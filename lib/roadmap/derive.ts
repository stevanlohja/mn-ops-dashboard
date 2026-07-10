import { CHANGES } from "@/lib/changes/data";
import { ChangeType, EnvStatus, NetworkChange } from "@/lib/changes/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { RoadmapCategory, RoadmapEvent, RoadmapStatus } from "./types";

const ENV_ORDER: NetworkId[] = ["preview", "preprod", "mainnet"];

const ENV_TO_STATUS: Record<EnvStatus, RoadmapStatus | null> = {
  completed: "done",
  "in-progress": "active",
  scheduled: "scheduled",
  planned: "planned",
  "not-applicable": null,
};

const TYPE_TO_CATEGORY: Record<ChangeType, RoadmapCategory> = {
  "cardano-hf": "hard-fork",
  "midnight-hf": "runtime-upgrade",
  "node-release": "node-release",
  "host-migration": "maintenance",
  other: "other",
};

/**
 * Project the Network-Change board onto the roadmap: one event per environment
 * state, so the calendar reflects the change board without a second source of
 * truth. A dated env state lands on the grid; an open (in-progress/scheduled)
 * env state with no date still surfaces in the agenda's "Dates TBD" bucket. A
 * completed state with no date is skipped (nothing datable to show).
 */
export function deriveChangeEvents(list: NetworkChange[] = CHANGES): RoadmapEvent[] {
  const out: RoadmapEvent[] = [];
  for (const change of list) {
    for (const env of ENV_ORDER) {
      const state = change.envs[env];
      const status = ENV_TO_STATUS[state.status];
      if (!status) continue;
      if (!state.date && status === "done") continue;
      out.push({
        id: `change:${change.id}:${env}`,
        title: `${change.title} · ${NETWORKS[env].label}`,
        category: TYPE_TO_CATEGORY[change.type],
        status,
        start: state.date ?? "",
        env,
        summary: state.note ?? change.summary,
        link: change.links?.[0],
        changeId: change.id,
      });
    }
  }
  return out;
}
