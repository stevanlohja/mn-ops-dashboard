# FNO Guides

Operator onboarding for running a Midnight validator. Two environments are
supported, each with its own end-to-end track. **Pick the environment you are
deploying for and follow that track in order** — do not mix steps between them.

:::warning[Preprod and Mainnet are different]

- **Mainnet** is the production network, with stricter region and hardware
  requirements (EU region, avoid GCP).
- **Preprod** is the testnet, with lighter hardware requirements.

Both use standard peer discovery — there is no overlay network and no
reserved-node flags.

:::
## Choose your environment

- [**Preprod track**](/docs/fno-guides/preprod) — testnet onboarding for validating on Preprod.
- [**Mainnet track**](/docs/fno-guides/mainnet) — production onboarding for validating on Mainnet.

## The onboarding sequence

Both tracks follow the same four steps. Complete them in order:

1. **Requirements** — provision hardware and OS.
2. **Install Node & Generate Keys** — install `midnight-node` and create validator keys.
3. **Cardano Availability** — stand up `cardano-node` + `cardano-db-sync` + PostgreSQL.
4. **Run Validator** — launch the node and confirm block production.
