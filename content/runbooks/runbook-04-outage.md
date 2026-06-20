# Runbook 04 · Node Outage

**Severity range:** P1 → P3
**Audience:** Internal DevOps · FNO Operators
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

A node outage occurs when a validator's process has stopped entirely. Unlike **Runbook 03 · Validator Isolation** — where the node is running but disconnected from other validators — an offline node disappears from the telemetry dashboard completely. It is no longer reporting, no longer syncing, and no longer participating in block production or finality.

---

## Why it matters

Midnight Mainnet currently runs with **10 FNO validators**. AURA consensus assigns block production slots in a deterministic round-robin across the active validator set. A validator that is offline will miss every slot assigned to it. GRANDPA finality requires a 2/3 supermajority of validators — with 10 validators, losing 4 or more puts finality at risk.

**Severity scales directly with how many validators are offline simultaneously:**

| Offline validators | Impact | Severity |
|---|---|---|
| 1 | Missed slots, network continues | P3 |
| 2 | Reduced resilience, monitor closely | P3 → P2 |
| 4+ | >33% of validator set — finality at risk | P1 immediately |

The federated nature of the launch means **Shielded cannot directly access FNO-operated nodes**. Every remediation step involving an FNO node requires the FNO operator to act. Response time is therefore directly constrained by FNO availability.

---

## How to detect

### Primary signal — Telemetry dashboard

Open: `https://telemetry.shielded.tools` → **Midnight Mainnet** tab

| Signal | What to look for |
|---|---|
| **Validator count** | Fewer than 10 FNO validators visible in the highlighted list |
| **Missing node** | A validator that was previously visible is no longer in the list at all |
| **Block production** | Average Time rising above 6s — missed slots from the offline validator extend block times |
| **Last Block time** | Growing if the offline validator held the current slot |

> **Node offline vs node isolated:** If a node is present in the list but shows 0 peers, that is **Runbook 03 · Validator Isolation** — the process is running. If the node has disappeared from the list entirely, that is this runbook — the process has stopped.

---

## Triage

```
□ Which FNO validator(s) are missing from telemetry?
□ When did the node last appear — check Last Block Time before it dropped off
□ How many validators are currently offline?
□ Is block production still occurring? Is Average Time elevated?
□ Did this coincide with a recent upgrade, config change, or announced maintenance?
□ Has the FNO been contacted — are they aware?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| 1 validator offline, chain producing normally | P3 |
| 2 validators offline, chain producing but degraded | P2 |
| 4+ validators offline | P1 — all hands immediately |
| 1+ validators offline AND Average Time significantly elevated | P2 minimum |

---

## Remediation

### Phase 1 — Confirm the outage

Before contacting the FNO, confirm the node is genuinely offline rather than a telemetry reporting delay:

- [ ] Wait 60 seconds and refresh telemetry — confirm the node has not reappeared
- [ ] Check whether the node appears on any other environment tab (PreProd, Preview) — rules out a telemetry display issue
- [ ] Note the exact time the node disappeared and the last block height it reported

---

### Phase 2 — Contact the FNO

Reach out immediately via the FNO's designated private channel. Do not post in public Discord channels.

**Contact method matters.** Some FNO operators prefer direct 1-to-1 communication over channel messages — know your FNO's preferred contact method before an incident occurs. For P1 incidents, use every available channel simultaneously rather than waiting for a response from one.

Use the comms template below. Be direct — include the severity, what you are seeing on telemetry, and what you need them to do.

If there is no response within the SLA window for the severity level:

| Severity | No-response escalation |
|---|---|
| P3 | Escalate to DevOps Lead after 2 hours |
| P2 | Escalate to Incident Commander after 30 minutes |
| P1 | Escalate immediately — do not wait for FNO response before involving IC and Protocol Engineer |

> **Confirmed pattern:** On at least one occasion (2026-03-23), reaching FNO operators outside business hours required escalation through non-standard channels. Have the escalation path documented and ready — the time to find it is not during a P1.

---

### Phase 3 — FNO-led diagnosis (DevOps to guide)

Once the FNO is engaged, ask them to check the following in order. Guide them through each step — do not assume technical familiarity.

**Check 1 — Node process status**

```bash
systemctl status midnight-node
```

Expected when healthy: `active (running)`. If it shows `inactive (dead)` or `failed`, the process has stopped.

> **Note:** The systemd service name `midnight-node` should be verified against the FNO's actual service configuration — FNO environments are not fully standardised and naming may differ.

**Check 2 — Recent logs**

```bash
journalctl -u midnight-node -n 200 --no-pager
```

Ask the FNO to paste the last 20–30 lines. Look for:
- Out-of-memory (OOM) kill messages
- Panic or fatal error messages from the node process
- Database errors
- Clean shutdown messages (suggests a deliberate stop rather than a crash)
- Port binding failures (suggests another process is occupying the expected port)

**Check 3 — System resources**

If logs do not reveal a clear cause:

```bash
# Disk space — a full disk will stop the node
df -h

