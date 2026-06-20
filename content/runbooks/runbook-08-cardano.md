# Runbook 08 · Cardano Node Sync Failure

**Severity range:** P1 → P2
**Audience:** Internal DevOps Engineers · Protocol Engineer
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

Midnight validators depend on a three-layer upstream dependency chain:

```
Cardano Node  →  DB Sync (MCF PostgreSQL)  →  Midnight Validator Node
```

**DB Sync is a hard dependency for Midnight validators.** If DB Sync cannot sync, Midnight validators lose their view of canonical chain state and instability follows. DB Sync in turn depends on the **Cardano node** — it fetches data from the Cardano node continuously and writes it to a PostgreSQL database (the Main Chain Follower, or MCF).

A Cardano node sync failure is therefore one layer deeper than a DB Sync failure. It is the root cause that can silently propagate through DB Sync and into Midnight.

**This runbook covers failures at the Cardano node layer specifically.** If the symptoms are DB Sync errors without a clear Cardano node cause, see **Runbook 01 · DB Sync Failure & Chain Reorganisation** first.

---

## Why it matters

A Cardano node failure will, after a lag, manifest as a DB Sync failure — which will in turn manifest as Midnight validator instability or a chain reorg. The lag between Cardano node failure and visible Midnight impact depends on how quickly DB Sync exhausts its buffered state and falls behind.

Additionally, **Cardano parameter environment variables must be correctly configured on each validator node.** A misconfigured Cardano node — even one that is running — can cause validators to behave incorrectly and potentially cause a fork. This was observed on 2026-03-23 when the team had to verify Cardano configuration parameters explicitly after the reorg.

The Cardano node layer is also the boundary between Midnight's own infrastructure and an external dependency — the Cardano codebase is maintained by IOG, not Shielded Technologies. Fixes at this layer may require coordination with the Cardano DB Sync team.

---

## How to detect

### Primary signal — DB Sync logs showing upstream failure

A Cardano node sync failure will first appear as errors in DB Sync logs, since DB Sync will stop receiving data from the Cardano node.

```bash
# Check DB Sync logs for upstream connection issues
journalctl -u cardano-db-sync -n 200 --no-pager
```

Look for:
- Connection refused or timeout errors referencing the Cardano node socket
- Messages indicating DB Sync cannot reach the node
- DB Sync falling behind the network tip (block height significantly behind current slot)

### Secondary signal — Cardano node logs

```bash
# Check Cardano node process
systemctl status cardano-node

# Check Cardano node logs
journalctl -u cardano-node -n 200 --no-pager
```

Look for:
- Node process not running (`inactive (dead)` or `failed`)
- Sync stalled — block height not advancing
- Memory or disk errors
- Peer connection failures

### Tertiary signal — Midnight telemetry (lagging indicator)

The Midnight telemetry dashboard will not directly show a Cardano node failure. By the time Midnight-level symptoms appear (block hash divergence, finality stall), the Cardano node issue may have been present for some time. Telemetry is a lagging indicator for this failure mode.

---

## Triage

```
□ Is the Cardano node process running on the affected node?
□ Is the Cardano node syncing (block height advancing)?
□ Are DB Sync logs showing upstream connection errors?
□ Is the DB Sync block height significantly behind the network tip?
□ Are the Cardano parameter environment variables correctly configured?
□ Is this affecting one FNO's node or multiple?
□ Did this coincide with a Cardano node upgrade, restart, or config change?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| Single FNO's Cardano node stopped, Midnight impact not yet visible | P3 |
| Single FNO's Cardano node stopped, DB Sync falling behind | P2 |
| Multiple FNOs' Cardano nodes affected | P2 → P1 |
| Cardano node misconfiguration causing incorrect behaviour | P2 minimum |
| DB Sync is already rolling back due to Cardano node failure | P1 — see Runbook 01 |

---

## Remediation

### Phase 1 — Confirm the Cardano node is the root cause

Before acting, confirm whether the issue is in the Cardano node itself or in DB Sync.

- [ ] Check DB Sync logs for upstream errors
- [ ] Check Cardano node process status
- [ ] If DB Sync shows rollback errors without Cardano node errors → this is Runbook 01 territory, not Runbook 08
- [ ] If Cardano node is stopped or unresponsive → this is the root cause, proceed

> **Note:** The systemd service name for the Cardano node is not standardised across all FNO environments. The most common name is `cardano-node` but FNOs may have named it differently. Confirm with the FNO before running service commands.

---

### Phase 2 — Restart the Cardano node

If the Cardano node has stopped:

```bash
# Check current status
systemctl status cardano-node

