#!/usr/bin/env python3
"""
Fast Bitcoin Address Collector using Direct Database Access

This script directly queries Bitcoin Core's LevelDB databases to quickly collect
addresses that have never spent their funds. Much faster than RPC calls.

Requirements:
- Bitcoin Core with full blockchain data
- Python packages: plyvel, python-bitcoinlib, base58

Configuration:
- Update BITCOIN_DATA_DIR to your Bitcoin data directory
"""

import os
import struct
import hashlib
import base58
import json
import time
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass
import plyvel
from bitcoin.core import b2x, x, COutPoint, CTxIn, CTxOut
from bitcoin.core.script import CScript, OP_DUP, OP_HASH160, OP_EQUALVERIFY, OP_CHECKSIG
import bitcoin.core.serialize

# Configuration
BITCOIN_DATA_DIR = os.path.expanduser("~/.bitcoin")  # Update this path
MAX_BLOCKS = 250000
OUTPUT_FILE = "bitcoin_addresses_fast.json"

@dataclass
class BitcoinAddress:
    """Represents a Bitcoin address with metadata"""
    address: str
    public_key: str  # Hex encoded public key if available
    public_key_compressed: str  # Compressed version
    public_key_uncompressed: str  # Uncompressed version
    balance: int  # in satoshis
    first_seen_block: int
    last_activity_block: int
    tags: List[str]
    is_miner: bool
    is_unspent: bool
    has_spent: bool  # Track if this address has ever spent funds

class UTXODatabase:
    """Direct access to Bitcoin's UTXO database"""

    def __init__(self, bitcoin_data_dir: str):
        self.chainstate_path = os.path.join(bitcoin_data_dir, "chainstate")
        self.blocks_path = os.path.join(bitcoin_data_dir, "blocks", "index")

        if not os.path.exists(self.chainstate_path):
            raise Exception(f"Chainstate database not found at {self.chainstate_path}")

        # Open databases
        self.chainstate_db = plyvel.DB(self.chainstate_path, compression=None)

    def close(self):
        """Close database connections"""
        if hasattr(self, 'chainstate_db'):
            self.chainstate_db.close()

    def decode_utxo_key(self, key: bytes) -> Tuple[bytes, int]:
        """Decode UTXO key to get txid and vout"""
        if len(key) < 33:
            return None, None

        # UTXO keys start with 'C' (0x43)
        if key[0] != ord('C'):
            return None, None

        # Next 32 bytes are txid, then varint for vout
        txid = key[1:33]
        vout_data = key[33:]

        # Decode varint for vout
        vout = 0
        shift = 0
        for byte in vout_data:
            vout |= (byte & 0x7f) << shift
            if byte & 0x80 == 0:
                break
            shift += 7

        return txid, vout

    def decode_utxo_value(self, value: bytes) -> Tuple[int, bytes]:
        """Decode UTXO value to get amount and script"""
        if len(value) < 1:
            return 0, b''

        # Decode varint for amount
        amount = 0
        shift = 0
        pos = 0

        while pos < len(value):
            byte = value[pos]
            amount |= (byte & 0x7f) << shift
            pos += 1
            if byte & 0x80 == 0:
                break
            shift += 7

        # Rest is the script
        script = value[pos:] if pos < len(value) else b''

        return amount, script

    def extract_address_from_script(self, script: bytes) -> Tuple[str, str]:
        """Extract address and public key from script"""
        if len(script) == 0:
            return "", ""

        try:
            # P2PKH script: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
            if (len(script) == 25 and
                script[0] == OP_DUP and
                script[1] == OP_HASH160 and
                script[2] == 20 and
                script[23] == OP_EQUALVERIFY and
                script[24] == OP_CHECKSIG):

                hash160 = script[3:23]
                # Convert to address
                version_byte = b'\x00'  # Mainnet P2PKH
                checksum = hashlib.sha256(hashlib.sha256(version_byte + hash160).digest()).digest()[:4]
                address = base58.b58encode(version_byte + hash160 + checksum).decode()
                return address, ""

            # P2PK script: <public key> OP_CHECKSIG
            elif (len(script) >= 35 and
                  script[-1] == OP_CHECKSIG and
                  script[0] in [33, 65]):  # Compressed or uncompressed pubkey length

                pubkey_len = script[0]
                if len(script) == pubkey_len + 2:  # pubkey_len + length_byte + OP_CHECKSIG
                    pubkey = script[1:1+pubkey_len]
                    pubkey_hex = pubkey.hex()

                    # Generate address from public key
                    hash160 = hashlib.new('ripemd160', hashlib.sha256(pubkey).digest()).digest()
                    version_byte = b'\x00'
                    checksum = hashlib.sha256(hashlib.sha256(version_byte + hash160).digest()).digest()[:4]
                    address = base58.b58encode(version_byte + hash160 + checksum).decode()

                    return address, pubkey_hex

            return "", ""

        except Exception as e:
            return "", ""

    def get_all_utxos(self) -> Dict[str, BitcoinAddress]:
        """Get all UTXOs from chainstate database"""
        print("Scanning UTXO set...")

        addresses = {}
        utxo_count = 0

        try:
            for key, value in self.chainstate_db:
                utxo_count += 1
                if utxo_count % 100000 == 0:
                    print(f"Processed {utxo_count} UTXOs, found {len(addresses)} addresses...")

                # Decode UTXO
                txid, vout = self.decode_utxo_key(key)
                if txid is None:
                    continue

                amount, script = self.decode_utxo_value(value)
                if amount == 0:
                    continue

                # Extract address from script
                address, pubkey = self.extract_address_from_script(script)
                if not address:
                    continue

                # Add or update address
                if address in addresses:
                    addresses[address].balance += amount
                else:
                    addresses[address] = BitcoinAddress(
                        address=address,
                        public_key=pubkey,
                        public_key_compressed="",
                        public_key_uncompressed="",
                        balance=amount,
                        first_seen_block=0,  # Will be filled later
                        last_activity_block=0,
                        tags=[],
                        is_miner=False,
                        is_unspent=True,
                        has_spent=False  # Will be determined later
                    )

        except Exception as e:
            print(f"Error scanning UTXOs: {e}")

        print(f"Found {len(addresses)} addresses with unspent outputs")
        return addresses

