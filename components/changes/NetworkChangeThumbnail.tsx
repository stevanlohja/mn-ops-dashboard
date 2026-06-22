import Link from "next/link";
import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import { CHANGES } from "@/lib/changes/data";
import { activeChanges } from "@/lib/changes/select";
import { ENV_STATUS_STYLE, ENV_STATUS_LABELS, NetworkChange } from "@/lib/changes/types";

const ENV_ORDER: NetworkId[] = ["preview", "preprod", "mainnet"];

/**
 * Compact network-change status for the overview page: shows in-flight changes
 * (or a calm state) with a mini per-environment dot strip, linking to the full
 * /network-change board. Static data — no telemetry.
 */
export default function NetworkChangeThumbnail() {
  const active = activeChanges();
  const shown = active.length > 0 ? active : CHANGES.slice(0, 1);

  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-mn-muted uppercase tracking-wider">Network Change</span>
        <Link href="/network-change" className="text-[11px] text-mn-accent-2 hover:underline">
          View all →
        </Link>
      </div>

      {active.length === 0 && (
        <p className="text-[11px] text-mn-muted">No changes in progress.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {shown.map((c) => (
          <Row key={c.id} change={c} />
        ))}
      </div>
    </div>
  );
}

function Row({ change }: { change: NetworkChange }) {
  return (
    <Link
      href="/network-change"
      className="block rounded-lg -mx-1 px-1 py-1 hover:bg-mn-surface-2 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-mn-text truncate">{change.title}</span>
        {change.onTrack && (
          <span className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-mn-ok">
            <span className="w-1.5 h-1.5 rounded-full bg-mn-ok animate-pulse" />
            On track
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {ENV_ORDER.map((env) => {
          const st = change.envs[env];
          return (
            <span
              key={env}
              className="flex items-center gap-1 text-[10px] text-mn-muted"
              title={`${NETWORKS[env].label}: ${ENV_STATUS_LABELS[st.status]}`}
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
