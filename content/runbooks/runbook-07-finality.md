# Runbook 07 · Finality Stall

**Severity range:** P1 → P2
**Audience:** Internal DevOps Engineers · Protocol Engineer
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

Midnight uses a two-layer consensus model standard to Substrate-based chains:

- **AURA** — block *production*. Assigns block production slots in a deterministic round-robin across the active validator set. Validators take turns producing blocks.
- **GRANDPA** — block *finality*. A separate finalisation gadget that runs alongside AURA and irreversibly confirms blocks once a supermajority of validators agree on the canonical chain.

These two mechanisms operate independently. AURA can continue producing blocks even when GRANDPA cannot finalise them. This creates the gap visible on the telemetry dashboard between **Best Block** (the latest block produced) and **Finalized Block** (the latest block irreversibly confirmed).

A **finality stall** occurs when GRANDPA falls behind — the Best Block number advances normally but the Finalized Block number stalls or advances much more slowly. The gap between the two grows.

---

## Why it matters

**Finalized blocks are irreversible.** A transaction in a finalized block cannot be reversed. A transaction in a best-but-not-finalized block exists on the chain but could theoretically be reversed if a reorg occurs that excludes it.

For practical purposes during the guarded launch, partners and exchanges should treat only finalized blocks as confirmed. A growing finality gap means:

- Transactions are landing in blocks but cannot be treated as confirmed
- Downstream systems (exchanges, custodians, RPC consumers) that rely on finality will stop processing
- If the gap grows large enough, the chain may need intervention to recover

**GRANDPA requires a supermajority.** Standard Substrate GRANDPA requires at least 2/3 of the active validator set to agree on the canonical chain in order to finalise a block. With 10 FNO validators on Mainnet, this means GRANDPA requires at least 7 validators to be online and in agreement to continue finalising. Losing 4 or more validators simultaneously puts finality at immediate risk.

> **Note:** The 2/3 supermajority requirement is standard Substrate GRANDPA behaviour. Verify with the Protocol Engineer if Midnight has modified this parameter.

---

## How to detect

### Primary signal — Telemetry dashboard

Open: `https://telemetry.shielded.tools` → **Midnight Mainnet** tab

| Signal | What to watch | Normal state |
|---|---|---|
| **BEST BLOCK** | Top bar — latest produced block | Incrementing every ~6s |
| **FINALIZED BLOCK** | Top bar — latest finalized block | Incrementing, gap of ~2 behind Best Block |
| **Gap = Best − Finalized** | Calculate manually from top bar | 2–3 blocks |
| **AVERAGE TIME** | Top bar | ~6.000s |

**Warning thresholds:**

| Gap | Action |
|---|---|
| 2–3 blocks | Normal — no action |
| 4–6 blocks | Monitor closely — check validator health |
| 7–10 blocks and growing | Investigate immediately — P2 |
| >10 blocks and growing | Escalate to Protocol Engineer — P1 |
| Finalized Block completely stalled | P1 — all hands |

> **How to check:** On the telemetry dashboard top bar, read BEST BLOCK and FINALIZED BLOCK numbers. Subtract: gap = Best − Finalized. Refresh the page every 30 seconds and observe whether the gap is stable, growing, or closing.

### Secondary signal — Finalized Block Hash

The telemetry list shows a **Finalized Block Hash** column per node. If validators show different finalized block hashes at the same finalized block height, GRANDPA is in disagreement — this is a more severe situation than a simple gap.

---

## Triage

