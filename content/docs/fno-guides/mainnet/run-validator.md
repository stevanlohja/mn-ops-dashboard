# Run Midnight Node in Validator Mode

This guide describes how to configure environment variables, perform a test launch, and deploy the Midnight node as a system service.

:::note[Checklist]

At this point you have:

1. Fully synced Cardano availability services ([Set Up Cardano Mainnet Availability](/docs/fno-guides/mainnet/cardano-availability)).
2. Generated and shared your public validator keys with the Midnight Foundation ([Install Midnight Node and Generate Validator Keys](/docs/fno-guides/mainnet/install-node-and-keys)).
3. Integrated with the guarded overlay network and verified handshakes with peers ([WireGuard Integration](/docs/fno-guides/mainnet/wireguard-integration)).

:::
## 1. Prepare the environment configuration

Before starting the node, consolidate your secrets and connection strings into a `.env` file. The node uses this file for both interactive testing and the system service.

:::info

This guide uses a `.env` file for demonstration. For production environments, use a secure secret management solution such as HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault.

:::
### 1.1 Verify connection variables

Every parameter in your `.env` file must be accurate. If a value is incorrect, the node will fail to connect to the Cardano database or fail to identify itself on the Midnight network.

1. **Retrieve the PostgreSQL password:**

    Extract the password from your existing `.pgpass` file:

    ```bash
    export POSTGRES_PASSWORD=$(cut -d: -f5 ~/.pgpass)
    echo $POSTGRES_PASSWORD
    ```

2. **Verify database connectivity:**

    Confirm that the database is accessible and the credentials are valid:

    ```bash
    psql -h localhost -p 5432 -U midnight -d cexplorer -c "SELECT 'PostgreSQL Connection Verified' AS status;"
    ```

    If successful, the command returns a table showing **PostgreSQL Connection Verified**. If the connection is refused, verify that PostgreSQL is running on port 5432.

### 1.2 Create the .env file

Create a file named `.env` in your home directory and populate it with your specific configuration values.

```bash
# PostgreSQL connection
POSTGRES_HOST='localhost'
POSTGRES_DB='cexplorer'
POSTGRES_PORT=5432
POSTGRES_USER='midnight'
POSTGRES_PASSWORD='YOUR_POSTGRES_PASSWORD'
DB_SYNC_POSTGRES_CONNECTION_STRING=postgresql://midnight:YOUR_POSTGRES_PASSWORD@localhost:5432/cexplorer

# Cardano Mainnet params
CARDANO_SECURITY_PARAMETER='2160'
BLOCK_STABILITY_MARGIN=30

# Push to public telemetry
PROMETHEUS_PUSH_ENDPOINT='https://telemetry.shielded.tools/api/v1/receive'

# Midnight node settings
CFG_PRESET=mainnet
NODE_NAME='YOUR_NODE_NAME'

# Absolute path to network and keystore files
NODE_KEY_FILE='/home/midnight/data/chains/midnight/network/secret_ed25519'
AURA_SEED_FILE='/home/midnight/keystore/61757261...'
GRANDPA_SEED_FILE='/home/midnight/keystore/6265656...'
CROSS_CHAIN_SEED_FILE='/home/midnight/keystore/6772616...'
```

## 2. Perform an interactive test launch

Test the node interactively to verify the configuration before moving to a background service.

:::info

The guarded overlay requires peers explicitly defined such as `--reserved-nodes /ip4/100.112.8.220/tcp/30333/ws/p2p/12D3KooWNPSrRuwPGvGE2MM5iR7nxPZ1p6NYwdSRMwMSxf9G9VTV`. You must use the exact peers as written below.

:::
### 2.1 Load variables and start the node

1. **Load the environment variables:**

    ```bash
    source ~/.env
    ```

