"use client";

import Link from "next/link";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import {
  buildExecutiveMetrics,
  SEVERITY_RAG,
  SLA,
  Share,
  DomainStatus,
} from "@/lib/executive/metrics";
import { toGlobeMarkers } from "@/lib/executive/markers";
import NetworkChangeThumbnail from "@/components/changes/NetworkChangeThumbnail";
import PageHeader from "@/components/ui/PageHeader";
import ConnectionBadge from "@/components/dashboard/ConnectionBadge";
import ValidatorGlobe from "./ValidatorGlobe";
import Sparkline from "./Sparkline";
import { useMetricTrend } from "./useMetricTrend";

export default function ExecutiveOverview() {
  const { nodes, summary, wsStatus, network, attestation } = useTelemetry();
  const m = buildExecutiveMetrics(nodes, summary, attestation, network);

  const resilienceTrend = useMetricTrend(m.resilienceScore);
  const availTrend = useMetricTrend(m.availability.pct);

  const isBootstrapping = nodes.length === 0 && wsStatus !== "error";

  const markers = toGlobeMarkers(nodes);

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 transition-opacity duration-500 ${
        isBootstrapping ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <PageHeader
        title="Executive Overview"
        subtitle={`${NETWORKS[network].label} · Network posture at a glance`}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/board"
              className="flex items-center gap-1.5 text-xs font-medium text-mn-muted hover:text-mn-text border border-mn-border hover:border-mn-accent rounded-full px-3 py-1.5 transition-colors"
              title="Open full-screen board mode"
            >
              Present
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <ConnectionBadge status={wsStatus} />
          </div>
        }
      />

      {/* ── Hero row: resilience score + RAG domains ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <ResilienceCard score={m.resilienceScore} trend={resilienceTrend} overall={m.overall} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {m.domains.map((d) => (
            <DomainCard key={d.key} domain={d} />
          ))}
          <NetworkModelCard
            model={NETWORKS[network].model}
            note={NETWORKS[network].modelNote}
          />
        </div>
      </div>

      {/* ── Globe + headline KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="bg-mn-surface border border-mn-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-mn-text">Validator Distribution</h2>
              <p className="text-xs text-mn-muted mt-0.5">
                {markers.length} located validators · drag to rotate
              </p>
            </div>
            <span className="font-mono text-[10px] text-mn-muted uppercase tracking-widest">
              {m.distinctLocations} regions
            </span>
          </div>
          <div className="h-[380px] w-full">
            <ValidatorGlobe markers={markers} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Kpi
            label="Validator Availability"
            value={m.availability.pct != null ? `${m.availability.pct.toFixed(1)}%` : `${m.availability.online}`}
            sub={
              m.availability.pct != null
                ? `${m.availability.online}/${m.availability.expected} online · SLA ${SLA.availabilityTargetPct}%`
                : "No fixed set on this network"
            }
            severityText={
              m.availability.meetsSla == null
                ? "text-mn-muted"
                : m.availability.meetsSla
                ? "text-mn-ok"
                : "text-mn-p1"
            }
            trend={availTrend}
          />
          <NetworkChangeThumbnail />
        </div>
      </div>

      {/* ── Distribution panels ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DistributionPanel
          title="Client Versions"
          note={`Top ${(m.dominantVersionShare * 100).toFixed(0)}%`}
          shares={m.versionDist}
        />
        <DistributionPanel title="Geographic Zone" shares={m.zoneDist} limit={6} collapseToOther />
        <InfraProviderPanel />
        <DistributionPanel title="Operating System" shares={m.osDist} />
        <DistributionPanel title="CPU Architecture" shares={m.archDist} />
      </div>

      {/* ── Reliability strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat
          label="Finality Gap"
          value={m.finalityGap != null ? `${m.finalityGap}` : "—"}
          unit="blocks"
        />
        <MiniStat
          label="Avg Block Time"
          value={m.avgBlockTimeMs != null ? (m.avgBlockTimeMs / 1000).toFixed(2) : "—"}
          unit="s"
        />
        <MiniStat label="Flapping Nodes" value={`${m.stability.flappingNodes}`} unit="this session" />
        <MiniStat label="Total Disconnects" value={`${m.stability.totalDisconnects}`} unit="this session" />
      </div>

      <p className="text-[11px] text-mn-muted leading-relaxed border-t border-mn-border pt-4">
        Network Resilience is a weighted composite of availability (45%), finality and security (35%),
        and session stability (20%), all derived from live telemetry. The network model is federated by
        design at this stage, so decentralization is not scored. Trends reflect movement since this view
        was opened (no historical store). Infrastructure provider data is not yet collected from the feed.
      </p>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function ResilienceCard({
  score,
  trend,
  overall,
}: {
  score: number;
  trend: number[];
  overall: "ok" | "warning" | "critical";
}) {
  const rag = SEVERITY_RAG[overall];
  return (
    <div
      className="bg-mn-surface border border-mn-border rounded-2xl p-5 flex flex-col justify-between"
      title="Weighted composite (0–100): availability 45%, finality & security 35%, session stability 20%. Decentralization is intentionally not scored — the validator set is federated by design at this stage."
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-mn-muted uppercase tracking-wider">Network Resilience</span>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${rag.text}`}>
          <span className={`w-2 h-2 rounded-full ${rag.dot} animate-pulse`} />
          {rag.label}
        </span>
      </div>
      <div className="flex items-end gap-3 mt-3">
        <span className="text-5xl font-mono font-semibold text-mn-text leading-none">{score}</span>
        <span className="text-mn-muted text-sm mb-1">/ 100</span>
      </div>
      <div className="mt-3 text-mn-accent-2">
        <Sparkline data={trend} width={260} height={36} />
      </div>
    </div>
  );
}

function DomainCard({ domain }: { domain: DomainStatus }) {
  const rag = SEVERITY_RAG[domain.severity];
  return (
    <div className={`bg-mn-surface border ${rag.ring} rounded-2xl p-4 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-mn-text">{domain.label}</span>
        <span className={`w-2.5 h-2.5 rounded-full ${rag.dot}`} />
      </div>
      <p className="text-xs text-mn-muted leading-snug">{domain.headline}</p>
      <span className={`text-[11px] font-semibold uppercase tracking-wider ${rag.text}`}>{rag.label}</span>
    </div>
  );
}

// Informational, not a RAG health domain: states the network's intended
// operating model so the federated-by-design posture reads as deliberate.
function NetworkModelCard({ model, note }: { model: string; note: string }) {
  return (
    <div className="bg-mn-surface border border-mn-accent-2/30 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-mn-text">Network Model</span>
        <span className="w-2.5 h-2.5 rounded-full bg-mn-accent-2" />
      </div>
      <p className="text-sm font-semibold text-mn-text leading-snug">{model}</p>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-mn-accent-2">{note}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  severityText = "text-mn-text",
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  severityText?: string;
  trend?: number[];
}) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mn-muted uppercase tracking-wider">{label}</span>
        {trend && (
          <span className="text-mn-accent-2">
            <Sparkline data={trend} width={64} height={20} strokeWidth={1.25} />
          </span>
        )}
      </div>
      <p className={`text-2xl font-mono font-semibold mt-1 ${severityText}`}>{value}</p>
      <p className="text-[11px] text-mn-muted mt-0.5">{sub}</p>
    </div>
  );
}

function DistributionPanel({
  title,
  shares,
  note,
  noteWarn,
  collapseToOther = false,
  limit = 5,
}: {
  title: string;
  shares: Share[];
  note?: string;
  noteWarn?: boolean;
  // When set, the tail beyond `limit` is folded into a single "Other" bucket
  // so the displayed shares always sum to 100%.
  collapseToOther?: boolean;
  // Max named rows shown before the tail is dropped (or collapsed to "Other").
  limit?: number;
}) {
  let top = shares.slice(0, limit);
  if (collapseToOther && shares.length > top.length) {
    const shown = top.reduce((a, s) => a + s.share, 0);
    const count = shares.slice(top.length).reduce((a, s) => a + s.count, 0);
    top = [
      ...top,
      { key: "__other__", label: "Other", count, share: Math.max(0, 1 - shown) },
    ];
  }
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mn-text">{title}</h3>
        {note && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${noteWarn ? "text-mn-p3" : "text-mn-muted"}`}>
            {note}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {top.length === 0 && <p className="text-xs text-mn-muted">No data</p>}
        {top.map((s) => (
          <div key={s.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mn-text-2 truncate mr-2 font-mono">{s.label}</span>
              <span className="text-mn-muted shrink-0">{(s.share * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-mn-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-mn-accent rounded-full"
                style={{ width: `${Math.max(3, s.share * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Infrastructure provider (GCP / AWS / Other) is not yet exposed by the
// telemetry feed, so this panel is a labelled placeholder until that data
// lands. Kept visually consistent with the live distribution panels.
function InfraProviderPanel() {
  const providers = ["GCP", "AWS", "Other"];
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-mn-text">Infrastructure Provider</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mn-accent-2">
          Coming soon
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {providers.map((p) => (
          <div key={p} className="flex flex-col gap-1 opacity-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-mn-text-2 truncate mr-2 font-mono">{p}</span>
              <span className="text-mn-muted shrink-0">—</span>
            </div>
            <div className="h-1.5 bg-mn-surface-2 rounded-full overflow-hidden" />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-mn-muted leading-snug">
        Not yet collected from the telemetry feed.
      </p>
    </div>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl px-4 py-3">
      <p className="text-xs text-mn-muted uppercase tracking-wider">{label}</p>
      <p className="text-xl font-mono font-semibold text-mn-text mt-1">
        {value} <span className="text-xs text-mn-muted font-sans">{unit}</span>
      </p>
    </div>
  );
}
