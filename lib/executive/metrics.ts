import { NodeState, NetworkSummary } from "@/lib/telemetry/types";
import { AttestationRecord } from "@/lib/attestation/types";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { evaluateHealth, Severity, worstSeverity } from "@/lib/health/health";

/**
 * Executive-suite rollups. Every metric here is derived from live telemetry
 * (nodes + attestation records) except the explicitly-labelled planning
 * assumptions in COST_MODEL / SLA — there is no cost, rewards, or historical
 * persistence feed, so those are operator-supplied estimates, not facts.
 *
 * Pure functions, no React, unit-testable.
 */

// ── Operator-supplied planning assumptions (NOT telemetry) ──────────────────
// Edit these to match real contracted figures. They are surfaced in the UI
// with a "modeled" label so they are never mistaken for billed spend.
export const COST_MODEL = {
  /** Fully-loaded infra + ops estimate per validator per month, USD. */
  monthlyUsdPerValidator: 850,
  currency: "USD",
};

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

/** Herfindahl–Hirschman style effective count: 1 / Σ(shareᵢ²). */
function effectiveCount(shares: number[]): number | null {
  const sumSq = shares.reduce((a, s) => a + s * s, 0);
  return sumSq > 0 ? 1 / sumSq : null;
}

// ── Authorship concentration (decentralization) ─────────────────────────────

export interface Concentration {
  /** Min validators producing > 50% of attributed blocks. Null until enough data. */
  nakamoto: number | null;
  /** Largest single-validator authorship share, 0..1. */
  topShare: number;
  /** 1/HHI — effective number of equally-weighted producers. */
  effectiveValidators: number | null;
  totalAttributed: number;
  judged: boolean;
}

/** Authorship is judged once we've seen at least 2 rounds per online validator. */
function concentration(records: AttestationRecord[], onlineValidators: number, totalAttributed: number): Concentration {
  const counts = records
    .filter((r) => r.isFno && r.blocksAuthored > 0)
    .map((r) => r.blocksAuthored)
    .sort((a, b) => b - a);

  const judged = totalAttributed >= Math.max(4, onlineValidators * 2) && counts.length > 0;
  if (!judged) {
    return { nakamoto: null, topShare: 0, effectiveValidators: null, totalAttributed, judged: false };
  }

  const total = counts.reduce((a, c) => a + c, 0) || 1;
  let cumulative = 0;
  let nakamoto = 0;
  for (const c of counts) {
    cumulative += c;
    nakamoto += 1;
    if (cumulative / total > 0.5) break;
  }

  return {
    nakamoto,
    topShare: counts[0] / total,
    effectiveValidators: effectiveCount(counts.map((c) => c / total)),
    totalAttributed,
    judged: true,
  };
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

// ── Economics (modeled, not billed) ─────────────────────────────────────────

export interface Economics {
  monthlyUsd: number;
  annualUsd: number;
  perValidatorUsd: number;
  validators: number;
  modeled: true;
}

function economics(onlineValidators: number): Economics {
  const monthlyUsd = onlineValidators * COST_MODEL.monthlyUsdPerValidator;
  return {
    monthlyUsd,
    annualUsd: monthlyUsd * 12,
    perValidatorUsd: COST_MODEL.monthlyUsdPerValidator,
    validators: onlineValidators,
    modeled: true,
  };
}

// ── Domain RAG rollup ───────────────────────────────────────────────────────

export type DomainKey = "availability" | "finality" | "decentralization" | "performance";

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
  concentration: Concentration;
  stability: Stability;
  economics: Economics;

  versionDist: Share[];
  cityDist: Share[];
  osDist: Share[];
  archDist: Share[];

  /** Largest single validator-client version share, 0..1 (monoculture risk). */
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
  totalAttributed: number,
  network: NetworkId
): ExecutiveMetrics {
  const cfg = NETWORKS[network];
  const fnoNodes = nodes.filter((n) => n.isFno);
  const onlineValidators = fnoNodes.length;
  const health = evaluateHealth(nodes, summary, network);

  const avail = availability(onlineValidators, cfg.expectedValidators);
  const conc = concentration(records, onlineValidators, totalAttributed);
  const stab = stability(records);
  const econ = economics(onlineValidators);

  const versionDist = distribution(fnoNodes.map((n) => n.version));
  const cityDist = distribution(fnoNodes.map((n) => n.city));
  const osDist = distribution(fnoNodes.map((n) => n.os));
  const archDist = distribution(fnoNodes.map((n) => n.cpuArch));
  const dominantVersionShare = versionDist[0]?.share ?? 0;
  const distinctLocations = cityDist.filter((c) => c.key !== "Unknown").length;

  const finalityGap =
    summary && summary.bestBlock > 0 && summary.finalizedBlock > 0
      ? summary.bestBlock - summary.finalizedBlock
      : null;

  // ── Decentralization severity: concentration + client monoculture ─────────
  let decentralization: Severity = "ok";
  if (conc.judged) {
    if (conc.nakamoto !== null && conc.nakamoto <= 2) decentralization = "critical";
    else if (conc.nakamoto !== null && conc.nakamoto <= Math.ceil(onlineValidators / 3)) {
      decentralization = "warning";
    }
  }
  if (dominantVersionShare > 0.66) decentralization = worstSeverity(decentralization, "critical");
  else if (dominantVersionShare > 0.5) decentralization = worstSeverity(decentralization, "warning");

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
      key: "decentralization",
      label: "Decentralization",
      severity: decentralization,
      headline: conc.judged
        ? `Nakamoto ${conc.nakamoto} · top client ${(dominantVersionShare * 100).toFixed(0)}%`
        : `${distinctLocations} locations · top client ${(dominantVersionShare * 100).toFixed(0)}%`,
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
  const sevScore: Record<Severity, number> = { ok: 100, warning: 65, critical: 25 };
  const availScore = avail.pct ?? sevScore[health.validatorCount];
  const finalityScore = sevScore[worstSeverity(health.finalityGap, health.blockTime)];
  const decentScore = conc.judged
    ? clamp(((conc.nakamoto ?? 1) / Math.max(1, onlineValidators / 3)) * 100) * (1 - Math.max(0, dominantVersionShare - 0.5))
    : sevScore[decentralization];
  const stabScore = clamp(100 - stab.totalDisconnects * 5 - stab.flappingNodes * 10);
  const resilienceScore = Math.round(
    availScore * 0.35 + finalityScore * 0.25 + decentScore * 0.25 + stabScore * 0.15
  );

  return {
    network,
    resilienceScore,
    overall,
    domains,
    availability: avail,
    concentration: conc,
    stability: stab,
    economics: econ,
    versionDist,
    cityDist,
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

export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
