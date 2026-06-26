import Link from "next/link";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { activeChanges } from "@/lib/changes/select";
import {
  NetworkChange,
  CHANGE_TYPE_LABELS,
  ENV_STATUS_LABELS,
  ENV_STATUS_STYLE,
} from "@/lib/changes/types";
import { Pill } from "@/components/ui/Badge";
import ReadinessGauge from "./ReadinessGauge";

const ENV_ORDER: NetworkId[] = ["preview", "preprod", "mainnet"];

/**
 * Prominent home-page banner highlighting in-flight coordinated changes (hard
 * forks, governance-gated runtime upgrades). Renders nothing when nothing is in
 * flight, so it only appears when there is something operators should see — the
 * way a real hard-fork notice would. Live readiness comes from ReadinessGauge;
 * Cardano-dependent changes show an externally-tracked status instead.
 */
export default function CoordinationBanner() {
  const active = activeChanges();
  if (active.length === 0) return null;

  return (
    <section className="w-full max-w-4xl mt-8 rounded-2xl border border-mn-accent-2/30 bg-mn-surface/60 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-mn-accent-2 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-mn-text">
            Network Change · Coordination
          </span>
        </div>
        <Link href="/network-change" className="text-[11px] text-mn-accent-2 hover:underline">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.map((c) => (
          <InitiativeCard key={c.id} change={c} />
        ))}
      </div>
    </section>
  );
}

function InitiativeCard({ change }: { change: NetworkChange }) {
  return (
    <Link
      href="/network-change"
      className="group flex flex-col gap-3 rounded-xl border border-mn-border bg-mn-bg p-4 hover:border-mn-accent transition-colors text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill className="text-mn-accent-2 bg-mn-accent-2/10 border-mn-accent-2/30">
            {CHANGE_TYPE_LABELS[change.type]}
          </Pill>
          {change.class && (
            <Pill className="text-mn-muted bg-mn-surface-2 border-mn-border">Class {change.class}</Pill>
          )}
        </div>
        {change.onTrack && (
          <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-mn-ok">
            <span className="w-1.5 h-1.5 rounded-full bg-mn-ok animate-pulse" />
            On track
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-mn-text leading-snug group-hover:text-mn-accent-2 transition-colors">
        {change.title}
      </h3>

      {/* Signal: live readiness gauge, or externally-tracked status. */}
      {change.readiness ? (
        <ReadinessGauge change={change} />
      ) : (
        <ExternalStatus change={change} />
      )}

      <div className="flex items-center gap-3 pt-1 mt-auto border-t border-mn-border/60">
        {ENV_ORDER.map((env) => {
          const st = change.envs[env];
          return (
            <span
              key={env}
              className="flex items-center gap-1 text-[10px] text-mn-muted pt-2"
              title={`${NETWORKS[env].label}: ${ENV_STATUS_LABELS[st.status]}${st.date ? ` · ${st.date}` : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ENV_STATUS_STYLE[st.status].dot}`} />
              {NETWORKS[env].label}
            </span>
          );
        })}
      </div>
    </Link>
  );
}

// Cardano-dependent / manually-tracked change: no live signal, so show the
// target date and the reason the absence of a % is deliberate.
function ExternalStatus({ change }: { change: NetworkChange }) {
  const target = ENV_ORDER.map((e) => change.envs[e]).find(
    (s) => s.status === "in-progress" || s.status === "scheduled",
  );
  return (
    <div className="flex flex-col gap-1.5">
      {target?.date && (
        <span className="font-mono text-base font-semibold text-mn-text">{target.date}</span>
      )}
      <span className="inline-flex items-center gap-1 self-start text-[10px] font-semibold uppercase tracking-wider text-mn-p3">
        <span className="w-1.5 h-1.5 rounded-full bg-mn-p3" />
        Externally tracked
      </span>
      {change.external?.reason && (
        <span className="text-[10px] text-mn-muted leading-snug">{change.external.reason}</span>
      )}
    </div>
  );
}
