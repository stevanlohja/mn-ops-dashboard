import type { NetworkId } from "./networks";
import type { NodeState } from "./types";

/**
 * The EXPECTED validator set per network — the roster the live feed is measured
 * against. Without it the dashboard can only count what it can see, so a
 * validator that has dropped off telemetry entirely reads as "12/12 online"
 * instead of "12/13, and here is the one that is missing".
 *
 * Only telemetry `--name` values appear here. They are already broadcast on the
 * public telemetry feed, so this file adds no non-public detail: no operator
 * entities, no overlay addresses, no endpoints. Keep it that way.
 *
 * PROVENANCE (mainnet, verified 2026-07-29): 13 total, matching
 * `expectedValidators` and confirmed name-for-name against a live read of the
 * mainnet feed.
 *
 * A node that is renamed shows up twice: missing from the roster AND flagged
 * "unlisted" in the validator table. That is deliberate — it makes roster drift
 * visible instead of silently miscounting. Fix the name here when it happens.
 *
 * IMPORTANT: absence from the feed means "not reporting telemetry", which is not
 * the same as "not producing blocks" — a validator can be healthy behind a
 * broken telemetry link. Callers must phrase it that way.
 */
export interface RosterEntry {
  /** Canonical telemetry name as reported to the feed. */
  name: string;
}

/** Mainnet federated validator set (13). See PROVENANCE above. */
export const MAINNET_VALIDATORS: RosterEntry[] = [
  { name: "aton-validator" },
  { name: "bgo-validator" },
  { name: "bkd-validator-bullish" },
  { name: "bkd-validator-mnf" },
  { name: "ktg-validator" },
  { name: "mnf-validator-1" },
  { name: "sfi-validator-google" },
  { name: "sfi-validator-moneygram" },
  { name: "sfi-validator-vodafone" },
  { name: "sfi-validator-worldpay" },
  { name: "stl-validator-labrador-monarch" },
  { name: "stl-validator-whippet-humpback" },
  { name: "twn-validator-etoro" },
];

/**
 * Expected set per network. `null` = no fixed roster to check against: the
 * preprod and preview sets churn with resets and are not pinned to a fixed list
 * the way mainnet's is, so they are counted, not roll-called. Do not invent one.
 */
export const VALIDATOR_ROSTER: Record<NetworkId, RosterEntry[] | null> = {
  mainnet: MAINNET_VALIDATORS,
  preprod: null,
  preview: null,
};

export interface RosterStatus {
  /** Roster size — the "should be" count. */
  expected: number;
  /** Roster entries currently reporting to the feed. */
  present: RosterEntry[];
  /** Roster entries with NO node in the feed — the roll-call misses. */
  missing: RosterEntry[];
  /**
   * Validators in the feed that are not on the roster (a rename, a new node, or
   * a stale roster). Surfaced so the roster can't quietly drift out of date.
   */
  unlisted: NodeState[];
}

function key(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Roll-call the live validator set against the expected roster. Returns null
 * where there is no roster for the network (nothing to compare — the caller
 * should fall back to counting what it sees).
 */
export function rosterStatus(nodes: NodeState[], network: NetworkId): RosterStatus | null {
  const roster = VALIDATOR_ROSTER[network];
  if (!roster) return null;

  const seen = new Map<string, NodeState>();
  for (const n of nodes) {
    if (n.isFno) seen.set(key(n.name), n);
  }
  const rosterKeys = new Set(roster.map((e) => key(e.name)));

  return {
    expected: roster.length,
    present: roster.filter((e) => seen.has(key(e.name))),
    missing: roster.filter((e) => !seen.has(key(e.name))),
    unlisted: [...seen.entries()].filter(([k]) => !rosterKeys.has(k)).map(([, n]) => n),
  };
}

/** True when this validator name is on the network's expected roster. */
export function isOnRoster(name: string, network: NetworkId): boolean {
  const roster = VALIDATOR_ROSTER[network];
  if (!roster) return true; // no roster to judge against
  return roster.some((e) => key(e.name) === key(name));
}
