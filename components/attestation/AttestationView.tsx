"use client";

import { useEffect, useMemo, useState } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import { scoreRecord, AttestationScore } from "@/lib/attestation/score";
import { AttestationRecord, avgPropagation } from "@/lib/attestation/types";
import { formatAgo, formatDuration, formatUptime } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import ConnectionBadge from "@/components/dashboard/ConnectionBadge";
import Stat from "@/components/ui/Stat";

const SCORE_COLORS: Record<AttestationScore["label"], string> = {
  excellent: "text-mn-ok",
  good: "text-mn-text",
  fair: "text-mn-p3",
  poor: "text-mn-p1",
};

const SCORE_BAR_COLORS: Record<AttestationScore["label"], string> = {
  excellent: "bg-mn-ok",
  good: "bg-mn-accent",
  fair: "bg-mn-p3",
  poor: "bg-mn-p1",
};

export default function AttestationView() {
  const {
    nodes,
    summary,
    wsStatus,
    network,
    attestation,
    recentBlocks,
    totalAttributed,
    sessionStartedAt,
  } = useTelemetry();
  const cfg = NETWORKS[network];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onlineValidators = nodes.filter((n) => n.isFno).length;

  const scoreCtx = useMemo(
    () => ({
      now,
      networkFinalized: summary?.finalizedBlock ?? 0,
      onlineValidators,
      totalAttributed,
      expectedPeers: cfg.expectedPeers,
    }),
    [now, summary?.finalizedBlock, onlineValidators, totalAttributed, cfg.expectedPeers]
  );

  const rows = useMemo(() => {
    return attestation
      .filter((r) => r.isFno)
      .map((rec) => ({ rec, score: scoreRecord(rec, scoreCtx) }))
      .sort(
        (a, b) =>
          Number(b.rec.online) - Number(a.rec.online) ||
          b.score.total - a.score.total ||
          a.rec.name.localeCompare(b.rec.name)
      );
  }, [attestation, scoreCtx]);

  const propSamples = rows
    .map(({ rec }) => avgPropagation(rec))
    .filter((v): v is number => v !== null);
  const fleetProp =
    propSamples.length > 0
      ? Math.round(propSamples.reduce((a, b) => a + b, 0) / propSamples.length)
      : null;

  const expectedShare = onlineValidators > 0 ? 100 / onlineValidators : null;
  const isBootstrapping = nodes.length === 0 && wsStatus !== "error";

  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 transition-opacity duration-500 ${
        isBootstrapping ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <PageHeader
        title="Validator Attestation"
        subtitle={`${cfg.label} · Block authorship, finality participation, and uptime per validator`}
        actions={<ConnectionBadge status={wsStatus} />}
      />

      {/* Session stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-mn-border rounded-xl overflow-hidden border border-mn-border">
        <Stat
          label="Validators Online"
          value={`${onlineValidators}${cfg.expectedValidators ? `/${cfg.expectedValidators}` : ""}`}
          valueClass={
            cfg.expectedValidators === null
              ? "text-mn-text"
              : onlineValidators >= cfg.expectedValidators
              ? "text-mn-ok"
              : onlineValidators >= 9
              ? "text-mn-p3"
              : "text-mn-p1"
          }
        />
        <Stat label="Blocks Attributed" value={totalAttributed.toLocaleString()} />
        <Stat
          label="Expected Share"
          value={expectedShare !== null ? `${expectedShare.toFixed(1)}%` : "—"}
          sub="per validator (round-robin)"
        />
        <Stat label="Fleet Avg Propagation" value={fleetProp !== null ? `${fleetProp}ms` : "—"} />
        <Stat label="Observation Window" value={formatDuration(now - sessionStartedAt)} />
      </div>

      {/* Methodology note */}
      <div className="flex items-start gap-3 px-4 py-3 bg-mn-surface border border-mn-border rounded-lg text-xs text-mn-muted">
        <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
        </svg>
        <span>
          Block authorship is attributed to the first node reporting a new height on the telemetry
          feed — an observability heuristic, not a cryptographic proof. Scores accumulate over this
          dashboard session and reset when you switch networks or reload.
        </span>
      </div>

      {/* Attestation table */}
      <div className="bg-mn-surface border border-mn-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-mn-border flex items-center justify-between">
          <span className="text-sm font-semibold text-mn-muted uppercase tracking-wider">
            Validator Scores
          </span>
          <span className="text-xs font-mono text-mn-muted">
            {rows.length} tracked this session
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-mn-muted">
            Waiting for validator data…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mn-border">
                  <Th left>Validator</Th>
                  <Th left>Score</Th>
                  <Th>Blocks</Th>
                  <Th>Share</Th>
                  <Th>Last Authored</Th>
                  <Th>Fin. Lag</Th>
                  <Th>Avg Prop.</Th>
                  <Th>Peers</Th>
                  <Th>Flaps</Th>
                  <Th>Uptime</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rec, score }, i) => (
                  <AttestationRow
                    key={rec.name}
                    rec={rec}
                    score={score}
                    now={now}
                    totalAttributed={totalAttributed}
                    expectedShare={expectedShare}
                    networkFinalized={summary?.finalizedBlock ?? 0}
                    last={i === rows.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent authored blocks */}
      <div className="bg-mn-surface border border-mn-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-mn-border">
          <span className="text-sm font-semibold text-mn-muted uppercase tracking-wider">
            Recent Block Authorship
          </span>
        </div>
        {recentBlocks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-mn-muted">
            No blocks attributed yet — authorship appears as new heights arrive.
          </div>
        ) : (
          <ul className="divide-y divide-mn-border">
            {recentBlocks.slice(0, 15).map((b) => (
              <li key={`${b.blockNumber}-${b.blockHash}`} className="flex items-center gap-4 px-4 py-2.5 animate-[fadeSlide_0.2s_ease]">
                <span className="font-mono text-xs text-mn-accent-2 w-28 shrink-0">
                  #{b.blockNumber.toLocaleString()}
                </span>
                <span className="font-mono text-xs text-mn-text truncate flex-1">{b.authorName}</span>
                {b.propagationMs !== null && (
                  <span className="font-mono text-[10px] text-mn-muted shrink-0">{b.propagationMs}ms</span>
                )}
                <span className="font-mono text-[10px] text-mn-muted w-16 text-right shrink-0">
                  {formatAgo(b.observedAt, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Th({ children, left = false }: { children: React.ReactNode; left?: boolean }) {
  return (
    <th
      className={`${left ? "text-left" : "text-right"} px-4 py-3 text-xs font-semibold text-mn-muted uppercase tracking-wider whitespace-nowrap`}
    >
      {children}
    </th>
  );
}

function AttestationRow({
  rec,
  score,
  now,
  totalAttributed,
  expectedShare,
  networkFinalized,
  last,
}: {
  rec: AttestationRecord;
  score: AttestationScore;
  now: number;
  totalAttributed: number;
  expectedShare: number | null;
  networkFinalized: number;
  last: boolean;
}) {
  const share = totalAttributed > 0 ? (rec.blocksAuthored / totalAttributed) * 100 : null;
  const lag =
    rec.lastFinalizedBlock > 0 && networkFinalized > 0
      ? networkFinalized - rec.lastFinalizedBlock
      : null;
  const prop = avgPropagation(rec);
  const shareBehind =
    share !== null && expectedShare !== null && totalAttributed >= 20 && share < expectedShare * 0.5;

  return (
    <tr className={`${last ? "" : "border-b border-mn-border"} ${rec.online ? "" : "opacity-50"}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${rec.online ? "bg-mn-ok" : "bg-mn-muted"}`}
            title={rec.online ? "Online" : "Offline"}
          />
          <span className="font-mono text-xs text-mn-text truncate">{rec.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 w-44">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-mn-surface-2 rounded-full overflow-hidden min-w-16">
            <div
              className={`h-full rounded-full ${SCORE_BAR_COLORS[score.label]}`}
              style={{ width: `${score.total}%` }}
            />
          </div>
          <span className={`font-mono text-xs font-semibold w-7 text-right ${SCORE_COLORS[score.label]}`}>
            {score.total}
          </span>
        </div>
      </td>
      <Td>{rec.blocksAuthored.toLocaleString()}</Td>
      <Td>
        {share !== null ? (
          <span className={shareBehind ? "text-mn-p3" : ""}>{share.toFixed(1)}%</span>
        ) : (
          "—"
        )}
      </Td>
      <Td>
        {rec.lastAuthoredBlock ? (
          <span title={`#${rec.lastAuthoredBlock.toLocaleString()}`}>
            {formatAgo(rec.lastAuthoredAt, now)}
          </span>
        ) : (
          "—"
        )}
      </Td>
      <Td>
        {lag !== null ? (
          <span className={lag > 10 ? "text-mn-p1" : lag > 5 ? "text-mn-p3" : "text-mn-ok"}>{lag}</span>
        ) : (
          "—"
        )}
      </Td>
      <Td>{prop !== null ? `${Math.round(prop)}ms` : "—"}</Td>
      <Td>{rec.online ? rec.peers : "—"}</Td>
      <Td>
        <span className={rec.disconnects > 0 ? "text-mn-p3" : ""}>{rec.disconnects}</span>
      </Td>
      <Td>{rec.online ? formatUptime(rec.startupTime, now) : "offline"}</Td>
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 font-mono text-xs text-right text-mn-text tabular-nums whitespace-nowrap">
      {children}
    </td>
  );
}
