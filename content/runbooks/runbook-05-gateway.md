# Runbook 05 · Filtering Gateway Failure

**Severity range:** P1 → P2
**Audience:** Internal DevOps Engineers
**Last updated:** March 2026
**Runbook owner:** Protocol Ops

---

## What is this?

The filtering gateway is a stock `midnight-node` binary with a `FilteringPool` wrapper (~50–100 LOC) that sits at the boundary between the public internet and the internal validator network. It has two network interfaces:

- **Internal interface** — connected to the validator network. Peers with validators and other validator nodes.
- **Outer interface (public internet)** — accepts inbound libp2p connections from partner nodes, RPC backend nodes, and external peers.

The gateway fleet (2–3 nodes) is the **only path** between the public internet and the internal validator network. It relays blocks outward to external peers and filters inbound transactions before they reach validators.

> **Architecture source:** Guarded Launch Network Architecture v0.12, Section 3.3 and 5.2

---

## Why it matters

A gateway failure has a uniquely dangerous property: **the chain continues producing blocks and appears completely healthy on the telemetry dashboard**, but external transactions stop reaching the producer mempool and are never confirmed.

The failure presents as follows from different perspectives:

| Observer | What they see |
|---|---|
| Telemetry dashboard | Chain healthy — blocks producing, validators present, peer counts normal |
| External user / partner | Transaction submitted to RPC, receives acknowledgement, transaction never confirms |
| RPC node operator | Transaction enters local mempool, propagates to gateway, silently dropped |
| Gateway metrics | `gateway_peers_outer` drops, `gateway_tx_forwarded_total` stalls |

This is the most operationally deceptive failure mode in the network. By the time partners report that transactions are not confirming, the gateway may have been down for an extended period.

A single gateway failure is a P2 — the remaining 1–2 gateways continue serving external traffic. All gateways failing simultaneously is a P1 — the network is fully isolated from external transactions.

---

## How to detect

### Primary signal — Gateway metrics

The telemetry dashboard does **not** surface gateway health. Detection requires checking the gateway's Prometheus metrics endpoint directly.

```bash
# On the gateway host — check internal metrics
curl -s http://localhost:<prometheus_port>/metrics | grep gateway_
```

Key metrics to check (from the architecture document, Section 5.3):

| Metric | Type | What to watch for |
|---|---|---|
| `gateway_peers_inner` | Gauge | Connected validator network peers — should be non-zero |
| `gateway_peers_outer` | Gauge | Connected external peers — should be non-zero |
| `gateway_tx_received_total` | Counter | Transactions received from external peers |
| `gateway_tx_forwarded_total` | Counter | Transactions passed to validator network |
| `gateway_tx_denied_total` | Counter | Transactions dropped (by reason) |
| `gateway_blocks_relayed_total` | Counter | Blocks relayed to external peers |
| `gateway_blocks_imported_total` | Counter | Blocks imported from validator network |
| `gateway_pool_size` | Gauge | Current transaction pool occupancy |

> **Note:** The specific Prometheus port for the gateway metrics endpoint is not confirmed in the available documentation. Verify this from the gateway deployment configuration before using the command above.

**Warning signals:**
- `gateway_peers_inner` = 0 → gateway has lost connection to the validator network
- `gateway_peers_outer` = 0 → gateway has no external peers (external transactions cannot arrive)
- `gateway_tx_forwarded_total` is not incrementing despite `gateway_tx_received_total` incrementing → gateway is receiving but not forwarding (possible FilteringPool or process issue)
- `gateway_blocks_imported_total` is not incrementing → gateway has lost sync with the validator network

### Secondary signal — Partner reports

The first indication of a gateway failure may be a partner or external user reporting that transactions are submitting successfully but never confirming. This is consistent with the architecture's documented behaviour:

> *"The transaction sits in the RPC node's local pool until it expires with a generic timeout — indistinguishable from legitimate congestion."* (Architecture doc, Section 3.6)

A transaction timeout that takes approximately 600 blocks (~1 hour) to expire is a strong indicator of a gateway failure.

### Why the telemetry dashboard is insufficient

The telemetry dashboard shows the validator network — not the gateway. Validators continue producing blocks on the internal network regardless of gateway health. The dashboard will show:
- All FNO validators present
- Block production normal
- Peer counts at baseline
- Average block time ~6s

**Everything looks healthy.** The only way to detect a gateway failure from the telemetry dashboard alone is indirectly — if `gateway_peers_inner` drops to 0, the gateway will eventually drop off the validator peer list, which could reduce peer counts. But this is a lagging signal at best.

---

## Triage

```
[] How many gateways are currently in the fleet?
[] How many are showing degraded metrics (peers_inner = 0, peers_outer = 0)?
[] Is block production still occurring on the validator network? (check telemetry)
[] Are partners reporting transaction confirmation failures?
[] Are any transactions confirming at all on the chain?
[] Did this coincide with a recent upgrade, hard fork, or config change?
```

### Severity assignment

| Scenario | Severity |
|---|---|
| 1 gateway down, remaining gateways healthy | P2 |
| All gateways down, no external transactions confirming | P1 |
| Gateway internal interface down (isolated from validators) | P1 — equivalent to all traffic blocked |
| Gateway process crashed | P2 minimum, P1 if all gateways affected |

---

## Remediation

### Phase 1 — Confirm the failure

