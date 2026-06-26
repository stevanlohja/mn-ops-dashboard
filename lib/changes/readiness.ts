import { NodeState } from "@/lib/telemetry/types";
import { NetworkId } from "@/lib/telemetry/networks";
import { NetworkChange, ReadinessSpec } from "./types";

/**
 * Telemetry-derived rollout readiness for a coordinated change. Pure TypeScript —
 * no React. Counts the FNO validators already reporting a version ≥ the target,
 * which is the live signal behind a governance-gated runtime upgrade.
 *
 * IMPORTANT: the feed is scoped to one network at a time, so readiness can only
 * be MEASURED when the selected network equals the change's target env. When it
 * doesn't, `live` is false and the caller should fall back to the curated env
 * status rather than imply a number.
 */
export interface ReadinessResult {
  spec: ReadinessSpec;
  /** True when the selected network matches the target env, so counts are real telemetry. */
  live: boolean;
  /** FNO validators reporting version ≥ target (0 when not live). */
  ready: number;
  /** FNO validators seen on the target env (0 when not live). */
  total: number;
  /** ready / total * 100, or null when not live or no validators seen yet. */
  pct: number | null;
  /** Whether the live readiness has reached the governance threshold. */
  meetsThreshold: boolean;
}

/** Parse a leading `major.minor.patch` into a comparable tuple, or null. */
function parseSemver(v: string): [number, number, number] | null {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(v ?? "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * True when `version` is ≥ `target` by leading semver (suffixes like `-rc1` are
 * ignored). Unparseable versions are treated as not-ready, conservatively.
 */
export function versionAtLeast(version: string, target: string): boolean {
  const a = parseSemver(version);
  const b = parseSemver(target);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

export function computeReadiness(
  change: NetworkChange,
  nodes: NodeState[],
  network: NetworkId,
): ReadinessResult | null {
  const spec = change.readiness;
  if (!spec) return null;

  const live = network === spec.env;
  if (!live) {
    return { spec, live: false, ready: 0, total: 0, pct: null, meetsThreshold: false };
  }

  const fno = nodes.filter((n) => n.isFno);
  const total = fno.length;
  const ready = fno.filter((n) => versionAtLeast(n.version, spec.targetVersion)).length;
  const pct = total > 0 ? (ready / total) * 100 : null;
  const meetsThreshold = pct != null && pct >= spec.thresholdPct;

  return { spec, live, ready, total, pct, meetsThreshold };
}
