# Runbook 02 · Peer Misconfiguration / Low Peer Count

**Severity range:** P3
**Audience:** Internal DevOps · FNO Operators
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

Each FNO validator connects to its peers via standard P2P configuration. Validators run with two critical flags that control who they connect to:

- `--reserved-only` — the node will only connect to explicitly listed peers
- `--reserved-nodes` — the list of peers the node is permitted to connect to

If either flag is missing, incorrect, or references stale peer information (e.g. an outdated IP), the node will connect to fewer peers than expected. The node remains running and visible on telemetry, but its view of the network is incomplete.

This is distinct from **Runbook 03 · Validator Isolation** where peer count reaches zero. Here the node has *some* peers but not the full expected set.

---

## Why it matters

The expected peer count for FNO validators on Mainnet is **17**. A node with fewer peers has a narrower view of the network. The practical consequences are:

- Slower propagation of blocks and transactions to and from that node
- Reduced participation in gossip, which can slow network-wide convergence during any instability
- If multiple nodes are simultaneously misconfigured, the aggregate effect on the network is larger than any single node would suggest

This is a P3 in isolation — the chain continues operating. However it should be resolved promptly, particularly ahead of any planned upgrade or high-activity period.

> **Detection gap risk:** A peer misconfiguration in the distributed peer script went undetected for approximately three working days before it was identified. This runbook exists partly because passive monitoring of peer counts is not yet automated — detection currently depends on someone actively checking the telemetry dashboard.

---

## How to detect

### Primary signal — Telemetry dashboard

Open: `https://telemetry.shielded.tools` → **Midnight Mainnet** tab

| Signal | What to look for |
|---|---|
| **Peer Count column** | Any FNO validator showing a value below 17 |
| **Shielded infra nodes** | These run at a higher peer count (~25) — do not use them as the FNO baseline |

> **Note:** The expected FNO baseline of 17 peers reflects the current network size. If FNOs are added or removed, this baseline will change. Always verify the expected count against the current approved node registry before treating a lower number as a misconfiguration.

---

## Triage

```
□ Which FNO(s) are showing low peer count?
□ What is their current peer count — how far below 17?
□ Is this a single FNO or multiple?
□ Did this follow a recent upgrade, config change, or new node joining the network?
□ Was a peer script recently distributed — has it been verified as correct?
□ Is the affected FNO's node otherwise healthy (block height advancing, uptime normal)?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| Single FNO below 17, chain healthy | P3 |
| Multiple FNOs below 17, chain healthy | P3 → monitor for escalation |
| Peer count dropping toward 0 on any node | Escalate to Runbook 03 |
| Peer count issue following a peer script distribution | P3 — verify script immediately |

---

## Remediation

### Phase 1 — Confirm the issue

- [ ] Note the affected FNO name(s) and their current peer count from telemetry
- [ ] Check whether a peer script or config update was recently distributed — if so, the script itself may be the source of the problem
- [ ] Confirm the affected node is otherwise healthy: block height advancing, uptime normal, Last Block time within expected range

---

### Phase 2 — Collect the FNO's config

Contact the affected FNO via their designated private channel. Do not ask for config information in public channels.

Request they paste their current node startup arguments, specifically:
- The `--reserved-only` flag — is it present?
- The `--reserved-nodes` argument — is it present and does it contain the full peer list?

> **Important:** Do not accept a verbal confirmation that config is correct. Stevan Lohja — 2026-03-24: *"I need to see it visibly."* Require the FNO to paste the actual arguments.

Compare their config against the current approved baseline for their node flavour (Docker / bare metal / cloud). The approved baselines are maintained separately — do not attempt to reconstruct the correct peer list from memory.

---

### Phase 3 — Correct the config and restart

If the config is missing arguments or contains incorrect peer entries, work through the correction with the FNO using **Leonard's 5-Step Upgrade Ceremony**:

```
Step 1 — CHECK     Confirm current node version and running state
Step 2 — STOP      Gracefully stop the midnight-node service
Step 3 — UPGRADE   Not applicable for a config-only fix — skip this step
Step 4 — CONFIGURE Apply the corrected --reserved-nodes argument
Step 5 — RESTART   Start the service and confirm peers establish
```

In detail:

```bash
# Step 1 — Check
systemctl status midnight-node

# Step 2 — Stop
systemctl stop midnight-node

# Step 4 — Configure
# Edit the node startup script or service file to include the correct
# --reserved-only and --reserved-nodes flags
# Verify the peer list matches the current approved registry

# Step 5 — Restart
systemctl start midnight-node
# Monitor peer count on telemetry — should rise to 17 within 1-2 minutes
```

---

### Phase 4 — Verify recovery

- [ ] Telemetry: affected node peer count returns to 17
- [ ] Telemetry: node block height is advancing in line with the rest of the network
- [ ] Telemetry: no other nodes showing degraded peer counts
- [ ] Ask the FNO to confirm in the designated channel
- [ ] If a peer script was involved — verify the script is correct before it is distributed to any other FNOs

---

### If the peer script itself is the problem

If the misconfiguration is traced to an error in the distributed peer script rather than an individual FNO's deviation:

- [ ] **Stop distribution immediately** — do not send the script to any further FNOs
- [ ] Identify which FNOs have already applied it
- [ ] Identify the error — wrong peer IDs, stale IPs, missing entries
- [ ] Produce a corrected script and have it reviewed before redistribution
- [ ] Work through the correction with all affected FNOs sequentially

> **Note:** On 2026-03-23 a peer script error went undetected for approximately three working days before it was identified. The lesson: any time a peer script is distributed, peer counts on telemetry must be actively checked within 24 hours of FNOs applying it — not left to passive observation.

---

## FNO Comms Templates

### Template A — Config request

```
Hey [FNO name] — we can see your peer count is currently showing [X] on telemetry,
expected is 17.

Can you paste your current node startup arguments here (specifically --reserved-only
and --reserved-nodes)?

Please paste the actual arguments rather than confirming verbally — we want to
compare directly against the approved config. Thanks.
```

---

### Template B — Correction instruction

```
Thanks — we can see the issue. Your --reserved-nodes argument is [missing /
contains incorrect entries].

When you have a moment, can you:
1. Stop your node: systemctl stop midnight-node
2. Update your startup config with the corrected --reserved-nodes list
   (sending you the correct values now via DM)
3. Restart: systemctl start midnight-node
4. Confirm your peer count is back to 17 on telemetry

Let us know when done and we'll verify from our side.
```

---

### Template C — Peer script issue (multiple FNOs affected)

```
@validators — heads up. We've identified an error in the peer script that was
recently distributed.

Please do NOT apply the script if you haven't already.

If you have already applied it, please stand by — we will send you a corrected
version shortly and walk through the fix with you.

More shortly.
```

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 03 · Validator Isolation / Zero Peers | If peer count drops to 0 rather than a partial reduction |
| Runbook 05 · Monitoring & Telemetry Gap | If the misconfiguration went undetected for an extended period |
| Runbook 06 · Upgrade Ceremony Failure | If the peer count issue arose during or after an upgrade |
