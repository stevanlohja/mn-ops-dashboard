"use client";

import Link from "next/link";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS, TELEMETRY_WEB_URL } from "@/lib/telemetry/networks";
import { evaluateHealth, buildAlerts } from "@/lib/health/health";
import { SeverityBadge } from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import ConnectionBadge from "./ConnectionBadge";
import AlertList from "./AlertList";
import NetworkStatusBar from "./NetworkStatusBar";
import NodeTables from "./NodeTables";

export default function HealthDashboard() {
  const { nodes, summary, wsStatus, network } = useTelemetry();
  const health = evaluateHealth(nodes, summary, network);
  const alerts = buildAlerts(nodes, summary, network);

  // Suppress content until we have real data to avoid a flash of empty/wrong state.
  // wsStatus turns "live" on socket open — before any node data arrives — so we must
  // also wait for at least one node. Fall through immediately on error so the banner shows.
  const isBootstrapping = nodes.length === 0 && wsStatus !== "error";

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 transition-opacity duration-500 ${
        isBootstrapping ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <PageHeader
        title="Network Health"
        subtitle={`${NETWORKS[network].label} · Real-time validator status`}
        actions={
          <>
            <ConnectionBadge status={wsStatus} />
            <SeverityBadge severity={health.overall} />
          </>
        }
      />

      {/* Offline/fallback banner */}
      {(wsStatus === "error" || wsStatus === "fallback") && (
        <div className="flex items-center gap-3 px-4 py-3 bg-mn-surface border border-mn-border rounded-lg text-sm text-mn-muted">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
          </svg>
          <span>
            Telemetry feed{" "}
            {wsStatus === "fallback" ? "reconnecting — showing last known state" : "unavailable"}.
            Check{" "}
            <a
              href={TELEMETRY_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mn-accent underline underline-offset-2"
            >
              telemetry.shielded.tools
            </a>{" "}
            directly.
          </span>
        </div>
      )}

      {/* Alerts */}
      <AlertList alerts={alerts} />

      {/* Network summary stats */}
      <NetworkStatusBar />

      {/* Node tables */}
      <NodeTables nodes={nodes} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-mn-border">
        <Link
          href="/reports"
          className="flex items-center gap-2 px-4 py-2 bg-mn-accent hover:opacity-90 text-mn-on-accent text-sm font-medium rounded-lg transition-opacity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Generate Report
        </Link>
        <Link
          href="/attestation"
          className="flex items-center gap-2 px-4 py-2 border border-mn-border hover:border-mn-accent text-mn-text text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Attestation
        </Link>
        <Link
          href="/diagnostic"
          className="flex items-center gap-2 px-4 py-2 border border-mn-border hover:border-mn-accent text-mn-text text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Run Diagnostic
        </Link>
      </div>
    </div>
  );
}