2. **Launch the node:**

    The following command connects to the mainnet overlay network.

    ```bash
    midnight-node \
        --chain /home/midnight/res/mainnet/chain-spec-raw.json \
        --base-path /home/midnight/data \
        --telemetry-url 'wss://telemetry.shielded.tools./submit 1' \
        --validator \
        --pool-limit 35 \
        --name ${NODE_NAME} \
        --rpc-port 9933 \
        --reserved-only \
        --reserved-nodes /ip4/100.112.8.220/tcp/30333/ws/p2p/12D3KooWNPSrRuwPGvGE2MM5iR7nxPZ1p6NYwdSRMwMSxf9G9VTV \
        --reserved-nodes /ip4/100.112.8.221/tcp/30333/ws/p2p/12D3KooWAAPDN3QLokjY2veVvms4KXqE925iKFxHUZdGw2zxex1h \
        --reserved-nodes /ip4/100.112.0.220/tcp/30333/ws/p2p/12D3KooWEhzKtv25C6Hv7F9Jr4PjHAz5auJX87FKgGSy1N1QumoM \
        --reserved-nodes /ip4/100.112.0.221/tcp/30333/ws/p2p/12D3KooWGqTQqUGjGBMwbWTzyC8zKueJGifPta2fi6B2CPmm2sdU \
        --reserved-nodes /ip4/100.112.8.10/tcp/30333/p2p/12D3KooWHrevk1nR3HQ5zDoUbGNKTyzsT5H9yKRBWqqADxcfc9tz \
        --reserved-nodes /ip4/100.112.8.100/tcp/30333/p2p/12D3KooWGWobFVMUHiViD8bL7ddu5ChvJpmGWe8Cfu2mTPrpCHwF \
        --reserved-nodes /ip4/100.112.8.101/tcp/30333/p2p/12D3KooWQs68Cwvp7GTZYUDaCwoXQ6YQH9vRtpdTWzwC4cbwnnX3 \
        --reserved-nodes /ip4/100.112.8.102/tcp/30333/p2p/12D3KooWGgRkPPoM1AV7iG7yxGDWW8JW2m85XWaEJNNrcUgpTBuD \
        --reserved-nodes /ip4/100.112.8.103/tcp/30333/p2p/12D3KooWPCa59NHxT97iVWW237haUYt4pYZgKuaNMiMbggMrSHYS \
        --reserved-nodes /ip4/100.112.8.104/tcp/30333/p2p/12D3KooWAfLfdHCiqTDUGUKiyAPsGLmceXizj6LNYgLBDPJBP5nT \
        --reserved-nodes /ip4/100.112.8.105/tcp/30333/p2p/12D3KooWRh4f9WxsbeUkxEupvsRorDpmbMTcKJc66jHVoBCY7mKL \
        --reserved-nodes /ip4/100.112.8.106/tcp/30333/p2p/12D3KooWR538ww4UuWRVJBNiX399nwxEkkwFR9oTVTP7GreVt9hC \
        --reserved-nodes /ip4/100.112.8.107/tcp/30333/p2p/12D3KooWRJBMMkK9LQKapEGhBkuc2eCo1XWEFZYEqurktGvPxPeB \
        --reserved-nodes /ip4/100.112.8.200/tcp/30333/ws/p2p/12D3KooWEU4shU3AsHNP6jeqk9NRM8x6r4CeiYW7yasuz6GPRvd2 \
        --reserved-nodes /ip4/100.112.8.201/tcp/30333/ws/p2p/12D3KooWRm2MHbHwWpbG4ukShVmD4jtD62b1yqv53gdESVF4HpCj \
        --reserved-nodes /ip4/100.112.0.10/tcp/30333/p2p/12D3KooWHbUx48SH528xJibJsaiaE5LQareVe4zUF85uxvA6tQLd \
        --reserved-nodes /ip4/100.112.0.200/tcp/30333/ws/p2p/12D3KooWJH3LMyRSFUC6VhM5bsT31PDAiX7HihkvRUpA2VFVMiXg \
        --reserved-nodes /ip4/100.112.0.201/tcp/30333/ws/p2p/12D3KooWSQ4TMAQ3X26V2T4aubFNKSc2x97LzqT7Wq1jT5jxsp9p \
        --reserved-nodes /ip4/100.112.8.108/tcp/30333/p2p/12D3KooWLPC5hmMF6YzpthUe1UzQmfNFiF5hVU72ABGUZ24puZ9E \
        --reserved-nodes /ip4/100.112.8.109/tcp/30333/p2p/12D3KooWL8p86z3LA8JvR1Agb8VfTbYZD1yoTP7dcCqikCqZiQgm \
        --reserved-nodes /ip4/100.112.8.110/tcp/30333/p2p/12D3KooWDavLZDsAvdD7oDP6izt7U3iMzNXcmEFCzzXDbYSaPCSV
    ```

    *(Note: Additional reserved nodes may be required based on current network topology.)*

