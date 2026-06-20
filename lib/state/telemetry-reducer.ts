import { NodeState, NetworkSummary, TelemetryEvent } from "@/lib/telemetry/types";
import { classifyNode } from "@/lib/telemetry/classify";
import {
  AttestationRecord,
  AuthoredBlock,
  newAttestationRecord,
  PROPAGATION_SAMPLE_CAP,
  RECENT_BLOCKS_CAP,
} from "@/lib/attestation/types";

/**
 * Central telemetry state. Owned by a pure reducer so that:
 *  - one WebSocket message = one state transition (batched, cheap renders)
 *  - all attestation bookkeeping lives in testable, framework-free code
 *  - the React provider is reduced to socket lifecycle + dispatch
 */
export interface TelemetryState {
  nodes: Map<number, NodeState>;
  summary: NetworkSummary | null;
  /** Attestation records keyed by node name (stable across reconnects) */
  attestation: Map<string, AttestationRecord>;
  /** Recently authored blocks, newest first (first-report attribution) */
  recentBlocks: AuthoredBlock[];
  /** Highest block height observed from any node */
  maxSeenBlock: number;
  /** Total blocks attributed to an author this session */
  totalAttributed: number;
  sessionStartedAt: number;
}

export type TelemetryAction =
  | { type: "events"; events: TelemetryEvent[]; now: number }
  | { type: "reset"; now: number };

export function initialTelemetryState(now: number): TelemetryState {
  return {
    nodes: new Map(),
    summary: null,
    attestation: new Map(),
    recentBlocks: [],
    maxSeenBlock: 0,
    totalAttributed: 0,
    sessionStartedAt: now,
  };
}

export function telemetryReducer(state: TelemetryState, action: TelemetryAction): TelemetryState {
  if (action.type === "reset") return initialTelemetryState(action.now);
  if (action.events.length === 0) return state;

  // Copy-on-write once per batch; events mutate the draft copies.
  const draft: TelemetryState = {
    ...state,
    nodes: new Map(state.nodes),
    attestation: new Map(state.attestation),
    recentBlocks: state.recentBlocks,
  };

  for (const event of action.events) {
    applyEvent(draft, event, action.now);
  }

  return draft;
}

/** Find the attestation record for a feed id, if any. */
function recordById(draft: TelemetryState, id: number): AttestationRecord | null {
  const node = draft.nodes.get(id);
  if (!node) return null;
  return draft.attestation.get(node.name) ?? null;
}

/** Clone-and-store an attestation record before mutating it. */
function touchRecord(draft: TelemetryState, rec: AttestationRecord, now: number): AttestationRecord {
  const next = { ...rec, lastSeen: now };
  draft.attestation.set(next.name, next);
  return next;
}

