"use client";

import { formatRange, parseDate } from "@/lib/roadmap/date";
import { byDate } from "@/lib/roadmap/select";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLE,
  RoadmapEvent,
  RoadmapStatus,
  STATUS_LABELS,
  STATUS_STYLE,
} from "@/lib/roadmap/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";

const GROUPS: { label: string; match: (s: RoadmapStatus) => boolean }[] = [
  { label: "In progress", match: (s) => s === "active" },
  { label: "Upcoming", match: (s) => s === "scheduled" || s === "planned" || s === "at-risk" },
  { label: "Completed", match: (s) => s === "done" },
];

export default function Agenda({
  events,
  selectedId,
  onSelect,
}: {
  events: RoadmapEvent[];
  selectedId: string | null;
  onSelect: (event: RoadmapEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((g) => {
        const rows = byDate(events.filter((e) => g.match(e.status)));
        if (rows.length === 0) return null;
        return (
          <div key={g.label} className="flex flex-col gap-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mn-muted">{g.label}</h3>
            <div className="flex flex-col gap-1.5">
              {rows.map((e) => (
                <AgendaRow key={e.id} event={e} selected={e.id === selectedId} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function envLabel(env: RoadmapEvent["env"]): string | null {
  if (!env) return null;
  if (env === "all") return "All envs";
  return NETWORKS[env as NetworkId].label;
}

function AgendaRow({
  event,
  selected,
  onSelect,
}: {
  event: RoadmapEvent;
  selected: boolean;
  onSelect: (event: RoadmapEvent) => void;
}) {
  const cat = CATEGORY_STYLE[event.category];
  const st = STATUS_STYLE[event.status];
  const start = parseDate(event.start);
  const end = event.end ? parseDate(event.end) : null;
  const dateLabel = formatRange(start, end);
  const env = envLabel(event.env);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={`flex items-stretch gap-3 rounded-xl border p-3 text-left transition hover:border-mn-accent ${
        selected ? "border-mn-accent-2 bg-mn-surface-2" : "border-mn-border bg-mn-surface"
      }`}
    >
      <span className={`w-0.5 shrink-0 self-stretch rounded-full ${cat.spine}`} />
      <div className="flex w-24 shrink-0 flex-col">
        <span className="font-mono text-xs text-mn-text-2">{dateLabel}</span>
        <span className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${st.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${st.pulse ? "animate-pulse" : ""}`} />
          {STATUS_LABELS[event.status]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-mn-text">{event.title}</span>
          <span className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${cat.text}`}>
            {CATEGORY_LABELS[event.category]}
          </span>
          {env && (
            <span className="rounded border border-mn-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-mn-muted">
              {env}
            </span>
          )}
        </div>
        {event.summary && <p className="mt-1 text-xs leading-snug text-mn-muted">{event.summary}</p>}
      </div>
    </button>
  );
}
