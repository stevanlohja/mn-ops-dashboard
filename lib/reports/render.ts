import { formatBlockTime } from "@/lib/format";
import { ReportModel, ReportFormat } from "./types";

/** Render a report model into one of the supported text formats. */
export function renderReport(report: ReportModel, format: ReportFormat): string {
  switch (format) {
    case "markdown":
      return renderMarkdown(report);
    case "plaintext":
      return renderPlaintext(report);
    case "json":
      return JSON.stringify(report, null, 2);
    case "csv":
      return renderCsv(report);
  }
}

export function fileExtension(format: ReportFormat): string {
  return { markdown: "md", plaintext: "txt", json: "json", csv: "csv" }[format];
}

export function mimeType(format: ReportFormat): string {
  return {
    markdown: "text/markdown",
    plaintext: "text/plain",
    json: "application/json",
    csv: "text/csv",
  }[format];
}

const SEV_LABEL: Record<string, string> = { ok: "OK", warning: "WARNING", critical: "CRITICAL" };

function num(n: number): string {
  return n > 0 ? `#${n.toLocaleString("en-US")}` : "-";
}

// ── Markdown ────────────────────────────────────────────────────────────────

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

function renderMarkdown(r: ReportModel): string {
  const out: string[] = [];
  out.push(`# ${r.title}`);
  out.push("");
  out.push(`- **Generated:** ${r.generatedAtUtc}`);
  out.push(`- **Network:** ${r.networkLabel}`);
  out.push(`- **Telemetry feed:** ${r.feedStatus}`);
  out.push(`- **Observation window:** ${r.observationWindow} (this dashboard session)`);

  if (r.summary) {
    out.push("");
    out.push("## Network Summary");
    out.push("");
    const s = r.summary;
    out.push(
      mdTable(
        ["Metric", "Value"],
        [
          ["Best block", num(s.bestBlock)],
          ["Finalized block", num(s.finalizedBlock)],
          ["Finality gap", s.finalityGap !== null ? `${s.finalityGap} blocks` : "-"],
          ["Avg block time", formatBlockTime(s.avgBlockTimeMs)],
          [
            "Validators online",
            `${s.validatorsOnline}${s.validatorsExpected ? ` / ${s.validatorsExpected}` : ""}`,
          ],
          ["Nodes visible", String(s.nodesVisible)],
          ["Blocks attributed (session)", String(s.blocksAttributed)],
        ]
      )
    );
  }

  if (r.health) {
    out.push("");
    out.push("## Health Status");
    out.push("");
    out.push(
      mdTable(
        ["Check", "Status"],
        [
          ["Overall", SEV_LABEL[r.health.overall]],
          ["Validator count", SEV_LABEL[r.health.validatorCount]],
          ["Block time", SEV_LABEL[r.health.blockTime]],
          ["Finality gap", SEV_LABEL[r.health.finalityGap]],
          ["Peer count", SEV_LABEL[r.health.peerCount]],
        ]
      )
    );
  }

  if (r.alerts) {
    out.push("");
    out.push("## Active Alerts");
    out.push("");
    if (r.alerts.length === 0) {
      out.push("No active alerts.");
    } else {
      out.push(
        mdTable(
          ["Severity", "Alert", "Runbook"],
          r.alerts.map((a) => [SEV_LABEL[a.severity], a.message, a.runbook ?? "-"])
        )
      );
    }
  }

  if (r.validators) {
    out.push("");
    out.push("## Validators");
    out.push("");
    if (r.validators.length === 0) {
      out.push("No validators visible on the feed.");
    } else {
      out.push(
        mdTable(
          ["Validator", "Status", "Peers", "Best", "Finalized", "Gap", "Version"],
          r.validators.map((v) => [
            v.name,
            v.status,
            String(v.peers),
            num(v.bestBlock),
            num(v.finalizedBlock),
            v.finalityGap !== null ? String(v.finalityGap) : "-",
            v.version || "-",
          ])
        )
      );
    }
  }

  if (r.attestation) {
    out.push("");
    out.push("## Attestation");
    out.push("");
    if (r.attestation.length === 0) {
      out.push("No attestation data collected yet.");
    } else {
      out.push(
        mdTable(
          ["Validator", "Score", "Blocks", "Share", "Expected", "Fin. Lag", "Avg Prop.", "Disconnects", "Uptime"],
          r.attestation.map((a) => [
            a.name,
            `${a.score} (${a.scoreLabel})`,
            String(a.blocksAuthored),
            a.authorshipSharePct !== null ? `${a.authorshipSharePct.toFixed(1)}%` : "-",
            a.expectedSharePct !== null ? `${a.expectedSharePct.toFixed(1)}%` : "-",
            a.finalityLag !== null ? `${a.finalityLag}` : "-",
            a.avgPropagationMs !== null ? `${a.avgPropagationMs}ms` : "-",
            String(a.disconnects),
            a.uptime,
          ])
        )
      );
      out.push("");
      out.push(
        "> Block authorship is attributed via a first-to-report telemetry heuristic over this session's observation window. It is an observability signal, not a cryptographic proof of authorship."
      );
    }
  }

  if (r.infrastructure) {
    out.push("");
    out.push("## Other Infrastructure");
    out.push("");
    if (r.infrastructure.length === 0) {
      out.push("No non-validator nodes visible.");
    } else {
      out.push(
        mdTable(
          ["Node", "Type", "Peers", "Best Block"],
          r.infrastructure.map((i) => [i.name, i.type, String(i.peers), num(i.bestBlock)])
        )
      );
    }
  }

  out.push("");
  out.push("---");
  out.push("Generated by PO Dash 2.0 — Midnight Network Operations.");
  return out.join("\n");
}

