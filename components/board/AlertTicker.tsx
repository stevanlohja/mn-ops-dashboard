"use client";

import { Alert } from "@/lib/health/health";

const SEV_STYLE: Record<Alert["severity"], { dot: string; text: string }> = {
  ok: { dot: "bg-mn-ok", text: "text-mn-ok" },
  warning: { dot: "bg-mn-p3", text: "text-mn-p3" },
  critical: { dot: "bg-mn-p1", text: "text-mn-p1" },
};

/** Active alerts, or an all-clear state when there are none. */
export default function AlertTicker({ alerts }: { alerts: Alert[] }) {
  const active = alerts.filter((a) => a.severity !== "ok").slice(0, 5);

  return (
    <div className="bg-mn-surface border border-mn-border rounded-3xl px-6 py-5 h-full flex flex-col overflow-hidden">
      <span className="text-[clamp(11px,1.4vh,15px)] uppercase tracking-[0.2em] text-mn-muted mb-3">
        Active Alerts
      </span>
      {active.length === 0 ? (
        <div className="flex items-center gap-3 flex-1">
          <span className="w-3 h-3 rounded-full bg-mn-ok animate-pulse" />
          <span className="text-mn-ok font-semibold text-[clamp(16px,2.4vh,26px)]">
            All systems nominal
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5 min-h-0">
          {active.map((a) => {
            const s = SEV_STYLE[a.severity];
            return (
              <li key={a.id} className="board-fade flex items-start gap-3 text-[clamp(12px,1.7vh,18px)]">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                <span className={`${s.text} leading-snug`}>{a.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
