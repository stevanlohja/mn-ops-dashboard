# Runbook 06 · Upgrade Ceremony Failure / FNO Deviation

**Severity range:** P2 → P3
**Audience:** Internal DevOps · FNO Liaison
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

An upgrade ceremony failure occurs when an FNO operator deviates from the agreed upgrade procedure — either by acting before the coordinated window, skipping steps, applying incorrect configuration, or failing to attend the upgrade call entirely.

Deviations fall into three categories:

| Deviation type | Example | Risk |
|---|---|---|
| **Premature upgrade** | FNO applies upgrade before the coordinated call begins | Network running heterogeneous versions; config drift undetected |
| **Missing or incorrect arguments** | `--reserved-nodes` missing or incomplete after upgrade | Degraded peer count; Runbook 02 territory |
| **Non-attendance / non-response** | FNO does not join the upgrade call or does not confirm completion | Upgrade status unknown; cannot verify network is in known-good state |

These deviations are P3 individually in most cases, but can compound — particularly if multiple FNOs deviate simultaneously during the same upgrade window, or if a deviation goes undetected and affects network health.

---

## Why it matters

The federated nature of the Midnight Mainnet means upgrades require coordination across 10 independent FNO operators running heterogeneous infrastructure. Unlike a centralised network where a single operator can push a uniform upgrade, every FNO must apply changes correctly and independently.

The risks of uncoordinated or incorrect upgrades are concrete:

- **Heterogeneous versions** create a mixed network where different nodes behave differently, making debugging significantly harder and increasing the risk of chain instability.
- **Missing config arguments** (e.g. `--reserved-nodes`) degrade peer counts immediately and silently — the FNO may not notice, and the issue may persist for days.
- **Premature upgrades** — before coordinated testing confirms the change is safe — remove the safety net that pre-prod burn-in is designed to provide.

> **Confirmed pattern from 2026-03-23:** One FNO upgraded prematurely before the coordinated call. Multiple FNOs were found to have missing `--reserved-nodes` arguments after an upgrade. A peer script error went undetected for approximately three working days. All of these were consequences of uncoordinated or incorrectly applied upgrades.

---

## The upgrade ceremony — how it should work

Leonard Hegarty has established the following 5-step procedure for all FNO upgrades. Every FNO must follow these steps in order. There is no shortcut:

```
Step 1 — CHECK     Confirm current version and running state before touching anything
Step 2 — STOP      Gracefully stop the node service
Step 3 — UPGRADE   Apply the new binary or configuration change
Step 4 — CONFIGURE Verify all arguments are correct — including --reserved-nodes
Step 5 — RESTART   Start the service and confirm it is healthy
```

**What "confirm" means at each step:**

- Step 1: FNO pastes current version output and service status into the designated channel
- Step 4: FNO pastes their full startup arguments — DevOps verifies against the approved config baseline
- Step 5: FNO pastes last 20 lines of node logs and confirms peer count on telemetry

> **Critical:** Do not accept verbal confirmation at any step. Require FNOs to paste actual output. As established on 2026-03-23: *"I'm glad you said you did it, but I need to see it visibly."*

---

## Coordinated upgrade protocol

The following is the established pattern for Mainnet upgrades, derived from what worked on 2026-03-23:

**Phase 1 — Pre-prod async burn-in (day before)**
- Instruct FNOs to apply the upgrade to PreProd asynchronously
- Do not publish the upgrade instructions publicly in Discord until instructed — premature access leads to premature upgrades
- Allow a burn-in period of at least 4–5 hours before proceeding to Mainnet
- Monitor PreProd telemetry throughout the burn-in period

**Phase 2 — Mainnet coordinated call**
- Schedule the Mainnet upgrade call with all 10 FNOs present
- Target a specific time — do not run async without a deadline
- Get all FNOs on the call before issuing upgrade instructions
- Walk through each FNO's upgrade one at a time or in coordinated batches
- Require evidence at each step (see above)

**Phase 3 — Post-upgrade verification**
- All FNOs confirm completion with evidence before the call ends
- DevOps verifies peer counts on telemetry for all 10 FNOs
- Monitor for at least 30 minutes before declaring the upgrade complete

**Known constraints:**
- FNOs have requested a **no-Friday upgrade policy**
- FNO emergency SLA is currently 24 hours — do not assume availability outside business hours without advance notice
- Some FNOs prefer direct 1-to-1 contact over channel messages

---

## Detecting deviations in progress

### Premature upgrade

**Detection:** FNO posts in the channel that they have already applied the upgrade before the coordinated call begins.

**Immediate action:**
- Do not proceed with the coordinated upgrade until the premature node is verified healthy
- Ask the FNO to paste their current config, version, and recent logs
- Check their peer count on telemetry
- If healthy: note the deviation, continue the ceremony with remaining FNOs
- If unhealthy: resolve the issue before proceeding

