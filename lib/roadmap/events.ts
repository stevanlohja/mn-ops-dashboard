import { RoadmapEvent } from "./types";

/**
 * HAND-AUTHORED roadmap events — the easy-to-edit surface. Add or change an
 * object below and it appears on the calendar immediately; no other file needs
 * to change.
 *
 * Coordinated changes tracked on the Network-Change board (lib/changes/data.ts)
 * are projected onto the calendar automatically (see derive.ts), so you do NOT
 * re-enter those here. Use this file for the granular items the change board
 * can't express: maintenance / governance windows, epoch boundaries, community
 * calls, freezes, and similar dated events.
 *
 * FIELD GUIDE
 *   id        unique string
 *   title     short label shown on the calendar bar
 *   category  hard-fork | node-release | runtime-upgrade | governance |
 *             maintenance | epoch | milestone | other   → drives the colour
 *   status    done | active | scheduled | planned | at-risk   → drives the style
 *   start     "YYYY-MM-DD" (a day) or "YYYY-MM" (a month marker). "~" prefix = approximate.
 *   end       optional inclusive "YYYY-MM-DD" — its presence makes this a
 *             MULTI-DAY window, rendered as a highlighted spanning bar.
 *   env       optional "mainnet" | "preprod" | "preview" | "all" (label only)
 *   summary   optional one-liner shown in the agenda and the detail panel
 *   link      optional { label, url }  — link out to the ops repo, not local paths
 *
 * Keep entries operator-safe and conservative: this is a planning view, not
 * live telemetry.
 */
export const EVENTS: RoadmapEvent[] = [
  {
    id: "mn-1-0-0-mainnet-maintenance",
    title: "FNO maintenance window · node 1.0.0",
    category: "maintenance",
    status: "scheduled",
    start: "2026-07-14",
    end: "2026-07-16",
    env: "mainnet",
    summary:
      "Coordinated Mainnet maintenance window: FNOs upgrade midnight-node to 1.0.0 ahead of the governance-gated runtime upgrade.",
    link: {
      label: "midnight-1-1 bundle",
      url: "https://github.com/midnightntwrk/midnight-network-ops/blob/main/releases/bundles/midnight-1-1/midnight-1-1.md",
    },
  },
  {
    id: "mn-1-0-0-mainnet-governance",
    title: "Governance window · runtime upgrade",
    category: "governance",
    status: "scheduled",
    start: "2026-07-16",
    end: "2026-07-17",
    env: "mainnet",
    summary:
      "Governance voting window for the node 1.0.0 runtime upgrade, opened once the Mainnet validator set reports full readiness.",
  },
];
