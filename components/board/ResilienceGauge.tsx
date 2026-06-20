"use client";

import { Severity } from "@/lib/health/health";
import { SEVERITY_RAG } from "@/lib/executive/metrics";
import Sparkline from "@/components/executive/Sparkline";

/** Point on a circle, angle measured clockwise from 12 o'clock (degrees). */
function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

/** SVG arc path from `start`, sweeping `sweep` degrees clockwise. */
function arcPath(cx: number, cy: number, r: number, start: number, sweep: number): string {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const START = 225; // 7:30 position
const SWEEP = 270; // leaves a 90° gap centered at the bottom

/**
 * Big-board resilience gauge: a 270° arc whose fill and colour track the
 * composite score and overall RAG severity, with the score read large in the
 * centre and an in-session trend sparkline beneath. Scales to its container.
 */
export default function ResilienceGauge({
  score,
  overall,
  trend,
}: {
  score: number;
  overall: Severity;
  trend: number[];
}) {
  const rag = SEVERITY_RAG[overall];
  const progress = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-full max-w-[clamp(220px,32vh,420px)] aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Track */}
          <path
            d={arcPath(100, 100, 82, START, SWEEP)}
            fill="none"
            stroke="var(--mn-surface-2)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d={arcPath(100, 100, 82, START, SWEEP * progress)}
            fill="none"
            className={rag.text}
            stroke="currentColor"
            strokeWidth={14}
            strokeLinecap="round"
          />
        </svg>
        {/* Centre readout (HTML overlay keeps the type crisp) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[clamp(11px,1.4vh,15px)] uppercase tracking-[0.2em] text-mn-muted">
            Resilience
          </span>
          <span className="font-mono font-semibold leading-none text-mn-text text-[clamp(48px,11vh,128px)]">
            {score}
          </span>
          <span className={`mt-1 flex items-center gap-2 font-semibold uppercase tracking-wider text-[clamp(12px,1.6vh,18px)] ${rag.text}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${rag.dot} animate-pulse`} />
            {rag.label}
          </span>
        </div>
      </div>
      <div className={`mt-2 ${rag.text}`}>
        <Sparkline data={trend} width={260} height={40} strokeWidth={2} />
      </div>
    </div>
  );
}
