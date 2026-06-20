import { NodeType } from "@/lib/telemetry/types";

/**
 * Per-node attestation record, accumulated over the lifetime of the
 * telemetry session. Keyed by node NAME (not feed id): telemetry ids are
 * reassigned every time a node reconnects, but names are stable, so keying
 * by name lets uptime/authorship history survive reconnects.
 */
export interface AttestationRecord {
  /** Current feed id (changes across reconnects); null while offline */
  nodeId: number | null;
  name: string;
  nodeType: NodeType;
  isFno: boolean;
  online: boolean;

  /** Wall-clock ms when this node was first observed this session */
  firstSeen: number;
  /** Wall-clock ms of the last feed event that touched this node */
  lastSeen: number;
  /** Number of AddedNode events observed (connection sessions) */
  sessions: number;
  /** Number of RemovedNode events observed (disconnects) */
  disconnects: number;

  /** Blocks attributed to this node via first-report heuristic */
  blocksAuthored: number;
  lastAuthoredBlock: number | null;
  lastAuthoredAt: number | null;

  lastImportedBlock: number;
  lastImportedAt: number | null;
  lastFinalizedBlock: number;
  lastFinalizedAt: number | null;

  /** Recent block propagation samples in ms, newest last (capped) */
  propagationSamples: number[];

  startupTime: number | null;
  peers: number;
}

/** One block with its attributed author (first node to report the height). */
export interface AuthoredBlock {
  blockNumber: number;
  blockHash: string;
  authorName: string;
  /** Wall-clock ms when the dashboard observed the block */
  observedAt: number;
  propagationMs: number | null;
}

export const PROPAGATION_SAMPLE_CAP = 30;
export const RECENT_BLOCKS_CAP = 60;

export function newAttestationRecord(
  name: string,
  nodeType: NodeType,
  now: number
): AttestationRecord {
  return {
    nodeId: null,
    name,
    nodeType,
    isFno: nodeType === "fno-validator",
    online: false,
    firstSeen: now,
    lastSeen: now,
    sessions: 0,
    disconnects: 0,
    blocksAuthored: 0,
    lastAuthoredBlock: null,
    lastAuthoredAt: null,
    lastImportedBlock: 0,
    lastImportedAt: null,
    lastFinalizedBlock: 0,
    lastFinalizedAt: null,
    propagationSamples: [],
    startupTime: null,
    peers: 0,
  };
}

export function avgPropagation(rec: AttestationRecord): number | null {
  if (rec.propagationSamples.length === 0) return null;
  const sum = rec.propagationSamples.reduce((a, b) => a + b, 0);
  return sum / rec.propagationSamples.length;
}
