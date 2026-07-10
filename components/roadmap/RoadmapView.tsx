"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Badge";
import { addMonths, formatRange, monthLong, parseDate } from "@/lib/roadmap/date";
import { toSpans } from "@/lib/roadmap/layout";
import { allRoadmapEvents, defaultMonth } from "@/lib/roadmap/select";
import {
  CATEGORY_LABELS,
  CATEGORY_STYLE,
  RoadmapCategory,
  RoadmapEvent,
  STATUS_LABELS,
  STATUS_STYLE,
} from "@/lib/roadmap/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import MonthCalendar from "./MonthCalendar";
import Agenda from "./Agenda";
import { useToday } from "./useToday";

// Static, deterministic data — computed once (no telemetry, no per-render work).
const ALL_EVENTS = allRoadmapEvents();
const ALL_SPANS = toSpans(ALL_EVENTS);
const START_MONTH = defaultMonth(ALL_EVENTS);

// Categories actually present, in a stable display order, for the legend.
const LEGEND_ORDER: RoadmapCategory[] = [
  "hard-fork", "runtime-upgrade", "node-release", "governance", "maintenance", "epoch", "milestone", "other",
];

function envLabel(env: RoadmapEvent["env"]): string | null {
  if (!env) return null;
  return env === "all" ? "All environments" : NETWORKS[env as NetworkId].label;
}

export default function RoadmapView() {
  const today = useToday();
  const [view, setView] = useState(START_MONTH);
  const [mode, setMode] = useState<"calendar" | "agenda">("calendar");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = ALL_EVENTS.find((e) => e.id === selectedId) ?? null;
  const legendCats = LEGEND_ORDER.filter((c) => ALL_EVENTS.some((e) => e.category === c));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Roadmap"
        subtitle="Coordinated changes and events across environments"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/network-change" className="hidden text-[11px] text-mn-accent-2 hover:underline sm:inline">
              Network Change →
            </Link>
            <ViewToggle mode={mode} setMode={setMode} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[11px] leading-relaxed text-mn-muted">
          A planning view of hard forks, node releases, runtime upgrades, and maintenance windows. Multi-day
          windows render as highlighted spanning bars. Manually maintained and forward-looking — not live
          telemetry; dates can move (Cardano-driven fork epochs especially).
        </p>
        <Pill className="border-mn-p3/30 bg-mn-p3/10 text-mn-p3">Experimental</Pill>
      </div>

      <Legend cats={legendCats} />

      {mode === "calendar" ? (
        <div className="flex flex-col gap-3">
          <MonthNav
            year={view.y}
            month={view.m}
            onPrev={() => setView((v) => addMonths(v.y, v.m, -1))}
            onNext={() => setView((v) => addMonths(v.y, v.m, 1))}
            onToday={today ? () => setView({ y: today.y, m: today.m }) : undefined}
          />
          <div className="overflow-x-auto rounded-2xl border border-mn-border bg-mn-bg p-1">
            <MonthCalendar
              year={view.y}
              month={view.m}
              spans={ALL_SPANS}
              today={today}
              selectedId={selectedId}
              onSelect={(e) => setSelectedId(e.id)}
            />
          </div>
        </div>
      ) : (
        <Agenda events={ALL_EVENTS} selectedId={selectedId} onSelect={(e) => setSelectedId(e.id)} />
      )}

      {selected && <DetailPanel event={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ViewToggle({
  mode,
  setMode,
}: {
  mode: "calendar" | "agenda";
  setMode: (m: "calendar" | "agenda") => void;
}) {
  const opts: { key: "calendar" | "agenda"; label: string }[] = [
    { key: "calendar", label: "Calendar" },
    { key: "agenda", label: "Agenda" },
  ];
  return (
    <div className="flex items-center rounded-full border border-mn-border bg-mn-bg p-0.5">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setMode(o.key)}
          aria-pressed={mode === o.key}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            mode === o.key ? "bg-mn-surface-2 text-mn-text" : "text-mn-muted hover:text-mn-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MonthNav({
  year,
  month,
  onPrev,
  onNext,
  onToday,
}: {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-mn-text">
        {monthLong(month)} <span className="font-mono text-mn-muted">{year}</span>
      </h2>
      <div className="flex items-center gap-1.5">
        {onToday && (
          <button
            type="button"
            onClick={onToday}
            className="rounded-full border border-mn-border px-3 py-1 text-xs text-mn-muted transition-colors hover:border-mn-accent hover:text-mn-text"
          >
            Today
          </button>
        )}
        <NavArrow label="Previous month" onClick={onPrev} d="M15 19l-7-7 7-7" />
        <NavArrow label="Next month" onClick={onNext} d="M9 5l7 7-7 7" />
      </div>
    </div>
  );
}

function NavArrow({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-mn-border text-mn-muted transition-colors hover:border-mn-accent hover:text-mn-text"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </button>
  );
}

function Legend({ cats }: { cats: RoadmapCategory[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-mn-border bg-mn-surface px-4 py-2.5">
      {cats.map((c) => (
        <span key={c} className="flex items-center gap-1.5 text-[11px] text-mn-text-2">
          <span className={`h-2 w-2 rounded-sm ${CATEGORY_STYLE[c].dot}`} />
          {CATEGORY_LABELS[c]}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-3 text-[10px] text-mn-muted">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mn-accent-2" /> in progress
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-3 rounded-sm border border-dashed border-mn-muted" /> planned
        </span>
      </span>
    </div>
  );
}

function DetailPanel({ event, onClose }: { event: RoadmapEvent; onClose: () => void }) {
  const cat = CATEGORY_STYLE[event.category];
  const st = STATUS_STYLE[event.status];
  const start = parseDate(event.start);
  const end = event.end ? parseDate(event.end) : null;
  const env = envLabel(event.env);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-mn-accent-2/30 bg-mn-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill className={`${cat.text} ${cat.barBg} ${cat.border}`}>{CATEGORY_LABELS[event.category]}</Pill>
          <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${st.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${st.pulse ? "animate-pulse" : ""}`} />
            {STATUS_LABELS[event.status]}
          </span>
          {env && (
            <span className="rounded border border-mn-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-mn-muted">
              {env}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Close detail"
          onClick={onClose}
          className="text-mn-muted transition-colors hover:text-mn-text"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-mn-text">{event.title}</h2>
        <p className="mt-0.5 font-mono text-xs text-mn-accent-2">{formatRange(start, end)}</p>
      </div>

      {event.summary && <p className="text-xs leading-relaxed text-mn-text-2">{event.summary}</p>}

      {event.link && (
        <a
          href={event.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-[11px] text-mn-accent-2 hover:underline"
        >
          {event.link.label} ↗
        </a>
      )}
    </div>
  );
}
