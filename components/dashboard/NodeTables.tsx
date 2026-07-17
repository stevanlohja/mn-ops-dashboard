"use client";

import { useState, useEffect, useRef } from "react";
import { NodeState } from "@/lib/telemetry/types";
import { NETWORKS } from "@/lib/telemetry/networks";
import { useTelemetry } from "@/providers/TelemetryProvider";
import NodeDetailDrawer from "./NodeDetailDrawer";

// ── Column configuration ───────────────────────────────────────────────────────

type ColKey = "version" | "peers" | "bestBlock" | "finalizedBlock" | "gap" | "txCount" | "bestHash" | "finalizedHash";

const ALL_COLUMNS: { key: ColKey; label: string }[] = [
  { key: "version",        label: "Version" },
  { key: "peers",          label: "Peers" },
  { key: "bestBlock",      label: "Best Block" },
  { key: "finalizedBlock", label: "Finalized" },
  { key: "gap",            label: "Gap" },
  { key: "txCount",        label: "Tx Count" },
  { key: "bestHash",       label: "Block Hash" },
  { key: "finalizedHash",  label: "Fin. Hash" },
];

const DEFAULT_COLS: ColKey[] = ["version", "peers", "bestBlock", "finalizedBlock", "gap"];
const LS_KEY = "mn-node-cols";

function renderCell(key: ColKey, node: NodeState, expectedPeers: number | null) {
  switch (key) {
    case "version":
      return node.version
        ? <span className="text-mn-text-2" title={node.version}>{node.version}</span>
        : <span className="text-mn-muted">—</span>;
    case "peers": {
      const low = expectedPeers !== null && node.peers < expectedPeers;
      const c = node.peers === 0 ? "text-mn-p1" : low ? "text-mn-p3" : "text-mn-ok";
      return <span className={c}>{node.peers}</span>;
    }
    case "bestBlock":
      return node.bestBlock > 0 ? `#${node.bestBlock.toLocaleString()}` : "—";
    case "finalizedBlock":
      return node.finalizedBlock > 0 ? `#${node.finalizedBlock.toLocaleString()}` : "—";
    case "gap": {
      const gap =
        node.bestBlock > 0 && node.finalizedBlock > 0
          ? node.bestBlock - node.finalizedBlock
          : null;
      if (gap === null) return "—";
      const c = gap >= 7 ? "text-mn-p1" : gap >= 4 ? "text-mn-p3" : "text-mn-ok";
      return <span className={c}>{gap}</span>;
    }
    case "txCount":
      return node.txCount.toLocaleString();
    case "bestHash":
      return node.bestHash
        ? <span className="text-mn-muted" title={node.bestHash}>{node.bestHash.slice(0, 10)}…</span>
        : "—";
    case "finalizedHash":
      return node.finalizedHash
        ? <span className="text-mn-muted" title={node.finalizedHash}>{node.finalizedHash.slice(0, 10)}…</span>
        : "—";
  }
}

