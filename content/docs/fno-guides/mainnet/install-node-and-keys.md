# Install Midnight Node and Generate Validator Keys

This documentation describes how to set up a Midnight node, generate the necessary validator keys, and prepare your registration files for the Midnight protocol.

## 1. Install the Midnight node

The Midnight node is the core client for the Midnight protocol. Follow these steps to prepare your environment and install the binary.

### 1.1 Prepare directories

Create the following directory structure to organize your data and configuration files:

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

Midnight utilizes a Substrate-based architecture with hybrid consensus. The following table describes the keys required for a validator node:

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

Execute these commands from your home directory. Ensure the `res` directory is present in your current path.

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

The network key defines your **PeerID**, which allows other nodes to identify and connect to you on the P2P network.

```bash
NETWORK_DIR="$HOME/data/chains/midnight/network"
mkdir -p "$NETWORK_DIR"
chmod 700 "$NETWORK_DIR"

midnight-node key generate-node-key --file "$NETWORK_DIR/secret_ed25519"
```

To view your unique PeerID, run:

```bash
midnight-node key inspect-node-key --file "$NETWORK_DIR/secret_ed25519"
```

## 3. Configure the keystore

After generating the secrets, you must "inject" them into the node's local keystore so the Midnight service can access them at runtime.

1. **Install dependencies:**

    ```bash
    sudo apt-get install jq -y
    ```

2. **Initialize the keystore path:**

    ```bash
    KEYSTORE_PATH="$HOME/data/chains/midnight/keystore"
    mkdir -p "$KEYSTORE_PATH"
    ```

3. **Insert the keys:**

    ```bash
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

To participate in block production, you must share your **public keys** with the governance authority for "allow-listing."

### 4.1 Create the registration file

This script extracts your public keys from the JSON files generated in Step 2.1 and formats them for the registration process.

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

Confirm the file contains the correct hexadecimal public keys:

```bash
cat "$OUTPUT_FILE"
```

The resulting JSON file acts as your "Validator Application." Once the governance authority adds these keys to the network configuration, your node will be authorized to produce blocks.

## Best practices for secret management

For production environments, avoid storing secrets in plain-text JSON files on the server. Consider the following:

- **Restricted Permissions:** Use `chmod 600` on all key files.
- **Systemd Credential Loading:** Use `LoadCredential=` to inject secrets into the service at runtime.
- **Secrets Managers:** Integrate with tools like **HashiCorp Vault**, **AWS Secrets Manager**, or **Azure Key Vault** to handle dynamic injection and rotation.