# Attempt restart
systemctl restart cardano-node

# Watch logs immediately after restart
journalctl -u cardano-node -f
```

After restart, verify:
- The node starts without errors
- Block height begins advancing
- DB Sync reconnects and begins syncing again

---

### Phase 3 — Verify Cardano parameter environment variables

If the Cardano node is running but behaviour is incorrect, or if this failure followed a configuration change, verify the Cardano parameter environment variables are correct.

> **This is operationally critical.** On 2026-03-23, the team explicitly had to verify Cardano parameter configurations after a reorg. Wrong parameters can cause a fork even when the node is running. — Stevan Lohja, 2026-03-23: *"If they had the wrong Cardano parameter environment variables, they would have caused a fork. Which is why we had to verify their configurations."*

Ask the FNO to paste their Cardano node startup arguments and environment configuration. Compare against the approved baseline for their node flavour. Do not accept verbal confirmation — require the actual output.

The specific parameters to verify are not documented in the available sources at the time of writing. Confirm with the Protocol Engineer or Shielded DevOps team which Cardano parameters are critical and must be verified after any restart.

---

### Phase 4 — DB Sync recovery after Cardano node restart

Once the Cardano node is running and syncing, DB Sync should reconnect automatically. Monitor:

```bash
# Watch DB Sync logs for reconnection
journalctl -u cardano-db-sync -f

# Check DB Sync block height vs network tip
curl -s http://localhost:8080/metrics | grep cardano_db_sync_db_block_height
```

If DB Sync does not reconnect automatically:

```bash
systemctl restart cardano-db-sync
journalctl -u cardano-db-sync -f
```

Allow DB Sync sufficient time to catch up to the network tip before checking Midnight validator health. DB Sync catching up from a significant lag may take minutes to hours depending on how far behind it fell.

---

### Phase 5 — External escalation (IOG / Cardano DB Sync team)

If the Cardano node failure involves a bug in the Cardano software itself — rather than a configuration or infrastructure issue — resolution requires the Cardano DB Sync team at IOG.

The team has an established relationship with the DB Sync team. Leonard Hegarty has previously coordinated directly with the DB Sync team on the DB Sync rollback bug (2026-03-23). Escalation path: Leonard Hegarty → Cardano DB Sync team contact.

When escalating to IOG:
- Document the exact error messages from the Cardano node and DB Sync logs
- Note the Cardano node version and DB Sync version on the affected nodes
- Note the network (Mainnet / PreProd)
- Describe the observed Midnight impact

---

## Post-recovery verification

- [ ] Cardano node process running without errors
- [ ] Cardano node block height advancing and at or near the network tip
- [ ] DB Sync reconnected and syncing
- [ ] DB Sync block height at or near the network tip
- [ ] No rollback messages in DB Sync logs for at least 10 minutes
- [ ] Midnight validator showing healthy peer count on telemetry
- [ ] No block hash divergence visible on Midnight telemetry
- [ ] Declare incident resolved in channel with timestamp

---

## Known gaps in this runbook

The following information was not available in the source documentation at the time of writing. These gaps must be filled before this runbook can be considered complete:

1. **Cardano node service name** — not standardised across FNO environments. Confirm per-FNO.
2. **Critical Cardano parameter environment variables** — the specific parameters that must be verified after a restart are not documented here. Obtain from Protocol Engineer or Shielded DevOps.
3. **DB Sync metrics port** — assumed `8080` based on the security assessment finding, but not confirmed as the standard port across all nodes.
4. **Whether FNOs run their own Cardano nodes** — the architecture assumes each validator runs its own Cardano node and DB Sync instance. Confirm this is true for all 10 FNO validators.

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 01 · DB Sync Failure | If the Cardano node is healthy but DB Sync is showing rollback errors |
| Runbook 04 · Node Outage | If the Midnight validator node itself has also stopped |
| Runbook 07 · Finality Stall | If Cardano node failure has propagated to Midnight and caused finality issues |
