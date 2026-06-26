"use client";

import { ExecutiveMetrics, SLA } from "@/lib/executive/metrics";
import { NETWORKS } from "@/lib/telemetry/networks";

interface Slide {
  label: string;
  value: string;
  sub: string;
  accent: string; // tailwind text-* class
}

/** Build the rotating set of headline slides from the live metrics. */
function buildSlides(m: ExecutiveMetrics): Slide[] {
  const avail = m.availability;
  const net = NETWORKS[m.network];
  const topClientPct = Math.round(m.dominantVersionShare * 100);

  return [
    {
      label: "Validator Availability",
      value: avail.pct != null ? `${avail.pct.toFixed(1)}%` : `${avail.online}`,
      sub:
        avail.pct != null
          ? `${avail.online}/${avail.expected} online · SLA ${SLA.availabilityTargetPct}%`
          : `${avail.online} validators online`,
      accent: avail.meetsSla == null ? "text-mn-text" : avail.meetsSla ? "text-mn-ok" : "text-mn-p1",
    },
    {
      label: "Network Model",
      value: net.model,
      sub: net.modelNote,
      accent: "text-mn-accent-2",
    },
    {
      label: "Block Time & Finality",
      value: m.avgBlockTimeMs != null ? `${(m.avgBlockTimeMs / 1000).toFixed(2)}s` : "—",
      sub: m.finalityGap != null ? `${m.finalityGap}-block finality gap` : "Awaiting finality data",
      accent: "text-mn-text",
    },
    {
      label: "Client Versions",
      value: topClientPct > 0 ? `${topClientPct}%` : "—",
      sub: "Share on the most common node version",
      accent: "text-mn-text",
    },
    {
      label: "Operating Footprint",
      value: `${m.distinctLocations} regions`,
      sub: `${m.totalValidators} validators online`,
      accent: "text-mn-text",
    },
  ];
}

export default function KpiSpotlight({ m, index }: { m: ExecutiveMetrics; index: number }) {
  const slides = buildSlides(m);
  const slide = slides[index % slides.length];

  return (
    <div className="bg-mn-surface border border-mn-border rounded-3xl px-8 py-7 h-full flex flex-col justify-center overflow-hidden">
      {/* key remounts the content so the fade replays on every slide change */}
      <div key={index % slides.length} className="board-fade flex flex-col gap-2">
        <span className="text-[clamp(12px,1.6vh,18px)] uppercase tracking-[0.2em] text-mn-muted">
          {slide.label}
        </span>
        <span className={`font-mono font-semibold leading-none text-[clamp(40px,9vh,104px)] ${slide.accent}`}>
          {slide.value}
        </span>
        <span className="text-[clamp(13px,2vh,22px)] text-mn-muted">{slide.sub}</span>
      </div>
      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-6">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index % slides.length ? "w-6 bg-mn-accent" : "w-1.5 bg-mn-surface-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