class BlockchainScanner:
    """Scans blockchain data to find public keys and spending history"""

    def __init__(self, bitcoin_data_dir: str):
        self.bitcoin_data_dir = bitcoin_data_dir
        self.blocks_dir = os.path.join(bitcoin_data_dir, "blocks")
        self.spent_addresses = set()  # Track addresses that have spent funds
        self.address_to_pubkey = {}  # Map addresses to their public keys

    def extract_pubkey_from_scriptsig(self, scriptsig: bytes) -> str:
        """Extract public key from scriptSig (when spending P2PKH)"""
        try:
            # P2PKH scriptSig format: <signature> <public_key>
            # Parse as script to extract elements
            script = CScript(scriptsig)
            elements = list(script)

            if len(elements) >= 2:
                # Last element should be the public key
                pubkey_candidate = elements[-1]

                # Validate public key length (33 for compressed, 65 for uncompressed)
                if len(pubkey_candidate) in [33, 65]:
                    # Additional validation: check if it starts with valid prefix
                    if len(pubkey_candidate) == 33 and pubkey_candidate[0] in [0x02, 0x03]:
                        return pubkey_candidate.hex()  # Compressed
                    elif len(pubkey_candidate) == 65 and pubkey_candidate[0] == 0x04:
                        return pubkey_candidate.hex()  # Uncompressed

            return ""

        except Exception as e:
            return ""

    def parse_block_file(self, file_path: str, max_blocks: int = None) -> Tuple[Set[str], Dict[str, str]]:
        """Parse a block file to find spending addresses and public keys"""
        spent_addrs = set()
        addr_pubkeys = {}
        blocks_processed = 0

        try:
            with open(file_path, 'rb') as f:
                while True:
                    if max_blocks and blocks_processed >= max_blocks:
                        break

                    # Read block header
                    magic = f.read(4)
                    if not magic or magic != b'\xf9\xbe\xb4\xd9':  # Bitcoin mainnet magic
                        break

                    block_size = struct.unpack('<I', f.read(4))[0]
                    block_data = f.read(block_size)

                    if len(block_data) != block_size:
                        break

                    # Parse block
                    self.parse_block_data(block_data, spent_addrs, addr_pubkeys)
                    blocks_processed += 1

                    if blocks_processed % 1000 == 0:
                        print(f"Processed {blocks_processed} blocks, found {len(spent_addrs)} spending addresses")

        except Exception as e:
            print(f"Error parsing block file {file_path}: {e}")

        return spent_addrs, addr_pubkeys

    def parse_block_data(self, block_data: bytes, spent_addrs: Set[str], addr_pubkeys: Dict[str, str]):
        """Parse block data to extract transaction info"""
        try:
            # Skip block header (80 bytes)
            pos = 80

            # Read transaction count (varint)
            tx_count, varint_size = self.read_varint(block_data, pos)
            pos += varint_size

            # Process each transaction
            for tx_idx in range(tx_count):
                pos = self.parse_transaction(block_data, pos, spent_addrs, addr_pubkeys, tx_idx == 0)
                if pos is None:
                    break

        except Exception as e:
            print(f"Error parsing block data: {e}")

    def parse_transaction(self, data: bytes, pos: int, spent_addrs: Set[str],
                         addr_pubkeys: Dict[str, str], is_coinbase: bool) -> Optional[int]:
        """Parse a single transaction"""
        try:
            start_pos = pos

            # Version (4 bytes)
            pos += 4

            # Input count (varint)
            input_count, varint_size = self.read_varint(data, pos)
            pos += varint_size

            # Process inputs (skip coinbase)
            if not is_coinbase:
                for _ in range(input_count):
                    # Previous tx hash (32 bytes)
                    pos += 32

                    # Previous tx output index (4 bytes)
                    pos += 4

                    # ScriptSig length (varint)
                    scriptsig_len, varint_size = self.read_varint(data, pos)
                    pos += varint_size

                    # ScriptSig data
                    scriptsig = data[pos:pos + scriptsig_len]
                    pos += scriptsig_len

                    # Extract public key and derive address
                    pubkey = self.extract_pubkey_from_scriptsig(scriptsig)
                    if pubkey:
                        address = self.pubkey_to_address(pubkey)
                        if address:
                            spent_addrs.add(address)
                            addr_pubkeys[address] = pubkey

                    # Sequence (4 bytes)
                    pos += 4
            else:
                # Skip coinbase input
                for _ in range(input_count):
                    pos += 32  # prev hash
                    pos += 4   # prev index
                    scriptsig_len, varint_size = self.read_varint(data, pos)
                    pos += varint_size + scriptsig_len
                    pos += 4   # sequence

            # Output count (varint)
            output_count, varint_size = self.read_varint(data, pos)
            pos += varint_size

            # Skip outputs (we don't need them for spending detection)
            for _ in range(output_count):
                pos += 8  # value
                script_len, varint_size = self.read_varint(data, pos)
                pos += varint_size + script_len

            # Lock time (4 bytes)
            pos += 4

            return pos

        except Exception as e:
            return None

    def read_varint(self, data: bytes, pos: int) -> Tuple[int, int]:
        """Read a variable-length integer"""
        if pos >= len(data):
            return 0, 0

        first_byte = data[pos]

        if first_byte < 0xfd:
            return first_byte, 1
        elif first_byte == 0xfd:
            if pos + 3 > len(data):
                return 0, 0
            return struct.unpack('<H', data[pos+1:pos+3])[0], 3
        elif first_byte == 0xfe:
            if pos + 5 > len(data):
                return 0, 0
            return struct.unpack('<I', data[pos+1:pos+5])[0], 5
        else:  # 0xff
            if pos + 9 > len(data):
                return 0, 0
            return struct.unpack('<Q', data[pos+1:pos+9])[0], 9

    def pubkey_to_address(self, pubkey_hex: str) -> str:
        """Convert public key to Bitcoin address"""
        try:
            pubkey_bytes = bytes.fromhex(pubkey_hex)
            hash160 = hashlib.new('ripemd160', hashlib.sha256(pubkey_bytes).digest()).digest()
            version_byte = b'\x00'
            checksum = hashlib.sha256(hashlib.sha256(version_byte + hash160).digest()).digest()[:4]
            address = base58.b58encode(version_byte + hash160 + checksum).decode()
            return address
        except:
            return ""

    def scan_spending_history(self, max_blocks: int = MAX_BLOCKS) -> Tuple[Set[str], Dict[str, str]]:
        """Scan blockchain for spending history and public keys"""
        print(f"Scanning blockchain for spending history (first {max_blocks} blocks)...")

        spent_addresses = set()
        address_pubkeys = {}

        # Find block files
        block_files = []
        for i in range(1000):  # Bitcoin creates blk00000.dat, blk00001.dat, etc.
            file_path = os.path.join(self.blocks_dir, f"blk{i:05d}.dat")
            if os.path.exists(file_path):
                block_files.append(file_path)
            else:
                break

        print(f"Found {len(block_files)} block files")

        blocks_processed = 0
        for file_path in block_files:
            if blocks_processed >= max_blocks:
                break

            print(f"Processing {file_path}...")
            remaining_blocks = max_blocks - blocks_processed

            spent_addrs, addr_pubkeys = self.parse_block_file(file_path, remaining_blocks)
            spent_addresses.update(spent_addrs)
            address_pubkeys.update(addr_pubkeys)

            blocks_processed += len(spent_addrs)  # Approximation

        print(f"Found {len(spent_addresses)} addresses that have spent funds")
        print(f"Extracted {len(address_pubkeys)} public keys")

        return spent_addresses, address_pubkeys

