"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { buildAlerts } from "@/lib/health/health";
import {
  DEFAULT_NOTIFY_CONFIG,
  DeliveryResult,
  initialNotifyEngineState,
  NotifyConfig,
} from "@/lib/notify/types";
import { decideNotifications } from "@/lib/notify/engine";
import {
  buildAlertPayload,
  buildTestPayload,
  isValidDiscordWebhook,
  sendDiscordWebhook,
  SendResult,
} from "@/lib/notify/discord";

/**
 * React binding for Discord alerting. All decision logic lives in
 * lib/notify/engine.ts — this provider only owns:
 *   - config persistence (localStorage)
 *   - arming (suppress alerts while the feed is still bootstrapping)
 *   - throttled evaluation of the alert stream
 *   - webhook delivery + last-result bookkeeping for the settings UI
 *
 * Mounted in the root layout so alerting runs no matter which page is open.
 */

const STORAGE_KEY = "mn-notify";

/**
 * After (re)connecting or switching networks the node list fills in over a few
 * seconds — "only 2/13 validators online" right after subscribe is bootstrap
 * noise, not an incident. Hold fire until the feed has been live this long.
 */
const ARM_DELAY_MS = 30_000;

/** Evaluate at most this often (telemetry can deliver several messages/sec). */
const MIN_EVAL_INTERVAL_MS = 5_000;

interface NotifyCtx {
  config: NotifyConfig;
  setConfig: (patch: Partial<NotifyConfig>) => void;
  lastDelivery: DeliveryResult | null;
  sendTest: () => Promise<SendResult>;
}

const Ctx = createContext<NotifyCtx>({
  config: DEFAULT_NOTIFY_CONFIG,
  setConfig: () => {},
  lastDelivery: null,
  sendTest: async () => ({ ok: false, error: "Notify provider not mounted" }),
});

export function useNotify() {
  return useContext(Ctx);
}

function readStoredConfig(): NotifyConfig {
  if (typeof window === "undefined") return DEFAULT_NOTIFY_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFY_CONFIG;
    return { ...DEFAULT_NOTIFY_CONFIG, ...(JSON.parse(raw) as Partial<NotifyConfig>) };
  } catch {
    return DEFAULT_NOTIFY_CONFIG;
  }
}

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const { nodes, summary, network, wsStatus } = useTelemetry();
  const [config, setConfigRaw] = useState<NotifyConfig>(readStoredConfig);
  const [lastDelivery, setLastDelivery] = useState<DeliveryResult | null>(null);

  const engineRef = useRef(initialNotifyEngineState());
  const liveSinceRef = useRef<number | null>(null);
  const lastEvalRef = useRef(0);

  const setConfig = useCallback((patch: Partial<NotifyConfig>) => {
    setConfigRaw((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Network switch → fresh session: forget alert history and re-arm.
  useEffect(() => {
    engineRef.current = initialNotifyEngineState();
    liveSinceRef.current = null;
  }, [network]);

  // Track how long the feed has been continuously live (arming clock).
  useEffect(() => {
    if (wsStatus === "live") {
      if (liveSinceRef.current === null) liveSinceRef.current = Date.now();
    } else {
      liveSinceRef.current = null;
    }
  }, [wsStatus]);

  // Disabling clears history, so re-enabling reports the *current* situation
  // as new alerts instead of emitting stale "resolved" notices.
  useEffect(() => {
    if (!config.enabled) engineRef.current = initialNotifyEngineState();
  }, [config.enabled]);

  // Evaluate the alert stream on every telemetry transition (throttled).
  useEffect(() => {
    if (!config.enabled || !isValidDiscordWebhook(config.webhookUrl)) return;
    const now = Date.now();
    if (liveSinceRef.current === null || now - liveSinceRef.current < ARM_DELAY_MS) return;
    if (nodes.length === 0) return;
    if (now - lastEvalRef.current < MIN_EVAL_INTERVAL_MS) return;
    lastEvalRef.current = now;

    const alerts = buildAlerts(nodes, summary, network);
    const decision = decideNotifications(engineRef.current, alerts, config, now);
    engineRef.current = decision.nextState;

    if (decision.outbound.length === 0 && decision.resolved.length === 0) return;

    const payload = buildAlertPayload({
      network,
      outbound: decision.outbound,
      resolved: decision.resolved,
      mention: config.mention,
      now,
    });
    void sendDiscordWebhook(config.webhookUrl, payload).then((res) => {
      setLastDelivery({
        at: now,
        ok: res.ok,
        status: res.status,
        error: res.error,
        count: decision.outbound.length + (decision.resolved.length > 0 ? 1 : 0),
      });
    });
  }, [nodes, summary, network, wsStatus, config]);

  const sendTest = useCallback(async (): Promise<SendResult> => {
    if (!isValidDiscordWebhook(config.webhookUrl)) {
      return { ok: false, error: "Invalid webhook URL" };
    }
    const now = Date.now();
    const res = await sendDiscordWebhook(
      config.webhookUrl,
      buildTestPayload(network, config.mention, now)
    );
    setLastDelivery({ at: now, ok: res.ok, status: res.status, error: res.error, count: 1 });
    return res;
  }, [config.webhookUrl, config.mention, network]);

  const value = useMemo<NotifyCtx>(
    () => ({ config, setConfig, lastDelivery, sendTest }),
    [config, setConfig, lastDelivery, sendTest]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
