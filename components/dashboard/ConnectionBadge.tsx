"use client";

import { WsStatus } from "@/lib/telemetry/types";

const CONFIG: Record<WsStatus, { label: string; dotClass: string; textClass: string }> = {
  connecting: {
    label: "Connecting…",
    dotClass: "bg-mn-p3 animate-pulse",
    textClass: "text-mn-p3",
  },
  live: {
    label: "Live",
    dotClass: "bg-mn-ok animate-pulse",
    textClass: "text-mn-ok",
  },
  fallback: {
    label: "Reconnecting…",
    dotClass: "bg-mn-p2 animate-pulse",
    textClass: "text-mn-p2",
  },
  error: {
    label: "Feed unavailable",
    dotClass: "bg-mn-muted",
    textClass: "text-mn-muted",
  },
};

export default function ConnectionBadge({ status }: { status: WsStatus }) {
  const cfg = CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
      <span className={`text-xs font-medium ${cfg.textClass}`}>{cfg.label}</span>
    </div>
  );
}
