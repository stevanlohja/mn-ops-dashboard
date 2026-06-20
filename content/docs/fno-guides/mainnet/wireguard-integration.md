# WireGuard Integration

This guide outlines the process for integrating your node into the **Midnight Mainnet's trusted overlay** using WireGuard. This is a secure, point-to-point network required for validator communication at this stage of the Midnight Mainnet.

:::warning

Before you begin, make sure you've configured a static IP address.

:::
## 1. Install WireGuard (Version v1.0.20250521)

Midnight requires a specific version of the WireGuard tools. You will use `make` and `gcc` (installed in your prerequisites step) to build it from source.

```bash
sudo apt update && sudo apt install -y \
    git \
    build-essential \
    pkg-config \
    libelf-dev \
    linux-headers-$(uname -r)

# Define version and create workspace
WIREGUARD_TOOLS_VERSION="v1.0.20250521"
WORKDIR="$(mktemp -d)"

# Clone and build
git clone https://git.zx2c4.com/wireguard-tools "$WORKDIR/wireguard-tools"
cd "$WORKDIR/wireguard-tools"
git checkout "$WIREGUARD_TOOLS_VERSION"
make -C src && sudo make -C src install

# Verify installation
wg --version
```

## 2. Generate Identity Keys

You must generate two types of identities: one for the encrypted tunnel (WireGuard) and one for the P2P network (Substrate).

**2.1 WireGuard Keypair (Tunnel Identity)**

```bash
# Secure the directory
umask 077

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey
```

- **`privatekey`**: Stay on your server.
- **`publickey`**: Sent to Midnight Foundation to authorize your connection.

**2.2 Substrate Network Key (Node Identity)**

:::info

You should have already generated a network key in the previous step [Install Midnight Node and Generate Validator Keys](/docs/fno-guides/mainnet/install-node-and-keys).

```bash
midnight-node key inspect-node-key --file "$NETWORK_DIR/secret_ed25519"
```

:::
If you haven't already, generate your node's network key, then inspect it to retrieve your **Peer ID**.

```bash
# 1. Set your network variable (preview, preprod, or mainnet)
NETWORK="mainnet"

# 2. Define the key directory
NETWORK_DIR="$HOME/data/chains/midnight_${NETWORK}/network"
mkdir -p "$NETWORK_DIR"

# 3. Generate the key file
midnight-node key generate-node-key --file "$NETWORK_DIR/secret_ed25519"

# 4. Inspect the file to retrieve your Peer ID
midnight-node key inspect-node-key --file "$NETWORK_DIR/secret_ed25519"
```

## 3. Exchange and Configure

### 3.1 Information to Send to Midnight Foundation

Provide the following to the Midnight Foundation to receive your assignment:

- **Public Key**: Your generated `publickey`.
- **Public IP**: Your public `IP:Port`.
- **Peer ID**: Your node's network Peer ID.

Submit this information using the following form:

### 3.2 Create the Configuration

Once you receive your **assigned overlay IP** and **peer details**, create `/etc/wireguard/wg0.conf`:

```bash
[Interface]
Address = <assigned_overlay_ip>/32
PrivateKey = <your_wireguard_private_key>
ListenPort = 51820
MTU = 1420

[Peer] # Add an entry for each validator peer provided
PublicKey = <validator_wg_public_key>
Endpoint = <validator_public_ip>:51820
AllowedIPs = <validator_overlay_ip>/32
PersistentKeepalive = 25
```

## 4. Enable and Verify the Overlay

Establish the tunnel and confirm it is passing traffic correctly.

```bash
# Start and enable the tunnel service
sudo systemctl enable --now wg-quick@wg0

# Verify recent handshakes and data transfer
sudo wg show
```

**Connectivity Checklist:**

- **Latest Handshake**: Should be recent (e.g., "Handshake: 15 seconds ago").
- **Transfer**: `Received` data must be greater than **0 B**.
- **Ping Test**: Run `ping <validator_overlay_ip>` to confirm the internal route is active.
