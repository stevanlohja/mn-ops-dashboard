"use client";

import { useMemo, useState } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS } from "@/lib/telemetry/networks";
import { buildReport } from "@/lib/reports/build";
import { renderReport, fileExtension, mimeType } from "@/lib/reports/render";
import { downloadText, copyToClipboard, reportFilename } from "@/lib/reports/download";
import { ALL_SECTIONS, ReportFormat, ReportSection } from "@/lib/reports/types";
import PageHeader from "@/components/ui/PageHeader";
import ConnectionBadge from "@/components/dashboard/ConnectionBadge";

const FORMATS: { key: ReportFormat; label: string; hint: string }[] = [
  { key: "markdown", label: "Markdown", hint: "GitHub / Notion / docs" },
  { key: "plaintext", label: "Plain Text", hint: "Notifi-safe, no markup" },
  { key: "json", label: "JSON", hint: "machine-readable snapshot" },
  { key: "csv", label: "CSV", hint: "per-validator rows for sheets" },
];

const DEFAULT_SECTIONS: ReportSection[] = ["summary", "health", "alerts", "validators", "attestation"];

export default function ReportBuilder() {
  const telemetry = useTelemetry();
  const { nodes, summary, wsStatus, network, attestation, totalAttributed, sessionStartedAt } =
    telemetry;
  const cfg = NETWORKS[network];

  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [format, setFormat] = useState<ReportFormat>("markdown");
  // Freeze the snapshot when the user generates; live data keeps streaming underneath.
  const [generatedAt, setGeneratedAt] = useState<number>(() => Date.now());
  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () =>
      buildReport({
        nodes,
        summary,
        attestation,
        totalAttributed,
        sessionStartedAt,
        network,
        wsStatus,
        now: generatedAt,
        sections,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot only re-derives on demand
    [generatedAt, sections, network]
  );

  const rendered = useMemo(() => renderReport(report, format), [report, format]);

  function toggleSection(key: ReportSection) {
    setSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  function regenerate() {
    setGeneratedAt(Date.now());
    setCopied(false);
  }

  async function onCopy() {
    const ok = await copyToClipboard(rendered);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  }

  function onDownload() {
    downloadText(
      reportFilename(cfg.label, report.generatedAtMs, fileExtension(format)),
      rendered,
      mimeType(format)
    );
  }

  function onPrint() {
    window.print();
  }

  const isBootstrapping = nodes.length === 0 && wsStatus !== "error";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      <div className="no-print">
        <PageHeader
          title="Report Generation"
          subtitle={`${cfg.label} · Snapshot the current network state into a shareable report`}
          actions={<ConnectionBadge status={wsStatus} />}
        />
      </div>

      {isBootstrapping && (
        <div className="no-print px-4 py-3 bg-mn-surface border border-mn-border rounded-lg text-sm text-mn-muted">
          Waiting for telemetry data — reports will be empty until the feed connects.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="no-print flex flex-col gap-4">
          <Panel title="Sections">
            {ALL_SECTIONS.map((s) => (
              <label
                key={s.key}
                className="flex items-center gap-2.5 px-1 py-1.5 cursor-pointer text-sm text-mn-text-2 hover:text-mn-text select-none"
              >
                <input
                  type="checkbox"
                  checked={sections.includes(s.key)}
                  onChange={() => toggleSection(s.key)}
                  className="w-3.5 h-3.5 accent-mn-accent"
                />
                {s.label}
              </label>
            ))}
          </Panel>

          <Panel title="Format">
            {FORMATS.map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2.5 px-1 py-1.5 cursor-pointer text-sm select-none"
              >
                <input
                  type="radio"
                  name="format"
                  checked={format === f.key}
                  onChange={() => setFormat(f.key)}
                  className="w-3.5 h-3.5 accent-mn-accent"
                />
                <span className="text-mn-text-2">{f.label}</span>
                <span className="text-[10px] text-mn-muted">{f.hint}</span>
              </label>
            ))}
          </Panel>

          <div className="flex flex-col gap-2">
            <button
              onClick={regenerate}
              className="w-full px-4 py-2.5 bg-mn-accent hover:opacity-90 text-mn-on-accent text-sm font-medium rounded-lg transition-opacity"
            >
              Regenerate Snapshot
            </button>
            <div className="grid grid-cols-3 gap-2">
              <ActionButton onClick={onCopy} label={copied ? "Copied" : "Copy"} />
              <ActionButton onClick={onDownload} label="Download" />
              <ActionButton onClick={onPrint} label="Print" />
            </div>
            <p className="text-[10px] text-mn-muted text-center">
              Snapshot taken {report.generatedAtUtc}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="print-report bg-mn-surface border border-mn-border rounded-xl overflow-hidden">
            <div className="no-print px-4 py-3 border-b border-mn-border flex items-center justify-between">
              <span className="text-sm font-semibold text-mn-muted uppercase tracking-wider">
                Preview · {FORMATS.find((f) => f.key === format)?.label}
              </span>
              <span className="text-xs font-mono text-mn-muted">
                {rendered.length.toLocaleString()} chars
              </span>
            </div>
            <pre className="p-5 overflow-x-auto text-xs leading-relaxed font-mono text-mn-text-2 whitespace-pre-wrap break-words max-h-[70vh] overflow-y-auto">
              {rendered}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-mn-surface border border-mn-border rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 border border-mn-border hover:border-mn-accent text-mn-text text-xs font-medium rounded-lg transition-colors"
    >
      {label}
    </button>
  );
}
