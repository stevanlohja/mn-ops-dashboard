# Midnight Network Ops Docs

Operational documentation for the
[`midnightntwrk/midnight-network-ops`](https://github.com/midnightntwrk/midnight-network-ops)
repository: the canonical coordination surface for Federated Node Operators (FNOs)
and Stake Pool Operators (SPOs) — guides, architecture decisions, and operational
procedures. This site renders the markdown under `docs/`; configs, runbooks, and
release records live elsewhere in the repository.

## Sections

- [**FNO Guides**](/docs/fno-guides) — operator onboarding for Preprod and
  Mainnet: hardware requirements, node install, Cardano availability, WireGuard,
  and running a validator.
- [**Architecture**](/docs/architecture) — protocol design and network topology,
  including consensus and block production.
- [**Architecture Decision Records**](/docs/adr/README) — recorded technical decisions
  and the ADR template.

## Coming soon

The following sections are placeholders pending content:

- **SPO Guides** — Stake Pool Operator procedures.
- **Terraform** — infrastructure-as-code documentation.

## Running this site locally

```sh
python3 -m venv .venv-docs
source .venv-docs/bin/activate
pip install -r requirements-docs.txt
mkdocs serve   # http://127.0.0.1:8000, live reload
```
