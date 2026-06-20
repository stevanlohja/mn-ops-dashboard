# Runbook 03 · Validator Isolation / Zero Peers

**Severity range:** P1 → P2
**Audience:** Internal DevOps · FNO Operators
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

A validator is **isolated** when it is running and visible on the telemetry dashboard but shows a peer count of zero — meaning it has no active connections to other nodes on the network.

This is distinct from:
- **Runbook 02 · Peer Misconfiguration** — where the node has *some* peers but below the expected 17
- **Runbook 04 · Node Outage** — where the node process has stopped entirely and the node disappears from telemetry

An isolated validator is functionally offline for consensus purposes. It cannot receive or gossip blocks, cannot participate in AURA block production, and cannot contribute to GRANDPA finality — even though the process is running and reporting to telemetry.

---

## Why peer count reaches zero — confirmed causes

The following characteristics of the Midnight network explain why zero-peer isolation occurs:

**Validators use P2P networking to connect to their configured peers.** All libp2p peer connections depend on this connectivity being available and reachable. If network connectivity is unavailable or unreachable for any reason, the node has no path to connect to any peer.

**Peer connections are fully restricted by `--reserved-only` and `--reserved-nodes`.** The node will not attempt to discover or connect to any peer not explicitly listed. If the reserved nodes list is empty, wrong, or unreachable, the node connects to nobody.

**The network uses a configured peer list with static addresses.** If a peer's IP changes and the peer configuration is not updated, the node can no longer reach that peer. If enough peers have moved, the count drops to zero.

**Possible root causes — to be worked through in triage order:**

| # | Cause | Key question |
|---|---|---|
| 1 | Node was recently restarted | Did peer count drop during a restart? It recovers within ~2 min |
| 2 | `--reserved-nodes` missing or empty | Is the flag present in the node's startup arguments? |
| 3 | Network connectivity issue | Is the node able to reach other peers on the network? |
| 4 | Peer connections stale or dropped | Are active P2P connections present? |
| 5 | Static IP changed | Has the FNO's host IP changed since peer configuration was last distributed? |
| 6 | Host firewall or cloud security group blocking P2P traffic | Are the required ports open to known peer IPs? |
| 7 | Stale chain data after network reset | Does the node's genesis hash match the current network? |
| 8 | Wrong or outdated chain-spec file | Is an externally mounted chain-spec overriding the built-in one? |
| 9 | P2P port conflict (containerised environments) | Is another service already listening on the node's P2P port? |
| 10 | Unknown — escalate | None of the above explains it |

> **Do not skip steps or jump to conclusions.** Each cause presents identically on the telemetry dashboard — peer count 0. The triage order above moves from fastest-to-check to most complex. Work through it sequentially.

---

## Why it matters

With 10 FNO validators on Mainnet, losing the participation of even one affects the network's resilience. AURA consensus assigns block production slots in a deterministic round-robin across the active validator set — an isolated validator will miss its assigned slots. GRANDPA finality requires 2/3 of validators to be in agreement — isolation of multiple validators simultaneously can stall finality.

**Severity depends on how many validators are isolated:**

| Isolated validators | Impact | Severity |
|---|---|---|
| 1 | Network healthy, one validator missing slots | P2 |
| 2 | Reduced resilience, finality may slow | P2 → monitor for escalation |
| 3+ | >33% of validator set affected — block production and finality at risk | P1 immediately |

---

## How to detect

### Primary signal — Telemetry dashboard

Open: `https://telemetry.shielded.tools` → **Midnight Mainnet** tab

| Signal | What to look for |
|---|---|
| **Peer Count column** | Any FNO validator showing 0 |
| **Block column** | Isolated node's block height frozen — not advancing with the rest of the network |
| **Last Block Time** | Isolated node showing a growing "last block" time while others remain current |
| **Node still visible** | Unlike a full outage, the node remains in the list — it is running but disconnected |

> **Peer count 0 vs peer count low:** A count of 0 means complete isolation — treat as this runbook. A count of 1–2 could be transient peer churn or the early stages of isolation — watch for 2 minutes before acting. A sustained count below 17 but above 2 is Runbook 02 territory.

