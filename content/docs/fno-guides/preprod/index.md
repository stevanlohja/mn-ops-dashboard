# Preprod Onboarding

:::info[You are on the Preprod track]

Preprod is the Midnight testnet. The node connects through **standard peer
discovery** — there is no WireGuard guarded overlay and no `--reserved-nodes`
flags. Hardware requirements are lighter than Mainnet. For production
onboarding, use the [Mainnet track](/docs/fno-guides/mainnet) instead.

:::
Complete these steps in order:

1. [**Requirements**](/docs/fno-guides/preprod/requirements) — provision hardware and a supported OS.
2. [**Install Node & Generate Keys**](/docs/fno-guides/preprod/install-node-and-keys) — install
   `midnight-node` and generate your validator and network keys.
3. [**Cardano Availability**](/docs/fno-guides/preprod/cardano-availability) — deploy `cardano-node`,
   `cardano-db-sync`, and PostgreSQL synced to Cardano Preprod.
4. [**WireGuard Integration**](/docs/fno-guides/preprod/wireguard-integration) — generate WireGuard and
   network identities and exchange them with the Midnight Foundation.
5. [**Run Validator**](/docs/fno-guides/preprod/run-validator) — launch the node and confirm block
   production.

## Before you go live

- Cardano Preprod availability services are fully synced.
- Your public validator keys are generated and shared with the Midnight Foundation.
- Your `.env` connection variables verify against the local PostgreSQL database.
