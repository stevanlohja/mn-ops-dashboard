# Mainnet Onboarding

:::warning[You are on the Mainnet track]

Mainnet is the production network. Key differences from Preprod:

- Nodes must be deployed in the **EU region**; **avoid GCP** for decentralization.
- The validator joins a WireGuard **guarded overlay** and launches with
  `--reserved-only` and a fixed `--reserved-nodes` peer list.
- Hardware requirements are higher (see step 1).

For testnet onboarding, use the [Preprod track](/docs/fno-guides/preprod) instead.

:::
Complete these steps in order:

1. [**Requirements**](/docs/fno-guides/mainnet/requirements) — provision EU-region hardware and a supported OS.
2. [**Install Node & Generate Keys**](/docs/fno-guides/mainnet/install-node-and-keys) — install
   `midnight-node` and generate your validator and network keys.
3. [**Cardano Availability**](/docs/fno-guides/mainnet/cardano-availability) — deploy `cardano-node`,
   `cardano-db-sync`, and PostgreSQL synced to Cardano Mainnet.
4. [**WireGuard Integration**](/docs/fno-guides/mainnet/wireguard-integration) — join the trusted overlay
   and verify handshakes with peers.
5. [**Run Validator**](/docs/fno-guides/mainnet/run-validator) — launch the node with the reserved-node
   peer list and confirm block production.

## Before you go live

- Cardano Mainnet availability services are fully synced.
- Your public validator keys are generated and shared with the Midnight Foundation.
- You have joined the guarded overlay and verified WireGuard handshakes with peers.
