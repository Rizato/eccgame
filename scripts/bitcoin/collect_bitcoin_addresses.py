#!/usr/bin/env python3
"""
Bitcoin Address Collector for ECC Game

This script queries a local Bitcoin node to collect addresses from early Bitcoin history
that have never spent their funds. It targets miners from the first n (200 by default) blocks
plus Satoshi's known addresses.

Requirements:
- Local Bitcoin Core node running with RPC enabled
- Python packages: pip install -r requirements.txt

Configuration:
- Ensure your bitcoin.conf has: rpcuser, rpcpassword, rpcallowip settings
"""

import json

import backoff
import click
import requests
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import hashlib
import base58

logger = logging.getLogger(__name__)

# Default constants
DEFAULT_RPC_URL = "http://192.168.56.1:8332"
DEFAULT_RPC_USER = "bitcoinrpc"
DEFAULT_MAX_BLOCKS = 200  # First 200 blocks
DEFAULT_OUTPUT_FILE = "bitcoin_addresses.json"
SATOSHI_BLOCKS = [9]  # Block 1 miner (Satoshi)

@dataclass
class BitcoinAddress:
    """Represents a Bitcoin address with metadata"""
    address: str
    public_key: str
    compressed_public_key: str
    balance: int  # in satoshis
    first_seen_block: int
    last_activity_block: int
    tags: List[str]
    is_miner: bool
    is_unspent: bool
    count: int
    total_received: int  # Total satoshis received (for miners, this is mining rewards)