---

### Missing or incorrect arguments post-upgrade

**Detection:** Peer count below 17 on telemetry after an upgrade. See **Runbook 02 · Peer Misconfiguration**.

**Immediate action:** Do not conclude the upgrade call until all 10 FNOs are showing the correct peer count on telemetry. A peer count below 17 is a failed upgrade, not a successful one.

---

### Non-attendance / non-response

**Detection:** FNO does not join the upgrade call or does not respond to the channel message requesting confirmation.

**Triage questions:**
```
□ Is this FNO in a timezone where the call time is unreasonable?
□ Have they been given sufficient notice?
□ Have you tried direct 1-to-1 contact in addition to the channel?
□ Is their node currently healthy on telemetry (present, peer count 17)?
```

**If the FNO's node is healthy on telemetry and they are simply not on the call:**
- Attempt direct 1-to-1 contact
- If no response and the node remains healthy, the upgrade can proceed for other FNOs
- Log the non-attendance and follow up after the call

**If the FNO's node is not on telemetry or showing degraded health:**
- Do not proceed with the upgrade for other FNOs until the situation is understood
- Escalate to Incident Commander if the FNO is unreachable and the node is unhealthy

---

## Remediation — upgrade in a degraded state

If the upgrade call has begun and deviations have been discovered mid-ceremony:

**Rule:** Do not declare the upgrade complete until every FNO has been verified. A partial upgrade — where some FNOs are on the new version and some are not — is acceptable as a temporary state, but must be tracked and resolved.

- [ ] Maintain a live status board during the call: FNO name | version confirmed | peer count | evidence posted
- [ ] For any FNO not yet confirmed: note their current state (pre-upgrade, upgraded unverified, upgraded confirmed)
- [ ] Resolve all outstanding FNOs before closing the upgrade call
- [ ] If an FNO cannot be reached and their node is on the old version: note this explicitly, monitor their peer count, and follow up

---

## Post-upgrade checklist

Do not close the upgrade call or declare success until all of the following are confirmed:

- [ ] All 10 FNO validators visible on telemetry
- [ ] All FNO validators showing peer count of 17
- [ ] All FNOs have posted version confirmation and recent logs as evidence
- [ ] Average block time is ~6.000s on telemetry
- [ ] No block hash divergence visible on telemetry
- [ ] 30-minute observation period completed without incident

---

## FNO Comms Templates

### Template A — Pre-upgrade announcement (do not publish until ready)

```
@validators — Mainnet upgrade call tomorrow at [TIME] [TIMEZONE].

Please have terminal access to your node ready before joining.

We will walk through the upgrade together step by step.
Do NOT start the upgrade before we are all on the call.

Please confirm you can attend: ✅ or flag if you cannot.
```

---

### Template B — PreProd async instruction

```
@validators — Please apply the following upgrade to your PreProd node
asynchronously when ready:

[Upgrade instructions]

After completing, please post here:
1. Your version output: [command]
2. Your last 20 lines of logs: [command]
3. Your peer count from telemetry

Do NOT apply this to Mainnet yet. Mainnet upgrade call is [DATE/TIME].
```

---

### Template C — Step-by-step during the call

```
[FNO name] — your turn.

Step 1: Please confirm your current version and service status:
  [command]

Post the output here before proceeding.
```

---

### Template D — Post-upgrade evidence request

```
[FNO name] — upgrade complete. Please post:

1. Version output: [command]
2. Last 20 lines of logs: [command]
3. Confirm your peer count on telemetry: https://telemetry.shielded.tools/...

We will verify from our side and mark you as complete.
```

---

### Template E — Premature upgrade detected

```
[FNO name] — we can see you've already applied the upgrade.

No problem — can you please post your current config and recent logs
so we can verify everything looks correct before we proceed?

  [commands]

Once we've verified, we'll continue with the rest of the group.
```

---

### Template F — Non-attendance follow-up

```
[FNO name] — we missed you on today's upgrade call.

Your node looks [healthy / degraded] on telemetry right now.

When you're available, can you confirm whether you've applied the upgrade?
If not, please let us know and we'll walk through it with you.

[If degraded: This is time-sensitive — please respond as soon as possible.]
```

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 01 · DB Sync Failure | If the upgrade involved a DB Sync version change and instability follows |
| Runbook 02 · Peer Misconfiguration | If missing --reserved-nodes arguments are found post-upgrade |
| Runbook 04 · Node Outage | If a node fails to restart after the upgrade |
| Runbook 07 · Finality Stall | If heterogeneous versions post-upgrade cause consensus issues |