// ── Plain text (Notifi-safe: no markdown syntax) ───────────────────────────

function padRow(cells: string[], widths: number[]): string {
  return cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
}

function textTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );
  const out = [padRow(headers, widths), padRow(widths.map((w) => "-".repeat(w)), widths)];
  for (const row of rows) out.push(padRow(row, widths));
  return out.join("\n");
}

function renderPlaintext(r: ReportModel): string {
  // Reuse the markdown structure but strip to plain text conventions.
  const out: string[] = [];
  const rule = (c: string, n = 56) => c.repeat(n);

  out.push(r.title.toUpperCase());
  out.push(rule("="));
  out.push(`Generated: ${r.generatedAtUtc}`);
  out.push(`Network: ${r.networkLabel}`);
  out.push(`Telemetry feed: ${r.feedStatus}`);
  out.push(`Observation window: ${r.observationWindow} (this dashboard session)`);

  if (r.summary) {
    const s = r.summary;
    out.push("");
    out.push("NETWORK SUMMARY");
    out.push(rule("-"));
    out.push(`Best block: ${num(s.bestBlock)}`);
    out.push(`Finalized block: ${num(s.finalizedBlock)}`);
    out.push(`Finality gap: ${s.finalityGap !== null ? `${s.finalityGap} blocks` : "-"}`);
    out.push(`Avg block time: ${formatBlockTime(s.avgBlockTimeMs)}`);
    out.push(
      `Validators online: ${s.validatorsOnline}${s.validatorsExpected ? ` / ${s.validatorsExpected}` : ""}`
    );
    out.push(`Nodes visible: ${s.nodesVisible}`);
  }

  if (r.health) {
    out.push("");
    out.push("HEALTH STATUS");
    out.push(rule("-"));
    out.push(`Overall: ${SEV_LABEL[r.health.overall]}`);
    out.push(`Validator count: ${SEV_LABEL[r.health.validatorCount]}`);
    out.push(`Block time: ${SEV_LABEL[r.health.blockTime]}`);
    out.push(`Finality gap: ${SEV_LABEL[r.health.finalityGap]}`);
    out.push(`Peer count: ${SEV_LABEL[r.health.peerCount]}`);
  }

  if (r.alerts) {
    out.push("");
    out.push("ACTIVE ALERTS");
    out.push(rule("-"));
    if (r.alerts.length === 0) out.push("No active alerts.");
    else for (const a of r.alerts) out.push(`[${SEV_LABEL[a.severity]}] ${a.message}`);
  }

  if (r.validators) {
    out.push("");
    out.push("VALIDATORS");
    out.push(rule("-"));
    if (r.validators.length === 0) out.push("No validators visible on the feed.");
    else
      out.push(
        textTable(
          ["Validator", "Status", "Peers", "Best", "Finalized", "Gap"],
          r.validators.map((v) => [
            v.name,
            v.status,
            String(v.peers),
            num(v.bestBlock),
            num(v.finalizedBlock),
            v.finalityGap !== null ? String(v.finalityGap) : "-",
          ])
        )
      );
  }

  if (r.attestation) {
    out.push("");
    out.push("ATTESTATION");
    out.push(rule("-"));
    if (r.attestation.length === 0) out.push("No attestation data collected yet.");
    else {
      out.push(
        textTable(
          ["Validator", "Score", "Blocks", "Share", "FinLag", "Disc", "Uptime"],
          r.attestation.map((a) => [
            a.name,
            `${a.score} (${a.scoreLabel})`,
            String(a.blocksAuthored),
            a.authorshipSharePct !== null ? `${a.authorshipSharePct.toFixed(1)}%` : "-",
            a.finalityLag !== null ? String(a.finalityLag) : "-",
            String(a.disconnects),
            a.uptime,
          ])
        )
      );
      out.push("");
      out.push(
        "Note: block authorship is attributed via a first-to-report telemetry"
      );
      out.push("heuristic over this session. It is an observability signal, not a");
      out.push("cryptographic proof of authorship.");
    }
  }

  if (r.infrastructure) {
    out.push("");
    out.push("OTHER INFRASTRUCTURE");
    out.push(rule("-"));
    if (r.infrastructure.length === 0) out.push("No non-validator nodes visible.");
    else
      out.push(
        textTable(
          ["Node", "Type", "Peers", "Best Block"],
          r.infrastructure.map((i) => [i.name, i.type, String(i.peers), num(i.bestBlock)])
        )
      );
  }

  out.push("");
  out.push(rule("="));
  out.push("Generated by PO Dash 2.0 - Midnight Network Operations");
  return out.join("\n");
}

