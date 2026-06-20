---
owner: Midnight Foundation
author: "@stevanlohja"
last_verified: 2026-06-10
volatility: stable
tags: [processes, change-management, upgrade-coordination, fault-tolerance, preprod, mainnet, fno]
source_of_truth: "midnight-network-fno-procedures"
audience: external-fno, internal-sre
depends_on:
  - docs/architecture/consensus-and-block-production.md
  - releases/compatibility-matrix.md
  - releases/reference/version-numbering.md
---

# Network Change Management & Upgrade Specification

**Audience:** Full Node Operators (FNOs) running Midnight validators on Preprod or Mainnet, and Midnight Foundation SRE / Protocol Operations.

**Last updated:** 2026-06-10

**Author:** @stevanlohja

**Owner:** Midnight Foundation

---

## TL;DR

- **Applies to Preprod and Mainnet.** Each environment runs its own permissioned FNO set under the same consensus, so the rules below apply independently to each.
- **Finality needs more than 2/3 of FNOs voting.** The one rule that governs everything: **never have more FNOs in maintenance at once than the `Max offline` value for that environment's current FNO count.**
- **Every change is one of three classes:**
    - **A — Coordinated:** breaking / hard fork / runtime / reset. Whole fleet upgrades in a pre-announced UTC window; a finality pause is planned and accepted.
    - **B — Async / rolling:** non-breaking. Operators upgrade before a deadline, in cohorts sized to `Max offline`, checking finality between cohorts.
    - **C — Emergency:** incident or security driven. Immediate, severity-gated.
- **Posture differs by environment.** Mainnet is conservative (multi-week notice, monthly–quarterly cadence). Preprod moves faster (about a week, bi-weekly–monthly) and is where a change is validated before it reaches Mainnet.
- **Communicate over Discord `#fno-validator-ops` + Notifi channels:** announcement for Class A/B, alert for Class C. Deadlines and windows are always explicit.

---

## Purpose and scope

This specification governs how every coordinated change reaches the Preprod and Mainnet FNO fleets without breaching network finality. It covers node binary upgrades, on-chain runtime upgrades, configuration changes, and the dependency stacks each validator runs (Cardano node, db-sync, Postgres).

