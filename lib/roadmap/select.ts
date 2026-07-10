import { ordinal, parseDate } from "./date";
import { deriveChangeEvents } from "./derive";
import { EVENTS } from "./events";
import { RoadmapEvent, RoadmapStatus } from "./types";

/** All roadmap events: Network-Change board projections + hand-authored entries. */
export function allRoadmapEvents(): RoadmapEvent[] {
  return [...deriveChangeEvents(), ...EVENTS];
}

/** Effective sort ordinal: a day → its ordinal, a month → its 1st, undated → last. */
export function sortOrdinal(e: RoadmapEvent): number {
  const p = parseDate(e.start);
  if (p.kind === "day") return ordinal(p.ymd);
  if (p.kind === "month") return ordinal({ y: p.y, m: p.m, d: 1 });
  return Number.POSITIVE_INFINITY;
}

/** Chronological sort; undated events sink to the end. Stable by id. */
export function byDate(events: RoadmapEvent[]): RoadmapEvent[] {
  return [...events].sort((a, b) => sortOrdinal(a) - sortOrdinal(b) || a.id.localeCompare(b.id));
}

/**
 * Deterministic month to open the calendar on — independent of "today" so the
 * static (server) render and the client render agree. Picks the month of the
 * earliest not-yet-complete dated event, else the earliest dated event, else a
 * fixed fallback.
 */
export function defaultMonth(events: RoadmapEvent[] = allRoadmapEvents()): { y: number; m: number } {
  interface Dated { y: number; m: number; ord: number; status: RoadmapStatus }
  const dated: Dated[] = [];
  for (const e of events) {
    const p = parseDate(e.start);
    if (p.kind !== "day") continue;
    dated.push({ y: p.ymd.y, m: p.ymd.m, ord: ordinal(p.ymd), status: e.status });
  }
  if (dated.length === 0) return { y: 2026, m: 7 };
  const upcoming = dated.filter((d) => d.status !== "done");
  const pool = upcoming.length > 0 ? upcoming : dated;
  const pick = pool.reduce((min, d) => (d.ord < min.ord ? d : min));
  return { y: pick.y, m: pick.m };
}
