import { NetworkChange } from "./types";

const OPS_REPO = "https://github.com/midnightntwrk/midnight-network-ops/blob/main";

/**
 * EXPERIMENTAL, MANUALLY MAINTAINED. This is not live telemetry — it is a curated
 * status board. Update the entries (and each `updated` date) by hand as changes
 * progress. Statuses are sourced from the coordinated-change comms + the
 * compatibility matrix; keep them conservative and operator-/community-safe.
 *
 * Newest / most relevant first.
 */
export const CHANGES: NetworkChange[] = [
  {
    id: "midnight-node-1-0-1",
    title: "Midnight node 1.0.1",
    type: "node-release",
    class: "B",
    summary:
      "Non-consensus client patch to node 1.0.1 (version bump only — no spec_version change, no governance action). FNOs updated binaries in a rolling maintenance window; nodes on 1.0.0 and 1.0.1 interoperate. Preprod completed Mon Jul 27; Mainnet completed Tue Jul 28. (Preview 1.0.1 is a separate genesis/chain-spec reset, tracked on the patch board.)",
    onTrack: true,
    readiness: {
      env: "mainnet",
      targetVersion: "1.0.1",
      thresholdPct: 100,
      triggerLabel: "Rollout target",
      thresholdNote:
        "Rolling binary update, not governance-gated: the target is the full Mainnet validator set on node 1.0.1. Nodes on 1.0.0 keep validating meanwhile. Preprod reached the same target on Jul 27.",
    },
    envs: {
      preview: {
        status: "planned",
        note: "Preview 1.0.1 is a genesis/chain-spec regeneration (Locked tNight pool reset), gated separately on the patch board.",
      },
      preprod: {
        status: "completed",
        date: "2026-07-27",
        note: "FNO maintenance window Mon Jul 27: rolling binary update complete; full Preprod validator set on 1.0.1.",
      },
      mainnet: {
        status: "completed",
        date: "2026-07-28",
        note: "FNO maintenance window Tue Jul 28: rolling binary update complete; full Mainnet validator set on 1.0.1.",
      },
    },
    links: [
      { label: "node 1.0.1 patch note", url: `${OPS_REPO}/releases/patches/node/node-1-0-1.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-07-29",
  },
  {
    id: "midnight-node-1-0-0",
    title: "Midnight node 1.0.0",
    type: "midnight-hf",
    class: "A",
    summary:
      "Governance-gated runtime upgrade to node 1.0.0 (spec_version bump; indexer reset/re-index). Preview, Preprod, and Mainnet are all complete — the Mainnet runtime upgrade was governance-actioned once the full validator set reported 1.0.0.",
    readiness: {
      env: "mainnet",
      targetVersion: "1.0.0",
      thresholdPct: 100,
      thresholdNote:
        "The governance-actioned runtime upgrade enacted once the full Mainnet validator set reported node 1.0.0.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05" },
      preprod: {
        status: "completed",
        note: "Runtime upgrade complete; full validator set on 1.0.0.",
      },
      mainnet: {
        status: "completed",
        date: "2026-07-20",
        note: "Runtime upgrade enacted Mon Jul 20; full validator set on 1.0.0.",
      },
    },
    links: [
      { label: "midnight-1-1 bundle", url: `${OPS_REPO}/releases/bundles/midnight-1-1/midnight-1-1.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-07-27",
  },
  {
    id: "cardano-van-rossem-hf",
    title: "Cardano Van Rossem Hard Fork (PV11)",
    type: "cardano-hf",
    class: "A",
    summary:
      "Cardano protocol-version 11 upgrade. Midnight is a Cardano partner chain, so each validator's Cardano availability stack (cardano-node 11.0.1+, cardano-db-sync 13.7.1.0 on Mainnet) had to upgrade before the fork epoch; the Midnight federated network followed. Preview, Preprod, and Mainnet have all forked — the Cardano Mainnet fork enacted at the epoch boundary on Sat 18 Jul 2026 21:44:51 UTC with every FNO's Cardano stack confirmed ready.",
    onTrack: true,
    external: {
      reason:
        "Readiness was on the Cardano side — the fork epoch is set by Cardano, not Midnight. Every FNO's Cardano availability stack (cardano-node 11.0.1, db-sync 13.7.1.0) was upgraded and individually confirmed for Mainnet ahead of the fork; there was no Midnight telemetry signal for this, so it was tracked by hand.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05-05" },
      preprod: { status: "completed", date: "2026-05" },
      mainnet: {
        status: "completed",
        date: "2026-07-18",
        note: "Cardano Mainnet Van Rossem fork enacted at the epoch boundary on Sat 18 Jul 2026 21:44:51 UTC. All FNO Cardano stacks (cardano-node 11.0.1, db-sync 13.7.1.0) confirmed ready pre-fork; Midnight partner chain followed with no disruption.",
      },
    },
    links: [
      { label: "FNO migration runbook", url: `${OPS_REPO}/runbooks/fno/van-rossem-hard-fork-migration.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-07-20",
  },
];
