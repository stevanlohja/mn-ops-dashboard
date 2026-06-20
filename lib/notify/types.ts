import { Severity } from "@/lib/health/health";

/**
 * Discord alert notification config. Persisted to localStorage by the
 * provider; everything in lib/notify is framework-free and unit-testable.
 */

export type MinSeverity = "warning" | "critical";

export interface NotifyConfig {
  enabled: boolean;
  /** Discord webhook URL (https://discord.com/api/webhooks/{id}/{token}) */
  webhookUrl: string;
  /**
   * "critical"  → consensus failures only (validators below GRANDPA 2/3,
   *               finality stalled, block production stalled, isolated nodes)
   * "warning"   → also degradation (reduced validator set, low peers,
   *               elevated block time, growing finality gap)
   */
  minSeverity: MinSeverity;
  /** Optional text prepended to every message, e.g. a role ping <@&123…> */
  mention: string;
}

export const DEFAULT_NOTIFY_CONFIG: NotifyConfig = {
  enabled: false,
  webhookUrl: "",
  minSeverity: "critical",
  mention: "",
};

/** What we last told Discord about a given alert id. */
export interface SentAlertEntry {
  severity: Severity;
  message: string;
  lastSentAt: number;
}

export interface NotifyEngineState {
  sent: Map<string, SentAlertEntry>;
}

export function initialNotifyEngineState(): NotifyEngineState {
  return { sent: new Map() };
}

export interface DeliveryResult {
  at: number;
  ok: boolean;
  status?: number;
  error?: string;
  /** Number of alert embeds in the delivered payload */
  count: number;
}
