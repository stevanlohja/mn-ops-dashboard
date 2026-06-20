"use client";

import { useState, useEffect } from "react";
import { formatBlockTime } from "@/lib/format";
import { useTelemetry } from "@/providers/TelemetryProvider";
import Stat from "@/components/ui/Stat";

export default function NetworkStatusBar() {
  const { summary, lastBlockProducer } = useTelemetry();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const bestBlock = summary?.bestBlock ?? null;
  const finalizedBlock = summary?.finalizedBlock ?? null;
  const gap =
    bestBlock !== null && finalizedBlock !== null && finalizedBlock > 0
      ? bestBlock - finalizedBlock
      : null;

  const gapColor =
    gap === null ? "text-mn-muted" : gap >= 7 ? "text-mn-p1" : gap >= 4 ? "text-mn-p3" : "text-mn-ok";

  const avgMs = summary?.avgBlockTime ?? null;
  const btColor =
    avgMs === null
      ? "text-mn-muted"
      : avgMs > 30_000
      ? "text-mn-p1"
      : avgMs > 10_000
      ? "text-mn-p3"
      : "text-mn-ok";

  const ageSec =
    summary?.timestamp && summary.timestamp > 0 ? (now - summary.timestamp) / 1000 : null;
  const ageLabel =
    ageSec === null
      ? "—"
      : ageSec < 60
      ? `${ageSec.toFixed(1)}s`
      : `${Math.floor(ageSec / 60)}m ${String(Math.floor(ageSec % 60)).padStart(2, "0")}s`;
  const ageColor =
    ageSec === null
      ? "text-mn-muted"
      : ageSec >= 30
      ? "text-mn-p1"
      : ageSec >= 10
      ? "text-mn-p3"
      : "text-mn-ok";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-mn-border rounded-xl overflow-hidden border border-mn-border">
      <Stat
        label="Best Block"
        value={bestBlock !== null && bestBlock > 0 ? `#${bestBlock.toLocaleString()}` : "—"}
      />
      <Stat
        label="Finalized Block"
        value={
          finalizedBlock !== null && finalizedBlock > 0 ? `#${finalizedBlock.toLocaleString()}` : "—"
        }
      />
      <Stat
        label="Finality Gap"
        value={gap !== null ? `${gap} block${gap === 1 ? "" : "s"}` : "—"}
        valueClass={gapColor}
      />
      <Stat label="Avg Block Time" value={formatBlockTime(avgMs)} valueClass={btColor} />
      <Stat label="Last Block" value={ageLabel} valueClass={ageColor} />
      <Stat label="Block Producer" value={lastBlockProducer ?? "—"} small />
    </div>
  );
}
