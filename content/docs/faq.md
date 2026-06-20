# FAQ

Frequently asked questions about Midnight network operations. This page serves
Federated Node Operators (FNOs), the internal team, and Stake Pool Operators (SPOs).

Midnight is a privacy-focused blockchain that runs as a **partner chain to
Cardano** — it follows Cardano's epoch schedule and depends on Cardano data for
availability. Block production is performed by a permissioned set of operators
(FNOs); Cardano stake pool operators (SPOs) participate in the Cardano-side
consensus and governance that the partner chain relies on.

<!-- Add Q&A entries under the relevant section below. -->

## For FNOs

### What is a Midnight validator?

A Midnight validator is a `midnight-node` running in validator mode, operated by a
Federated Node Operator (FNO). FNOs are the permissioned block producers of the
network. Because Midnight is a partner chain to Cardano, each validator runs
alongside Cardano availability services and reads Cardano chain data through a
local PostgreSQL database populated by `cardano-db-sync`.

### What do I need to run one?

Every validator host runs three things on the **same instance**: `midnight-node`,
`cardano-node`, and `cardano-db-sync` (+ PostgreSQL). Minimum hardware:

| Component | Mainnet (min) | Preprod (min) |
| --- | --- | --- |
| CPU | 16–24 cores (≥3.0 GHz) | 8 cores (≥2.5 GHz) |
| RAM | 128 GB | 32 GB |
| Storage | 2 TB NVMe SSD | 500 GB NVMe SSD |
| IOPS | ≥60,000 | ≥20,000 |
| Network | 1 Gbps | 500 Mbps |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

- **OS / GLIBC:** Ubuntu 24.04+ (recommended) or Debian 13+, GLIBC ≥ 2.39. Verify with `ldd --version`.
- **Region (Mainnet only):** deploy in the **EU region**. **Avoid GCP** — it is over-represented; prefer AWS, Azure, Hetzner, OVH, or bare metal for decentralization. Preprod has no region restriction.

Full specs: [Mainnet requirements](/docs/fno-guides/mainnet/requirements) ·
[Preprod requirements](/docs/fno-guides/preprod/requirements).

### How do I onboard?

Pick **one** environment and follow that track end-to-end — do not mix steps
between Preprod and Mainnet. Both tracks share five steps:

1. Requirements — provision hardware and OS.
2. Install Node & Generate Keys — install `midnight-node`, create validator keys.
3. Cardano Availability — stand up `cardano-node` + `cardano-db-sync` + PostgreSQL.
4. WireGuard Integration — join the trusted overlay (Mainnet).
5. Run Validator — launch and confirm block production.

Start here: [FNO Guides](/docs/fno-guides).

### How is Mainnet different from Preprod?

:::warning[They are not interchangeable]

- **Mainnet** joins a WireGuard **guarded overlay** and launches with
  `--reserved-only` plus a fixed `--reserved-nodes` peer list. Stricter EU-region
  and hardware requirements apply.
- **Preprod** uses **standard peer discovery** — no overlay, no reserved-node
  flags — and has lighter requirements.

:::
### What are session keys?

Block production requires three session keys, supplied as environment variables
(or `_FILE` variants pointing at the keystore):

- `AURA_SEED` — block authoring
- `GRANDPA_SEED` — finality
- `CROSS_CHAIN_SEED` — partner-chain coordination

You share only the **public** keys with the Foundation. Never share seeds or
private keys.

### How does block production work?

Two independent mechanisms run each epoch: **AURA** authors blocks, and **GRANDPA**
finalizes them. They are separate — finality can stall while block production
continues, which is why you must monitor both. A committee selected each epoch gives
every FNO **equal voting weight**, and the committee order is reshuffled every epoch.
Full explanation: [Consensus & Block Production](/docs/architecture/consensus-and-block-production).

### Why is my block production bursty / unevenly spaced?

This is normal and cosmetic. When the committee holds more seats than there are
FNOs, your seats land at scattered positions in the shuffled list, so you may author
two blocks seconds apart and then wait a minute or two. Your average gap (~60s) and
your overall share of blocks are unchanged. A small per-epoch block-count variation
(the "last lap" effect) is also expected and averages out — it does not affect voting
weight or fault tolerance.

