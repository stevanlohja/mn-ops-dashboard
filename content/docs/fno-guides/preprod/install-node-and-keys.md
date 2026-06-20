# Install Midnight Node and Generate Validator Keys (Preprod)

This documentation describes how to set up a Midnight node on **Preprod**, generate the necessary validator keys, and prepare your registration files for the Midnight protocol.

:::info

This guide is identical to the Mainnet equivalent except where noted. The `NETWORK` variable is set to `preprod` throughout.

:::
## 1. Install the Midnight node

### 1.1 Prepare directories

```bash
mkdir -p ~/data ~/res ~/.local/bin
```

- **`~/data`**: Stores the node database and base path.
- **`~/res`**: Stores chain configuration files.
- **`~/.local/bin`**: Stores executable binaries.

### 1.2 Download and install the binary

Always verify the latest release tag from the official [Midnight Node repository](https://github.com/midnightntwrk/midnight-node/releases).

1. Download and extract the node:

    ```bash
    mkdir -p ~/tmp && cd ~/tmp
    curl -L -O https://github.com/midnightntwrk/midnight-node/releases/download/node-0.22.2/midnight-node-0.22.2-linux-amd64.tar.gz
    tar -xvzf midnight-node-0.22.2-linux-amd64.tar.gz
    ```

2. Move the files to their permanent locations:

    ```bash
    mv ~/tmp/midnight-node ~/.local/bin/
    mv ~/tmp/res ~/res
    ```

3. Refresh your shell environment:

    ```bash
    source ~/.bashrc
    ```

## 2. Manage validator keys

:::warning

These keys grant control over node identity, block production, finality, and cross-chain operations. Compromise of these keys can lead to loss of control over your node.

:::
### Key types and roles

| **Key Name** | **Scheme** | **Type** | **Purpose** |
| --- | --- | --- | --- |
| **Node Key** | `ed25519` | Network | Persistent network identity (PeerID) for P2P communication. |
| **Aura Key** | `sr25519` | `aura` | Block production consensus (proposing new blocks). |
| **Grandpa Key** | `ed25519` | `gran` | Block finality (voting on the irreversible chain). |
| **Cross-Chain** | `ecdsa` | `beef` | Secure interaction and bridging with the Cardano parent chain. |

:::info

Key generation is only required if you are running a **validator (block producer)**. Non-validator relay nodes do not require session keys.

:::
### 2.1 Generate session keys

```bash
cd ~

# Generate AURA (sr25519)
midnight-node key generate --scheme sr25519 --output-type json > aura.json

# Generate GRANDPA (ed25519)
midnight-node key generate --scheme ed25519 --output-type json > grandpa.json

# Generate CROSS-CHAIN (ecdsa)
midnight-node key generate --scheme ecdsa --output-type json > cross_chain.json
```

**Back up these JSON files immediately in a secure, offline location.**

### 2.2 Generate the network key

```bash
NETWORK="preprod"
NETWORK_DIR="$HOME/data/chains/midnight_${NETWORK}/network"
mkdir -p "$NETWORK_DIR"
chmod 700 "$NETWORK_DIR"

midnight-node key generate-node-key --file "$NETWORK_DIR/secret_ed25519"
```

To view your unique PeerID:

```bash
midnight-node key inspect-node-key --file "$NETWORK_DIR/secret_ed25519"
```

## 3. Configure the keystore

```bash
sudo apt-get install jq -y

KEYSTORE_PATH="$HOME/data/chains/midnight_preprod/keystore"
mkdir -p "$KEYSTORE_PATH"

# Insert AURA key
midnight-node key insert \
  --keystore-path "$KEYSTORE_PATH" \
  --scheme sr25519 \
  --key-type aura \
  --suri "$(jq -r .secretPhrase aura.json)"

# Insert GRANDPA key
midnight-node key insert \
  --keystore-path "$KEYSTORE_PATH" \
  --scheme ed25519 \
  --key-type gran \
  --suri "$(jq -r .secretPhrase grandpa.json)"

# Insert Cross-Chain key
midnight-node key insert \
  --keystore-path "$KEYSTORE_PATH" \
  --scheme ecdsa \
  --key-type beef \
  --suri "$(jq -r .secretPhrase cross_chain.json)"
```

## 4. Register as a Federated Node Operator

### 4.1 Create the registration file

```bash
OUTPUT_FILE="$HOME/partner-chains-public-keys.json"

cat <<EOF > "$OUTPUT_FILE"
{
  "partner_chains_key": "$(jq -r .publicKey cross_chain.json)",
  "keys": {
    "aura": "$(jq -r .publicKey aura.json)",
    "crch": "$(jq -r .publicKey cross_chain.json)",
    "gran": "$(jq -r .publicKey grandpa.json)"
  }
}
EOF
```

### 4.2 Verify the output

```bash
cat "$OUTPUT_FILE"
```

The resulting JSON file is your Validator Application. Share it with the Midnight Foundation to be authorized for block production on Preprod.

## Best practices for secret management

- **Restricted Permissions:** Use `chmod 600` on all key files.
- **Systemd Credential Loading:** Use `LoadCredential=` to inject secrets into the service at runtime.
- **Secrets Managers:** Integrate with tools like **HashiCorp Vault**, **AWS Secrets Manager**, or **Azure Key Vault** for dynamic injection and rotation.
