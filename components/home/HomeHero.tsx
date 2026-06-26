"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import { formatBlockNumber, formatBlockTime } from "@/lib/format";
import BlockPropagation, { BlockPulse } from "./BlockPropagation";
import CoordinationBanner from "@/components/changes/CoordinationBanner";

const MAX_RING_NODES = 24;

export default function HomeHero() {
  const { nodes, summary, recentBlocks, network, wsStatus } = useTelemetry();

  // Stable node ring: validators if present, otherwise the first N nodes.
  const nodeNames = useMemo(() => {
    const fno = nodes.filter((n) => n.isFno).map((n) => n.name);
    const base = (fno.length ? fno : nodes.map((n) => n.name)).slice(0, MAX_RING_NODES);
    return [...base].sort();
  }, [nodes]);

  const latest: BlockPulse | null = recentBlocks[0]
    ? {
        blockNumber: recentBlocks[0].blockNumber,
        authorName: recentBlocks[0].authorName,
        propagationMs: recentBlocks[0].propagationMs,
      }
    : summary
    ? { blockNumber: summary.bestBlock, authorName: null, propagationMs: null }
    : null;

  const validatorsOnline = nodes.filter((n) => n.isFno).length;
  const expected = NETWORKS[network].expectedValidators;
  const live = wsStatus === "live";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-5">
        <span className={`w-2 h-2 rounded-full ${live ? "bg-mn-ok animate-pulse" : "bg-mn-p3"}`} />
        <span className="font-mono text-[11px] uppercase tracking-widest text-mn-muted">
          {NETWORKS[network].label} · {live ? "Live telemetry" : "Reconnecting"}
        </span>
      </div>

      <h1 className="text-3xl sm:text-5xl font-semibold text-mn-text text-center tracking-tight leading-tight max-w-3xl">
        Midnight Network Operations
      </h1>
      <p className="text-mn-text-2 text-center mt-4 max-w-xl text-sm sm:text-base leading-relaxed">
        Real-time block propagation across the federated validator set. Every pulse is a finalized
        height rippling from its author to the network.
      </p>

      {/* ── Animation centerpiece with live block readout overlay ────────── */}
      <div className="relative w-full max-w-2xl aspect-square sm:aspect-[16/11] mt-6">
        <BlockPropagation nodeNames={nodeNames} latest={latest} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-[10px] uppercase tracking-widest text-mn-muted">Best Block</span>
          <span className="font-mono text-2xl sm:text-3xl font-semibold text-mn-text tabular-nums">
            {summary ? formatBlockNumber(summary.bestBlock) : "—"}
          </span>
          {latest?.authorName && (
            <span className="font-mono text-[11px] text-mn-accent-2 mt-1 max-w-[60%] truncate">
              {latest.authorName}
            </span>
          )}
        </div>
      </div>

      {/* ── Live stat ticker ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-6">
        <HeroStat label="Validators" value={`${validatorsOnline}${expected ? `/${expected}` : ""}`} />
        <HeroStat
          label="Finalized"
          value={summary ? formatBlockNumber(summary.finalizedBlock) : "—"}
        />
        <HeroStat label="Block Time" value={formatBlockTime(summary?.avgBlockTime ?? null)} />
        <HeroStat label="Located Nodes" value={`${nodes.filter((n) => n.latitude != null).length}`} />
      </div>

      {/* ── Coordination banner: in-flight network changes ───────────────── */}
      <CoordinationBanner />

      {/* ── CTAs ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link
          href="/executive"
          className="px-5 py-2.5 bg-mn-accent hover:bg-mn-accent-2 text-mn-on-accent text-sm font-medium rounded-full transition-colors"
        >
          Executive Overview
        </Link>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 border border-mn-border hover:border-mn-accent text-mn-text text-sm font-medium rounded-full transition-colors"
        >
          Network Health
        </Link>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl px-4 py-3 text-center">
      <p className="text-[10px] text-mn-muted uppercase tracking-wider">{label}</p>
      <p className="text-lg font-mono font-semibold text-mn-text mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
