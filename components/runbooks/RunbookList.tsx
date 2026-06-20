import Link from "next/link";
import { RunbookMeta } from "@/lib/runbooks/manifest";
import { Pill } from "@/components/ui/Badge";

const SEVERITY_STYLES: Record<string, string> = {
  "P0–P3": "text-mn-p0 bg-mn-p0/10 border-mn-p0/30",
  "P1": "text-mn-p1 bg-mn-p1/10 border-mn-p1/30",
  "P1–P2": "text-mn-p1 bg-mn-p1/10 border-mn-p1/30",
  "P1–P3": "text-mn-p2 bg-mn-p2/10 border-mn-p2/30",
  "P2–P3": "text-mn-p2 bg-mn-p2/10 border-mn-p2/30",
  "P3": "text-mn-p3 bg-mn-p3/10 border-mn-p3/30",
};

export default function RunbookList({ runbooks }: { runbooks: RunbookMeta[] }) {
  return (
    <div className="divide-y divide-mn-border border border-mn-border rounded-xl overflow-hidden">
      {runbooks.map((rb) => {
        const sevClass =
          SEVERITY_STYLES[rb.severity] ?? "text-mn-muted bg-mn-surface-2 border-mn-border";
        return (
          <Link
            key={rb.slug}
            href={`/runbooks/${rb.slug}`}
            className="flex items-center justify-between gap-4 px-5 py-4 bg-mn-surface hover:bg-mn-surface-2 transition-colors group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-mono text-xs text-mn-muted shrink-0 w-6 text-right">
                {String(rb.number).padStart(2, "0")}
              </span>
              <span className="text-sm font-medium text-mn-text truncate">{rb.shortTitle}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Pill className={sevClass}>{rb.severity}</Pill>
              <svg
                className="w-3.5 h-3.5 text-mn-muted group-hover:text-mn-text transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
