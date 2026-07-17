# Epic 01 — Network Health Monitoring

**Status:** Shipped (`/dashboard`). This is the worked example of how to write a story in this repo: `As a… I want… So that…` + checkable acceptance criteria. AIs should tick `- [ ]` → `- [x]` as criteria are met and link the implementing files.

---

## Story 1.1 — At-a-glance network status

> **As a** Protocol Operations Manager
> **I want** the current best block, finalized block, finality gap, and average block time on one screen
> **So that** I can tell within seconds whether the network is producing and finalizing blocks.

**Acceptance criteria**
- [x] Best/finalized block and finality gap render from `useTelemetry()` summary.
- [x] Average block time shown in seconds.
- [x] Values update live as feed messages arrive (one render per message via the reducer).
- [x] Severity coloring uses `mn-*` tokens and the thresholds in `lib/telemetry/networks.ts` / `lib/health/health.ts`.

_Implemented in:_ `components/dashboard/*`, `lib/health/health.ts`.

## Story 1.2 — Severity alerts with runbook links

> **As an** on-call operator
> **I want** active alerts (low validator count, finality gap, block time, isolated peers) with a link to the matching runbook
> **So that** I can go from "something's wrong" to "here's the procedure" in one click.

**Acceptance criteria**
- [x] `buildAlerts()` derives alerts purely from nodes + summary + network.
- [x] Each alert shows severity (ok/warning/critical) and message.
- [x] Alerts deep-link to `/runbooks/<slug>` where one exists.
- [x] Validator-count severity is network-aware: derived from each network's expected set and the GRANDPA 2/3 finality floor (`floor(2N/3)+1`) — warning at the floor, critical below it; networks with no fixed set are not count-judged. Finality gap ≥4/≥7; block time >10s/>30s; peers below target / 0.

## Story 1.3 — Per-node tables with detail

> **As an** operator
> **I want** validator/gateway/boot-node tables with a detail drawer
> **So that** I can inspect a specific node's peers, version, location, and blocks.

**Acceptance criteria**
- [x] Nodes grouped by type; columns configurable and persisted to `localStorage`. A **Version** column (reported client version) is shown by default alongside peers/blocks/gap.
- [x] Clicking a row opens a detail drawer (network, blocks, software, system, location, attestation).
- [x] Peer count and finality gap colored by severity.

---

## Template for new stories

```md
## Story X.Y — <short title>
> As a <persona> I want <capability> So that <value>.

**Acceptance criteria**
- [ ] <observable, testable condition>
- [ ] <…>

_Notes:_ edge cases, OUT-of-scope, data caveats (label modeled/approx/session-scoped).
_Implemented in:_ <paths once built>
```
