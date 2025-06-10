#!/usr/bin/env python3
"""
Bitcoin Address Collector for ECC Crypto Playground

This script queries a local Bitcoin node to collect addresses from early Bitcoin history
that have never spent their funds. It targets miners and recipients from the first 250k blocks
plus Satoshi's known addresses.

Requirements:
- Local Bitcoin Core node running with RPC enabled
- Python packages: requests, bitcoin (install with: pip install requests python-bitcoinlib)

Configuration:
- Update RPC_URL, RPC_USER, RPC_PASSWORD for your Bitcoin node
- Ensure your bitcoin.conf has: rpcuser, rpcpassword, rpcallowip settings
"""

import json
import requests
import time
from typing import Dict, List, Set, Optional
from dataclasses import dataclass
import hashlib
import base58

# Bitcoin RPC Configuration
RPC_URL = "http://127.0.0.1:8332"
RPC_USER = "your_rpc_user"
RPC_PASSWORD = "your_rpc_password"

# Constants
MAX_BLOCKS = 250000  # First 250k blocks
SATOSHI_BLOCK = 1  # Block 1 miner (Satoshi)
FIRST_TX_BLOCK = 170  # Block with first P2PKH transaction (estimate)
BATCH_SIZE = 100  # Blocks to process in batch
OUTPUT_FILE = "bitcoin_addresses.json"

@dataclass
class BitcoinAddress:
    """Represents a Bitcoin address with metadata"""
    address: str
    public_key: str
    balance: int  # in satoshis
    first_seen_block: int
    last_activity_block: int
    tags: List[str]
    is_miner: bool
    is_unspent: bool

class BitcoinRPC:
    """Bitcoin RPC client"""

    def __init__(self, url: str, user: str, password: str):
        self.url = url
        self.auth = (user, password)
        self.headers = {'content-type': 'application/json'}

    def call(self, method: str, params: List = None) -> Dict:
        """Make RPC call to Bitcoin node"""
        if params is None:
            params = []

        payload = {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 1
        }

        try:
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
        except requests.exceptions.RequestException as e:
            raise Exception(f"RPC Connection Error: {e}")

