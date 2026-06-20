# Run Midnight Node in Validator Mode (Preprod)

This guide describes how to configure environment variables, perform a test launch, and deploy the Midnight node as a system service on **Preprod**.

:::warning[Preprod vs Mainnet]

Preprod does **not** use the WireGuard guarded overlay. The `--reserved-only` and `--reserved-nodes` flags are not required. The node connects to the Preprod network through standard peer discovery.

:::
:::note[Checklist]

At this point you should have:

1. Fully synced Cardano Preprod availability services ([Set Up Cardano Preprod Availability](/docs/fno-guides/preprod/cardano-availability)).
2. Generated and shared your public validator keys with the Midnight Foundation ([Install Midnight Node and Generate Validator Keys (Preprod)](/docs/fno-guides/preprod/install-node-and-keys)).

:::
## 1. Prepare the environment configuration

:::info

This guide uses a `.env` file for demonstration. For production environments, use a secure secret management solution such as HashiCorp Vault, AWS Secrets Manager, or Azure Key Vault.

:::
### 1.1 Verify connection variables

1. **Retrieve the PostgreSQL password:**

    ```bash
    export POSTGRES_PASSWORD=$(cut -d: -f5 ~/.pgpass)
    echo $POSTGRES_PASSWORD
    ```

2. **Verify database connectivity:**

    ```bash
    psql -h localhost -p 5432 -U midnight -d cexplorer -c "SELECT 'PostgreSQL Connection Verified' AS status;"
    ```

    If successful, the command returns a table showing **PostgreSQL Connection Verified**.

### 1.2 Create the .env file

```bash
# PostgreSQL connection
POSTGRES_HOST='localhost'
POSTGRES_DB='cexplorer'
POSTGRES_PORT=5432
POSTGRES_USER='midnight'
POSTGRES_PASSWORD='YOUR_POSTGRES_PASSWORD'
DB_SYNC_POSTGRES_CONNECTION_STRING=postgresql://midnight:YOUR_POSTGRES_PASSWORD@localhost:5432/cexplorer

# Cardano Preprod params
CARDANO_SECURITY_PARAMETER='432'
BLOCK_STABILITY_MARGIN=30

# Push to public telemetry
PROMETHEUS_PUSH_ENDPOINT='https://telemetry.shielded.tools/api/v1/receive'

# Midnight node settings
CFG_PRESET=preprod
NODE_NAME='YOUR_NODE_NAME'

# Absolute path to network and keystore files
NODE_KEY_FILE='/home/midnight/data/chains/midnight_preprod/network/secret_ed25519'
AURA_SEED_FILE='/home/midnight/keystore/61757261...'
GRANDPA_SEED_FILE='/home/midnight/keystore/6265656...'
CROSS_CHAIN_SEED_FILE='/home/midnight/keystore/6772616...'
```

## 2. Perform an interactive test launch

### 2.1 Load variables and start the node

1. **Load the environment variables:**

    ```bash
    source ~/.env
    ```

2. **Launch the node:**

    On Preprod, the node connects through standard peer discovery — no overlay flags required.

    ```bash
    midnight-node \
        --chain /home/midnight/res/preprod/chain-spec-raw.json \
        --base-path /home/midnight/data \
        --telemetry-url 'wss://telemetry.shielded.tools./submit 1' \
        --validator \
        --pool-limit 35 \
        --name ${NODE_NAME} \
        --rpc-port 9933
    ```

### 2.2 Verify node output

Monitor the terminal for the following indicators:

- **Postgres connection established:** Confirms database settings are correct.
- **Peers:** If the peer count remains at 0, check your firewall settings for port **6000**.
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
Description=Midnight Protocol Node (Preprod FNO)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=midnight
Group=midnight
Type=simple
WorkingDirectory=/home/midnight
EnvironmentFile=/home/midnight/.env

ExecStart=/home/midnight/.local/bin/midnight-node \
    --chain /home/midnight/res/preprod/chain-spec-raw.json \
    --base-path /home/midnight/data \
    --telemetry-url 'wss://telemetry.shielded.tools./submit 1' \
    --validator \
    --pool-limit 35 \
    --name ${NODE_NAME} \
    --rpc-port 9933

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

```bash
journalctl -u midnight-node -f
```

Look for these specific log entries at node startup:

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

If you see **Successfully proposed block**, your node is actively contributing to the Preprod network consensus.
