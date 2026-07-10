"use client";

import { sameYMD, YMD } from "@/lib/roadmap/date";
import { EventSpan, layoutWeek, monthGrid, WeekSegment, WEEKDAYS } from "@/lib/roadmap/layout";
import { CATEGORY_STYLE, RoadmapEvent, STATUS_STYLE } from "@/lib/roadmap/types";

const MAX_LANES = 3;

export default function MonthCalendar({
  year,
  month,
  spans,
  today,
  selectedId,
  onSelect,
}: {
  year: number;
  month: number;
  spans: EventSpan[];
  today: YMD | null;
  selectedId: string | null;
  onSelect: (event: RoadmapEvent) => void;
}) {
  const weeks = monthGrid(year, month);

  return (
    <div className="min-w-[720px]">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-mn-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-mn-muted">
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="border-l border-mn-border">
        {weeks.map((week, wi) => {
          const { segments, overflow } = layoutWeek(spans, week[0].ord, MAX_LANES);
          return (
            <div key={wi} className="relative">
              {/* Background day cells */}
              <div className="grid grid-cols-7">
                {week.map((cell) => {
                  const isToday = today != null && sameYMD(cell.ymd, today);
                  return (
                    <div
                      key={cell.ord}
                      className={`min-h-[104px] border-r border-b border-mn-border px-1 pt-1 ${
                        cell.inMonth ? "bg-mn-surface" : "bg-mn-bg"
                      }`}
                    >
                      <div className="flex justify-end">
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] ${
                            isToday
                              ? "bg-mn-accent font-semibold text-mn-on-accent"
                              : cell.inMonth
                              ? "text-mn-text-2"
                              : "text-mn-muted/40"
                          }`}
                        >
                          {cell.ymd.d}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Event overlay — columns align 1:1 with the background grid */}
              <div className="pointer-events-none absolute inset-x-0 top-7 grid grid-cols-7 grid-rows-[repeat(3,17px)] gap-y-1">
                {segments.map((seg) => (
                  <EventBar
                    key={seg.event.id}
                    seg={seg}
                    selected={seg.event.id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
                {Object.entries(overflow).map(([col, n]) => (
                  <span
                    key={`of-${col}`}
                    style={{ gridColumn: `${Number(col) + 1} / span 1`, gridRow: MAX_LANES }}
                    className="mx-[3px] self-center truncate text-[9px] font-medium text-mn-muted"
                  >
                    +{n}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBar({
  seg,
  selected,
  onSelect,
}: {
  seg: WeekSegment;
  selected: boolean;
  onSelect: (event: RoadmapEvent) => void;
}) {
  const cat = CATEGORY_STYLE[seg.event.category];
  const st = STATUS_STYLE[seg.event.status];
  const done = seg.event.status === "done";

  const cls = [
    "pointer-events-auto flex items-center gap-1 h-[17px] min-w-0 mx-[3px] px-1 border text-[10px] leading-none transition hover:brightness-110",
    seg.multiDay ? cat.barBgStrong : cat.barBg,
    cat.border,
    seg.clipLeft ? "rounded-l-none border-l-0" : "rounded-l",
    seg.clipRight ? "rounded-r-none border-r-0" : "rounded-r",
    done ? "opacity-70" : "",
    seg.event.status === "planned" ? "border-dashed" : "",
    seg.event.status === "at-risk" ? "ring-1 ring-mn-p1" : "",
    selected ? "ring-1 ring-mn-accent-2" : "",
  ].join(" ");

  return (
    <button
      type="button"
      onClick={() => onSelect(seg.event)}
      title={seg.event.title}
      style={{ gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`, gridRow: seg.lane + 1 }}
      className={cls}
    >
      {seg.clipLeft && <span className="shrink-0 text-mn-muted">‹</span>}
      {seg.multiDay && !seg.clipLeft && (
        <span className={`my-0.5 w-0.5 shrink-0 self-stretch rounded-full ${cat.spine}`} />
      )}
      {done ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5 shrink-0 text-mn-ok">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot} ${st.pulse ? "animate-pulse" : ""}`} />
      )}
      <span className="truncate text-mn-text">{seg.event.title}</span>
      {seg.clipRight && <span className="ml-auto shrink-0 text-mn-muted">›</span>}
    </button>
  );
}
