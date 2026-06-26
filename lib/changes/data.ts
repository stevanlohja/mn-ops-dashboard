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
    id: "cardano-van-rossem-hf",
    title: "Cardano Van Rossem Hard Fork (PV11)",
    type: "cardano-hf",
    class: "A",
    summary:
      "Cardano protocol-version 11 upgrade. Midnight is a Cardano partner chain, so each validator's Cardano availability stack (cardano-node 11.0.1+, cardano-db-sync 13.7.0.5+) must upgrade before the fork epoch; the Midnight federated network follows.",
    onTrack: true,
    external: {
      reason:
        "Readiness is on the Cardano side — each FNO must update its Cardano availability stack (cardano-node / db-sync) before the fork epoch. There is no Midnight telemetry signal for this, so it is tracked by hand.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05-05" },
      preprod: { status: "completed", date: "2026-05" },
      mainnet: {
        status: "in-progress",
        date: "~2026-06-29",
        note: "On target for the Van Rossem Cardano Mainnet fork (end of June); Midnight follows the Cardano fork epoch.",
      },
    },
    links: [
      { label: "FNO migration runbook", url: `${OPS_REPO}/runbooks/fno/van-rossem-hard-fork-migration.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-06-26",
  },
  {
    id: "midnight-node-1-0-0",
    title: "Midnight node 1.0.0",
    type: "midnight-hf",
    class: "A",
    summary:
      "Governance-gated runtime upgrade to node 1.0.0 (spec_version bump; indexer reset/re-index). Promotes through Preview → Preprod → Mainnet per the compatibility matrix. Preprod is the active stage — the runtime upgrade is governance-actioned once the validator set is fully ready.",
    onTrack: true,
    readiness: {
      env: "preprod",
      targetVersion: "1.0.0",
      thresholdPct: 100,
      thresholdNote:
        "The governance-actioned runtime upgrade proceeds once the full Preprod validator set reports node 1.0.0.",
    },
    envs: {
      preview: { status: "completed", date: "2026-05" },
      preprod: {
        status: "in-progress",
        note: "Rolling out from 0.22.5 → 1.0.0; readiness tracked live below.",
      },
      mainnet: { status: "planned", note: "Follows Preprod. Currently on 0.22.5." },
    },
    links: [
      { label: "midnight-1-1 bundle", url: `${OPS_REPO}/releases/bundles/midnight-1-1/midnight-1-1.md` },
      { label: "Compatibility matrix", url: `${OPS_REPO}/releases/compatibility-matrix.md` },
    ],
    updated: "2026-06-26",
  },
];