### What happens if finality stalls?

If more than 1/3 of voting weight goes offline, GRANDPA stops finalizing while AURA
keeps producing — the chain can fork into a "bushy" tree. **Indexers consume only
finalized blocks, so they stop, and DApp clients stall.** It resolves when the
offline node(s) rejoin (most common) or governance updates the FNO set; the canonical
chain is then finalized and competing forks are pruned (their transactions return to
the pool). The lesson for operators: keep your node online — finality needs more than
2/3 of operators voting at all times. See
[Consensus & Block Production](/docs/architecture/consensus-and-block-production).

### My node is synced but not producing blocks. Why?

Most often one of two reasons:

1. **Keys not loaded.** Check startup logs for `AURA pubkey:`, `GRANDPA pubkey:`,
   and `CROSS_CHAIN pubkey:`:

        journalctl -u midnight-node -f

    If those lines are missing, the node has no keys loaded and cannot validate.

2. **The n+2 epoch rule.** A newly added validator stays passive for two Cardano
   epochs. Epoch *n*: added to the set. Epoch *n+1*: queued. Epoch *n+2*: block
   production begins. Confirmed authoring shows `🏆 Prepared block…` /
   `✨ Successfully proposed block…` in the logs.

### Common issues and solutions

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Node syncs blocks but finality is stuck / not participating | Wrong GRANDPA key path after a config change. Block-sync health alone hides this. | Correct the GRANDPA key path in the env file, restart, and add **finality/GRANDPA participation** monitoring — block-sync checks are not enough to confirm validator health. |
| Peer count stuck at 0 | Firewall, or (Mainnet) wrong/stale reserved-node or WireGuard config | Open p2p port **30333**. On Mainnet, confirm your `--reserved-nodes` list and WireGuard handshakes; request an updated `wg0.conf` if peers won't establish. |
| WireGuard won't peer with all nodes | Incorrect WireGuard public key(s) | Re-verify the public keys you submitted; ask the Foundation for a refreshed `wg0.conf`. See the [live preprod overlay allocation](/docs/fno-guides/preprod-wireguard-onboarding). |
| PostgreSQL connection refused | DB not on 5432, or wrong `.env` / `.pgpass` values | Confirm PostgreSQL is up on port 5432 and the connection string in `.env` matches `.pgpass`. |
| Disk fills during a Cardano migration | `cardano-db-sync` replay placed on an undersized volume | Check disk headroom and `data_directory` placement **before** any large replay; keep the Postgres datadir on the large NVMe volume. |
| Node fails to start after an upgrade | Packaging or chain-config change missed | Release archives change format (`.zip` vs `.tar.gz`) and may ship a new `res/` chain-config directory. Update **both** binary and config; read the release note. |

### How do I know which version to run?

Run the version coordinated by the Foundation and announced via Notifi, and stay
within the supported window in the
[compatibility matrix](https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/compatibility-matrix.md).
Do **not** jump ahead to a new major (e.g. a `1.0.0` line) before the coordinated
upgrade window — premature upgrades have had to be rolled back. Coordinated
deadlines always state an exact date and time in UTC.

### When are monthly reports due?