class FastAddressCollector:
    """Fast collection using direct database access"""

    def __init__(self, bitcoin_data_dir: str):
        self.bitcoin_data_dir = bitcoin_data_dir
        self.utxo_db = UTXODatabase(bitcoin_data_dir)
        self.blockchain_scanner = BlockchainScanner(bitcoin_data_dir)

    def collect_addresses(self) -> Dict[str, BitcoinAddress]:
        """Main collection process"""
        print("Starting fast address collection...")

        # Step 1: Get all addresses with unspent outputs
        addresses = self.utxo_db.get_all_utxos()

        # Step 2: Scan blockchain for spending history and public keys
        spent_addresses, address_pubkeys = self.blockchain_scanner.scan_spending_history()

        # Step 3: Filter out addresses that have spent funds
        never_spent_addresses = {}

        for address, addr_obj in addresses.items():
            if address not in spent_addresses:
                # This address has never spent funds
                if address in address_pubkeys:
                    addr_obj.public_key = address_pubkeys[address]
                    # Convert between compressed/uncompressed if needed
                    addr_obj.public_key_compressed = self.compress_pubkey(addr_obj.public_key)
                    addr_obj.public_key_uncompressed = self.uncompress_pubkey(addr_obj.public_key)

                addr_obj.has_spent = False
                never_spent_addresses[address] = addr_obj

        print(f"Found {len(never_spent_addresses)} addresses that never spent funds")
        return never_spent_addresses

    def compress_pubkey(self, pubkey_hex: str) -> str:
        """Convert public key to compressed format"""
        if not pubkey_hex:
            return ""

        try:
            pubkey_bytes = bytes.fromhex(pubkey_hex)
            if len(pubkey_bytes) == 65 and pubkey_bytes[0] == 0x04:
                # Uncompressed -> Compressed
                x = pubkey_bytes[1:33]
                y = pubkey_bytes[33:65]
                y_int = int.from_bytes(y, 'big')
                prefix = 0x02 if y_int % 2 == 0 else 0x03
                return f"{prefix:02x}{x.hex()}"
            elif len(pubkey_bytes) == 33 and pubkey_bytes[0] in [0x02, 0x03]:
                # Already compressed
                return pubkey_hex
        except:
            pass

        return pubkey_hex

    def uncompress_pubkey(self, pubkey_hex: str) -> str:
        """Convert public key to uncompressed format using secp256k1 curve math"""
        if not pubkey_hex:
            return ""

        try:
            pubkey_bytes = bytes.fromhex(pubkey_hex)
            if len(pubkey_bytes) == 65 and pubkey_bytes[0] == 0x04:
                # Already uncompressed
                return pubkey_hex
            elif len(pubkey_bytes) == 33 and pubkey_bytes[0] in [0x02, 0x03]:
                # Decompress using secp256k1 curve: y^2 = x^3 + 7 (mod p)

                # secp256k1 parameters
                p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F

                # Extract x coordinate
                x = int.from_bytes(pubkey_bytes[1:33], 'big')

                # Calculate y^2 = x^3 + 7 (mod p)
                y_squared = (pow(x, 3, p) + 7) % p

                # Calculate square root using Tonelli-Shanks algorithm (since p ≡ 3 (mod 4))
                # For secp256k1, we can use the simple case: y = y_squared^((p+1)/4) mod p
                y = pow(y_squared, (p + 1) // 4, p)

                # Determine correct y based on prefix
                is_even = (y % 2 == 0)

                if pubkey_bytes[0] == 0x02:
                    # Prefix 0x02 means y should be even
                    if not is_even:
                        y = p - y
                elif pubkey_bytes[0] == 0x03:
                    # Prefix 0x03 means y should be odd
                    if is_even:
                        y = p - y

                # Construct uncompressed public key: 0x04 + x (32 bytes) + y (32 bytes)
                x_bytes = x.to_bytes(32, 'big')
                y_bytes = y.to_bytes(32, 'big')
                uncompressed = b'\x04' + x_bytes + y_bytes

                return uncompressed.hex()

        except Exception as e:
            # If decompression fails, return empty string
            return ""

        return ""

    def save_to_file(self, addresses: Dict[str, BitcoinAddress], filename: str):
        """Save collected addresses to JSON file"""
        output_data = []

        for addr, addr_obj in addresses.items():
            output_data.append({
                "address": addr_obj.address,
                "public_key": addr_obj.public_key,
                "public_key_compressed": addr_obj.public_key_compressed,
                "public_key_uncompressed": addr_obj.public_key_uncompressed,
                "balance_satoshis": addr_obj.balance,
                "balance_btc": addr_obj.balance / 100000000,
                "first_seen_block": addr_obj.first_seen_block,
                "last_activity_block": addr_obj.last_activity_block,
                "tags": addr_obj.tags,
                "is_miner": addr_obj.is_miner,
                "is_unspent": addr_obj.is_unspent,
                "has_spent": addr_obj.has_spent
            })

        with open(filename, 'w') as f:
            json.dump({
                "collected_at": time.time(),
                "total_addresses": len(output_data),
                "max_block_processed": MAX_BLOCKS,
                "method": "direct_database_access",
                "addresses": output_data
            }, f, indent=2)

        print(f"Saved {len(output_data)} addresses to {filename}")

    def close(self):
        """Close database connections"""
        self.utxo_db.close()

def main():
    """Main execution function"""
    print("Fast Bitcoin Address Collector using Direct Database Access")
    print("=" * 60)

    # Check if Bitcoin data directory exists
    if not os.path.exists(BITCOIN_DATA_DIR):
        print(f"Bitcoin data directory not found: {BITCOIN_DATA_DIR}")
        print("Please update BITCOIN_DATA_DIR in the script")
        return

    print(f"Using Bitcoin data directory: {BITCOIN_DATA_DIR}")

    collector = FastAddressCollector(BITCOIN_DATA_DIR)

    try:
        # Collect addresses
        addresses = collector.collect_addresses()

        # Save results
        collector.save_to_file(addresses, OUTPUT_FILE)

        # Print summary
        print("\nCollection Summary:")
        print(f"Total addresses that never spent: {len(addresses)}")

        # Count addresses with public keys
        with_pubkeys = sum(1 for addr in addresses.values() if addr.public_key)
        print(f"Addresses with public keys: {with_pubkeys}")

        # Total balance
        total_balance = sum(addr.balance for addr in addresses.values())
        print(f"Total balance: {total_balance / 100000000:.8f} BTC")

        # Top balances
        sorted_addrs = sorted(addresses.values(), key=lambda x: x.balance, reverse=True)
        print(f"\nTop 10 balances:")
        for i, addr in enumerate(sorted_addrs[:10]):
            print(f"{i+1}. {addr.address}: {addr.balance / 100000000:.8f} BTC")

    except Exception as e:
        print(f"Error during collection: {e}")
        import traceback
        traceback.print_exc()

    finally:
        collector.close()

if __name__ == "__main__":
    main()
