"use client";

import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import { computeReadiness } from "@/lib/changes/readiness";
import { NetworkChange } from "@/lib/changes/types";

/**
 * Live, telemetry-derived readiness for a coordinated change (e.g. the
 * governance-gated node-1.0.0 runtime upgrade). Reads the selected-network feed
 * and counts validators already on the target version. When the change's target
 * env is not the selected network, the feed can't measure it, so we say so
 * rather than imply a number.
 */
export default function ReadinessGauge({
  change,
  size = 84,
}: {
  change: NetworkChange;
  size?: number;
}) {
  const { nodes, network } = useTelemetry();
  const r = computeReadiness(change, nodes, network);
  if (!r) return null;

  const envLabel = NETWORKS[r.spec.env].label;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = r.pct ?? 0;
  const offset = circ * (1 - pct / 100);
  const ringColor = r.meetsThreshold ? "text-mn-ok" : "text-mn-accent-2";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            className="text-mn-surface-2"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          {r.live && (
            <circle
              className={`${ringColor} transition-[stroke-dashoffset] duration-700`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold tabular-nums text-mn-text leading-none">
            {r.live && r.pct != null ? `${Math.round(r.pct)}%` : "—"}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-mn-muted mt-0.5">ready</span>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        {r.live ? (
          <span className="text-xs text-mn-text-2 font-mono">
            {r.ready}/{r.total} on ≥{r.spec.targetVersion}
          </span>
        ) : (
          <span className="text-xs text-mn-muted">
            Switch to {envLabel} for live readiness
          </span>
        )}
        <span className="text-[10px] text-mn-muted">
          Governance trigger: {r.spec.thresholdPct}% of the {envLabel} set
        </span>
        {r.live && (
          <span
            className={`inline-flex items-center gap-1 self-start text-[10px] font-semibold ${
              r.meetsThreshold ? "text-mn-ok" : "text-mn-muted"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                r.meetsThreshold ? "bg-mn-ok animate-pulse" : "bg-mn-muted"
              }`}
            />
            {r.meetsThreshold ? "Threshold met — upgrade can proceed" : "Awaiting full readiness"}
          </span>
        )}
      </div>
      </div>

      {r.live && r.notReady.length > 0 && (
        <div className="rounded-lg border border-mn-border bg-mn-surface-2/40 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-mn-muted mb-1.5">
            Remaining to adopt ≥{r.spec.targetVersion} ({r.notReady.length})
          </p>
          <ul className="flex flex-col gap-1">
            {r.notReady.map((n) => (
              <li
                key={n.name}
                className="flex items-center justify-between gap-3 text-[11px] font-mono"
              >
                <span className="text-mn-text-2 truncate" title={n.name}>{n.name}</span>
                <span className="text-mn-muted shrink-0">{n.version}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.live && r.notReady.length === 0 && r.total > 0 && (
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-mn-ok">
          <span className="w-1.5 h-1.5 rounded-full bg-mn-ok" />
          All {r.total} validators on ≥{r.spec.targetVersion}
        </p>
      )}
    </div>
  );
}
