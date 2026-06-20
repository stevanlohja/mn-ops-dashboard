import { ACTIONS, TelemetryEvent } from "./types";

/**
 * Parse a raw Substrate telemetry WebSocket message into typed events.
 *
 * Wire format: flat JSON array with alternating pairs — [action, payload, action, payload, ...]
 * Each payload is itself a nested array/tuple. Payload is consumed as a single element (i += 2).
 *
 * Pure function — no side effects, safe to unit test.
 * Source: paritytech/substrate-telemetry frontend/src/common/feed.ts
 */
export function parseFeedMessage(raw: string): TelemetryEvent[] {
  let batch: unknown[];
  try {
    batch = JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }

  if (!Array.isArray(batch) || batch.length < 2 || batch.length % 2 !== 0) return [];

  const events: TelemetryEvent[] = [];

  for (let i = 0; i < batch.length; i += 2) {
    const action = batch[i] as number;
    const payload = batch[i + 1] as unknown[];

    if (!Array.isArray(payload)) continue;

    try {
      switch (action) {
        case ACTIONS.AddedNode: {
          // payload: [id, nodeDetails, nodeStats, nodeIO, nodeHw, blockDetails, location, startupTime]
          // nodeDetails: [name, impl, version, addr, netId, os, arch, env, _, sysInfo]
          // nodeStats: [peers, txCount]
          // blockDetails: [blockNumber, blockHash, ms, timestamp, propTime]
          const id = payload[0] as number;
          const details = payload[1] as unknown[];
          const stats = payload[2] as unknown[];
          const block = payload[5] as unknown[];
          const loc = payload[6] as unknown[] | null;
          const startup = payload[7] as number | null;
          events.push({
            type: "AddedNode",
            id,
            name: (details?.[0] as string) ?? "",
            peers: (stats?.[0] as number) ?? 0,
            txCount: (stats?.[1] as number) ?? 0,
            bestBlock: (block?.[0] as number) ?? 0,
            bestHash: (block?.[1] as string) ?? "",
            implementation: (details?.[1] as string) ?? "",
            version: (details?.[2] as string) ?? "",
            address: (details?.[3] as string) ?? "",
            networkId: (details?.[4] as string) ?? "",
            os: (details?.[5] as string) ?? "",
            cpuArch: (details?.[6] as string) ?? "",
            environment: (details?.[7] as string) ?? "",
            city: (loc?.[2] as string) ?? "",
            latitude: (loc?.[0] as number) ?? null,
            longitude: (loc?.[1] as number) ?? null,
            startupTime: startup ?? null,
            blockPropagationMs: (block?.[4] as number) ?? null,
          });
          break;
        }

        case ACTIONS.RemovedNode: {
          // payload: [id]
          events.push({ type: "RemovedNode", id: payload[0] as number });
          break;
        }

        case ACTIONS.ImportedBlock: {
          // payload: [id, blockDetails]
          // blockDetails: [blockNumber, blockHash, ms, timestamp, propTime]
          const id = payload[0] as number;
          const block = payload[1] as unknown[];
          events.push({
            type: "ImportedBlock",
            id,
            blockNumber: (block?.[0] as number) ?? 0,
            blockHash: (block?.[1] as string) ?? "",
            propagationMs: (block?.[4] as number) ?? null,
          });
          break;
        }

        case ACTIONS.LocatedNode: {
          // payload: [id, lat, lng, city]
          events.push({
            type: "LocatedNode",
            id: payload[0] as number,
            latitude: (payload[1] as number) ?? 0,
            longitude: (payload[2] as number) ?? 0,
            city: (payload[3] as string) ?? "",
          });
          break;
        }

        case ACTIONS.FinalizedBlock: {
          // payload: [id, blockNumber, blockHash]
          events.push({
            type: "FinalizedBlock",
            id: payload[0] as number,
            blockNumber: payload[1] as number,
            blockHash: payload[2] as string,
          });
          break;
        }

        case ACTIONS.NodeStats: {
          // payload: [id, [peers, txCount]]
          const id = payload[0] as number;
          const stats = payload[1] as unknown[];
          events.push({
            type: "NodeStats",
            id,
            peers: (stats?.[0] as number) ?? 0,
            txCount: (stats?.[1] as number) ?? 0,
          });
          break;
        }

        case ACTIONS.BestBlock: {
          // payload: [blockNumber, timestamp, maybeAvgMs]
          events.push({
            type: "BestBlock",
            blockNumber: payload[0] as number,
            timestamp: payload[1] as number,
            avgBlockTime: (payload[2] as number | null) ?? null,
          });
          break;
        }

        case ACTIONS.BestFinalized: {
          // payload: [blockNumber, blockHash]
          events.push({
            type: "BestFinalized",
            blockNumber: payload[0] as number,
            blockHash: payload[1] as string,
          });
          break;
        }

        // Silently skip all other action types
        default:
          break;
      }
    } catch {
      // Malformed payload for this message — skip it and continue
    }
  }

  return events;
}