class AddressCollector:
    """Collects Bitcoin addresses with historical significance"""

    def __init__(self, rpc: BitcoinRPC):
        self.rpc = rpc
        self.addresses: Dict[str, BitcoinAddress] = {}
        self.processed_blocks = 0

    def extract_addresses_from_transaction(self, tx_data: Dict, block_height: int) -> List[tuple]:
        """Extract addresses from transaction data"""
        addresses = []

        # Extract output addresses (recipients)
        for vout in tx_data.get('vout', []):
            script_pub_key = vout.get('scriptPubKey', {})
            if 'addresses' in script_pub_key:
                for addr in script_pub_key['addresses']:
                    # Try to extract public key if available
                    pub_key = ""
                    if script_pub_key.get('type') == 'pubkey':
                        pub_key = script_pub_key.get('hex', '')

                    addresses.append((addr, pub_key, vout['value'], False))  # False = not miner

        return addresses

    def get_coinbase_address(self, block_data: Dict) -> Optional[tuple]:
        """Extract miner address from coinbase transaction"""
        if not block_data.get('tx'):
            return None

        # First transaction is always coinbase
        coinbase_tx = block_data['tx'][0]

        # Get full transaction details
        tx_data = self.rpc.call('getrawtransaction', [coinbase_tx, True])

        # Extract miner address from coinbase output
        for vout in tx_data.get('vout', []):
            script_pub_key = vout.get('scriptPubKey', {})
            if 'addresses' in script_pub_key:
                for addr in script_pub_key['addresses']:
                    pub_key = ""
                    if script_pub_key.get('type') == 'pubkey':
                        pub_key = script_pub_key.get('hex', '')

                    return (addr, pub_key, vout['value'], True)  # True = miner

        return None

    def is_address_unspent(self, address: str) -> tuple:
        """Check if address has any unspent outputs and get balance"""
        try:
            # Get all UTXOs for this address
            utxos = self.rpc.call('scantxoutset', ['start', [f'addr({address})']])

            total_amount = 0
            has_unspent = False

            if utxos and 'unspents' in utxos:
                for utxo in utxos['unspents']:
                    total_amount += int(utxo['amount'] * 100000000)  # Convert to satoshis
                    has_unspent = True

            return has_unspent, total_amount
        except Exception as e:
            print(f"Error checking address {address}: {e}")
            return False, 0

    def has_sent_transaction(self, address: str) -> bool:
        """Check if address has ever sent a transaction (spent outputs)"""
        try:
            # Use listunspent to check if the address has any UTXOs
            # Then use gettxout to see if there are any spent outputs

            # Method 1: Check if address appears in transaction inputs
            # This requires scanning transaction inputs, which is expensive
            # We'll use a Bitcoin RPC method that can help us determine this

            # Import the address to check its transaction history
            # Note: This only works if the wallet is watching this address
            try:
                # First, try to import the address for monitoring (won't work on pruned nodes)
                self.rpc.call('importaddress', [address, "", False, False])
            except:
                # If import fails, continue with alternative method
                pass

            # Get transaction history for this address
            try:
                # This will show all transactions involving this address
                txs = self.rpc.call('listtransactions', ["*", 1000, 0, True])

                # Check if any transactions have this address as input (sent FROM)
                for tx in txs:
                    if tx.get('address') == address and tx.get('category') in ['send', 'move']:
                        return True  # Found a send transaction

            except:
                # If wallet methods don't work, use scan method
                pass

            # Alternative method: Use scantxoutset to get current UTXOs
            # Then compare with historical received amounts
            utxo_result = self.rpc.call('scantxoutset', ['start', [f'addr({address})']])

            if not utxo_result or 'unspents' not in utxo_result:
                return True  # No UTXOs found, likely spent everything

            current_balance = sum(utxo['amount'] for utxo in utxo_result['unspents'])

            # Method 2: Use getaddressinfo if available (newer Bitcoin Core)
            try:
                addr_info = self.rpc.call('getaddressinfo', [address])
                # This might give us more details about the address
            except:
                pass

            # Method 3: Heuristic approach for early blocks
            # If an address from early blocks has exactly the coinbase amount
            # and no other transactions, it likely never sent anything

            # For a more accurate check, we'd need to:
            # 1. Get all transactions that sent TO this address (received)
            # 2. Sum up total received
            # 3. Compare with current UTXO balance
            # 4. If current balance < total received, then some was spent

            # Simplified approach: if current balance is > 0 and this is an early address,
            # assume it never sent (this works for our use case of early, inactive addresses)
            return current_balance == 0  # If no balance, assume it was spent

        except Exception as e:
            print(f"Error checking transaction history for {address}: {e}")
            return True  # Assume spent if we can't determine

    def process_block(self, block_height: int) -> None:
        """Process a single block and extract relevant addresses"""
        try:
            # Get block hash
            block_hash = self.rpc.call('getblockhash', [block_height])

            # Get block data
            block_data = self.rpc.call('getblock', [block_hash, 2])  # 2 = include tx data

            # Process miner address (coinbase)
            miner_info = self.get_coinbase_address(block_data)
            if miner_info:
                addr, pub_key, amount, is_miner = miner_info
                self.add_address(addr, pub_key, amount, block_height, is_miner, block_height)

            # Process all transaction outputs in the block
            for tx in block_data.get('tx', [])[1:]:  # Skip coinbase
                if isinstance(tx, str):
                    # Need to get full transaction data
                    tx_data = self.rpc.call('getrawtransaction', [tx, True])
                else:
                    tx_data = tx

                addresses = self.extract_addresses_from_transaction(tx_data, block_height)
                for addr, pub_key, amount, is_miner in addresses:
                    self.add_address(addr, pub_key, amount, block_height, is_miner, block_height)

            self.processed_blocks += 1
            if self.processed_blocks % 1000 == 0:
                print(f"Processed {self.processed_blocks} blocks...")

        except Exception as e:
            print(f"Error processing block {block_height}: {e}")

    def add_address(self, address: str, pub_key: str, amount: float,
                   first_seen: int, is_miner: bool, block_height: int) -> None:
        """Add or update an address in our collection"""

        if address in self.addresses:
            # Update existing address
            addr_obj = self.addresses[address]
            addr_obj.last_activity_block = max(addr_obj.last_activity_block, block_height)
            if is_miner:
                addr_obj.tags.append(f"block:{block_height}")
                if "miner" not in addr_obj.tags:
                    addr_obj.tags.append("miner")
        else:
            # Create new address
            tags = []
            if is_miner:
                tags.extend(["miner", f"block:{block_height}"])

            # Special tags for Satoshi
            if block_height == SATOSHI_BLOCK and is_miner:
                tags.append("satoshi")

            self.addresses[address] = BitcoinAddress(
                address=address,
                public_key=pub_key,
                balance=0,  # Will be updated later
                first_seen_block=first_seen,
                last_activity_block=block_height,
                tags=tags,
                is_miner=is_miner,
                is_unspent=False  # Will be updated later
            )

    def filter_unspent_addresses(self) -> None:
        """Filter addresses to only include those that never spent funds"""
        print("Filtering for addresses that never sent transactions...")

        never_sent_addresses = {}
        total = len(self.addresses)
        processed = 0

        for address, addr_obj in self.addresses.items():
            processed += 1
            if processed % 100 == 0:
                print(f"Checked {processed}/{total} addresses for spending activity...")

            # Check if address has current balance (unspent outputs)
            has_unspent, balance = self.is_address_unspent(address)

            # Check if address has ever sent a transaction
            has_sent = self.has_sent_transaction(address)

            # We want addresses that:
            # 1. Have a current balance (received funds that are still there)
            # 2. Have never sent a transaction (never spent)
            if has_unspent and not has_sent and balance > 0:
                addr_obj.balance = balance
                addr_obj.is_unspent = True
                never_sent_addresses[address] = addr_obj
            else:
                # Debug info for why address was filtered out
                if not has_unspent:
                    print(f"Filtered {address}: No unspent outputs")
                elif has_sent:
                    print(f"Filtered {address}: Has sent transactions")
                elif balance <= 0:
                    print(f"Filtered {address}: Zero balance")

        self.addresses = never_sent_addresses
        print(f"Found {len(self.addresses)} addresses that never sent transactions")

    def add_satoshi_first_transaction(self) -> None:
        """Add the first P2PKH transaction sender (likely Satoshi)"""
        # Block 170 contains the first known P2PKH transaction from Satoshi
        # This is well-documented in Bitcoin history

        try:
            # This would need to be manually identified or through historical analysis
            # For now, we'll add a placeholder for the known Satoshi addresses

            satoshi_addresses = [
                "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # Genesis block
                "12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX",  # First transaction recipient
            ]

            for addr in satoshi_addresses:
                if addr not in self.addresses:
                    has_unspent, balance = self.is_address_unspent(addr)
                    if has_unspent and balance > 0:
                        self.addresses[addr] = BitcoinAddress(
                            address=addr,
                            public_key="",  # Not available for these addresses
                            balance=balance,
                            first_seen_block=1,
                            last_activity_block=1,
                            tags=["satoshi", "historic"],
                            is_miner=False,
                            is_unspent=True
                        )

        except Exception as e:
            print(f"Error adding Satoshi addresses: {e}")

    def collect_addresses(self) -> Dict[str, BitcoinAddress]:
        """Main collection process"""
        print(f"Starting collection of Bitcoin addresses from blocks 1-{MAX_BLOCKS}")

        # Process blocks in batches
        for start_block in range(1, MAX_BLOCKS + 1, BATCH_SIZE):
            end_block = min(start_block + BATCH_SIZE - 1, MAX_BLOCKS)

            print(f"Processing blocks {start_block}-{end_block}")

            for block_height in range(start_block, end_block + 1):
                self.process_block(block_height)
                time.sleep(0.01)  # Small delay to avoid overwhelming the node

        # Add known Satoshi addresses
        self.add_satoshi_first_transaction()

        # Filter for unspent addresses
        self.filter_unspent_addresses()

        return self.addresses

    def save_to_file(self, filename: str) -> None:
        """Save collected addresses to JSON file"""
        output_data = []

        for addr, addr_obj in self.addresses.items():
            output_data.append({
                "address": addr_obj.address,
                "public_key": addr_obj.public_key,
                "balance_satoshis": addr_obj.balance,
                "balance_btc": addr_obj.balance / 100000000,
                "first_seen_block": addr_obj.first_seen_block,
                "last_activity_block": addr_obj.last_activity_block,
                "tags": addr_obj.tags,
                "is_miner": addr_obj.is_miner,
                "is_unspent": addr_obj.is_unspent
            })

        with open(filename, 'w') as f:
            json.dump({
                "collected_at": time.time(),
                "total_addresses": len(output_data),
                "max_block_processed": MAX_BLOCKS,
                "addresses": output_data
            }, f, indent=2)

        print(f"Saved {len(output_data)} addresses to {filename}")

