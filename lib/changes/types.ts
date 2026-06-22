import { NetworkId } from "@/lib/telemetry/networks";

/**
 * Network-change status model (experimental). Mirrors the shape a future ops-repo
 * change record would carry, so the seed data here can later be swapped for a
 * vendored source. Pure types — no React.
 */

export type ChangeType =
  | "cardano-hf"
  | "midnight-hf"
  | "node-release"
  | "host-migration"
  | "other";

export type EnvStatus =
  | "completed"
  | "in-progress"
  | "scheduled"
  | "planned"
  | "not-applicable";

export interface EnvState {
  status: EnvStatus;
  /** Completion date (for completed) or target (for scheduled/in-progress). */
  date?: string;
  note?: string;
}

export interface NetworkChange {
  id: string;
  title: string;
  type: ChangeType;
  /** Change-management class (A coordinated / B rolling / C emergency). */
  class?: "A" | "B" | "C";
  summary: string;
  /** Overall "tracking as planned" flag for an in-flight change. */
  onTrack?: boolean;
  envs: Record<NetworkId, EnvState>;
  links?: { label: string; url: string }[];
  /** Date this record was last hand-updated (it is not live telemetry). */
  updated: string;
}

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  "cardano-hf": "Cardano HF",
  "midnight-hf": "Midnight HF",
  "node-release": "Node release",
  "host-migration": "Host migration",
  other: "Change",
};

export const ENV_STATUS_LABELS: Record<EnvStatus, string> = {
  completed: "Completed",
  "in-progress": "In progress",
  scheduled: "Scheduled",
  planned: "Planned",
  "not-applicable": "N/A",
};

/** Shared status colours (Tailwind `mn-*` classes) for chips + dots. */
export const ENV_STATUS_STYLE: Record<EnvStatus, { dot: string; chip: string }> = {
  completed: { dot: "bg-mn-ok", chip: "text-mn-ok bg-mn-ok/10 border-mn-ok/30" },
  "in-progress": {
    dot: "bg-mn-accent-2 animate-pulse",
    chip: "text-mn-accent-2 bg-mn-accent-2/10 border-mn-accent-2/30",
  },
  scheduled: { dot: "bg-mn-p3", chip: "text-mn-p3 bg-mn-p3/10 border-mn-p3/30" },
  planned: { dot: "bg-mn-muted", chip: "text-mn-muted bg-mn-surface-2 border-mn-border" },
  "not-applicable": { dot: "bg-mn-border", chip: "text-mn-muted bg-transparent border-mn-border" },
};
