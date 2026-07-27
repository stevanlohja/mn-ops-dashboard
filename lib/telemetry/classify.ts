import { NodeType } from "./types";

/**
 * Node names the "validator" substring heuristic misses, matched as a lowercased
 * substring. Two distinct cases:
 *
 *  1. Protocol-operated (Shielded) overlay codenames. The preprod guarded set
 *     reports `stl-validator-walleye-marlin`, `stl-validator-grub-unicorn`, etc.
 *     (these already contain "validator", but the bare codenames are kept for
 *     resilience against future `--name` changes).
 *  2. FNO validators whose operator-chosen telemetry `--name` omits "validator"
 *     entirely. On PREPROD several operators report bare names — `ATON`,
 *     `moneygram-bcw`, `vodaphone-bcw`, `worldpay-bcw` — even though the SAME
 *     operators name their mainnet nodes correctly (`sfi-validator-moneygram`).
 *     Without these entries those 4 preprod validators are miscounted as
 *     "other", which is why the preprod board read 10 online instead of 14.
 *
 * Verified against the live telemetry feed + the ops reserved-nodes roster
 * (`configs/nodes/preprod/p2p-peers.md`). Entries are kept specific enough not to
 * over-match mainnet — e.g. `moneygram-bcw` won't hit mainnet's standby
 * `sfi-tmp-moneygram-1`. Update if a network reset renames the set.
 */
const KNOWN_VALIDATORS = [
  // Shielded overlay codenames (preprod guarded set)
  "walleye-marlin",
  "walleye-dodo",
  "grub-unicorn",
  "antelope-possum",
  // FNO validators whose preprod telemetry name omits "validator"
  "aton",
  "moneygram-bcw",
  "vodaphone-bcw",
  "worldpay-bcw",
];

/**
 * Classify a node by its name into a NodeType.
 * Order matters — more specific patterns must come before general ones.
 */
export function classifyNode(name: string): NodeType {
  if (!name) return "other";
  const lower = name.toLowerCase();
  if (lower.includes("validator") || KNOWN_VALIDATORS.some((v) => lower.includes(v))) {
    return "fno-validator";
  }
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
