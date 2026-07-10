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
    id: "midnight-node-1-0-0",
    title: "Midnight node 1.0.0",
    type: "midnight-hf",
    class: "A",
    summary:
      "Governance-gated runtime upgrade to node 1.0.0 (spec_version bump; indexer reset/re-index). Preview and Preprod are complete; Mainnet is the active stage. FNOs upgrade in a coordinated maintenance window, then the runtime upgrade is governance-actioned once the full Mainnet validator set is ready.",
    onTrack: true,
    readiness: {
      env: "mainnet",
      targetVersion: "1.0.0",
      thresholdPct: 100,
      thresholdNote:
        "The governance-actioned runtime upgrade enacts once the full Mainnet validator set reports node 1.0.0.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05" },
      preprod: {
        status: "completed",
        note: "Runtime upgrade complete; full validator set on 1.0.0.",
      },
      mainnet: {
        status: "in-progress",
        date: "2026-07-20",
        note: "FNO maintenance window Jul 14–16; governance window Jul 16–17; runtime upgrade enacts Mon Jul 20.",
      },
    },
    links: [
      { label: "midnight-1-1 bundle", url: `${OPS_REPO}/releases/bundles/midnight-1-1/midnight-1-1.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-07-10",
  },
  {
    id: "cardano-van-rossem-hf",
    title: "Cardano Van Rossem Hard Fork (PV11)",
    type: "cardano-hf",
    class: "A",
    summary:
      "Cardano protocol-version 11 upgrade. Midnight is a Cardano partner chain, so each validator's Cardano availability stack (cardano-node 11.0.1+, cardano-db-sync 13.7.1.0 on Mainnet) must upgrade before the fork epoch; the Midnight federated network follows. Preview and Preprod have forked; Mainnet FNO preparedness is complete and awaiting the Cardano Mainnet fork epoch.",
    onTrack: true,
    external: {
      reason:
        "Readiness is on the Cardano side — the fork epoch is set by Cardano, not Midnight. Every FNO has upgraded its Cardano availability stack (cardano-node / db-sync) for Mainnet; there is no Midnight telemetry signal for this, so it is tracked by hand.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05-05" },
      preprod: { status: "completed", date: "2026-05" },
      mainnet: {
        status: "in-progress",
        note: "FNO Cardano-stack preparedness complete (cardano-node 11.0.1, db-sync 13.7.1.0); awaiting the Cardano Mainnet Van Rossem fork epoch.",
      },
    },
    links: [
      { label: "FNO migration runbook", url: `${OPS_REPO}/runbooks/fno/van-rossem-hard-fork-migration.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-07-10",
  },
];