### 2.2 Verify node output

Monitor the terminal for the following indicators:

- **Postgres connection established:** Confirms database settings are correct.
- **Peers:** If the peer count remains at 0, check your firewall settings for port **30333**.
- **Syncing:** The "Best: #" value should increment as the node pulls blocks from the network.

## 3. Deploy as a systemd service

Once the interactive test is successful, configure the node to run as a background service.

1. **Create the service file:**

    ```bash
    sudo nano /etc/systemd/system/midnight-node.service
    ```

2. **Paste the following configuration:**

    *(Ensure the `ExecStart` path matches your binary location, typically `/home/midnight/.local/bin/midnight-node`.)*

```toml
[Unit]
Description=Midnight Protocol Node (Guarded Overlay FNO)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=midnight
Group=midnight
Type=simple
WorkingDirectory=/home/midnight
EnvironmentFile=/home/midnight/.env

# The ExecStart command handles the guarded overlay via --reserved-nodes
ExecStart=/home/midnight/.local/bin/midnight-node \
    --chain /home/midnight/res/mainnet/chain-spec-raw.json \
    --base-path /home/midnight/data \
    --telemetry-url 'wss://telemetry.shielded.tools./submit 1' \
    --validator \
    --pool-limit 35 \
    --name ${NODE_NAME} \
    --rpc-port 9933 \
    --reserved-only \
    --reserved-nodes /ip4/100.112.8.220/tcp/30333/ws/p2p/12D3KooWNPSrRuwPGvGE2MM5iR7nxPZ1p6NYwdSRMwMSxf9G9VTV \
    --reserved-nodes /ip4/100.112.8.221/tcp/30333/ws/p2p/12D3KooWAAPDN3QLokjY2veVvms4KXqE925iKFxHUZdGw2zxex1h \
    --reserved-nodes /ip4/100.112.0.220/tcp/30333/ws/p2p/12D3KooWEhzKtv25C6Hv7F9Jr4PjHAz5auJX87FKgGSy1N1QumoM \
    --reserved-nodes /ip4/100.112.0.221/tcp/30333/ws/p2p/12D3KooWGqTQqUGjGBMwbWTzyC8zKueJGifPta2fi6B2CPmm2sdU \
    --reserved-nodes /ip4/100.112.8.10/tcp/30333/p2p/12D3KooWHrevk1nR3HQ5zDoUbGNKTyzsT5H9yKRBWqqADxcfc9tz \
    --reserved-nodes /ip4/100.112.8.100/tcp/30333/p2p/12D3KooWGWobFVMUHiViD8bL7ddu5ChvJpmGWe8Cfu2mTPrpCHwF \
    --reserved-nodes /ip4/100.112.8.101/tcp/30333/p2p/12D3KooWQs68Cwvp7GTZYUDaCwoXQ6YQH9vRtpdTWzwC4cbwnnX3 \
    --reserved-nodes /ip4/100.112.8.102/tcp/30333/p2p/12D3KooWGgRkPPoM1AV7iG7yxGDWW8JW2m85XWaEJNNrcUgpTBuD \
    --reserved-nodes /ip4/100.112.8.103/tcp/30333/p2p/12D3KooWPCa59NHxT97iVWW237haUYt4pYZgKuaNMiMbggMrSHYS \
    --reserved-nodes /ip4/100.112.8.104/tcp/30333/p2p/12D3KooWAfLfdHCiqTDUGUKiyAPsGLmceXizj6LNYgLBDPJBP5nT \
    --reserved-nodes /ip4/100.112.8.105/tcp/30333/p2p/12D3KooWRh4f9WxsbeUkxEupvsRorDpmbMTcKJc66jHVoBCY7mKL \
    --reserved-nodes /ip4/100.112.8.106/tcp/30333/p2p/12D3KooWR538ww4UuWRVJBNiX399nwxEkkwFR9oTVTP7GreVt9hC \
    --reserved-nodes /ip4/100.112.8.107/tcp/30333/p2p/12D3KooWRJBMMkK9LQKapEGhBkuc2eCo1XWEFZYEqurktGvPxPeB \
    --reserved-nodes /ip4/100.112.8.200/tcp/30333/ws/p2p/12D3KooWEU4shU3AsHNP6jeqk9NRM8x6r4CeiYW7yasuz6GPRvd2 \
    --reserved-nodes /ip4/100.112.8.201/tcp/30333/ws/p2p/12D3KooWRm2MHbHwWpbG4ukShVmD4jtD62b1yqv53gdESVF4HpCj \
    --reserved-nodes /ip4/100.112.0.10/tcp/30333/p2p/12D3KooWHbUx48SH528xJibJsaiaE5LQareVe4zUF85uxvA6tQLd \
    --reserved-nodes /ip4/100.112.0.200/tcp/30333/ws/p2p/12D3KooWJH3LMyRSFUC6VhM5bsT31PDAiX7HihkvRUpA2VFVMiXg \
    --reserved-nodes /ip4/100.112.0.201/tcp/30333/ws/p2p/12D3KooWSQ4TMAQ3X26V2T4aubFNKSc2x97LzqT7Wq1jT5jxsp9p \
    --reserved-nodes /ip4/100.112.8.108/tcp/30333/p2p/12D3KooWLPC5hmMF6YzpthUe1UzQmfNFiF5hVU72ABGUZ24puZ9E \
    --reserved-nodes /ip4/100.112.8.109/tcp/30333/p2p/12D3KooWL8p86z3LA8JvR1Agb8VfTbYZD1yoTP7dcCqikCqZiQgm \
    --reserved-nodes /ip4/100.112.8.110/tcp/30333/p2p/12D3KooWDavLZDsAvdD7oDP6izt7U3iMzNXcmEFCzzXDbYSaPCSV

Restart=on-failure
RestartSec=10
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

3. **Enable and start the service:**

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable midnight-node
    sudo systemctl start midnight-node
    ```

## 4. Verify block production

### 4.1 Check session keys

Search the service logs to confirm your keys are loaded:

```bash
journalctl -u midnight-node -f
```

Look for these specific log entries at the node startup logs:

- `AURA pubkey: ...`
- `GRANDPA pubkey: ...`
- `CROSS_CHAIN pubkey: ...`

:::info

If these lines are missing, your node has no keys loaded and cannot participate in validation.

:::
### 4.2 Understand the n+2 epoch rule

Validator nodes do not produce blocks immediately. Midnight follows an **n+2 transition cycle**:

1. **Epoch n:** You are added to the whitelist. Your node remains passive.
2. **Epoch n+1:** Your node is queued for the next session. Still passive.
3. **Epoch n+2:** Your node joins the validator set and begins block production.

### 4.3 Confirm block authoring

When your node begins producing blocks, you will see logs similar to these:

```
✨ Imported #12345 (0xabc1…def2)

🏆 Prepared block for proposing at #12346

🔖 Pre-sealed block for proposal at #12346

✨ Successfully proposed block #12346 (0xdef3…ghi4)
```

If you see **Successfully proposed block**, your node is actively contributing to the network consensus.
