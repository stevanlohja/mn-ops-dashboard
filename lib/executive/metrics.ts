import { NodeState, NetworkSummary } from "@/lib/telemetry/types";
import { AttestationRecord } from "@/lib/attestation/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { evaluateHealth, Severity, worstSeverity } from "@/lib/health/health";

/**
 * Executive-suite rollups. Every metric here is derived from live telemetry
 * (nodes + attestation records) except the explicitly-labelled planning
 * assumption in SLA — there is no rewards or historical persistence feed, so
 * that target is an operator-supplied figure, not a fact.
 *
 * Pure functions, no React, unit-testable.
 */

export const SLA = {
  /** Contracted validator-set availability target. */
  availabilityTargetPct: 99.5,
};

// ── Generic helpers ─────────────────────────────────────────────────────────

export interface Share<T = string> {
  key: T;
  label: string;
  count: number;
  share: number; // 0..1
}

/**
 * Bucket a validator's coordinates into a coarse continental zone. Derived from
 * lat/lng (not the city string, which is unreliable) so the Geography panel can
 * roll up to "Europe", "Americas", etc. Boundaries are approximate — adequate
 * for a continent-level rollup, not for border cases. Returns "Unknown" when the
 * node has not been geolocated by the feed.
 */
export function geoZone(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "Unknown";
  if (lng >= -170 && lng < -25) return "Americas";
  if (lng >= 110 && lat < 0) return "Oceania";
  if (lng >= -25 && lng < 40 && lat >= 36) return "Europe";
  if (lng >= -25 && lng < 52 && lat < 36) return "Africa";
  if (lng >= 40 && lng < 63 && lat >= 12 && lat < 42) return "Middle East";
  if (lng >= 40) return "Asia";
  return "Other";
}

