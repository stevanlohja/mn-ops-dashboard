import { addMonths, formatDay, monthLong } from "./date";
import { RoadmapEvent } from "./types";

/**
 * The standing FNO reporting deadline, generated rather than hand-listed in
 * events.ts so the series can never go stale one month at a time.
 *
 * RULE: an operator's monthly report is due on the 5th of the FOLLOWING month —
 * July's report is due Aug 5, August's on Sep 5, and so on.
 *
 * Deterministic on purpose: no "today" is read here. The window is a fixed
 * constant so the static (server) render and the client render agree — the
 * roadmap builds its event list once at module scope
 * (components/roadmap/RoadmapView.tsx).
 *
 * Every occurrence is `scheduled`, never `done`: the dashboard has no signal for
 * whether a given report was actually submitted (operator reports live in the
 * ops repo, not in the telemetry feed), so it states the deadline and nothing
 * more. Occurrences are flagged `recurring`, which keeps them on the calendar
 * grid but out of the agenda list and the default-month pick.
 */

/** First report month covered. Its deadline is the 5th of the next month. */
const FIRST_REPORT_MONTH = { y: 2026, m: 1 };

/** Consecutive report months generated from FIRST_REPORT_MONTH. */
const REPORT_MONTHS = 36;

/** One-line description of the series, surfaced where the occurrences are hidden. */
export const REPORT_DUE_STANDING_NOTE =
  "Standing: every FNO's monthly operator report is due on the 5th of the following month (July's report on Aug 5).";

const REPORTS_URL = "https://github.com/midnightntwrk/midnight-network-ops/tree/main/reports/fno";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The monthly FNO report deadlines, one event per report month. */
export function deriveReportDueEvents(): RoadmapEvent[] {
  const out: RoadmapEvent[] = [];
  for (let i = 0; i < REPORT_MONTHS; i++) {
    const report = addMonths(FIRST_REPORT_MONTH.y, FIRST_REPORT_MONTH.m, i);
    const due = addMonths(report.y, report.m, 1);
    const dueYmd = { y: due.y, m: due.m, d: 5 };
    out.push({
      id: `report-due:${report.y}-${pad(report.m)}`,
      title: `FNO monthly report due · ${monthLong(report.m)}`,
      category: "reporting",
      status: "scheduled",
      start: `${due.y}-${pad(due.m)}-05`,
      env: "all",
      summary:
        `${monthLong(report.m)} ${report.y} operator reports are due from every FNO on ` +
        `${formatDay(dueYmd, true)} — the 5th of the following month. Submission is tracked in ` +
        `the ops repo, not on this board.`,
      link: { label: "FNO reports (ops repo)", url: REPORTS_URL },
      recurring: true,
    });
  }
  return out;
}
