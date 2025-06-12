# Bitcoin Address Collection Script

This script queries a Bitcoin Core node to collect historically significant Bitcoin addresses that have never spent their funds. It targets:

- Early miners from the first 250k blocks
- Recipients who never moved their Bitcoin
- Known Satoshi Nakamoto addresses
- Addresses with proper tagging for the ECC Game

## Setup for Windows Host + Linux VM

This setup allows you to run Bitcoin Core on your Windows host machine while running the Python script inside a Linux VM (VirtualBox).

### 1. Bitcoin Core on Windows Host

1. **Download and install Bitcoin Core** from https://bitcoin.org/en/download/
2. **Configure Bitcoin Core** by creating `bitcoin.conf` in the Bitcoin data directory:
   - Windows default location: `%APPDATA%\Bitcoin\bitcoin.conf`
   - Create the file if it doesn't exist

**bitcoin.conf example:**
```
# RPC Configuration
rpcuser=bitcoinrpc
rpcpassword=your_secure_random_password_here
rpcallowip=0.0.0.0/0
rpcbind=0.0.0.0:8332
server=1

# Index Configuration (required for address scanning)
txindex=1

# Optional: Reduce bandwidth if needed
maxconnections=8
```

3. **Start Bitcoin Core** with these settings:
   ```cmd
   bitcoind.exe -conf=bitcoin.conf
   ```

   Or start Bitcoin Core GUI and let it sync (this may take days for initial sync)

4. **Find your Windows host IP address**:
   ```cmd
   ipconfig
   ```
   Look for your network adapter's IPv4 address (usually something like 192.168.1.xxx)

### 2. Linux VM Configuration

1. **Install Python dependencies** in your Linux VM:
   ```bash
   cd /home/vboxuser/PycharmProjects/CryptoGuesser/scripts/bitcoin
   pip install -r requirements.txt
   ```

2. **Configure network access** - ensure your VM can reach the host:
   - In VirtualBox, set network adapter to "Bridged Adapter" or "NAT"
   - Test connectivity: `ping <host_ip_address>`

3. **Update script configuration** in `collect_bitcoin_addresses.py`:
   ```python
   RPC_URL = "http://<HOST_IP_ADDRESS>:8332"  # Replace with your Windows IP
   RPC_USER = "bitcoinrpc"                     # From bitcoin.conf
   RPC_PASSWORD = "your_secure_random_password_here"  # From bitcoin.conf
   ```

### 3. Test Bitcoin RPC Connection

Before running the collection script, test the RPC connection from your Linux VM:

```bash
# Test basic connection
curl -u bitcoinrpc:your_password \
     -d '{"jsonrpc": "1.0", "id":"test", "method": "getblockchaininfo", "params": [] }' \
     -H 'content-type: text/plain;' \
     http://<HOST_IP_ADDRESS>:8332/

# Check if fully synced
curl -u bitcoinrpc:your_password \
     -d '{"jsonrpc": "1.0", "id":"test", "method": "getblockcount", "params": [] }' \
     -H 'content-type: text/plain;' \
     http://<HOST_IP_ADDRESS>:8332/
```

The response should show current blockchain info without errors.

## Usage

1. **Ensure Bitcoin Core is fully synced** (this can take days initially)
2. **Run the collection script** from your Linux VM:
   ```bash
   cd /home/vboxuser/PycharmProjects/CryptoGuesser/scripts/bitcoin
   python3 collect_bitcoin_addresses.py
   ```

The script will:
1. Connect to your Bitcoin node on the Windows host
2. Process blocks 1-250,000 looking for miners and recipients
3. Check if addresses have unspent outputs
4. Filter out addresses that have spent funds
5. Add special tags for Satoshi and historical significance
6. Save results to `bitcoin_addresses.json`

**Performance Notes:**
- Processing 250k blocks takes several hours
- The script includes delays to avoid overwhelming your node
- Progress is logged every 1000 blocks
- Can be interrupted with Ctrl+C (saves partial results)

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

### "Connection refused" or "Connection timeout"
- **Check Bitcoin Core is running** on Windows host
- **Verify Windows Firewall** allows connections on port 8332:
  ```cmd
  netsh advfirewall firewall add rule name="Bitcoin RPC" dir=in action=allow protocol=TCP localport=8332
  ```
- **Test network connectivity** from VM:
  ```bash
  telnet <HOST_IP_ADDRESS> 8332
  ```
- **Check RPC configuration** in bitcoin.conf
- **Verify host IP address** hasn't changed (DHCP)

### "Unauthorized" or "Authentication failed"
- **Check RPC credentials** match between bitcoin.conf and script
- **Ensure rpcallowip** includes your VM's IP range
- **Test with curl command** from the VM (see above)

### "Method not found"
- **Ensure your Bitcoin Core version supports the RPC methods used**
- **Some methods require `txindex=1`** in bitcoin.conf
- **Restart Bitcoin Core** after adding txindex (requires full reindex)

### "Timeout errors"
- **Your node may be slow** or under heavy load
- **Increase timeout values** in the script (line 76)
- **Reduce BATCH_SIZE** for slower nodes (line 35)

### VirtualBox Network Issues
- **Use "Bridged Adapter"** for simplest setup
- **Or use "NAT" with port forwarding**: VM Settings → Network → Advanced → Port Forwarding
  - Host IP: 127.0.0.1, Host Port: 8332
  - Guest IP: (leave empty), Guest Port: 8332

## Integration with ECC Game

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