function distribution(values: string[], fallback = "Unknown"): Share[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw && raw.trim() ? raw.trim() : fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = values.length || 1;
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

// ── Availability (vs SLA) ───────────────────────────────────────────────────

export interface Availability {
  online: number;
  expected: number | null;
  /** online / expected, capped at 100. Null on networks with no fixed set. */
  pct: number | null;
  /** Margin above (positive) or below (negative) the SLA target, in points. */
  slaMargin: number | null;
  meetsSla: boolean | null;
}

function availability(onlineValidators: number, expected: number | null): Availability {
  if (expected === null || expected === 0) {
    return { online: onlineValidators, expected, pct: null, slaMargin: null, meetsSla: null };
  }
  const pct = Math.min(100, (onlineValidators / expected) * 100);
  return {
    online: onlineValidators,
    expected,
    pct,
    slaMargin: pct - SLA.availabilityTargetPct,
    meetsSla: pct >= SLA.availabilityTargetPct,
  };
}

// ── Stability (flapping) ────────────────────────────────────────────────────

export interface Stability {
  totalDisconnects: number;
  flappingNodes: number; // records with >= 2 disconnects this session
}

function stability(records: AttestationRecord[]): Stability {
  const fno = records.filter((r) => r.isFno);
  return {
    totalDisconnects: fno.reduce((a, r) => a + r.disconnects, 0),
    flappingNodes: fno.filter((r) => r.disconnects >= 2).length,
  };
}

// ── Domain RAG rollup ───────────────────────────────────────────────────────

export type DomainKey = "availability" | "finality" | "performance";

export interface DomainStatus {
  key: DomainKey;
  label: string;
  severity: Severity;
  headline: string;
}

// ── Top-level aggregate ─────────────────────────────────────────────────────

export interface ExecutiveMetrics {
  network: NetworkId;
  resilienceScore: number; // 0..100 composite
  overall: Severity;
  domains: DomainStatus[];

  availability: Availability;
  stability: Stability;

  versionDist: Share[];
  cityDist: Share[];
  zoneDist: Share[];
  osDist: Share[];
  archDist: Share[];

  /** Largest single validator client-version share, 0..1 (software-diversity signal). */
  dominantVersionShare: number;
  distinctLocations: number;

  finalityGap: number | null;
  avgBlockTimeMs: number | null;
  totalValidators: number;
  totalNodes: number;
}

function clamp(v: number, lo = 0, hi = 100) {
  return Math.min(hi, Math.max(lo, v));
}

export function buildExecutiveMetrics(
  nodes: NodeState[],
  summary: NetworkSummary | null,
  records: AttestationRecord[],
  network: NetworkId
): ExecutiveMetrics {
  const cfg = NETWORKS[network];
  const fnoNodes = nodes.filter((n) => n.isFno);
  const onlineValidators = fnoNodes.length;
  const health = evaluateHealth(nodes, summary, network);

  const avail = availability(onlineValidators, cfg.expectedValidators);
  const stab = stability(records);

  const versionDist = distribution(fnoNodes.map((n) => n.version));
  const cityDist = distribution(fnoNodes.map((n) => n.city));
  const zoneDist = distribution(fnoNodes.map((n) => geoZone(n.latitude, n.longitude)));
  const osDist = distribution(fnoNodes.map((n) => n.os));
  const archDist = distribution(fnoNodes.map((n) => n.cpuArch));
  const dominantVersionShare = versionDist[0]?.share ?? 0;
  const distinctLocations = cityDist.filter((c) => c.key !== "Unknown").length;

  const finalityGap =
    summary && summary.bestBlock > 0 && summary.finalizedBlock > 0
      ? summary.bestBlock - summary.finalizedBlock
      : null;

  const domains: DomainStatus[] = [
    {
      key: "availability",
      label: "Availability / SLA",
      severity: health.validatorCount,
      headline:
        avail.pct !== null
          ? `${avail.online}/${avail.expected} online · ${avail.pct.toFixed(1)}% vs ${SLA.availabilityTargetPct}% SLA`
          : `${avail.online} validators online`,
    },
    {
      key: "finality",
      label: "Finality & Security",
      severity: worstSeverity(health.finalityGap, health.blockTime),
      headline: finalityGap !== null ? `${finalityGap}-block finality gap` : "Awaiting finality data",
    },
    {
      key: "performance",
      label: "Performance",
      severity: health.blockTime,
      headline:
        summary?.avgBlockTime != null ? `${(summary.avgBlockTime / 1000).toFixed(2)}s avg block` : "Measuring",
    },
  ];

  const overall = domains.reduce<Severity>((a, d) => worstSeverity(a, d.severity), "ok");

  // ── Composite resilience score (transparent, weighted) ────────────────────
  // Resilience reflects operational health for a federated set: staying online,
  // finalizing, and stable. Network decentralization is intentionally not scored
  // here — the set is federated by design at this stage.
  const sevScore: Record<Severity, number> = { ok: 100, warning: 65, critical: 25 };
  const availScore = avail.pct ?? sevScore[health.validatorCount];
  const finalityScore = sevScore[worstSeverity(health.finalityGap, health.blockTime)];
  const stabScore = clamp(100 - stab.totalDisconnects * 5 - stab.flappingNodes * 10);
  const resilienceScore = Math.round(
    availScore * 0.45 + finalityScore * 0.35 + stabScore * 0.2
  );

  return {
    network,
    resilienceScore,
    overall,
    domains,
    availability: avail,
    stability: stab,
    versionDist,
    cityDist,
    zoneDist,
    osDist,
    archDist,
    dominantVersionShare,
    distinctLocations,
    finalityGap,
    avgBlockTimeMs: summary?.avgBlockTime ?? null,
    totalValidators: onlineValidators,
    totalNodes: nodes.length,
  };
}

export const SEVERITY_RAG: Record<Severity, { dot: string; text: string; ring: string; label: string }> = {
  ok: { dot: "bg-mn-ok", text: "text-mn-ok", ring: "border-mn-ok/30", label: "On track" },
  warning: { dot: "bg-mn-p3", text: "text-mn-p3", ring: "border-mn-p3/30", label: "Watch" },
  critical: { dot: "bg-mn-p1", text: "text-mn-p1", ring: "border-mn-p1/30", label: "Action" },
};