It is the governing framework, not a per-change procedure. Individual changes are executed from their own runbooks under [`runbooks/fno/`](https://github.com/midnightntwrk/midnight-network-ops/tree/main/runbooks/fno) (for example, the [Van Rossem hard-fork migration guide](https://github.com/midnightntwrk/midnight-network-ops/blob/main/runbooks/fno/van-rossem-hard-fork-migration.md)). Those runbooks **instantiate** the classes defined here.

This spec does not restate consensus mechanics. Read [Consensus & Block Production](/docs/architecture/consensus-and-block-production) first; everything below depends on it.

---

## Environments

This spec applies to both **Preprod** and **Mainnet**. Both run a permissioned FNO set producing and finalizing blocks under the same consensus (AURA + GRANDPA), so the >2/3 finality constraint and the three change classes apply independently to each environment's own FNO set. What differs is posture — notice, cadence, and risk tolerance.

| Environment | Role | Update cadence | Default notice | Posture |
| --- | --- | --- | --- | --- |
| **Preprod** | Production-like validation; the staging environment a change clears before Mainnet | Bi-weekly to monthly | About a week | Higher risk tolerance; faster cohorts |
| **Mainnet** | Production network | Monthly to quarterly | Multi-week | Conservative; cleared in Preprod first |

Cadence values are from the [compatibility matrix environment notes](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/compatibility-matrix.md#environment-notes). Changes promote **Preview → Preprod → Mainnet**: a Mainnet change should already have cleared Preprod (and the upstream Preview validation), which makes Preprod the cross-environment canary for Mainnet. Preview is an upstream, non-FNO validation environment and is out of scope for this spec.

---

## The fault-tolerance constraint

Finality (GRANDPA) in each environment requires **more than 2/3 of that environment's equal-weight FNOs to be voting at all times**. A "fault" is any node that cannot vote, for any reason: a planned restart counts the same as a crash. The number of operators that may be offline simultaneously before finality is at risk is the `Max offline` value for the live FNO count, given in the [fault-tolerance table](/docs/architecture/consensus-and-block-production#fault-tolerance-by-fno-count). That value **oscillates** as the fleet grows, so it must be read from the table against each environment's current count, not assumed.

:::warning[The operative rule]

No more FNOs may be in maintenance at once than the current `Max offline` value for that environment's FNO count. Every coordinated change must be sequenced to hold this line, except a Class A coordinated window (where a finality pause is planned and accepted) or a Class C emergency where finality has already stalled.

:::
A finality stall is disruptive, not a graceful degradation: indexers stop, dApp clients stall, and recovery is messier than a catch-up. See [What happens during a finality stall](/docs/architecture/consensus-and-block-production#what-happens-during-a-finality-stall).

---

## Change classes

Every change is classified into exactly one of three classes. The class determines the window discipline, how quorum is held, the notice period, and who approves. The classes apply to both environments; only the notice period and risk tolerance shift by environment (see [Environments](#environments)).

| Class | Trigger | Window discipline | Quorum handling | Notice | Approval |
| --- | --- | --- | --- | --- | --- |
| **A — Coordinated** | Hard fork, runtime / `spec_version` upgrade, governance-gated or breaking bundle, reset-required state/schema migration | Deterministic maintenance window, pre-announced in UTC, pinned to fork epoch or governance enactment | Finality pause within the window is expected and accepted | Mainnet: multi-week; Preprod: about a week | Foundation SRE + Protocol Ops; governance vote where required |
| **B — Asynchronous / rolling** | Non-breaking node binary bump, hot-swappable patch, config change | No shared window; each FNO upgrades before a stated deadline | Staggered in cohorts so simultaneous restarts never exceed `Max offline`; verify finality healthy between cohorts | Days to deadline | Foundation SRE + Protocol Ops |
| **C — Emergency / critical** | Active incident or security advisory requiring immediate adoption | Out-of-band; window discipline suspended or compressed by severity | Sub-paths below | Immediate | On-call incident commander |

### Class A — Coordinated change (deterministic maintenance window)

Used when the change is breaking, crosses a fork epoch, requires a coordinated on-chain runtime upgrade, or requires a reset/re-index. The whole fleet converges inside a single pre-announced window. Because all validators act together, a finality pause inside the window is planned and accepted rather than avoided.

Canonical example: the [Van Rossem hard-fork migration](https://github.com/midnightntwrk/midnight-network-ops/blob/main/runbooks/fno/van-rossem-hard-fork-migration.md), pinned to the Cardano fork epoch.

### Class B — Asynchronous / rolling change

Used for non-breaking binary bumps, hot-swappable patches, and config changes where old and new versions interoperate. There is no shared window; each operator upgrades on their own schedule before a stated deadline. The fleet-level discipline is **cohorting**:

1. Divide the fleet into cohorts each no larger than the environment's current `Max offline` value.
2. A cohort upgrades and restarts.
3. Before the next cohort begins, confirm finality is healthy: GRANDPA round progress and finalized-height advancement, per the [operator takeaways](/docs/architecture/consensus-and-block-production#operator-takeaways).
4. Repeat until the fleet is upgraded.

### Class C — Emergency / critical change

Used for incident- or security-driven changes that cannot wait for a window. Severity-gated, adopted immediately, coordinated by the on-call incident commander. Two sub-paths:

- **Finality already stalled** — all-hands; window and cohort discipline are suspended because quorum is already lost. Priority is restoring >2/3 voting.
- **Finality healthy** — adopt fast, but still cohort to hold quorum wherever the fix permits, falling back to all-hands only if the threat outweighs a controlled stall.

---

## Classification authority and decision flow

Foundation SRE and Protocol Operations classify each change before it is announced. The classification inputs come from the bundle or component release note's **Deployment information** block ([bundle template](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/templates/release-note-bundle-template.md)):

- **Upgrade scope** — `binary only` or `binary + runtime`. A runtime upgrade implies Class A.
- **Reset required** — any state wipe, re-sync, or re-index implies Class A.
- **Governance action required** — an on-chain proposal/vote gate implies Class A.
- **Coordination** — `any-order` permits Class B; `strict sequence` implies Class A.

A change is classified per environment, and the class can differ: a change may roll asynchronously on Preprod (Class B) yet warrant a coordinated window on Mainnet (Class A) given the tighter posture. A change may also **escalate** mid-rollout — a Class B rolling update that regresses finality, or whose new version proves incompatible, is reclassified Class C and the remaining cohorts are halted.

---

## Maintenance-window discipline (Class A)

- **Naming and time:** announce the window in UTC with an explicit start and expected duration; pin it to the fork epoch or governance enactment block, not a wall-clock guess.
- **Lead time:** Mainnet gets multi-week notice; Preprod about a week. Cadence is monthly to quarterly on Mainnet and bi-weekly to monthly on Preprod, per the [compatibility matrix environment notes](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/compatibility-matrix.md#environment-notes).
- **Date verification:** confirm the day of week, UTC offset, and any DST transition for every announced local time before publishing.
- **Freeze and soak:** freeze non-essential changes ahead of the window; soak the upgraded fleet (run at tip) before declaring the change complete.
- **Go / no-go and rollback:** define a go/no-go check at window start and a rollback decision point inside the window, per the change's runbook.

---

## Quorum-safe rollout choreography

For any change touching more than a single operator at a time, sequence:

1. **Canary** — one operator (or one cohort within `Max offline`) upgrades first and soaks. For a Mainnet change, Preprod (and upstream Preview) already served as the cross-environment canary.
2. **Staged cohorts** — proceed cohort by cohort, each no larger than `Max offline`, with a finality-health check between cohorts.
3. **Full fleet** — only after staged cohorts confirm healthy finality and no regressions.

**Abort criteria:** if finality stalls or a cohort surfaces a regression, halt the remaining cohorts immediately and move to recovery before resuming.

---

## Communications

Each change is communicated to FNOs over the standard notification channels (Discord `#fno-validator-ops`, plus email, Telegram, and SMS), with the environment named explicitly:

- **Class A and Class B** — announcement, with the window or deadline stated explicitly.
- **Class C** — alert, dispatched with incident urgency.

Deadlines, windows, and required actions must be explicit in every notice. Detail is deferred to the linked runbook and release note rather than restated in the notice.

---

## Rollback and recovery

Component- and step-level rollback lives in each change's runbook and in the bundle release note's migration/rollback section. At the network level:

- If a rollout induces a finality stall, halt remaining cohorts and recover before resuming.
- Recovery follows the consensus doc's [stall resolution](/docs/architecture/consensus-and-block-production#how-a-stall-resolves): the offline node rejoining (most common), or a governance change to the FNO set if a node is permanently lost.

---

## Glossary

- **Change class** — the A/B/C category that determines a change's window discipline, quorum handling, notice, and approval.
- **Deterministic maintenance window** — a pre-announced UTC window, pinned to a fork epoch or governance enactment, in which the whole fleet performs a Class A change; a finality pause inside it is planned and accepted.
- **Cohort** — a group of FNOs upgraded together in a rolling (Class B) change, sized no larger than the current `Max offline` value so simultaneous restarts never breach the >2/3 threshold.

Consensus terms (AURA, GRANDPA, finality stall, fault, epoch) are defined in [Consensus & Block Production](/docs/architecture/consensus-and-block-production) and the [FAQ](/docs/faq); they are not repeated here.

---

## References

- [Consensus & Block Production](/docs/architecture/consensus-and-block-production) — the >2/3 finality threshold and fault-tolerance table this spec depends on
- [FAQ](/docs/faq) — operator-facing symptoms and fixes
- [Compatibility matrix](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/compatibility-matrix.md) — tested versions and per-environment update cadences
- [Version numbering and release stages](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/reference/version-numbering.md) — how MAJOR/MINOR/PATCH and bundle numbering signal breaking vs non-breaking
- [Bundle release note template](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/templates/release-note-bundle-template.md) — the Deployment information fields used to classify a change
- [Van Rossem hard-fork migration guide](https://github.com/midnightntwrk/midnight-network-ops/blob/main/runbooks/fno/van-rossem-hard-fork-migration.md) — canonical Class A instance
