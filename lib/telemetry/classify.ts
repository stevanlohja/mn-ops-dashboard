import { NodeType } from "./types";

/**
 * Classify a node by its name into a NodeType.
 * Order matters — more specific patterns must come before general ones.
 */
export function classifyNode(name: string): NodeType {
  if (!name) return "other";
  const lower = name.toLowerCase();
  if (lower.includes("validator")) return "fno-validator";
  if (lower.includes("filter-gateway") || lower.includes("filter_gateway")) return "filter-gateway";
  // Check semi-trusted before generic "rpc" — semi-trusted names also contain "rpc"
  if (lower.includes("semi-trusted") || lower.includes("semi_trusted")) return "semi-trusted-rpc";
  if (lower.includes("boot")) return "boot";
  if (lower.includes("bridge")) return "bridge";
  if (lower.includes("rpc")) return "rpc";
  return "other";
}

export function isFnoNode(name: string): boolean {
  return classifyNode(name) === "fno-validator";
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  "fno-validator": "FNO Validator",
  "filter-gateway": "Filter Gateway",
  boot: "Boot Node",
  bridge: "Bridge",
  "semi-trusted-rpc": "Semi-Trusted RPC",
  rpc: "RPC",
  other: "Other",
};
