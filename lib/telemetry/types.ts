/** Substrate telemetry feed action codes (from paritytech/substrate-telemetry feed.ts) */
export const ACTIONS = {
  FeedVersion:           0,
  BestBlock:             1,
  BestFinalized:         2,
  AddedNode:             3,
  RemovedNode:           4,
  LocatedNode:           5,
  ImportedBlock:         6,
  FinalizedBlock:        7,
  NodeStats:             8,
  NodeHardware:          9,
  TimeSync:             10,
  AddedChain:           11,
  RemovedChain:         12,
  SubscribedTo:         13,
  UnsubscribedFrom:     14,
  Pong:                 15,
  AfgFinalized:         16,
  AfgReceivedPrevote:   17,
  AfgReceivedPrecommit: 18,
  AfgAuthoritySet:      19,
  StaleNode:            20,
  NodeIO:               21,
  ChainStatsUpdate:     22,
  TelemetryInfo:        23,
} as const;

export type ActionCode = (typeof ACTIONS)[keyof typeof ACTIONS];

/**
 * Wire format: flat JSON array with alternating [action, payload] pairs.
 * [ action1, payload1, action2, payload2, ... ]
 * Each payload is itself a tuple/array.
 *
 * Key payload shapes:
 *   BestBlock (1):      [blockNumber, timestamp, maybeAvgMs]
 *   BestFinalized (2):  [blockNumber, blockHash]
 *   AddedNode (3):      [id, nodeDetails, nodeStats, nodeIO, nodeHw, blockDetails, location, startupTime]
 *     nodeDetails:      [name, impl, version, addr, netId, os, arch, env, _, sysInfo]
 *     nodeStats:        [peers, txCount]
 *     blockDetails:     [blockNumber, blockHash, ms, timestamp, propTime]
 *   RemovedNode (4):    [id]
 *   ImportedBlock (6):  [id, blockDetails]
 *   FinalizedBlock (7): [id, blockNumber, blockHash]
 *   NodeStats (8):      [id, [peers, txCount]]
 */

export type NodeType =
  | "fno-validator"
  | "filter-gateway"
  | "boot"
  | "bridge"
  | "semi-trusted-rpc"
  | "rpc"
  | "other";

export interface NodeState {
  id: number;
  name: string;
  peers: number;
  txCount: number;
  bestBlock: number;
  bestHash: string;
  finalizedBlock: number;
  finalizedHash: string;
  avgBlockTime: number | null; // ms
  isFno: boolean;
  nodeType: NodeType;
  // Extended fields from AddedNode payload
  implementation: string;
  version: string;
  address: string;
  networkId: string;
  os: string;
  cpuArch: string;
  environment: string;
  // Location (from AddedNode or LocatedNode)
  city: string;
  latitude: number | null;
  longitude: number | null;
  // Timing
  startupTime: number | null;
  blockPropagationMs: number | null;
  /** Wall-clock ms of the last feed event that touched this node */
  lastUpdate: number;
}

export interface NetworkSummary {
  bestBlock: number;
  finalizedBlock: number;
  finalizedHash: string;
  timestamp: number;
  avgBlockTime: number | null; // ms
}

export type WsStatus = "connecting" | "live" | "fallback" | "error";

export type TelemetryEvent =
  | { type: "AddedNode"; id: number; name: string; peers: number; txCount: number; bestBlock: number; bestHash: string; implementation: string; version: string; address: string; networkId: string; os: string; cpuArch: string; environment: string; city: string; latitude: number | null; longitude: number | null; startupTime: number | null; blockPropagationMs: number | null }
  | { type: "RemovedNode"; id: number }
  | { type: "ImportedBlock"; id: number; blockNumber: number; blockHash: string; propagationMs: number | null }
  | { type: "FinalizedBlock"; id: number; blockNumber: number; blockHash: string }
  | { type: "NodeStats"; id: number; peers: number; txCount: number }
  | { type: "BestBlock"; blockNumber: number; timestamp: number; avgBlockTime: number | null }
  | { type: "BestFinalized"; blockNumber: number; blockHash: string }
  | { type: "LocatedNode"; id: number; latitude: number; longitude: number; city: string };