class BitcoinRPC:
    """Bitcoin RPC client"""

    def __init__(self, url: str, user: str, password: str):
        self.url = url
        self.auth = (user, password)
        self.headers = {'content-type': 'application/json'}

    @backoff.on_exception(backoff.expo,
                          (requests.exceptions.Timeout,
                           requests.exceptions.ConnectionError, requests.exceptions.HTTPError, requests.exceptions.RequestException),max_tries=15,)
    def call(self, method: str, params: List = None) -> Any:
        """Make RPC call to Bitcoin node"""
        if params is None:
            params = []

        payload = {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 1
        }

        response = requests.post(
            self.url,
            data=json.dumps(payload),
            headers=self.headers,
            auth=self.auth,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()

        if 'error' in result and result['error']:
            raise Exception(f"RPC Error: {result['error']}")

        return result['result']

class AddressCollector:
    """Collects Bitcoin addresses with historical significance"""

    def __init__(self, rpc: BitcoinRPC):
        self.rpc = rpc
        self.addresses: Dict[str, BitcoinAddress] = {}
        self.processed_blocks = 0

    @staticmethod
    def pubkey_to_p2pkh_address(pubkey_hex: str) -> str:
        """Convert a public key (compressed or uncompressed) to a P2PKH Bitcoin address"""
        try:
            # Remove any whitespace and convert to bytes
            pubkey_bytes = bytes.fromhex(pubkey_hex.strip())

            # Step 1: SHA256 hash of the public key
            sha256_hash = hashlib.sha256(pubkey_bytes).digest()

            # Step 2: RIPEMD160 hash of the SHA256 hash
            ripemd160 = hashlib.new('ripemd160')
            ripemd160.update(sha256_hash)
            pubkey_hash = ripemd160.digest()

            # Step 3: Add version byte (0x00 for mainnet P2PKH)
            versioned_hash = b'\x00' + pubkey_hash

            # Step 4: Calculate checksum (first 4 bytes of double SHA256)
            checksum = hashlib.sha256(hashlib.sha256(versioned_hash).digest()).digest()[:4]

            # Step 5: Append checksum
            address_bytes = versioned_hash + checksum

            # Step 6: Base58 encode
            address = base58.b58encode(address_bytes).decode('ascii')

            return address
        except Exception as e:
            logger.exception("Error converting pubkey %s to address", pubkey_hex,  {e})
            return ""

    @staticmethod
    def compress_public_key(pubkey_hex: str) -> str:
        """Convert an uncompressed public key to compressed format"""
        try:
            pubkey_bytes = bytes.fromhex(pubkey_hex.strip())

            # Check if already compressed (33 bytes starting with 02 or 03)
            if len(pubkey_bytes) == 33 and pubkey_bytes[0] in [0x02, 0x03]:
                return pubkey_hex

            # Check if uncompressed (65 bytes starting with 04)
            if len(pubkey_bytes) == 65 and pubkey_bytes[0] == 0x04:
                # Extract x and y coordinates
                x = pubkey_bytes[1:33]
                y = pubkey_bytes[33:65]

                # Determine prefix based on y parity
                prefix = 0x02 if y[-1] % 2 == 0 else 0x03

                # Compressed key is prefix + x coordinate
                compressed = bytes([prefix]) + x
                return compressed.hex()

            # If neither format is recognized, return original
            return pubkey_hex

        except Exception as e:
            logger.error(f"Error compressing public key: {e}")
            return pubkey_hex

    def get_coinbase_address(self, block_data: Dict) -> Optional[tuple]:
        """Extract miner address from coinbase transaction"""
        if not block_data.get('tx'):
            return None

        # First transaction is always coinbase
        coinbase_tx = block_data['tx'][0]['txid']

        # Get full transaction details
        tx_data = self.rpc.call('getrawtransaction', [coinbase_tx, True])
        logger.debug("tx_data: %s", tx_data)
        # Extract miner address from coinbase output
        for vout in tx_data.get('vout', []):
            script_pub_key = vout.get('scriptPubKey', {})
            if script_pub_key.get('type') == 'pubkey':
                # Extract the public key from the script
                # In pubkey scripts, the format is: [push opcode] [pubkey] [OP_CHECKSIG]
                # We need to extract just the pubkey portion
                hex_script = script_pub_key.get('hex', '')
                if len(hex_script) >= 4:
                    # First byte is the push opcode (length of pubkey)
                    push_len = int(hex_script[0:2], 16)
                    # Extract the pubkey based on the push length
                    pub_key = hex_script[2:2 + (push_len * 2)]

                    # Convert pubkey to P2PKH address
                    addr = self.pubkey_to_p2pkh_address(pub_key)
                    compressed_key = self.compress_public_key(pub_key)
                    if addr:
                        return addr, pub_key, compressed_key, vout['value'], True  # True = miner

        return None

    def process_block(self, block_height: int) -> None:
        """Process a single block and extract relevant addresses"""
        try:
            # Get block hash
            block_hash = self.rpc.call('getblockhash', [block_height])

            # Get block data
            block_data = self.rpc.call('getblock', [block_hash, 2])  # 2 = include tx data

            # Process miner address (coinbase)
            miner_info = self.get_coinbase_address(block_data)
            logger.debug("Miner info: %s", miner_info)
            if miner_info:
                addr, pub_key, compressed_key, amount, is_miner = miner_info
                self.add_address(addr, pub_key, compressed_key, amount, block_height, is_miner, block_height)

            self.processed_blocks += 1
            if self.processed_blocks % 1000 == 0:
                logger.info(f"Processed {self.processed_blocks} blocks...")

        except Exception as e:
            logger.exception("Error processing block %d", block_height, exc_info=e)

    def add_address(self, address: str, pub_key: str, compressed_key: str, amount: float,
                   first_seen: int, is_miner: bool, block_height: int) -> None:
        """Add or update an address in our collection"""

        amount_sats = int(amount * 100000000)  # Convert BTC to satoshis

        if address in self.addresses:
            # Update existing address
            addr_obj = self.addresses[address]
            addr_obj.last_activity_block = max(addr_obj.last_activity_block, block_height)
            addr_obj.count += 1
            addr_obj.total_received += amount_sats
            if is_miner:
                addr_obj.tags.append(f"mined-block:{block_height}")
        else:
            # Create new address
            tags = []
            if is_miner:
                tags.extend([f"mined-block:{block_height}"])

            # Special tags for Satoshi
            if block_height in SATOSHI_BLOCKS and is_miner:
                tags.append("satoshi")

            self.addresses[address] = BitcoinAddress(
                address=address,
                public_key=pub_key,
                compressed_public_key=compressed_key,
                balance=0,  # Will be updated when we check balances
                first_seen_block=first_seen,
                last_activity_block=block_height,
                tags=tags,
                is_miner=is_miner,
                is_unspent=False,  # Will be updated later
                count=1,
                total_received=amount_sats,
            )

    def check_coinbase_utxos(self) -> None:
        """Check if coinbase outputs are still unspent using gettxout"""
        print(f"Checking coinbase UTXOs for {len(self.addresses)} addresses...")

        for address, addr_obj in self.addresses.items():
            if not addr_obj.is_miner:
                logger.warning("Skipping non-miner %s", address)
                continue

            # For miners, check if their coinbase outputs are still unspent
            try:
                # Extract block number from tags to get the coinbase transaction
                block_nums = [int(tag.split(':')[1]) for tag in addr_obj.tags if tag.startswith('mined-block:')]
                if not block_nums:
                    continue

                for block_num in block_nums:
                    # Get the coinbase transaction for this block
                    block_hash = self.rpc.call('getblockhash', [block_num])
                    block_data = self.rpc.call('getblock', [block_hash, 1])
                    coinbase_txid = block_data['tx'][0]  # First tx is always coinbase

                    # Check if the coinbase output is still unspent
                    # Most coinbase transactions have output index 0
                    utxo_info = self.rpc.call('gettxout', [coinbase_txid, 0])

                    if utxo_info is not None:
                        # UTXO exists, so it's unspent
                        value_sats = int(utxo_info['value'] * 100000000)
                        addr_obj.balance += value_sats
                        logger.info(f"Found unspent coinbase for {address}: {value_sats} sats")
                    else:
                        logger.warning(f"Coinbase output spent for {address} in block {block_num}")

            except Exception as e:
                logger.exception("Error checking coinbase for %s", address, e)
                continue

        logger.info("Coinbase UTXO check complete.")

    def filter_likely_unspent_addresses(self) -> None:
        """Filter addresses that likely never spent based on balance comparison"""
        print("Filtering addresses that likely never spent funds...")

        never_spent_addresses = {}

        for address, addr_obj in self.addresses.items():
            if "satoshi" in addr_obj.tags:
                never_spent_addresses[address] = addr_obj

            # Compare current balance with total received
            # If current balance >= total received, address likely never spent
            current_balance = addr_obj.balance
            total_received = addr_obj.total_received

            if current_balance >= total_received and current_balance > 0:
                addr_obj.is_unspent = True
                never_spent_addresses[address] = addr_obj
                logger.warning(f"Address {address}: received {total_received}, "
                           f"current {current_balance} - likely unspent")
            else:
                # Debug info for why address was filtered out
                if current_balance == 0:
                    logger.warning(f"Filtered {address}: Zero current balance")
                elif current_balance < total_received:
                    logger.warning(f"Filtered {address}: Current balance ({current_balance}) < "
                               f"received ({total_received}) - likely spent some")

        self.addresses = never_spent_addresses
        print(f"Found {len(self.addresses)} addresses that likely never spent funds "
              f"(current balance >= total received)")

    def collect_addresses(self) -> Dict[str, BitcoinAddress]:
        """Main collection process"""
        max_blocks = getattr(self, 'max_blocks', DEFAULT_MAX_BLOCKS)
        logger.info(f"Starting collection of Bitcoin addresses from blocks 1-{max_blocks}")

        # Process blocks in batches
        for block in range(1, max_blocks + 1):
            logger.info(f"Processing block {block}")
            self.process_block(block)

        # Check if coinbase outputs are still unspent
        self.check_coinbase_utxos()

        # Filter for addresses that likely never spent
        self.filter_likely_unspent_addresses()

        return self.addresses

    def save_to_file(self, filename: str) -> None:
        """Save collected addresses to JSON file"""
        output_data = []

        for addr, addr_obj in self.addresses.items():
            output_data.append({
                "public_key": addr_obj.compressed_public_key,
                "tags": addr_obj.tags,
            })

        with open(filename, 'w') as f:
            json.dump({
                "collected_at": time.time(),
                "total_addresses": len(output_data),
                "max_block_processed": getattr(self, 'max_blocks', DEFAULT_MAX_BLOCKS),
                "challenges": output_data
            }, f, indent=2)

        logger.info(f"Saved {len(output_data)} addresses to {filename}")

def detect_host_ip():
    """Try to detect the Windows host IP address from the VM"""
    import socket
    import subprocess

    # Method 1: Try to get default gateway (usually the host in VirtualBox NAT)
    try:
        result = subprocess.run(['ip', 'route', 'show', 'default'],
                              capture_output=True, text=True)
        if result.returncode == 0:
            gateway = result.stdout.split()[2]
            logger.info(f"Detected default gateway (likely host): {gateway}")
            return f"http://{gateway}:8332"
    except:
        pass

    # Method 2: Try common VirtualBox host IPs
    common_host_ips = ["10.0.2.2", "192.168.56.1", "192.168.1.1"]
    for ip in common_host_ips:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex((ip, 8332))
            sock.close()
            if result == 0:
                logger.info(f"Found Bitcoin RPC at {ip}:8332")
                return f"http://{ip}:8332"
        except:
            continue

    return None

@click.command()
@click.option('--rpc-url',
              envvar='BITCOIN_RPC_URL',
              default=DEFAULT_RPC_URL,
              help='Bitcoin RPC URL (e.g., http://192.168.56.1:8332)')
@click.option('--rpc-user',
              envvar='BITCOIN_RPC_USER',
              default=DEFAULT_RPC_USER,
              help='Bitcoin RPC username')
@click.option('--rpc-password',
              envvar='BITCOIN_RPC_PASSWORD',
              prompt=True,
              hide_input=True,
              help='Bitcoin RPC password')
@click.option('--max-blocks',
              envvar='MAX_BLOCKS',
              default=DEFAULT_MAX_BLOCKS,
              type=int,
              help='Maximum number of blocks to process')
@click.option('--output-file',
              envvar='OUTPUT_FILE',
              default=DEFAULT_OUTPUT_FILE,
              help='Output JSON file path')
@click.option('--auto-detect-ip/--no-auto-detect-ip',
              default=True,
              help='Attempt to auto-detect host IP')
@click.option('--log-level',
              type=click.Choice(['DEBUG', 'INFO', 'WARNING', 'ERROR']),
              default='WARNING',
              help='Set logging level')
def main(rpc_url, rpc_user, rpc_password, max_blocks, output_file, auto_detect_ip, log_level):
    """Bitcoin Address Collector for ECC Game

    Collects Bitcoin addresses from early blocks that have never spent their funds.
    Requires a local Bitcoin Core node with RPC enabled.

    Environment variables:
    - BITCOIN_RPC_URL: RPC endpoint URL
    - BITCOIN_RPC_USER: RPC username
    - BITCOIN_RPC_PASSWORD: RPC password
    - MAX_BLOCKS: Maximum block height to process
    - OUTPUT_FILE: Output file path
    """
    # Configure logging
    logging.basicConfig(level=getattr(logging, log_level))

    click.echo("Bitcoin Address Collector for ECC Game")
    click.echo("=" * 50)

    # Try to auto-detect host IP if requested and using default
    if auto_detect_ip and rpc_url == DEFAULT_RPC_URL:
        click.echo("Attempting to auto-detect Windows host IP...")
        detected_url = detect_host_ip()
        if detected_url:
            rpc_url = detected_url
            click.echo(f"Using detected RPC URL: {rpc_url}")
        else:
            click.echo("Could not auto-detect host IP.")
            click.echo("Common VirtualBox host IPs to try:")
            click.echo("- 10.0.2.2 (NAT mode)")
            click.echo("- 192.168.56.1 (Host-only adapter)")
            click.echo("- Your actual Windows IP (Bridged adapter)")
            if not click.confirm("Continue with default URL?"):
                return

    # Initialize RPC client
    try:
        rpc = BitcoinRPC(rpc_url, rpc_user, rpc_password)

        # Test connection
        block_count = rpc.call('getblockcount')
        click.echo(f"Connected to Bitcoin node. Current block height: {block_count}")

        if block_count < max_blocks:
            click.echo(f"Warning: Node only has {block_count} blocks, but we need {max_blocks}")
            if not click.confirm("Continue anyway?"):
                return

    except Exception as e:
        click.echo(f"Failed to connect to Bitcoin node: {e}", err=True)
        click.echo("\nMake sure:", err=True)
        click.echo("1. Bitcoin Core is running", err=True)
        click.echo("2. RPC is enabled in bitcoin.conf", err=True)
        click.echo("3. RPC credentials are correct", err=True)
        return

    # Initialize collector with max_blocks parameter
    collector = AddressCollector(rpc)
    collector.max_blocks = max_blocks

    try:
        # Collect addresses
        addresses = collector.collect_addresses()

        # Save results
        collector.save_to_file(output_file)

        # Print summary
        click.echo("\nCollection Summary:")
        click.echo(f"Total unspent addresses found: {len(addresses)}")

        # Count by type
        miners = sum(1 for addr in addresses.values() if addr.is_miner)
        satoshi_addrs = sum(1 for addr in addresses.values() if "satoshi" in addr.tags)

        click.echo(f"Miner addresses: {miners}")
        click.echo(f"Satoshi addresses: {satoshi_addrs}")

        # Total balance
        total_balance = sum(addr.balance for addr in addresses.values())
        click.echo(f"Total balance: {total_balance / 100000000:.8f} BTC")

    except KeyboardInterrupt:
        click.echo("\nCollection interrupted by user")
        collector.save_to_file(f"partial_{output_file}")
    except Exception as e:
        logger.exception("Error during collection", e)

if __name__ == "__main__":
    main()