function applyEvent(draft: TelemetryState, event: TelemetryEvent, now: number): void {
  switch (event.type) {
    case "AddedNode": {
      const nodeType = classifyNode(event.name);
      draft.nodes.set(event.id, {
        id: event.id,
        name: event.name,
        peers: event.peers,
        txCount: event.txCount,
        bestBlock: event.bestBlock,
        bestHash: event.bestHash,
        finalizedBlock: 0,
        finalizedHash: "",
        avgBlockTime: null,
        isFno: nodeType === "fno-validator",
        nodeType,
        implementation: event.implementation,
        version: event.version,
        address: event.address,
        networkId: event.networkId,
        os: event.os,
        cpuArch: event.cpuArch,
        environment: event.environment,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
        startupTime: event.startupTime,
        blockPropagationMs: event.blockPropagationMs,
        lastUpdate: now,
      });

      const prev = draft.attestation.get(event.name) ?? newAttestationRecord(event.name, nodeType, now);
      const rec = touchRecord(draft, prev, now);
      rec.nodeId = event.id;
      rec.online = true;
      rec.sessions += 1;
      rec.startupTime = event.startupTime;
      rec.peers = event.peers;
      if (event.bestBlock > rec.lastImportedBlock) {
        rec.lastImportedBlock = event.bestBlock;
        rec.lastImportedAt = now;
      }
      if (event.bestBlock > draft.maxSeenBlock) draft.maxSeenBlock = event.bestBlock;
      break;
    }

    case "RemovedNode": {
      const rec = recordById(draft, event.id);
      if (rec) {
        const next = touchRecord(draft, rec, now);
        next.online = false;
        next.nodeId = null;
        next.disconnects += 1;
        next.peers = 0;
      }
      draft.nodes.delete(event.id);
      break;
    }

    case "ImportedBlock": {
      const node = draft.nodes.get(event.id);
      if (!node) break;

      // First node to report a never-seen height is attributed as the
      // probable block producer (observability heuristic, not a proof).
      const isNewHeight = event.blockNumber > draft.maxSeenBlock;
      if (isNewHeight) draft.maxSeenBlock = event.blockNumber;

      draft.nodes.set(event.id, {
        ...node,
        bestBlock: event.blockNumber,
        bestHash: event.blockHash,
        blockPropagationMs: event.propagationMs ?? node.blockPropagationMs,
        lastUpdate: now,
      });

      const rec = draft.attestation.get(node.name);
      if (rec) {
        const next = touchRecord(draft, rec, now);
        next.lastImportedBlock = event.blockNumber;
        next.lastImportedAt = now;
        if (event.propagationMs !== null) {
          next.propagationSamples = [...next.propagationSamples, event.propagationMs].slice(
            -PROPAGATION_SAMPLE_CAP
          );
        }
        if (isNewHeight) {
          next.blocksAuthored += 1;
          next.lastAuthoredBlock = event.blockNumber;
          next.lastAuthoredAt = now;
          draft.totalAttributed += 1;
          draft.recentBlocks = [
            {
              blockNumber: event.blockNumber,
              blockHash: event.blockHash,
              authorName: node.name,
              observedAt: now,
              propagationMs: event.propagationMs,
            },
            ...draft.recentBlocks,
          ].slice(0, RECENT_BLOCKS_CAP);
        }
      }
      break;
    }

    case "FinalizedBlock": {
      const node = draft.nodes.get(event.id);
      if (!node) break;
      draft.nodes.set(event.id, {
        ...node,
        finalizedBlock: event.blockNumber,
        finalizedHash: event.blockHash,
        lastUpdate: now,
      });
      const rec = draft.attestation.get(node.name);
      if (rec) {
        const next = touchRecord(draft, rec, now);
        next.lastFinalizedBlock = event.blockNumber;
        next.lastFinalizedAt = now;
      }
      break;
    }

    case "NodeStats": {
      const node = draft.nodes.get(event.id);
      if (!node) break;
      draft.nodes.set(event.id, {
        ...node,
        peers: event.peers,
        txCount: event.txCount,
        lastUpdate: now,
      });
      const rec = draft.attestation.get(node.name);
      if (rec) {
        const next = touchRecord(draft, rec, now);
        next.peers = event.peers;
      }
      break;
    }

    case "LocatedNode": {
      const node = draft.nodes.get(event.id);
      if (!node) break;
      draft.nodes.set(event.id, {
        ...node,
        city: event.city,
        latitude: event.latitude,
        longitude: event.longitude,
        lastUpdate: now,
      });
      break;
    }

    case "BestBlock": {
      draft.summary = {
        bestBlock: event.blockNumber,
        finalizedBlock: draft.summary?.finalizedBlock ?? 0,
        finalizedHash: draft.summary?.finalizedHash ?? "",
        timestamp: event.timestamp,
        avgBlockTime: event.avgBlockTime,
      };
      if (event.blockNumber > draft.maxSeenBlock) draft.maxSeenBlock = event.blockNumber;
      break;
    }

    case "BestFinalized": {
      draft.summary = draft.summary
        ? { ...draft.summary, finalizedBlock: event.blockNumber, finalizedHash: event.blockHash }
        : {
            bestBlock: 0,
            finalizedBlock: event.blockNumber,
            finalizedHash: event.blockHash,
            timestamp: now,
            avgBlockTime: null,
          };
      break;
    }
  }
}
