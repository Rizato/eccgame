# Bitcoin Address Collection Script

This script queries a local Bitcoin Core node to collect historically significant Bitcoin addresses that have never spent their funds. It targets:

- Early miners from the first 250k blocks
- Recipients who never moved their Bitcoin
- Known Satoshi Nakamoto addresses
- Addresses with proper tagging for the ECC Crypto Playground

## Prerequisites

### 1. Bitcoin Core Node
You need a fully synchronized Bitcoin Core node running locally with RPC enabled.

**bitcoin.conf example:**
```
rpcuser=your_username
rpcpassword=your_secure_password
rpcallowip=127.0.0.1
server=1
txindex=1
```

### 2. Python Dependencies
```bash
cd scripts
pip install -r requirements.txt
```

## Configuration

Edit the script and update these variables:
```python
RPC_URL = "http://127.0.0.1:8332"  # Your Bitcoin RPC URL
RPC_USER = "your_rpc_user"         # From bitcoin.conf
RPC_PASSWORD = "your_rpc_password" # From bitcoin.conf
```

## Usage

```bash
python collect_bitcoin_addresses.py
```

The script will:
1. Connect to your Bitcoin node
2. Process blocks 1-250,000 looking for miners and recipients
3. Check if addresses have unspent outputs
4. Filter out addresses that have spent funds
5. Add special tags for Satoshi and historical significance
6. Save results to `bitcoin_addresses.json`

## Output Format

```json
{
  "collected_at": 1641234567,
  "total_addresses": 1234,
  "max_block_processed": 250000,
  "addresses": [
    {
      "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "public_key": "",
      "balance_satoshis": 5000000000,
      "balance_btc": 50.0,
      "first_seen_block": 1,
      "last_activity_block": 1,
      "tags": ["satoshi", "historic", "miner", "block:1"],
      "is_miner": true,
      "is_unspent": true
    }
  ]
}
```

## Tags Explained

- `miner`: Address received coinbase rewards
- `satoshi`: Known or likely Satoshi Nakamoto address
- `block:N`: Address was active in block N (for miners)
- `historic`: Historically significant address

## Performance Notes

- Processing 250k blocks takes several hours
- The script includes delays to avoid overwhelming your node
- Progress is logged every 1000 blocks
- Can be interrupted with Ctrl+C (saves partial results)

## Security Notes

- Only works with your local Bitcoin node
- No private keys are handled or exposed
- All addresses collected are already public on the blockchain
- Script only reads blockchain data, never modifies anything

## Troubleshooting

### "Connection refused"
- Ensure Bitcoin Core is running
- Check RPC configuration in bitcoin.conf
- Verify RPC credentials

### "Method not found"
- Ensure your Bitcoin Core version supports the RPC methods used
- Some methods require `txindex=1` in bitcoin.conf

### "Timeout errors"
- Your node may be slow or under heavy load
- Increase timeout values in the script
- Reduce BATCH_SIZE for slower nodes

## Integration with ECC Crypto Playground

The output JSON can be processed to create challenge files for the game:

```python
# Example: Convert to challenge format
import json

with open('bitcoin_addresses.json', 'r') as f:
    data = json.load(f)

challenges = []
for addr_data in data['addresses']:
    if addr_data['balance_btc'] > 1.0:  # Only high-value addresses
        challenge = {
            "public_key": addr_data['address'],  # P2PKH address
            "metadata": {
                "tags": addr_data['tags'],
                "balance": addr_data['balance_btc'],
                "block": addr_data['first_seen_block']
            }
        }
        challenges.append(challenge)
```
