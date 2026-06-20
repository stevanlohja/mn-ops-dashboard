import { Severity } from "@/lib/health/health";

const SEVERITY_BADGE: Record<Severity, { label: string; cls: string }> = {
  ok: { label: "Healthy", cls: "bg-mn-ok/15 text-mn-ok border-mn-ok/30" },
  warning: { label: "Degraded", cls: "bg-mn-p3/15 text-mn-p3 border-mn-p3/30" },
  critical: { label: "Critical", cls: "bg-mn-p1/15 text-mn-p1 border-mn-p1/30" },
};

export function SeverityBadge({ severity, label }: { severity: Severity; label?: string }) {
  const cfg = SEVERITY_BADGE[severity];
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cfg.cls}`}>
      {label ?? cfg.label}
    </span>
  );
}

export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}
