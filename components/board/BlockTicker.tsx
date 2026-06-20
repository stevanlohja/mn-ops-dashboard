"use client";

import { AuthoredBlock } from "@/lib/attestation/types";

/** Live feed of recently authored blocks, newest first. */
export default function BlockTicker({ blocks }: { blocks: AuthoredBlock[] }) {
  const recent = blocks.slice(0, 7);

  return (
    <div className="bg-mn-surface border border-mn-border rounded-3xl px-6 py-5 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[clamp(11px,1.4vh,15px)] uppercase tracking-[0.2em] text-mn-muted">
          Recent Blocks
        </span>
        <span className="w-2 h-2 rounded-full bg-mn-ok animate-pulse" />
      </div>
      {recent.length === 0 ? (
        <p className="text-mn-muted text-sm">Awaiting blocks…</p>
      ) : (
        <ul className="flex flex-col gap-2 min-h-0">
          {recent.map((b) => (
            <li
              key={`${b.blockNumber}-${b.blockHash}`}
              className="board-fade flex items-baseline justify-between gap-3 text-[clamp(12px,1.7vh,18px)]"
            >
              <span className="font-mono text-mn-text-2 shrink-0">
                #{b.blockNumber.toLocaleString()}
              </span>
              <span className="text-mn-text truncate flex-1 text-right">{b.authorName}</span>
              <span className="font-mono text-mn-muted shrink-0 w-16 text-right">
                {b.propagationMs != null ? `${Math.round(b.propagationMs)}ms` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
