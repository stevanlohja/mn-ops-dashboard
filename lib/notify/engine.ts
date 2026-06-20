import { Alert, Severity } from "@/lib/health/health";
import {
  NotifyConfig,
  NotifyEngineState,
  SentAlertEntry,
} from "./types";

/**
 * Edge-triggered notification engine (pure).
 *
 * Given the previous engine state and the current alert list, decide which
 * alerts to push to Discord. The rules:
 *
 *   - new        → alert id not seen before
 *   - escalated  → alert id seen, but severity went up (warning → critical)
 *   - renotify   → still-active CRITICAL alert, re-sent every RENOTIFY_COOLDOWN_MS
 *                  so an ongoing consensus failure can't scroll out of sight.
 *                  Warnings are sent once and then stay quiet until resolved.
 *   - resolved   → previously-sent alert id no longer present (or it dropped
 *                  below the configured severity threshold)
 *
 * The engine never performs I/O — the provider owns fetch and timing.
 */

export const RENOTIFY_COOLDOWN_MS = 15 * 60_000;

const RANK: Record<Severity, number> = { ok: 0, warning: 1, critical: 2 };

export type NotifyKind = "new" | "escalated" | "renotify";

export interface OutboundAlert {
  alert: Alert;
  kind: NotifyKind;
}

export interface ResolvedAlert {
  id: string;
  message: string;
  severity: Severity;
}

export interface NotifyDecision {
  outbound: OutboundAlert[];
  resolved: ResolvedAlert[];
  nextState: NotifyEngineState;
}

export function meetsThreshold(severity: Severity, min: NotifyConfig["minSeverity"]): boolean {
  return RANK[severity] >= RANK[min];
}

export function decideNotifications(
  state: NotifyEngineState,
  alerts: Alert[],
  config: NotifyConfig,
  now: number
): NotifyDecision {
  const eligible = alerts.filter((a) => meetsThreshold(a.severity, config.minSeverity));
  const outbound: OutboundAlert[] = [];
  const resolved: ResolvedAlert[] = [];
  const nextSent = new Map<string, SentAlertEntry>();

  for (const alert of eligible) {
    const prev = state.sent.get(alert.id);

    if (!prev) {
      outbound.push({ alert, kind: "new" });
      nextSent.set(alert.id, { severity: alert.severity, message: alert.message, lastSentAt: now });
    } else if (RANK[alert.severity] > RANK[prev.severity]) {
      outbound.push({ alert, kind: "escalated" });
      nextSent.set(alert.id, { severity: alert.severity, message: alert.message, lastSentAt: now });
    } else if (alert.severity === "critical" && now - prev.lastSentAt >= RENOTIFY_COOLDOWN_MS) {
      outbound.push({ alert, kind: "renotify" });
      nextSent.set(alert.id, { severity: alert.severity, message: alert.message, lastSentAt: now });
    } else {
      // Still active, nothing to say — carry the entry forward (keeping the
      // original lastSentAt so the renotify clock keeps ticking), but track
      // the latest message/severity for an accurate "resolved" line later.
      nextSent.set(alert.id, {
        severity: alert.severity,
        message: alert.message,
        lastSentAt: prev.lastSentAt,
      });
    }
  }

  for (const [id, entry] of state.sent) {
    if (!nextSent.has(id)) {
      resolved.push({ id, message: entry.message, severity: entry.severity });
    }
  }

  return { outbound, resolved, nextState: { sent: nextSent } };
}
