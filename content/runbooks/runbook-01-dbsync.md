# Runbook 01 · DB Sync Failure & Chain Reorganisation

**Severity range:** P1 → P2
**Audience:** Internal DevOps · FNO Operators
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

DB Sync is an indexing service that synchronises state from the Cardano node into a queryable database. On Midnight, it sits in the critical dependency chain between the underlying Cardano layer and the Midnight validator:

```
Cardano Node  →  DB Sync  →  Midnight Validator Node
```

DB Sync is a **hard dependency**. If it falls behind, rolls back, or crashes, the Midnight validator node loses its view of canonical chain state. When this happens across multiple nodes simultaneously — particularly if they are running different DB Sync versions — validators can briefly diverge onto separate chains. This is a **chain reorganisation**.

A chain reorganisation is not inherently catastrophic. Substrate-based chains handle short reorgs as a normal part of consensus. What makes reorgs dangerous on Midnight is their **duration** — a reorg window of more than a few seconds creates a period during which two separate canonical chains coexist, which has real financial consequences for any party treating confirmations as final.

---

## Why it matters

**Double-spend exposure.** During a reorg, a transaction confirmed on one fork may not exist on the chain that eventually wins. An exchange or custodian that credits a deposit based on a confirmation seen during the reorg window may never see that transaction finalised. A 12-minute reorg window — as observed on 2026-03-23 — is sufficient time for a sophisticated actor to exploit this.

**Stale state.** Even a short DB Sync lag means validators are making block production decisions based on an outdated view of chain state. Transactions that appear valid locally may conflict with the true canonical state.

**Cascading instability.** If DB Sync rolls back on multiple nodes, and those nodes are running heterogeneous versions, some may handle the rollback correctly while others do not. The result is a mixed validator set — some on the correct chain, some on a stale fork — which extends the reorg duration beyond what any single node failure would cause.

---

## How to detect

### Primary signal — Telemetry dashboard

Open: `https://telemetry.shielded.tools` → **Midnight Mainnet** tab

| Signal | What to look for | What it means |
|---|---|---|
| **Block Hash divergence** | Two or more nodes at the same Block height showing different Block Hash values | Active reorg — two chains exist simultaneously |
| **Finalized Block lag** | Best Block − Finalized Block gap growing beyond 4 | Network cannot reach finality consensus |
| **Average Time spike** | Average Time rising significantly above 6.000s | Block production degrading |
| **Last Block time** | Last Block time >30s | Block production stalled or severely delayed |

> **How to check block hash divergence:** Sort the telemetry list by the **Block** column. Scan the **Block Hash** column for nodes at the same height. Any two nodes showing identical block numbers but different hash prefixes are on different chains.

### Secondary signal — Node logs

If telemetry signals are ambiguous, check DB Sync logs directly on affected nodes:

```bash
journalctl -u cardano-db-sync -n 200 --no-pager
```

Look for:
- `Rolling back` messages — DB Sync is undoing previously indexed blocks
- `Db.Block: failed` or similar database errors
- A `db_block_height` value significantly behind the network's current slot height
- Connection errors between DB Sync and the Cardano node

Check DB Sync metrics endpoint if accessible internally:
```bash
curl -s http://localhost:8080/metrics | grep cardano_db_sync
# cardano_db_sync_db_block_height — should be close to current block
# cardano_db_sync_db_slot_height  — should be close to current slot
```

A significant lag between these values and the network tip confirms DB Sync is the source of instability.

---

## Triage

Work through these questions before acting. The answers determine severity and which remediation path to follow.

```
□ How many validators are showing block hash divergence on telemetry?
□ How long has the divergence been visible — seconds, minutes?
□ Is the divergence growing (chains drifting further apart) or stabilising?
□ Are all FNO validators on the same DB Sync version?
□ Did any nodes recently restart or apply a DB Sync update?
□ Is this affecting Shielded-operated nodes, FNO nodes, or both?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| Block hash divergence detected, <2 minutes, gap closing | P2 — monitor closely, prepare to escalate |
| Block hash divergence >3 minutes, gap not closing | P1 — all hands |
| Block production stalled AND DB Sync errors confirmed | P1 — all hands |
| DB Sync lag detected but no hash divergence yet | P2 — act before it escalates |
| Single node showing DB Sync errors, rest healthy | P3 — isolate and recover |

> **Escalation trigger:** Any reorg lasting more than 3 minutes must be treated as P1 regardless of scope. A 12-minute reorg creates a double-spend window large enough to be exploited.

---

## Remediation

### Phase 1 — Stabilise and observe

Before touching anything, establish a clear picture.

- [ ] Open incident channel: `#inc-YYYYMMDD-dbsync-reorg`
- [ ] Declare Incident Commander
- [ ] Take a **screenshot of the telemetry dashboard** immediately — captures the block heights and hashes at the moment of detection. This is your evidence baseline.
- [ ] Note the exact time divergence was first observed
- [ ] Identify which nodes are on each fork (by block hash)
- [ ] Monitor for 60 seconds — is the gap growing or closing?
- [ ] **Do not restart any nodes yet** — a restart mid-reorg can extend the divergence window

