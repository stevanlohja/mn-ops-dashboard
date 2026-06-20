"use client";

import { useEffect, useState } from "react";
import { NodeState } from "@/lib/telemetry/types";
import { NETWORKS } from "@/lib/telemetry/networks";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { scoreRecord } from "@/lib/attestation/score";
import { avgPropagation } from "@/lib/attestation/types";
import { formatUptime, formatAgo } from "@/lib/format";

interface Props {
  node: NodeState;
  onClose: () => void;
}

export default function NodeDetailDrawer({ node, onClose }: Props) {
  const { summary, attestation, totalAttributed, network, nodes } = useTelemetry();
  const cfg = NETWORKS[network];
  const expectedPeers = cfg.expectedPeers;

  const lowPeers = expectedPeers !== null && node.peers < expectedPeers;
  const dotColor = node.peers === 0 ? "bg-mn-p1" : lowPeers ? "bg-mn-p3" : "bg-mn-ok";
  const textColor = node.peers === 0 ? "text-mn-p1" : lowPeers ? "text-mn-p3" : "text-mn-ok";
  const statusLabel = node.peers === 0 ? "Isolated" : lowPeers ? "Degraded" : "Healthy";

  const gap =
    node.bestBlock > 0 && node.finalizedBlock > 0 ? node.bestBlock - node.finalizedBlock : null;
  const gapColor =
    gap === null ? "" : gap >= 7 ? "text-mn-p1" : gap >= 4 ? "text-mn-p3" : "text-mn-ok";

  const networkGap =
    summary && summary.bestBlock > 0 && node.bestBlock > 0
      ? summary.bestBlock - node.bestBlock
      : null;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rec = attestation.find((r) => r.name === node.name) ?? null;
  const score = rec
    ? scoreRecord(rec, {
        now,
        networkFinalized: summary?.finalizedBlock ?? 0,
        onlineValidators: nodes.filter((n) => n.isFno).length,
        totalAttributed,
        expectedPeers,
      })
    : null;
  const prop = rec ? avgPropagation(rec) : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-mn-surface border-l border-mn-border z-50 overflow-y-auto animate-[slideIn_0.15s_ease]">
        {/* Header */}
        <div className="sticky top-0 bg-mn-surface border-b border-mn-border px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-mn-text font-mono truncate">{node.name}</h2>
              <p className={`text-xs font-mono ${textColor}`}>{statusLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-mn-border/30 text-mn-muted hover:text-mn-text transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {rec && node.isFno && score && (
            <Section title="Attestation (this session)">
              <Row
                label="Score"
                value={
                  <span
                    className={
                      score.total >= 90
                        ? "text-mn-ok"
                        : score.total >= 75
                        ? "text-mn-text"
                        : score.total >= 50
                        ? "text-mn-p3"
                        : "text-mn-p1"
                    }
                  >
                    {score.total} · {score.label}
                  </span>
                }
              />
              <Row label="Blocks Authored" value={rec.blocksAuthored.toLocaleString()} />
              <Row
                label="Last Authored"
                value={
                  rec.lastAuthoredBlock
                    ? `#${rec.lastAuthoredBlock.toLocaleString()} (${formatAgo(rec.lastAuthoredAt, now)})`
                    : "—"
                }
              />
              {prop !== null && <Row label="Avg Propagation" value={`${Math.round(prop)}ms`} />}
              <Row label="Sessions / Disconnects" value={`${rec.sessions} / ${rec.disconnects}`} />
            </Section>
          )}

          <Section title="Network">
            <Row
              label="Peers"
              value={<span className={textColor}>{node.peers}</span>}
            />
            <Row label="Tx Pool" value={node.txCount.toLocaleString()} />
            <Row label="Node Type" value={node.nodeType} />
            {node.address && <Row label="Address" value={node.address} />}
            {node.networkId && (
              <Row
                label="Network ID"
                value={
                  <span className="break-all">
                    {node.networkId.length > 20
                      ? node.networkId.slice(0, 10) + "..." + node.networkId.slice(-10)
                      : node.networkId}
                  </span>
                }
              />
            )}
          </Section>

          <Section title="Blocks">
            <Row label="Best Block" value={node.bestBlock > 0 ? `#${node.bestBlock.toLocaleString()}` : "—"} />
            <Row
              label="Best Hash"
              value={
                node.bestHash ? (
                  <span className="break-all" title={node.bestHash}>{node.bestHash}</span>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Finalized" value={node.finalizedBlock > 0 ? `#${node.finalizedBlock.toLocaleString()}` : "—"} />
            <Row
              label="Finalized Hash"
              value={
                node.finalizedHash ? (
                  <span className="break-all" title={node.finalizedHash}>{node.finalizedHash}</span>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Finality Gap"
              value={gap !== null ? <span className={gapColor}>{gap} blocks</span> : "—"}
            />
            {networkGap !== null && networkGap > 0 && (
              <Row
                label="Behind Network"
                value={
                  <span className={networkGap > 5 ? "text-mn-p1" : networkGap > 2 ? "text-mn-p3" : "text-mn-ok"}>
                    {networkGap} blocks
                  </span>
                }
              />
            )}
            {node.blockPropagationMs !== null && (
              <Row label="Block Propagation" value={`${node.blockPropagationMs}ms`} />
            )}
          </Section>

          <Section title="Software">
            {node.implementation && <Row label="Implementation" value={node.implementation} />}
            {node.version && <Row label="Version" value={<span className="break-all">{node.version}</span>} />}
          </Section>

          <Section title="System">
            {node.os && <Row label="OS" value={node.os} />}
            {node.cpuArch && <Row label="Architecture" value={node.cpuArch} />}
            {node.environment && <Row label="Environment" value={node.environment} />}
            <Row label="Uptime" value={formatUptime(node.startupTime, now)} />
          </Section>

          {(node.city || node.latitude !== null) && (
            <Section title="Location">
              {node.city && <Row label="City" value={node.city} mono={false} />}
              {node.latitude !== null && node.longitude !== null && (
                <Row label="Coordinates" value={`${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}`} />
              )}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-mn-border last:border-0">
      <span className="text-xs text-mn-muted uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-xs text-mn-text text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest mb-1 px-1">{title}</h3>
      <div className="bg-mn-bg border border-mn-border rounded-lg px-4">{children}</div>
    </div>
  );
}