One report per operator per month, by the **5th of the following month (UTC)**,
submitted as a PR. Template and instructions:
[reports/fno/README.md](https://github.com/midnightntwrk/midnight-network-ops/blob/main/reports/fno/README.md).

### Where do I get help and notifications?

- **Real-time support:** `#fno-validator-ops` on Discord (keep notifications on).
- **Announcements & alerts:** Midnight Notifi — <https://midnight.notifi.network/>
  (Discord, Email, SMS, Telegram).
- **Live calls:** the Validator Stage in Discord (requires the Validator Role —
  verify your access ahead of any scheduled call).
- **Node visibility:** public telemetry at <https://telemetry.shielded.tools/>.

## For the internal team

### What is this repository?

`midnight-network-ops` is the canonical coordination surface shared with operators:
configs, runbooks, release records, change requests, FNO/SPO docs, monthly reports,
and incidents. Treat it as the source of truth — verify operational facts here
before asserting them in any comm.

Key locations:

- `docs/` — operator-facing guides (this site).
- `configs/` — `wireguard/` and `nodes/` configs.
- `changes/planned/` and `changes/completed/` — coordinated change records (primary
  source for announcements).
- `runbooks/fno/` — operator procedures (link these instead of inlining steps).
- `releases/` — bundles, components, and the compatibility matrix.
- `reports/fno/<YYYY-MM>/` — operator monthly reports.
- `incidents/` — RCAs.

### How are FNO communications sent?

Drafts are distributed through Notifi, which pushes to Discord, Email, SMS, and
Telegram. Notifi does **not** render markdown — all operator-facing comm output is
plain text. A human reviews and approves every draft before it is pasted into
Notifi; nothing is sent automatically.

### How do monthly reports work?

Operators submit one report per month by the 5th of the following month (UTC) via
PR. Reviewers check naming, that all sections are present (`None` is acceptable),
that incidents reference an RCA where warranted, and that asks tagged `[BLOCKER]`
or `[DECISION]` are routed to an owner. See
[reports/fno/README.md](https://github.com/midnightntwrk/midnight-network-ops/blob/main/reports/fno/README.md).

### Which operator issues should comms preempt?

Recurring pain points worth addressing proactively:

- **Session-key loading** — include key-verification steps with any epoch-activation comm.
- **Upgrade packaging** — call out `.zip`/`.tar.gz` changes and any new `res/` config files explicitly.
- **WireGuard submissions** — late or incorrect public keys block peering; emphasize that late submissions delay other FNOs.
- **n+2 timing** — state the exact epoch and UTC timestamp that triggers block production.
- **Discord access** — remind FNOs to confirm the Validator Role before required calls.
- **Monitoring gaps** — block-sync health is not validator health; finality must be monitored separately.

### How are security incidents handled?

For a suspected compromise, contact `security@midnight.foundation` first (see
`SECURITY.md`). The monthly report may reference an incident in summary, but full
detail belongs in the private incident channel, not in a report or comm.

### What is the current hard-fork context?

Cardano's **Van Rossem** hard fork drives the current preparation cycle (parallel
`cardano-db-sync` stacks, `cardano-node` 11.0.1 / db-sync 13.7.0.5). Mainnet
enactment depends on Cardano governance (DRep, SPO, and Constitutional Committee
voting) and is not final until those stages pass. See
[runbooks/fno/van-rossem-hard-fork-migration.md](https://github.com/midnightntwrk/midnight-network-ops/blob/main/runbooks/fno/van-rossem-hard-fork-migration.md).

## For SPOs

### How is an SPO different from an FNO?

A **Stake Pool Operator (SPO)** runs a Cardano stake pool and participates in
Cardano's consensus and on-chain governance. A **Federated Node Operator (FNO)**
is a permissioned block producer on Midnight itself. They are distinct roles:
running a Cardano stake pool does not make you a Midnight block producer, and
vice versa.

### How do SPOs relate to Midnight?

Midnight is a partner chain to Cardano, so it inherits Cardano's security and
follows its epochs. SPO participation matters most at **governance milestones**:
Midnight hard-fork enactment depends on Cardano governance actions clearing the
DRep, SPO, and Constitutional Committee voting cycles. SPO voting is therefore
part of what gates major Midnight network changes.

### Is there SPO-specific tooling?

The Midnight indexer ships an **SPO standalone mode** (SQLite) and an
`spo-indexer` image in the `4.3.x` line, intended for lighter-weight standalone
indexing. Consult the relevant release notes under `releases/` for the supported
versions.

### Where are the SPO guides?

:::note[Coming soon]

Dedicated SPO procedures (`docs/spo-guides/`) are not yet published. Until they
land, reach out in the [Midnight Discord](https://discord.com/invite/midnightnetwork)
for SPO-related questions, and refer to the partner-chain context above.

:::