"use client";

import Link from "next/link";
import { Alert } from "@/lib/health/health";

const SEVERITY_STYLES: Record<string, { bar: string; bg: string; text: string }> = {
  critical: {
    bar: "bg-mn-p1",
    bg: "bg-mn-p1/10 border-mn-p1/30",
    text: "text-mn-p1",
  },
  warning: {
    bar: "bg-mn-p3",
    bg: "bg-mn-p3/10 border-mn-p3/30",
    text: "text-mn-p3",
  },
};

export default function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => {
        const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.warning;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${s.bg}`}
          >
            <div className={`w-1 self-stretch rounded-full ${s.bar} shrink-0`} />
            <p className={`flex-1 min-w-0 text-sm ${s.text}`}>{alert.message}</p>
            {alert.runbook && (
              <Link
                href={`/runbooks/${alert.runbook}`}
                className="shrink-0 text-xs font-medium text-mn-muted hover:text-mn-text underline underline-offset-2 transition-colors"
              >
                Runbook →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