# Memory
free -m

# Was the process OOM-killed?
journalctl -k | grep -i "oom\|killed process"
```

---

### Phase 4 — Recovery

Recovery procedure depends on what Phase 3 reveals.

#### Scenario A — Clean crash, no obvious cause

If the node stopped without a clear error and system resources are healthy:

```bash
# Attempt restart
systemctl restart midnight-node

# Watch logs immediately after restart
journalctl -u midnight-node -f
```

Monitor telemetry — the node should reappear within 2–3 minutes of a clean restart. Watch for:
- Node appearing in the telemetry list
- Peer count climbing toward 17
- Block height beginning to sync toward the network tip

**Do not mark the node as recovered until it has reached the current network tip** — a node that is running but not yet synced is not contributing to consensus.

---

#### Scenario B — OOM kill

If the node was killed by the OS due to memory exhaustion:

- [ ] Check available memory — is it sufficient to restart safely?
- [ ] Check whether any other processes on the host are consuming unexpected memory
- [ ] Restart the node only if memory headroom is sufficient
- [ ] Flag to the FNO that a memory review is needed — this will recur without a fix
- [ ] Escalate to Protocol Engineer if OOM kills are recurring — this may indicate a node software issue

---

#### Scenario C — Disk full

If disk space is exhausted:

- [ ] Do not restart the node until disk space is freed — the node will crash again immediately
- [ ] Ask FNO to identify what is consuming disk space: `du -sh /* 2>/dev/null | sort -rh | head -20`
- [ ] Common causes: chain data growth, log accumulation, DB Sync database growth
- [ ] Once sufficient space is freed, restart and monitor

---

#### Scenario D — Node will not restart

If the node fails to start cleanly after multiple attempts:

- [ ] Escalate to Protocol Engineer — do not attempt config changes without guidance
- [ ] Collect and share: full logs from the failed startup attempt, system resource stats, disk usage
- [ ] If this is a P1 (4+ validators offline), engage Protocol Engineer and IC simultaneously — do not work sequentially

---

### Phase 5 — Post-recovery verification

- [ ] Telemetry: node reappears in the validator list
- [ ] Telemetry: peer count returns to 17
- [ ] Telemetry: node's block height syncs to the current network tip
- [ ] Telemetry: Average Time returns to ~6.000s (if it was elevated)
- [ ] No further crashes within 30 minutes of recovery
- [ ] FNO confirms stability from their side
- [ ] Document confirmed root cause in the incident channel

---

## FNO Comms Templates

### Template A — Initial contact (P3, single node)

```
Hey [FNO] — we can see your validator node has dropped off telemetry.

When you get a chance, can you check the status of your midnight-node process:

  systemctl status midnight-node

Let us know what you see and we can go from there. No immediate urgency 
but we'd like to get it back up as soon as you're available.
```

---

### Template B — Initial contact (P2, urgency)

```
Hey [FNO] — your validator node has gone offline and we need to get it 
back up as soon as possible.

Can you check now:

  systemctl status midnight-node
  journalctl -u midnight-node -n 50 --no-pager

Please paste the output here. We'll work through the fix with you.
```

---

### Template C — P1, multiple nodes offline

```
🔴 P1 INCIDENT — [X] validators are offline simultaneously.

[FNO name] — we need you on a call RIGHT NOW.

Call link: [link]

Check your node process immediately:
  systemctl status midnight-node

We cannot wait — block production is at risk. Please respond urgently.
```

---

### Template D — No response, escalating

```
[FNO name] — we have not had a response to our earlier message.
Your validator has been offline for [X] minutes.

We are escalating internally. Please contact [Incident Commander name] 
directly at [contact] as soon as you see this.
```

---

### Template E — Recovery confirmed

```
✅ Your node is back on telemetry and syncing to the network tip.

Peer count: [X] / 17
Block height: catching up

Please monitor from your side and let us know if anything looks off. 
Thanks for the quick response.
```

---

## Operational notes

**No-Friday policy.** FNOs have requested that upgrades and planned maintenance are not scheduled on Fridays. This applies to planned work — it does not override the need to respond to an unplanned outage on a Friday.

**Shielded 24/7 coverage.** Shielded Technologies operates their nodes with 24/7/365 coverage. FNO operators are not held to the same standard by their current contracts. This asymmetry is a known risk for the guarded launch period.

**Direct contact preference.** Some FNO operators are more responsive to direct 1-to-1 messages than to channel posts. Maintain a record of each FNO's preferred contact method outside of this runbook — this information is operationally sensitive and should not be stored in public channels.

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 03 · Validator Isolation | If the node is visible on telemetry with peer count 0 — different failure mode |
| Runbook 06 · Upgrade Ceremony Failure | If the outage followed an upgrade attempt |
| Runbook 07 · Finality Stall | If multiple validators are offline and finality gap is growing |
| Runbook 08 · Cardano Node Sync Failure | If logs show Cardano-layer errors as the crash cause |
