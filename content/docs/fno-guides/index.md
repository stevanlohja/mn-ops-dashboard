# FNO Guides

Operator onboarding for running a Midnight validator. Two environments are
supported, each with its own end-to-end track. **Pick the environment you are
deploying for and follow that track in order** — do not mix steps between them.

:::warning[Preprod and Mainnet are different]

- **Mainnet** validators join a WireGuard **guarded overlay** and launch with
  `--reserved-only` plus a fixed `--reserved-nodes` peer list. Mainnet also has
  stricter region and hardware requirements (EU region, avoid GCP).
- **Preprod** uses **standard peer discovery** — no overlay, no reserved-node
  flags — and has lighter hardware requirements.

:::
## Choose your environment

- [**Preprod track**](/docs/fno-guides/preprod) — testnet onboarding for validating on Preprod.
- [**Mainnet track**](/docs/fno-guides/mainnet) — production onboarding for validating on Mainnet.

## The onboarding sequence

Both tracks follow the same five steps. Complete them in order:

1. **Requirements** — provision hardware and OS.
2. **Install Node & Generate Keys** — install `midnight-node` and create validator keys.
3. **Cardano Availability** — stand up `cardano-node` + `cardano-db-sync` + PostgreSQL.
4. **WireGuard Integration** — join the trusted overlay (Mainnet).
5. **Run Validator** — launch the node and confirm block production.

## Reference

- [Preprod WireGuard overlay (live allocation)](/docs/fno-guides/preprod-wireguard-onboarding) —
  the repo-specific overlay address allocation and peer list for the live preprod
  overlay.