```
□ What is the current Best Block − Finalized Block gap?
□ Is the gap stable, growing, or closing?
□ Is AVERAGE TIME still ~6.000s? (AURA may be producing blocks even if GRANDPA stalls)
□ Are all 10 FNO validators visible on telemetry?
□ Are all FNO validators showing peer count of 17?
□ Do any validators show 0 peers? (see Runbook 03)
□ Do any validators show different Finalized Block Hashes?
□ Did this coincide with a recent upgrade, node restart, or config change?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| Gap growing, all 10 validators present and healthy | P2 — investigate immediately |
| Gap growing AND one or more validators offline/isolated | P2 → P1 depending on count |
| 4+ validators offline simultaneously, gap growing | P1 — all hands |
| Finalized Block completely stalled | P1 — immediate Protocol Engineer escalation |
| Gap growing AND validators show divergent Finalized Block Hashes | P1 — chain may be splitting |

---

## Remediation

### Phase 1 — Establish what is happening

A finality stall almost always has an underlying cause that must be identified before any remediation is attempted. Do not take action on the finality stall itself until the root cause is understood.

- [ ] Note the current gap and the time it was first observed
- [ ] Refresh telemetry every 30 seconds for 2 minutes — is the gap growing or stable?
- [ ] Check all 10 FNO validators: are they present, and are their peer counts at 17?
- [ ] Check for block hash divergence (see Runbook 01 · DB Sync Failure)

---

### Phase 2 — Follow the root cause

Finality stalls are almost always a symptom of another condition. The underlying cause determines the remediation path:

| Root cause | Runbook |
|---|---|
| One or more validators offline (not on telemetry) | Runbook 04 · Node Outage |
| One or more validators showing 0 peers | Runbook 03 · Validator Isolation |
| One or more validators showing low peer count | Runbook 02 · Peer Misconfiguration |
| Block hash divergence across validators | Runbook 01 · DB Sync Failure |
| All validators healthy but finality stalled | Escalate to Protocol Engineer — no standard remediation path |

> **The most common cause of a finality stall is validators going offline or losing network connectivity.** Start by verifying all 10 validators are present and healthy before escalating to the Protocol Engineer.

---

### Phase 3 — If root cause resolved, monitor recovery

Once the underlying issue is resolved (e.g. offline validators are back online), GRANDPA should resume finalising automatically. Do not attempt to manually intervene in the finality process.

- [ ] Monitor the Finalized Block number on telemetry — it should begin advancing again
- [ ] Monitor the gap — it should begin closing as GRANDPA catches up
- [ ] Allow at least 5 minutes after root cause resolution before assessing whether finality is recovering
- [ ] If finality does not recover within 10 minutes of root cause resolution → escalate to Protocol Engineer

---

### Phase 4 — If no root cause identified — escalate

If all 10 validators are present, peer counts are at 17, no block hash divergence is visible, but finality is stalling — there is no standard remediation path available. This requires Protocol Engineer intervention.

- [ ] Escalate to Protocol Engineer immediately — do not attempt further diagnosis without guidance
- [ ] Provide: current gap, time gap first appeared, screenshot of telemetry, any recent changes (upgrades, restarts, config changes)
- [ ] Do not restart any validators or change any configuration without Protocol Engineer guidance
- [ ] Declare P1 if gap exceeds 10 blocks or Finalized Block is completely stalled

---

## Post-recovery verification

- [ ] Telemetry: Finalized Block is advancing
- [ ] Telemetry: Best Block − Finalized Block gap has returned to 2–3 blocks
- [ ] Telemetry: All 10 FNO validators present with peer count 17
- [ ] Telemetry: Average block time ~6.000s
- [ ] Gap has been stable at 2–3 blocks for at least 5 minutes
- [ ] Declare incident resolved in channel with timestamp

---

## Operational notes

**Do not confuse a finality stall with a block production stall.** AURA and GRANDPA are independent. AURA can continue producing blocks (Best Block advances normally) while GRANDPA stalls (Finalized Block stalls). Check both numbers on the telemetry dashboard independently.

**A large gap alone is not always catastrophic.** If all validators are healthy and the gap is growing slowly, GRANDPA may simply be lagging behind a burst of blocks. Monitor for 2–3 minutes before escalating. A gap that is stable (not growing) at 5–6 blocks is less concerning than a gap that is actively widening.

**A completely stalled Finalized Block is always P1.** If the Finalized Block number has not moved in 2+ minutes while Best Block continues advancing, escalate immediately regardless of gap size.

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 01 · DB Sync Failure | If block hash divergence is present — GRANDPA may be unable to agree on canonical chain |
| Runbook 02 · Peer Misconfiguration | If low peer counts are reducing validator visibility to GRANDPA |
| Runbook 03 · Validator Isolation | If zero-peer validators are absent from GRANDPA quorum |
| Runbook 04 · Node Outage | If offline validators are reducing below GRANDPA supermajority threshold |
