# Consensus & Block Production

How a Midnight validator produces and finalizes blocks, and what that means for
operating a node. Midnight uses two **independent** mechanisms:

- **AURA** — block production (authoring).
- **GRANDPA** — finality (agreeing which blocks are permanent).

They run independently. This is the single most important thing to understand:
**a finality stall does not stop block production, and a healthy block-sync signal
does not prove your validator is healthy.** Monitor both.

## The committee and equal voting weight

Block production and finality are performed by a **committee** selected once per
epoch from the permissioned FNO set. Seats are distributed so that every FNO holds
**equal voting weight** — the design goal is a clean, equal-weight committee each
epoch. The committee may hold more seats than there are FNOs, in which case each
FNO holds several seats.

The committee list is **randomly shuffled every epoch**, so the order in which
operators author blocks changes from epoch to epoch.

## AURA: block production

AURA walks the shuffled committee list **sequentially**, authoring roughly one
block per slot. With equal weight, every FNO authors the same share of blocks.

### Why block timing can look bursty

When the committee holds more seats than there are FNOs, each operator's seats land
at **scattered positions** in the shuffled list. AURA hits them in order, so you may
author two blocks a few seconds apart and then wait a minute or two for the next.

- The **average** gap is still about 60 seconds.
- Your **share** of block production is unchanged.
- This is cosmetic timing variation, not a fault. It is most visible when the
  committee is larger than the FNO count.

### The "last lap" effect

An epoch is **300 slots**. AURA cycles through the committee list repeatedly
(`slot % committee_size`). When 300 is not an exact multiple of the committee size,
the final pass through the list is **partial** — the operators whose shuffled seats
fall in that partial pass get one extra block that epoch.

This is random per epoch (the shuffle changes who benefits) and averages out over
time. It is **not** a fault-tolerance concern — voting weight is set by seat count,
not by how many blocks you happened to author. It only matters if block counts are
used for per-block accounting. The effect exists at any committee size where 300 is
not an exact multiple; it is not specific to any one configuration.

## GRANDPA: finality

GRANDPA is a **Byzantine Fault Tolerant (BFT)** finality gadget. It finalizes a
block once nodes holding **more than 2/3 of total voting weight** agree on it. With
equal weight across FNOs, that 2/3 threshold becomes a simple node count.

A "fault," in GRANDPA's terms, is **any node that cannot vote** — not just a
malicious one. A crash, an ISP outage, a DDoS against the node's interface, a
misconfigured firewall, or a hardware failure all count the same: a node that can't
vote is a node that can't vote.

### Fault tolerance by FNO count

Assuming equal voting weight, the number of operators that can be offline before
finality is at risk is:

| FNOs | Nodes needed for finality | Max offline | Fault tolerance |
| --- | --- | --- | --- |
| 4 | 3 | 1 | 25% |
| 5 | 4 | 1 | 20% |
| 6 | 5 | 1 | 17% |
| 7 | 5 | 2 | 29% |
| 8 | 6 | 2 | 25% |
| 9 | 7 | 2 | 22% |
| 10 | 7 | 3 | 30% |
| 11 | 8 | 3 | 27% |
| 12 | 9 | 3 | 25% |
| 13 | 9 | 4 | 31% |
| 14 | 10 | 4 | 29% |
| 15 | 11 | 4 | 27% |

Fault tolerance **oscillates** as the count grows: adding a node dilutes each node's
share until the count crosses the next integer 2/3 boundary, where one more
simultaneous fault becomes tolerable and the tolerable percentage jumps back up.

The operational takeaway: **finality depends on more than 2/3 of operators being
online and reachable at all times.** This is why 24/7 on-call coverage and resilient
networking matter — every offline node, for any reason, counts against the threshold.

## What happens during a finality stall

If too many nodes drop below the 2/3 threshold, GRANDPA stops finalizing. Because
AURA keeps producing blocks, the chain can develop short-lived **forks** — a "bushy"
tree of competing blocks instead of a clean line. Practical impact:

- **Indexers stop.** Midnight's indexers consume only *finalized* blocks. During a
  stall they produce no new output, so DApp clients that depend on the indexer are
  fully stalled — unable to observe new state, not merely degraded.
- **Transactions may need relocation.** Transactions in blocks on a losing fork are
  not lost, but they return to the transaction pool to be re-included on the winning
  fork during recovery. Recovery is messier than simply catching up.

### How a stall resolves

1. **The offline node rejoins (most common).** Once the missing operator's node is
   voting again, GRANDPA reaches consensus on a canonical chain, finalizes it, and
   prunes the competing forks. Transactions on pruned forks return to the pool.
2. **Governance changes the FNO set.** If a node is permanently lost, governance can
   update the permissioned candidate list; at the next epoch boundary the committee
   is re-selected from the new set and its voters resolve the forks.
3. **Epoch boundary.** Each epoch re-runs committee selection with a fresh shuffle.
   In the network's standard equal-weight configuration this does not by itself clear
   a stall — recovery comes from path 1 or 2.

In every case GRANDPA selects one canonical chain, finalizes it, and discards the
rest. The network recovers, but a stall is disruptive — not a graceful degradation.

## Operator takeaways

- **Monitor finality separately from block sync.** A node can sync blocks while
  failing to participate in GRANDPA (for example, a wrong GRANDPA key path). Block
  import alone is a false healthy signal — alert on GRANDPA round progress and
  finalized-height advancement.
- **Stay online.** Finality needs more than 2/3 of operators voting; your uptime is
  part of the network's fault tolerance, not just your own SLA.
- **Expect bursty authoring.** Uneven block spacing is normal and cosmetic.
- **You won't produce immediately.** New validators stay passive until the n+2 epoch
  transition — see [Run Validator](/docs/fno-guides/mainnet/run-validator).

For common symptoms and fixes, see the [FAQ](/docs/faq).