---

### Phase 2 — Identify the root cause

**Check DB Sync version across all nodes:**

```bash
# On each affected node
cardano-db-sync --version
# or check the running binary
systemctl status cardano-db-sync | grep -i version
```

If versions differ across nodes, heterogeneous DB Sync is a likely contributor. All validators must run the same version.

**Check for active rollback:**

```bash
journalctl -u cardano-db-sync -f
# Watch for "Rolling back" in real time
```

**Check Cardano node health (DB Sync upstream dependency):**

```bash
journalctl -u cardano-node -n 100 --no-pager
# Look for sync errors or unexpected restarts
```

If the Cardano node itself is unhealthy, DB Sync will also be unhealthy. See **Runbook 08 · Cardano Node Sync Failure** if Cardano-layer errors are found.

---

### Phase 3a — Recovery (self-resolving reorg)

If the reorg is closing — nodes are converging back to a single chain — allow it to complete before taking any action.

- [ ] Monitor telemetry until **all nodes show the same Block Hash at the same height**
- [ ] Confirm the Finalized Block gap returns to the expected 2–3 block range
- [ ] Confirm Average Time returns to ~6.000s
- [ ] Check DB Sync block height on all nodes matches the network tip
- [ ] Record the duration of the reorg in the incident channel
- [ ] If duration exceeded 3 minutes → treat as a full P1 post-incident review regardless

Once the chain has stabilised, proceed to **Phase 4 (DB Sync version check)** to ensure the root cause is addressed before the next incident.

---

### Phase 3b — Recovery (stalled or widening reorg)

If the divergence is growing, or has not resolved after 3 minutes, active intervention is required.

- [ ] Escalate to Protocol Engineer — do not attempt consensus-layer remediation without them
- [ ] Identify which fork has the most validators — this is most likely the canonical chain
- [ ] Contact FNO liaison — alert all FNO operators via the FNO comms template below
- [ ] **Instruct FNOs: do not restart nodes, do not apply updates, await instructions**
- [ ] With Protocol Engineer: determine whether DB Sync restart on stale-fork nodes is safe
- [ ] If DB Sync restart is approved:

```bash
systemctl stop cardano-db-sync
# Wait 30 seconds for clean shutdown
systemctl start cardano-db-sync
# Monitor logs immediately
journalctl -u cardano-db-sync -f
```

- [ ] After restart, monitor telemetry — the restarted node should begin converging toward the canonical fork within 1–2 minutes
- [ ] Do not declare recovery until **all** nodes are on the same block hash

---

### Phase 3c — DB Sync version upgrade required

If the root cause is a known DB Sync bug with a patched release binary available, all nodes must be upgraded. Use **Leonard's 5-Step Upgrade Ceremony** for each node:

> ⚠️ Coordinate this across all FNO operators simultaneously on a live call. Do not ask FNOs to upgrade asynchronously during an active reorg.

**Leonard's 5-Step Upgrade Ceremony:**

```
Step 1 — CHECK    Confirm current DB Sync version and running state
Step 2 — STOP     Gracefully stop the DB Sync service
Step 3 — UPGRADE  Apply the patched release binary
Step 4 — CONFIGURE Verify config is unchanged and correct
Step 5 — RESTART  Start the service and confirm it syncs cleanly
```

In detail:

```bash
# Step 1 — Check
systemctl status cardano-db-sync
cardano-db-sync --version

# Step 2 — Stop
systemctl stop cardano-db-sync

# Step 3 — Upgrade
# Apply the release binary per the deployment procedure for this node's environment
# Confirm binary checksum matches the release artefact

# Step 4 — Configure
# Verify config file is unchanged
# Confirm --socket-path points to the correct Cardano node socket
# Confirm PostgreSQL connection string is correct

# Step 5 — Restart
systemctl start cardano-db-sync
journalctl -u cardano-db-sync -f
# Look for clean startup: "Starting DB Sync" with no immediate errors
```

