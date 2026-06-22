import { NETWORKS, NetworkId } from "@/lib/telemetry/networks";
import {
  CHANGES,
} from "@/lib/changes/data";
import {
  NetworkChange,
  EnvState,
  CHANGE_TYPE_LABELS,
  ENV_STATUS_LABELS,
  ENV_STATUS_STYLE,
} from "@/lib/changes/types";
import PageHeader from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Badge";

// Promotion order, left → right.
const ENV_ORDER: NetworkId[] = ["preview", "preprod", "mainnet"];

export default function NetworkChangeView() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
      <PageHeader
        title="Network Change"
        subtitle="Coordinated change status across environments"
        actions={
          <Pill className="text-mn-p3 bg-mn-p3/10 border-mn-p3/30">Experimental</Pill>
        }
      />

      <p className="text-[11px] text-mn-muted leading-relaxed">
        Manually maintained status of coordinated changes (hard forks, node releases, host
        migrations) as they roll through Preview → Preprod → Mainnet. This is a curated board, not
        live telemetry — see each card&apos;s &ldquo;updated&rdquo; date.
      </p>

      <div className="flex flex-col gap-4">
        {CHANGES.map((c) => (
          <ChangeCard key={c.id} change={c} />
        ))}
      </div>
    </div>
  );
}

function ChangeCard({ change }: { change: NetworkChange }) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill className="text-mn-accent-2 bg-mn-accent-2/10 border-mn-accent-2/30">
            {CHANGE_TYPE_LABELS[change.type]}
          </Pill>
          {change.class && (
            <Pill className="text-mn-muted bg-mn-surface-2 border-mn-border">Class {change.class}</Pill>
          )}
          {change.onTrack && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-mn-ok">
              <span className="w-1.5 h-1.5 rounded-full bg-mn-ok animate-pulse" />
              On track
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold text-mn-text">{change.title}</h2>
        <p className="text-xs text-mn-muted leading-relaxed">{change.summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ENV_ORDER.map((env) => (
          <EnvCell key={env} env={env} state={change.envs[env]} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-mn-border">
        <div className="flex flex-wrap items-center gap-3">
          {change.links?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-mn-accent-2 hover:underline"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
        <span className="text-[10px] text-mn-muted">updated {change.updated}</span>
      </div>
    </div>
  );
}

function EnvCell({ env, state }: { env: NetworkId; state: EnvState }) {
  const s = ENV_STATUS_STYLE[state.status];
  return (
    <div className="rounded-xl border border-mn-border bg-mn-bg px-3 py-2.5 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-mn-muted">
        {NETWORKS[env].label}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 self-start font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${s.chip}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {ENV_STATUS_LABELS[state.status]}
      </span>
      {state.date && <span className="text-[11px] text-mn-text-2 font-mono">{state.date}</span>}
      {state.note && <span className="text-[10px] text-mn-muted leading-snug">{state.note}</span>}
    </div>
  );
}
