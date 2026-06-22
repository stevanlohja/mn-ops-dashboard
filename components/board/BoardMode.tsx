"use client";

import { useEffect, useRef, useState } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import { WsStatus } from "@/lib/telemetry/types";
import { buildExecutiveMetrics } from "@/lib/executive/metrics";
import { toGlobeMarkers } from "@/lib/executive/markers";
import { buildAlerts } from "@/lib/health/health";
import { BASE_PATH } from "@/lib/basePath";
import ValidatorGlobe from "@/components/executive/ValidatorGlobe";
import { useMetricTrend } from "@/components/executive/useMetricTrend";
import ResilienceGauge from "./ResilienceGauge";
import KpiSpotlight from "./KpiSpotlight";
import BlockTicker from "./BlockTicker";
import AlertTicker from "./AlertTicker";

const SPOTLIGHT_DWELL_MS = 8_000;

const WS_LABEL: Record<WsStatus, { dot: string; label: string }> = {
  connecting: { dot: "bg-mn-p3", label: "Connecting" },
  live: { dot: "bg-mn-ok", label: "Live" },
  fallback: { dot: "bg-mn-p3", label: "Reconnecting" },
  error: { dot: "bg-mn-p1", label: "Offline" },
};

export default function BoardMode() {
  const { nodes, summary, wsStatus, network, attestation, recentBlocks } = useTelemetry();

  const m = buildExecutiveMetrics(nodes, summary, attestation, network);
  const alerts = buildAlerts(nodes, summary, network);
  const markers = toGlobeMarkers(nodes);
  const resilienceTrend = useMetricTrend(m.resilienceScore);

  const isBootstrapping = nodes.length === 0 && wsStatus !== "error";

  // Rotating KPI spotlight.
  const [spot, setSpot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSpot((s) => s + 1), SPOTLIGHT_DWELL_MS);
    return () => clearInterval(id);
  }, []);

  // Wall clock (null until mounted to avoid SSR hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  // Keep the screen awake on a kiosk display (best-effort, feature-detected).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        /* denied or unsupported — ignore */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, []);

  // Fullscreen toggle.
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  // Hide the cursor after a few seconds of inactivity (kiosk polish). Toggles a
  // class directly on the container so it never triggers a React re-render.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      el.classList.remove("board-cursor-hidden");
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.add("board-cursor-hidden"), 4000);
    };
    show();
    el.addEventListener("pointermove", show);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("pointermove", show);
    };
  }, []);

  const ws = WS_LABEL[wsStatus];
  const clock = now != null ? new Date(now) : null;

  return (
    <div
      ref={rootRef}
      data-theme="dark"
      className="fixed inset-0 bg-mn-bg text-mn-text overflow-hidden flex flex-col p-[2vh] gap-[2vh]"
    >
      {/* Header */}
      <header className="flex items-center justify-between shrink-0 px-2">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/logos/mn-logo-horizontal.svg`} alt="Midnight" className="h-[3.2vh] w-auto" />
          <span className="font-mono text-[clamp(10px,1.3vh,13px)] text-mn-muted border border-mn-border rounded-full px-3 py-1 tracking-[0.3em]">
            BOARD
          </span>
          <span className="text-[clamp(13px,1.8vh,20px)] font-semibold text-mn-text-2">
            {NETWORKS[network].label}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 text-[clamp(11px,1.5vh,16px)] text-mn-muted">
            <span className={`w-2.5 h-2.5 rounded-full ${ws.dot} animate-pulse`} />
            {ws.label}
          </span>
          <span className="font-mono text-[clamp(13px,1.9vh,22px)] text-mn-text tabular-nums">
            {clock ? clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
          </span>
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            title="Toggle fullscreen"
            className="board-hover-show p-1.5 rounded-lg text-mn-muted hover:text-mn-text hover:bg-mn-surface-2 transition-colors"
          >
            <svg className="w-[2.2vh] h-[2.2vh]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {isFs ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9H5m0 0V5m0 4l5-5m5 5h4m0 0V5m0 4l-5-5M9 15H5m0 0v4m0-4l5 5m5-5h4m0 0v4m0-4l-5 5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div
        className={`flex-1 min-h-0 flex flex-col gap-[2vh] transition-opacity duration-700 ${
          isBootstrapping ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Hero row: gauge · globe · spotlight */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] gap-[2vh]">
          <div className="bg-mn-surface border border-mn-border rounded-3xl flex items-center justify-center p-4">
            <ResilienceGauge score={m.resilienceScore} overall={m.overall} trend={resilienceTrend} />
          </div>
          <div className="bg-mn-surface border border-mn-border rounded-3xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-4 shrink-0">
              <span className="text-[clamp(11px,1.4vh,15px)] uppercase tracking-[0.2em] text-mn-muted">
                Validator Distribution
              </span>
              <span className="font-mono text-[clamp(10px,1.3vh,14px)] text-mn-muted">
                {markers.length} located · {m.distinctLocations} regions
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ValidatorGlobe markers={markers} />
            </div>
          </div>
          <KpiSpotlight m={m} index={spot} />
        </div>

        {/* Bottom row: tickers */}
        <div className="h-[26vh] shrink-0 grid grid-cols-1 md:grid-cols-2 gap-[2vh]">
          <BlockTicker blocks={recentBlocks} />
          <AlertTicker alerts={alerts} />
        </div>
      </div>

      {/* Bootstrapping splash */}
      {isBootstrapping && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-mn-bg">
          <span className="w-3 h-3 rounded-full bg-mn-ok animate-pulse" />
          <span className="text-mn-muted text-[clamp(14px,2vh,22px)]">Connecting to telemetry…</span>
        </div>
      )}
    </div>
  );
}
