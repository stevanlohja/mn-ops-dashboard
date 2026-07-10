import { NetworkId } from "@/lib/telemetry/networks";

/**
 * Roadmap event model (experimental, manually maintained). Pure types — no
 * React. Events come from two places, merged in lib/roadmap/select.ts:
 *   1. the Network-Change board, projected automatically (lib/roadmap/derive.ts);
 *   2. hand-authored entries in lib/roadmap/events.ts (the easy-to-edit surface).
 */

export type RoadmapCategory =
  | "hard-fork"
  | "node-release"
  | "runtime-upgrade"
  | "governance"
  | "maintenance"
  | "epoch"
  | "milestone"
  | "other";

export type RoadmapStatus = "done" | "active" | "scheduled" | "planned" | "at-risk";

export interface RoadmapEvent {
  id: string;
  title: string;
  /** Drives the event colour. */
  category: RoadmapCategory;
  /** Drives the fill/treatment (done ✓ / active pulse / dashed planned / at-risk ring). */
  status: RoadmapStatus;
  /** Start "YYYY-MM-DD" (a day) or "YYYY-MM" (a month marker). Prefix "~" = approximate. */
  start: string;
  /** Inclusive end "YYYY-MM-DD". Presence makes this a highlighted MULTI-DAY window. */
  end?: string;
  /** Environment this pertains to (label only). */
  env?: NetworkId | "all";
  summary?: string;
  link?: { label: string; url: string };
  /** Set when derived from the Network-Change board (see derive.ts). */
  changeId?: string;
}

export const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  "hard-fork": "Hard fork",
  "node-release": "Node release",
  "runtime-upgrade": "Runtime upgrade",
  governance: "Governance",
  maintenance: "Maintenance",
  epoch: "Epoch",
  milestone: "Milestone",
  other: "Event",
};

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  done: "Complete",
  active: "In progress",
  scheduled: "Scheduled",
  planned: "Planned",
  "at-risk": "At risk",
};

/**
 * Per-category style. Literal `mn-*` Tailwind class strings only (never build
 * class names dynamically — Tailwind must see them verbatim to emit the CSS).
 * `barBg`/`barBgStrong` are the single-day / multi-day fills; `spine` is the
 * solid accent rail on a multi-day window bar.
 */
export interface CategoryStyle {
  dot: string;
  text: string;
  barBg: string;
  barBgStrong: string;
  border: string;
  spine: string;
}

export const CATEGORY_STYLE: Record<RoadmapCategory, CategoryStyle> = {
  "hard-fork": {
    dot: "bg-mn-escalate", text: "text-mn-escalate", barBg: "bg-mn-escalate/15",
    barBgStrong: "bg-mn-escalate/25", border: "border-mn-escalate/40", spine: "bg-mn-escalate",
  },
  "runtime-upgrade": {
    dot: "bg-mn-accent", text: "text-mn-accent-2", barBg: "bg-mn-accent/15",
    barBgStrong: "bg-mn-accent/25", border: "border-mn-accent/40", spine: "bg-mn-accent",
  },
  "node-release": {
    dot: "bg-mn-accent-2", text: "text-mn-accent-2", barBg: "bg-mn-accent-2/15",
    barBgStrong: "bg-mn-accent-2/25", border: "border-mn-accent-2/40", spine: "bg-mn-accent-2",
  },
  governance: {
    dot: "bg-mn-p2", text: "text-mn-p2", barBg: "bg-mn-p2/15",
    barBgStrong: "bg-mn-p2/25", border: "border-mn-p2/40", spine: "bg-mn-p2",
  },
  maintenance: {
    dot: "bg-mn-p3", text: "text-mn-p3", barBg: "bg-mn-p3/15",
    barBgStrong: "bg-mn-p3/25", border: "border-mn-p3/40", spine: "bg-mn-p3",
  },
  epoch: {
    dot: "bg-mn-ok", text: "text-mn-ok", barBg: "bg-mn-ok/15",
    barBgStrong: "bg-mn-ok/25", border: "border-mn-ok/40", spine: "bg-mn-ok",
  },
  milestone: {
    dot: "bg-mn-accent", text: "text-mn-accent-2", barBg: "bg-mn-accent/15",
    barBgStrong: "bg-mn-accent/25", border: "border-mn-accent/40", spine: "bg-mn-accent",
  },
  other: {
    dot: "bg-mn-muted", text: "text-mn-muted", barBg: "bg-mn-surface-2",
    barBgStrong: "bg-mn-surface-2", border: "border-mn-border", spine: "bg-mn-muted",
  },
};

export interface StatusStyle {
  dot: string;
  text: string;
  chip: string;
  pulse: boolean;
}

export const STATUS_STYLE: Record<RoadmapStatus, StatusStyle> = {
  done: { dot: "bg-mn-ok", text: "text-mn-ok", chip: "text-mn-ok bg-mn-ok/10 border-mn-ok/30", pulse: false },
  active: {
    dot: "bg-mn-accent-2", text: "text-mn-accent-2",
    chip: "text-mn-accent-2 bg-mn-accent-2/10 border-mn-accent-2/30", pulse: true,
  },
  scheduled: { dot: "bg-mn-p3", text: "text-mn-p3", chip: "text-mn-p3 bg-mn-p3/10 border-mn-p3/30", pulse: false },
  planned: { dot: "bg-mn-muted", text: "text-mn-muted", chip: "text-mn-muted bg-mn-surface-2 border-mn-border", pulse: false },
  "at-risk": { dot: "bg-mn-p1", text: "text-mn-p1", chip: "text-mn-p1 bg-mn-p1/10 border-mn-p1/30", pulse: false },
};