def main():
    """Main execution function"""
    print("Bitcoin Address Collector for ECC Crypto Playground")
    print("=" * 50)

    # Initialize RPC client
    try:
        rpc = BitcoinRPC(RPC_URL, RPC_USER, RPC_PASSWORD)

        # Test connection
        block_count = rpc.call('getblockcount')
        print(f"Connected to Bitcoin node. Current block height: {block_count}")

        if block_count < MAX_BLOCKS:
            print(f"Warning: Node only has {block_count} blocks, but we need {MAX_BLOCKS}")
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                return

    except Exception as e:
        print(f"Failed to connect to Bitcoin node: {e}")
        print("\nMake sure:")
        print("1. Bitcoin Core is running")
        print("2. RPC is enabled in bitcoin.conf")
        print("3. RPC credentials are correct")
        return

    # Initialize collector
    collector = AddressCollector(rpc)

    try:
        # Collect addresses
        addresses = collector.collect_addresses()

        # Save results
        collector.save_to_file(OUTPUT_FILE)

        # Print summary
        print("\nCollection Summary:")
        print(f"Total unspent addresses found: {len(addresses)}")

        # Count by type
        miners = sum(1 for addr in addresses.values() if addr.is_miner)
        satoshi_addrs = sum(1 for addr in addresses.values() if "satoshi" in addr.tags)

        print(f"Miner addresses: {miners}")
        print(f"Satoshi addresses: {satoshi_addrs}")

        # Total balance
        total_balance = sum(addr.balance for addr in addresses.values())
        print(f"Total balance: {total_balance / 100000000:.8f} BTC")

    except KeyboardInterrupt:
        print("\nCollection interrupted by user")
        collector.save_to_file(f"partial_{OUTPUT_FILE}")
    except Exception as e:
        print(f"Error during collection: {e}")

if __name__ == "__main__":
    main()
