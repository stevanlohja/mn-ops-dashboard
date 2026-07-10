# Project Purpose

## Elevator pitch

PO Dash 2.0 is the **Midnight Foundation's internal operations dashboard** for monitoring the health of the Midnight network and its Federated Node Operators (FNOs). It reads the public Substrate telemetry feed live in the browser and turns it into network health, per-validator attestation, exportable reports, incident diagnostics, and an at-a-glance executive/board view. It runs entirely client-side — no backend, no database, no API keys — so it deploys anywhere static and exposes no secrets.

## North star

> Give the Protocol Operations team and leadership a **truthful, real-time, single-pane** view of network health and validator behavior — fast enough to catch a consensus or finality problem before it escalates, and honest about the limits of what telemetry can prove.

## Primary users / personas

- **Protocol Operations Manager** (primary): drives coordinated changes, watches finality/consensus, generates reports, fields FNO issues.
- **MNF leadership / executives**: want a glanceable "is the network healthy?" read — the Executive overview and Board (kiosk) mode.
- **Ops / DevRel teammates**: triage incidents via the diagnostic tree and runbooks, reference FNO docs.

The audience is technical and time-pressured. Lead with signal; never bury the one number that matters.

## Networks

Mainnet, Preprod, Preview — switchable in the nav. Thresholds (expected validator count, peer target) are parameterized per network in `lib/telemetry/networks.ts`.

## In scope

- Live network health (best/finalized block, finality gap, block time, per-node tables, alerts).
- Validator attestation (authorship share, finality lag, propagation, uptime, composite score) — as an **observability heuristic**, not cryptographic proof.
- Report generation (Markdown / Notifi-safe plain text / JSON / CSV) from a frozen snapshot.
- Discord webhook alerting (browser → webhook, edge-triggered).
- Incident diagnostic tree + rendered FNO runbooks + vendored ops docs.
- Executive overview and full-screen Board (kiosk) mode.
- Coordinated-change status board (`/network-change`) and a forward-looking roadmap calendar (`/roadmap`) — manually-maintained, clearly-labeled planning views (not telemetry history), with the change board projected onto the calendar automatically.
- Dark/light theming on the Midnight brand palette.

## OUT of scope (guardrails against creep)

- **No backend, server state, database, or authenticated API.** If a feature needs one, it does not belong here — raise it instead of adding a server.
- **No historical/time-series persistence.** Telemetry is session-scoped (only capped in-memory buffers). Do not imply multi-day trends without an explicit, labeled persistence design.
- **No secrets in the client.** No private keys, no privileged API tokens.
- **Not the source of truth for ops data.** Operator identities, contracts, IPs, and runbook *content* live in the `midnight-network-ops` repo / internal systems. This app *visualizes* and *links*, it doesn't own that data.
- **Attestation is not consensus-grade proof.** It attributes a block to the first node to report a height — good for spotting silent stoppage, not for slashing/rewards decisions.

## Definition of success

A teammate can open the dashboard and, within seconds, know whether the network is healthy, which validators are misbehaving, and where the matching runbook is — and can export a leadership-ready snapshot without touching a terminal.
