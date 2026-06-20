import { AttestationRecord } from "./types";

export type ScoreLabel = "excellent" | "good" | "fair" | "poor";

export interface AttestationScore {
  /** Weighted composite, 0–100 */
  total: number;
  /** Online + feed freshness, 0–100 */
  presence: number;
  /** Observed vs expected block authorship share, 0–100. Null when not a
   *  validator or when too few blocks have been attributed to judge. */
  authorship: number | null;
  /** Finalized-height freshness vs network finalized head, 0–100. Null when
   *  the node has not reported finality yet. */
  finality: number | null;
  /** Peer count vs expected, 0–100. Null when the network has no peer target. */
  peerHealth: number | null;
  label: ScoreLabel;
}

export interface ScoreContext {
  now: number;
  networkFinalized: number;
  /** Currently-online FNO validators (for expected authorship share) */
  onlineValidators: number;
  /** Total blocks attributed via the first-report heuristic this session */
  totalAttributed: number;
  /** Expected peer count for a healthy node, or null to skip peer scoring */
  expectedPeers: number | null;
}

/** Minimum attributed blocks per online validator before authorship is judged */
const MIN_ROUNDS_FOR_AUTHORSHIP = 2;

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

function presenceScore(rec: AttestationRecord, now: number): number {
  if (!rec.online) return 0;
  const staleSec = (now - rec.lastSeen) / 1000;
  // Fresh feed activity within 30s is full marks; decay to 40 by 5 minutes.
  const freshness = staleSec <= 30 ? 100 : staleSec >= 300 ? 40 : 100 - ((staleSec - 30) / 270) * 60;
  // Each observed disconnect this session costs 5 points, floored at -25.
  const flapPenalty = Math.min(rec.disconnects * 5, 25);
  return clamp(freshness - flapPenalty);
}

function authorshipScore(rec: AttestationRecord, ctx: ScoreContext): number | null {
  if (!rec.isFno) return null;
  if (ctx.onlineValidators === 0) return null;
  if (ctx.totalAttributed < ctx.onlineValidators * MIN_ROUNDS_FOR_AUTHORSHIP) return null;
  const expectedShare = 1 / ctx.onlineValidators;
  const observedShare = rec.blocksAuthored / ctx.totalAttributed;
  // Producing at or above the expected round-robin share is full marks;
  // under-production scales down linearly.
  return clamp((observedShare / expectedShare) * 100);
}

function finalityScore(rec: AttestationRecord, ctx: ScoreContext): number | null {
  if (rec.lastFinalizedBlock <= 0 || ctx.networkFinalized <= 0) return null;
  const lag = ctx.networkFinalized - rec.lastFinalizedBlock;
  if (lag <= 2) return 100;
  if (lag <= 5) return 80;
  if (lag <= 10) return 60;
  if (lag <= 20) return 40;
  return 20;
}

function peerScore(rec: AttestationRecord, ctx: ScoreContext): number | null {
  if (ctx.expectedPeers === null) return null;
  if (!rec.online) return null;
  if (rec.peers === 0) return 0;
  return clamp((rec.peers / ctx.expectedPeers) * 100);
}

const WEIGHTS = { presence: 0.35, authorship: 0.25, finality: 0.25, peerHealth: 0.15 };

export function scoreLabel(total: number): ScoreLabel {
  if (total >= 90) return "excellent";
  if (total >= 75) return "good";
  if (total >= 50) return "fair";
  return "poor";
}

/**
 * Composite attestation score. Components without enough data are excluded
 * and the remaining weights re-normalised, so a freshly-connected node is
 * judged only on what we can actually observe.
 */
export function scoreRecord(rec: AttestationRecord, ctx: ScoreContext): AttestationScore {
  const presence = presenceScore(rec, ctx.now);
  const authorship = authorshipScore(rec, ctx);
  const finality = finalityScore(rec, ctx);
  const peerHealth = peerScore(rec, ctx);

  const parts: { value: number; weight: number }[] = [
    { value: presence, weight: WEIGHTS.presence },
  ];
  if (authorship !== null) parts.push({ value: authorship, weight: WEIGHTS.authorship });
  if (finality !== null) parts.push({ value: finality, weight: WEIGHTS.finality });
  if (peerHealth !== null) parts.push({ value: peerHealth, weight: WEIGHTS.peerHealth });

  const weightSum = parts.reduce((a, p) => a + p.weight, 0);
  const total = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) / weightSum);

  return { total, presence: Math.round(presence), authorship, finality, peerHealth, label: scoreLabel(total) };
}
