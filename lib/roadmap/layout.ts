import { ordinal, parseDate, weekday, YMD, ymdFromOrdinal } from "./date";
import { RoadmapEvent } from "./types";

/** 0 = Sunday. Change this one constant to shift the week start. */
export const WEEK_START = 0;

const BASE_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS: string[] = BASE_WEEKDAYS.map((_, i) => BASE_WEEKDAYS[(WEEK_START + i) % 7]);

export interface DayCell {
  ymd: YMD;
  ord: number;
  inMonth: boolean;
}

/** A fixed 6-row (42-cell) month grid; weeks start on WEEK_START. */
export function monthGrid(year: number, month: number): DayCell[][] {
  const firstDow = weekday({ y: year, m: month, d: 1 });
  const lead = (firstDow - WEEK_START + 7) % 7;
  const startOrd = ordinal({ y: year, m: month, d: 1 }) - lead;
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const ord = startOrd + w * 7 + i;
      const ymd = ymdFromOrdinal(ord);
      week.push({ ymd, ord, inMonth: ymd.y === year && ymd.m === month });
    }
    weeks.push(week);
  }
  return weeks;
}

/** A day-precision event resolved to an inclusive ordinal span. */
export interface EventSpan {
  event: RoadmapEvent;
  startOrd: number;
  endOrd: number;
  multiDay: boolean;
}

/**
 * Day-precision events resolved to ordinal spans. Month-level and undated
 * events are excluded here (they live in the agenda, not on the grid).
 */
export function toSpans(events: RoadmapEvent[]): EventSpan[] {
  const spans: EventSpan[] = [];
  for (const event of events) {
    const start = parseDate(event.start);
    if (start.kind !== "day") continue;
    const startOrd = ordinal(start.ymd);
    let endOrd = startOrd;
    if (event.end) {
      const end = parseDate(event.end);
      if (end.kind === "day") endOrd = Math.max(startOrd, ordinal(end.ymd));
    }
    spans.push({ event, startOrd, endOrd, multiDay: endOrd > startOrd });
  }
  return spans;
}

export interface WeekSegment {
  event: RoadmapEvent;
  lane: number;
  /** 0-6, inclusive columns within the week. */
  startCol: number;
  endCol: number;
  /** Window continues before this week / after this week (draw a clip arrow). */
  clipLeft: boolean;
  clipRight: boolean;
  multiDay: boolean;
}

export interface WeekLayout {
  segments: WeekSegment[];
  /** Per-column count of events that didn't fit within `maxLanes`. */
  overflow: Record<number, number>;
}

/**
 * Greedy lane assignment for one week [weekStartOrd, weekStartOrd + 6]. Events
 * are packed top-down by start then by longest duration, so multi-day windows
 * read as continuous bars (Gantt-style). Anything past `maxLanes` is tallied
 * into `overflow` per covered column instead of drawn.
 */
export function layoutWeek(spans: EventSpan[], weekStartOrd: number, maxLanes = 3): WeekLayout {
  const weekEndOrd = weekStartOrd + 6;
  const inWeek = spans
    .filter((s) => s.endOrd >= weekStartOrd && s.startOrd <= weekEndOrd)
    .sort((a, b) => a.startOrd - b.startOrd || b.endOrd - b.startOrd - (a.endOrd - a.startOrd));

  const laneEnds: number[] = []; // laneEnds[i] = last occupied column in lane i
  const segments: WeekSegment[] = [];
  const overflow: Record<number, number> = {};

  for (const s of inWeek) {
    const startCol = Math.max(0, s.startOrd - weekStartOrd);
    const endCol = Math.min(6, s.endOrd - weekStartOrd);

    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] >= startCol) lane++;

    if (lane >= maxLanes) {
      for (let c = startCol; c <= endCol; c++) overflow[c] = (overflow[c] ?? 0) + 1;
      continue;
    }

    laneEnds[lane] = endCol;
    segments.push({
      event: s.event,
      lane,
      startCol,
      endCol,
      clipLeft: s.startOrd < weekStartOrd,
      clipRight: s.endOrd > weekEndOrd,
      multiDay: s.multiDay,
    });
  }

  return { segments, overflow };
}