---

## Triage

```
[] How many FNO validators are showing peer count 0?
[] Is the affected node's block height frozen or still advancing?
[] Did this coincide with a recent restart, upgrade, or config change?
[] Has the FNO recently changed their hosting environment or IP?
[] Was a new peer config recently distributed to the network?
[] Has the network been reset since the node's chain data was last initialised?
[] Is the node using an externally mounted chain-spec, or the one built into the image?
[] Is the node running in a containerised environment (K8s, Docker) where port conflicts are possible?
```

---

## Remediation

### Phase 1 — Rule out transient restart

Before contacting the FNO, wait **2 minutes** and refresh telemetry. A node that was recently restarted will briefly show 0 peers while libp2p peer discovery runs. If peer count recovers to 17 without intervention, no action is required — note it in the incident log and monitor.

If after 2 minutes the count remains 0, proceed.

---

### Phase 2 — Contact the FNO

Reach out via the designated private channel using the comms template below. Ask the FNO to work through the following checks on their node, **in order**.

---

### Phase 3 — Triage checks (FNO to perform, DevOps to guide)

**Check 1 — Verify `--reserved-nodes` is present**

Ask the FNO to confirm their node startup arguments include both flags:

```bash
# Check running process arguments
ps aux | grep midnight-node
# or check the service definition
systemctl cat midnight-node
```

If `--reserved-only` or `--reserved-nodes` is missing → this is the cause. Proceed to config correction using **Leonard's 5-Step Upgrade Ceremony** (config fix variant, same as Runbook 02 Phase 3).

---

**Check 2 — Verify network connectivity**

Ask the FNO to confirm the node can reach its configured peers. Try a basic connectivity test to a known peer IP:

```bash
# Ping a known peer IP
ping -c 3 <peer-ip>

# Or test TCP connectivity to a peer's P2P port
curl -v telnet://<peer-ip>:30333 --connect-timeout 5
```

If the node cannot reach any peers, investigate the host's network configuration, DNS resolution, and whether the network interface is up and correctly configured.

---

**Check 3 — Verify static IP has not changed**

The architecture requires all validators to use static IPs. Peer configurations reference these IPs directly — if a node's public IP has changed since the configuration was last distributed, the node cannot connect to any peer whose config still references the old IP.

Ask the FNO to confirm their current public IP:

```bash
curl -s https://ifconfig.me
# or
curl -s https://api.ipify.org
```

Compare against the IP in the current peer configuration distributed to other nodes. If it has changed, a new peer configuration must be distributed to all other participants — this requires coordination with the full FNO set and should be escalated to DevOps Lead.

---

**Check 4 — Verify firewall and cloud security group rules**

If the host firewall or cloud provider security group is blocking the P2P port, peer connections cannot establish.

Ask the FNO to check their firewall:

```bash
# For nftables
nft list ruleset | grep <p2p-port>

# For iptables
iptables -L -n | grep <p2p-port>
```

On cloud instances, check the cloud provider's security group or VPC firewall rules directly in their console — host firewall checks alone are insufficient since cloud rules sit outside the OS.

The P2P port must be open for inbound traffic from all known peer IPs. Cloud instances should have security groups (AWS) or VPC firewall rules (GCP) restricting the P2P port to known validator IPs.

> **Note:** Confirm the specific P2P port in use from the node's startup arguments or peer configuration before directing FNOs to check firewall rules.

---

**Check 5 — Verify genesis hash matches the current network**

A node running with stale chain data or a wrong chain-spec will have a different genesis hash from the rest of the network. It will show 0 peers because no peer on the current network recognises it. This was confirmed in a March 2026 Preprod incident where a node was stuck at 0 peers because it retained chain data from a pre-reset network.

Ask the FNO to query their node's genesis hash:

```bash
curl -s -H "Content-Type: application/json" \
  -d '{"id":1,"jsonrpc":"2.0","method":"chain_getBlockHash","params":[0]}' \
  http://localhost:9944
```

Compare the result against the known genesis hash for the current network. If the hashes differ, the node is on the wrong chain.

**To resolve a genesis hash mismatch:**