**Post-upgrade checklist per node:**
- [ ] DB Sync is running without errors
- [ ] `cardano_db_sync_db_block_height` is advancing toward the network tip
- [ ] No rollback messages in the first 5 minutes
- [ ] FNO confirms via the designated channel with logs as evidence

**Require evidence from FNOs before marking their node as recovered:**

> Ask each FNO to post: their DB Sync version output + last 20 lines of logs + their block height from metrics. Do not mark a node recovered on their word alone.

---

### Phase 4 — Post-recovery verification

Only proceed once **all nodes** have confirmed recovery.

- [ ] Telemetry: all validators showing the same Block Hash at the same height
- [ ] Telemetry: Finalized Block gap back to 2–3 blocks
- [ ] Telemetry: Average Time back to ~6.000s
- [ ] Telemetry: Last Block time <10s
- [ ] DB Sync block height on all nodes matches or is within 2 blocks of network tip
- [ ] No rollback messages in DB Sync logs for at least 10 minutes post-recovery
- [ ] Declare incident resolved in channel with timestamp

---

## FNO Comms Templates

### Template A — Alert (reorg detected, FNOs to stand by)

```
@validators 🔴 Incident in progress — chain reorganisation detected on Mainnet.

Do NOT restart your nodes, do NOT apply any updates, do NOT change your config until you hear from us.

Stand by for instructions. Please confirm you have seen this message with a ✅
```

---

### Template B — DB Sync upgrade required (coordinated call)

```
@validators Action required — we need everyone on a call NOW to perform a DB Sync upgrade.

Join: [call link]

Prepare: have terminal access to your node ready before joining.
We will walk through this together step by step. Do not start the upgrade until we are all on the call.

ETA: 15 minutes. Please confirm availability with ✅ or flag if you cannot join.
```

---

### Template C — Post-recovery (all clear)

```
@validators ✅ Incident resolved. All nodes are back on the canonical chain.

Please confirm your DB Sync is running cleanly and post your version + last 20 lines of logs here as evidence.

Thanks for your quick response.
```

---

## Worked Example: 2026-03-23 12-Minute Reorg

**What happened:** During a live debugging session on Mainnet, the team observed shielded nodes and FNO validators diverge onto separate chains. The divergence lasted approximately 12 minutes before all nodes converged back to a single canonical chain.

**Root cause:** A DB Sync rollback triggered by a known bug in the version running across the network. When DB Sync rolled back on some nodes, those nodes' validators lost their accurate view of canonical state and briefly followed a different fork.

**Concurrent finding:** During the same session, several FNO nodes were found to have peer counts below the expected baseline of 17, caused by missing `--reserved-nodes` arguments. Whether this contributed to the reorg duration was not established at the time.

**Detection:** Spotted manually by the team watching telemetry during the debugging session. There was no automated alert.

**Risk realised:** A 12-minute divergence window is sufficient for a double-spend attack against an exchange crediting deposits on confirmation. No value was at risk in this instance as Mainnet was not yet carrying real user value, but the same event post-launch would have been a P1 incident with immediate partner impact.

**Resolution:** All nodes converged naturally without manual intervention. The patched DB Sync release binary was subsequently distributed and validated as the permanent fix.

**Lessons:**
- Block hash divergence must be detectable without a human watching telemetry — monitoring alerting on this signal is a prerequisite for safe mainnet operation (see Runbook 05 · Monitoring & Telemetry Gap)
- All FNO nodes must be on the same DB Sync version before and after any upgrade window
- Reorg duration, not reorg occurrence, is the primary risk metric — a 30-second reorg is normal; a 12-minute reorg is a P1

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 02 · Peer Misconfiguration | If low peer counts are contributing to slow reorg recovery |
| Runbook 05 · Monitoring & Telemetry Gap | If the reorg was detected manually rather than by an alert |
| Runbook 06 · Upgrade Ceremony Failure | If FNOs deviate from the upgrade procedure during DB Sync patching |
| Runbook 08 · Cardano Node Sync Failure | If Cardano-layer errors are found upstream of DB Sync |