function statusDot(node: NodeState, expectedPeers: number | null) {
  if (node.peers === 0) return "bg-mn-p1";
  if (expectedPeers !== null && node.peers < expectedPeers) return "bg-mn-p3";
  return "bg-mn-ok";
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NodeTables({ nodes }: { nodes: NodeState[] }) {
  const { network } = useTelemetry();
  const cfg = NETWORKS[network];
  const isMainnet = network === "mainnet";
  const validatorLabel = isMainnet ? "FNO Validators" : "Validators";

  // Lazy init from localStorage. Safe against hydration mismatch: the tables
  // only render once live feed data arrives, long after hydration completes.
  const [visibleCols, setVisibleCols] = useState<ColKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COLS;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved) as ColKey[];
    } catch { /* ignore */ }
    return DEFAULT_COLS;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const selectedNode =
    selectedNodeId !== null ? nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [pickerOpen]);

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const activeCols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));

  const fnoNodes     = nodes.filter((n) => n.nodeType === "fno-validator");
  const gatewayNodes = nodes.filter((n) => n.nodeType === "filter-gateway");
  const bootNodes    = nodes.filter((n) => n.nodeType === "boot");
  const otherNodes   = nodes.filter(
    (n) => !["fno-validator", "filter-gateway", "boot"].includes(n.nodeType)
  );

  const fnoOnline = fnoNodes.length;
  const expected = cfg.expectedValidators;
  const fnoColor =
    expected === null
      ? "text-mn-muted"
      : fnoOnline >= expected
      ? "text-mn-ok"
      : fnoOnline >= 9
      ? "text-mn-p3"
      : "text-mn-p1";

  return (
    <div className="flex flex-col gap-4">
      {/* Shared column picker toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-mn-muted">
          {nodes.length} nodes visible across {[fnoNodes, gatewayNodes, bootNodes, otherNodes].filter((g) => g.length > 0).length} groups
        </p>
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
              pickerOpen
                ? "border-mn-accent text-mn-text bg-mn-accent/10"
                : "border-mn-border text-mn-muted hover:border-mn-accent hover:text-mn-text"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 bg-mn-surface border border-mn-border rounded-xl shadow-xl py-2 min-w-40">
              <p className="px-3 pt-1 pb-2 text-[10px] font-mono text-mn-muted uppercase tracking-widest border-b border-mn-border mb-1">
                Applied to all sections
              </p>
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm text-mn-muted hover:text-mn-text hover:bg-mn-border/30 select-none"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="w-3.5 h-3.5 accent-mn-accent"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Validators */}
      <NodeSection
        label={validatorLabel}
        badge={
          <span className={`text-sm font-mono font-semibold ${fnoColor}`}>
            {fnoOnline}{expected ? `/${expected}` : ""} online
          </span>
        }
        nodes={fnoNodes}
        activeCols={activeCols}
        expectedPeers={cfg.expectedPeers}
        defaultOpen
        emptyMessage={`Waiting for validator data… ${validatorLabel} will appear once the feed connects.`}
        onSelectNode={setSelectedNodeId}
        selectedNodeId={selectedNodeId}
      />

      {/* Filter Gateways */}
      {gatewayNodes.length > 0 && (
        <NodeSection
          label="Filter Gateways"
          nodes={gatewayNodes}
          activeCols={activeCols}
          expectedPeers={cfg.expectedPeers}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* Boot Nodes */}
      {bootNodes.length > 0 && (
        <NodeSection
          label="Boot Nodes"
          nodes={bootNodes}
          activeCols={activeCols}
          expectedPeers={cfg.expectedPeers}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* Other */}
      {otherNodes.length > 0 && (
        <NodeSection
          label="Other Nodes"
          nodes={otherNodes}
          activeCols={activeCols}
          expectedPeers={cfg.expectedPeers}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      )}

      {/* Node detail drawer */}
      {selectedNode && (
        <NodeDetailDrawer node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      )}
    </div>
  );
}

// ── Shared table section ───────────────────────────────────────────────────────

function NodeSection({
  label,
  badge,
  nodes,
  activeCols,
  expectedPeers,
  defaultOpen = false,
  emptyMessage,
  onSelectNode,
  selectedNodeId,
}: {
  label: string;
  badge?: React.ReactNode;
  nodes: NodeState[];
  activeCols: { key: ColKey; label: string }[];
  expectedPeers: number | null;
  defaultOpen?: boolean;
  emptyMessage?: string;
  onSelectNode?: (id: number) => void;
  selectedNodeId?: number | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasAlert = nodes.some((n) => n.peers === 0);

  return (
    <div className="bg-mn-surface border border-mn-border rounded-xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-mn-border/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-3.5 h-3.5 text-mn-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-mn-muted uppercase tracking-wider">
            {label}
          </span>
          {hasAlert && <span className="w-1.5 h-1.5 rounded-full bg-mn-p1" />}
        </div>
        <div className="flex items-center gap-3">
          {badge ?? (
            <span className={`text-sm font-mono font-semibold ${hasAlert ? "text-mn-p1" : "text-mn-muted"}`}>
              {nodes.filter((n) => n.peers > 0).length}/{nodes.length} online
            </span>
          )}
        </div>
      </button>

      {/* Table */}
      {open && (
        <div className="border-t border-mn-border">
          {nodes.length === 0 && emptyMessage ? (
            <div className="px-4 py-8 text-center">
              <p className="text-mn-muted text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mn-border">
                    <th className="w-8 px-4 py-3" />
                    <th className="text-left px-4 py-3 text-xs font-semibold text-mn-muted uppercase tracking-wider">
                      Node
                    </th>
                    {activeCols.map((col) => (
                      <th
                        key={col.key}
                        className="text-right px-4 py-3 text-xs font-semibold text-mn-muted uppercase tracking-wider whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node, i) => (
                    <tr
                      key={node.id}
                      onClick={() => onSelectNode?.(node.id)}
                      className={`hover:bg-mn-border/20 transition-colors cursor-pointer ${
                        i < nodes.length - 1 ? "border-b border-mn-border" : ""
                      } ${selectedNodeId === node.id ? "bg-mn-accent/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`block w-2 h-2 rounded-full ${statusDot(node, expectedPeers)}`} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-mn-text">
                        {node.name}
                      </td>
                      {activeCols.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-3 font-mono text-xs text-right text-mn-text tabular-nums"
                        >
                          {renderCell(col.key, node, expectedPeers)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