// ── CSV (validator + attestation rows, one table) ───────────────────────────

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function csvRows(rows: (string | number | null)[][]): string {
  return rows
    .map((r) => r.map((c) => csvEscape(c === null ? "" : String(c))).join(","))
    .join("\n");
}

function renderCsv(r: ReportModel): string {
  const att = new Map((r.attestation ?? []).map((a) => [a.name, a]));
  const validators = r.validators ?? [];

  const header = [
    "report_generated_utc",
    "network",
    "validator",
    "status",
    "peers",
    "best_block",
    "finalized_block",
    "finality_gap",
    "version",
    "attestation_score",
    "attestation_label",
    "blocks_authored",
    "authorship_share_pct",
    "expected_share_pct",
    "finality_lag_blocks",
    "avg_propagation_ms",
    "sessions",
    "disconnects",
    "uptime",
  ];

  const rows: (string | number | null)[][] = validators.map((v) => {
    const a = att.get(v.name);
    return [
      r.generatedAtUtc,
      r.networkLabel,
      v.name,
      v.status,
      v.peers,
      v.bestBlock,
      v.finalizedBlock,
      v.finalityGap,
      v.version,
      a?.score ?? null,
      a?.scoreLabel ?? null,
      a?.blocksAuthored ?? null,
      a?.authorshipSharePct !== null && a?.authorshipSharePct !== undefined
        ? a.authorshipSharePct.toFixed(2)
        : null,
      a?.expectedSharePct !== null && a?.expectedSharePct !== undefined
        ? a.expectedSharePct.toFixed(2)
        : null,
      a?.finalityLag ?? null,
      a?.avgPropagationMs ?? null,
      a?.sessions ?? null,
      a?.disconnects ?? null,
      a?.uptime ?? null,
    ];
  });

  // Attestation-only rows for validators currently offline (not in node list)
  for (const a of r.attestation ?? []) {
    if (validators.some((v) => v.name === a.name)) continue;
    rows.push([
      r.generatedAtUtc,
      r.networkLabel,
      a.name,
      a.online ? "healthy" : "offline",
      null,
      null,
      null,
      null,
      null,
      a.score,
      a.scoreLabel,
      a.blocksAuthored,
      a.authorshipSharePct !== null ? a.authorshipSharePct.toFixed(2) : null,
      a.expectedSharePct !== null ? a.expectedSharePct.toFixed(2) : null,
      a.finalityLag,
      a.avgPropagationMs,
      a.sessions,
      a.disconnects,
      a.uptime,
    ]);
  }

  return csvRows([header, ...rows]);
}