- [ ] Check gateway metrics on each gateway in the fleet
- [ ] Confirm whether the failure is on the internal interface (validator side) or outer interface (public internet side), or both
- [ ] Check whether the gateway process is running:

```bash
systemctl status midnight-node
```

- [ ] Check gateway logs for errors:

```bash
journalctl -u midnight-node -n 200 --no-pager
```

- [ ] Confirm block production is still healthy on the telemetry dashboard — this distinguishes a gateway failure from a validator/consensus failure

---

### Phase 2 — Recovery paths

#### Scenario A — Gateway process crashed

```bash
# Restart the gateway node
systemctl restart midnight-node

# Watch logs immediately after restart
journalctl -u midnight-node -f
```

After restart, verify:
- `gateway_peers_inner` recovers (connection to validator network re-established)
- `gateway_peers_outer` recovers (external peers reconnect)
- `gateway_tx_forwarded_total` begins incrementing again

---

#### Scenario B — Internal interface down

If the gateway has lost connectivity to the validator network (`gateway_peers_inner = 0`), the gateway is running but isolated from validators. Follow the connectivity triage procedure from **Runbook 03 · Validator Isolation**.

If connectivity is stale, restart the node service:

```bash
systemctl restart midnight-node
```

After connectivity recovery, verify `gateway_peers_inner` returns to a non-zero value.

---

#### Scenario C — Outer interface degraded (no external peers)

If `gateway_peers_outer` drops to 0 but `gateway_peers_inner` is healthy, external peers are not connecting to the gateway. Possible causes:

- Gateway host firewall or cloud security group blocking inbound connections on the P2P port
- DNS / CNAME record for the gateway has changed or expired
- Network-level issue upstream of the gateway (Cloudflare Spectrum, if active)

Check:
```bash
# Is the P2P port listening?
ss -tlnp | grep midnight

# Check inbound firewall rules
nft list ruleset | grep <p2p_port>
# or
iptables -L -n | grep <p2p_port>
```

> **Note:** The specific P2P port and firewall configuration details are not confirmed in the available documentation. Verify from the gateway deployment configuration.

---

#### Scenario D — FilteringPool issue

If the gateway process is running, internal connectivity is healthy, and peers are connected on both interfaces, but `gateway_tx_forwarded_total` is not incrementing despite `gateway_tx_received_total` incrementing, the FilteringPool wrapper may have encountered an issue.

The FilteringPool is controlled by the `--filter-deploy-txs` CLI argument. It can be toggled with a restart — **no rebuild required**.

> **Consult the Protocol Engineer before restarting a gateway with a modified `--filter-deploy-txs` flag.** Disabling filtering on a gateway removes the deployment restriction enforcement boundary. This must be an explicit, reviewed decision.

---

#### Scenario E — Hard fork divergence

The architecture document states:

> *"When the network hard forks, the gateway fleet must be upgraded before the fork block height or it will diverge from the canonical chain."*

If a hard fork has occurred and the gateway was not upgraded in time, the gateway will be on a different chain than the producers. Symptoms:
- `gateway_blocks_imported_total` stalls
- The gateway's reported block height falls behind the network tip

Remediation: upgrade the gateway binary to the runtime upgrade version and restart. The `FilteringPool` wrapper ships in every `midnight-node` binary — the upgrade process is the same as any node upgrade. Use **Leonard's 5-Step Upgrade Ceremony** from Runbook 01.

---

### Phase 3 — Post-recovery verification

- [ ] Gateway metrics: `gateway_peers_inner` > 0
- [ ] Gateway metrics: `gateway_peers_outer` > 0
- [ ] Gateway metrics: `gateway_tx_forwarded_total` incrementing
- [ ] Gateway metrics: `gateway_blocks_imported_total` incrementing
- [ ] Gateway's reported block height is at or near the network tip
- [ ] Submit a test transaction through an external RPC endpoint and confirm it reaches the chain
- [ ] No recurrence within 30 minutes
- [ ] Declare incident resolved in channel with timestamp

---

## Operational notes

**No FNO comms template.** Gateways are operated by Shielded Technologies, not FNO operators. There is no FNO communication required for a gateway failure — this is an internal infrastructure incident.

**Partner communication.** If a gateway failure has caused partner-facing transaction confirmation failures, the Comms Lead should notify affected partners once the incident is resolved. Partners will have observed transactions timing out without confirmation — an explanation and timeline should be provided.

**Cloudflare Spectrum.** The architecture document notes that Cloudflare Spectrum is deployed optionally on gateway P2P ports as a DDoS mitigation layer. If Spectrum is active and experiencing issues, this could present as an outer-interface failure on the gateway. Check Cloudflare status if outer-interface degradation cannot be explained by local configuration.

**Transaction expiry.** Transactions that were submitted during a gateway outage will sit in RPC node mempools until they expire (~600 blocks, approximately 1 hour). After gateway recovery, these transactions will not automatically retry — users must resubmit.

---

## Related Runbooks

| Runbook | When to cross-reference |
|---|---|
| Runbook 03 · Validator Isolation | For internal interface triage procedures |
| Runbook 04 · Node Outage | If the gateway process has crashed entirely |
| Runbook 09 · Mempool Exhaustion | If the gateway pool is full and transactions are being rejected before filtering |
| Runbook 13 · Deployer Abuse | If the FilteringPool is being bypassed or tampered with |