1. Stop the node
2. Delete the chain data directory (`paritydb/` and `ledger_storage/`)
3. If the node is using an externally mounted `chain-spec-raw.json`, **remove the mount** — the correct chain-spec is baked into the node Docker image and will be used automatically when `CFG_PRESET` is set (e.g. `CFG_PRESET=preprod` or `CFG_PRESET=mainnet`)
4. Restart the node
5. Re-run the genesis hash query above to confirm it now matches

> **Lesson learned:** After any network reset, all nodes must purge their old chain data. An externally mounted chain-spec from before the reset will override the correct built-in one, producing a genesis mismatch that presents identically to other zero-peer causes on telemetry. Always verify the genesis hash early in triage — it is the fastest way to rule out or confirm this cause.

---

**Check 6 — Verify no P2P port conflict (containerised environments)**

In Kubernetes or Docker environments, another service may already be listening on the node's default P2P port (30333). The node will start and connect outbound to bootnodes, but peers cannot connect back — resulting in 0 peers or peers that drop immediately.

Ask the FNO to check for port conflicts:

```bash
# Inside the container / pod
ss -tlnp | grep 30333
# or
netstat -tlnp | grep 30333
```

If another process is bound to port 30333:

- Add `--port 30334` (or another available port) to the node startup arguments to move the P2P listener
- Update the container port and Kubernetes Service/Ingress to expose the new port
- Restart the node and check telemetry for peer recovery

> **Note:** Changing the P2P port does not affect outbound connections — the node will still reach bootnodes and reserved peers on their advertised ports. Only inbound peer connections are affected.

---

**Check 7 — None of the above resolves it**

If the node still shows 0 peers after working through all six checks:

- [ ] Escalate to Protocol Engineer immediately
- [ ] Collect and share: network connectivity test results, node startup arguments, current public IP, systemd service status, last 50 lines of midnight-node logs
- [ ] Do not attempt further config changes without Protocol Engineer guidance

---

### Phase 4 — Verify recovery

- [ ] Telemetry: affected node peer count returns to 17
- [ ] Telemetry: node's block height resumes advancing in line with the network
- [ ] Node shows active peer connections
- [ ] No recurrence within the following 30 minutes
- [ ] Document the confirmed root cause in the incident channel

---

## FNO Comms Templates

### Template A — Initial contact

```
Hey [FNO] -- we can see your node is showing 0 peers on telemetry.
Your node process is running fine but it appears isolated from the network.

Can you work through a few quick checks with us?
Join the call: [link] -- or we can walk through it here step by step.
```

---

### Template B — Network connectivity check

```
Can you check whether your node can reach its configured peers?

Try pinging a known peer IP, or test TCP connectivity to a peer's P2P port.
Let us know the results so we can narrow down the issue.
```

---

### Template C — IP change suspected

```
Can you confirm your node's current public IP?

  curl -s https://ifconfig.me

We want to check whether it matches the IP in the current peer config.
If it has changed we'll need to redistribute configs to all nodes --
we'll coordinate that from our side.
```

---

### Template E — Genesis hash mismatch suspected

```
Can you run this from your node and share the output?

  curl -s -H "Content-Type: application/json" \
    -d '{"id":1,"jsonrpc":"2.0","method":"chain_getBlockHash","params":[0]}' \
    http://localhost:9944

We need to check whether your genesis hash matches the current network.
If it doesn't, you'll need to:
1. Stop the node
2. Delete the chain data directory (paritydb/ and ledger_storage/)
3. Remove any externally mounted chain-spec-raw.json -- the correct one
   is built into the node image and will be picked up automatically
4. Restart the node

Let us know what you see and we'll confirm the expected hash.
```

---

### Template D — Recovery confirmed

```
Peer count is back to 17 on telemetry -- your node looks healthy again.

Can you confirm from your side that the node shows active peer connections?
Thanks for working through that with us.
```

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 02 · Peer Misconfiguration | If peer count is low but above 0 — different failure mode |
| Runbook 04 · Node Outage | If the node disappears from telemetry entirely rather than showing 0 peers |
| Runbook 07 · Finality Stall | If multiple validators are isolated simultaneously and finality begins to lag |
