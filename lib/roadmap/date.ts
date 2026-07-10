/**
 * Pure date helpers for the roadmap calendar. No React, and no timezone
 * surprises: every roadmap date is a naive "YYYY-MM-DD" (or "YYYY-MM") string
 * interpreted in UTC, so day arithmetic and comparisons are deterministic
 * regardless of the viewer's timezone. "Today" is supplied by the caller (see
 * components/roadmap/useToday.ts) rather than read here, keeping this module a
 * pure function of its inputs.
 */

export interface YMD {
  y: number;
  /** 1-12 */
  m: number;
  /** 1-31 */
  d: number;
}

export type ParsedDate =
  | { kind: "day"; ymd: YMD; approx: boolean }
  | { kind: "month"; y: number; m: number; approx: boolean }
  | { kind: "none" };

const DAY_MS = 86_400_000;

/** Parse "YYYY-MM-DD" or "YYYY-MM"; a leading "~" marks the date approximate. */
export function parseDate(input?: string): ParsedDate {
  if (!input) return { kind: "none" };
  const trimmed = input.trim();
  const approx = trimmed.startsWith("~");
  const s = approx ? trimmed.slice(1) : trimmed;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (day) return { kind: "day", ymd: { y: +day[1], m: +day[2], d: +day[3] }, approx };
  const month = /^(\d{4})-(\d{2})$/.exec(s);
  if (month) return { kind: "month", y: +month[1], m: +month[2], approx };
  return { kind: "none" };
}

/** Day ordinal (whole days since the Unix epoch, UTC) — safe to compare/subtract. */
export function ordinal(ymd: YMD): number {
  return Math.round(Date.UTC(ymd.y, ymd.m - 1, ymd.d) / DAY_MS);
}

export function ymdFromOrdinal(ord: number): YMD {
  const dt = new Date(ord * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function sameYMD(a: YMD, b: YMD): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(ymd: YMD): number {
  return new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthShort(m: number): string {
  return MONTHS_SHORT[m - 1] ?? "";
}

export function monthLong(m: number): string {
  return MONTHS_LONG[m - 1] ?? "";
}

/** "Jul 14" or "Jul 14, 2026". */
export function formatDay(ymd: YMD, withYear = false): string {
  return `${monthShort(ymd.m)} ${ymd.d}${withYear ? `, ${ymd.y}` : ""}`;
}

/**
 * Human range label for an event: "Jul 14 – 16", "Jul 30 – Aug 2", a single
 * "Jul 20, 2026", a month "May 2026", or "TBD". `approx` prefixes a "~".
 */
export function formatRange(start: ParsedDate, end: ParsedDate | null): string {
  if (start.kind === "none") return "TBD";
  if (start.kind === "month") {
    return `${start.approx ? "~" : ""}${monthShort(start.m)} ${start.y}`;
  }
  const a = start.ymd;
  if (!end || end.kind !== "day" || sameYMD(end.ymd, a)) {
    return `${start.approx ? "~" : ""}${formatDay(a, true)}`;
  }
  const b = end.ymd;
  const tail = b.m === a.m && b.y === a.y ? `${b.d}` : formatDay(b);
  return `${formatDay(a)} – ${tail}, ${b.y}`;
}

/** Add `delta` months to {y, m} (m is 1-12), returning a normalized {y, m}. */
export function addMonths(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}
