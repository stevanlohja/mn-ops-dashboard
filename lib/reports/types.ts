import { Severity } from "@/lib/health/health";
import { NetworkId } from "@/lib/telemetry/networks";
import { ScoreLabel } from "@/lib/attestation/score";

/** Sections a report can include — toggled in the report builder UI. */
export type ReportSection = "summary" | "health" | "alerts" | "validators" | "attestation" | "infrastructure";

export const ALL_SECTIONS: { key: ReportSection; label: string }[] = [
  { key: "summary", label: "Network Summary" },
  { key: "health", label: "Health Status" },
  { key: "alerts", label: "Active Alerts" },
  { key: "validators", label: "Validator Table" },
  { key: "attestation", label: "Attestation" },
  { key: "infrastructure", label: "Other Infrastructure" },
];

export type ReportFormat = "markdown" | "plaintext" | "json" | "csv";

export interface ReportValidatorRow {
  name: string;
  peers: number;
  bestBlock: number;
  finalizedBlock: number;
  finalityGap: number | null;
  version: string;
  city: string;
  status: "healthy" | "degraded" | "isolated";
}

export interface ReportAttestationRow {
  name: string;
  online: boolean;
  score: number;
  scoreLabel: ScoreLabel;
  blocksAuthored: number;
  authorshipSharePct: number | null;
  expectedSharePct: number | null;
  finalityLag: number | null;
  avgPropagationMs: number | null;
  sessions: number;
  disconnects: number;
  uptime: string;
}

export interface ReportInfraRow {
  name: string;
  type: string;
  peers: number;
  bestBlock: number;
}

export interface ReportAlertRow {
  severity: Severity;
  message: string;
  runbook: string | null;
}

/** Fully-resolved, serialisable report model. Renderers never touch live state. */
export interface ReportModel {
  title: string;
  generatedAtUtc: string;
  generatedAtMs: number;
  network: NetworkId;
  networkLabel: string;
  feedStatus: string;
  observationWindow: string;
  sections: ReportSection[];

  summary: {
    bestBlock: number;
    finalizedBlock: number;
    finalityGap: number | null;
    avgBlockTimeMs: number | null;
    validatorsOnline: number;
    validatorsExpected: number | null;
    nodesVisible: number;
    blocksAttributed: number;
  } | null;

  health: {
    overall: Severity;
    validatorCount: Severity;
    blockTime: Severity;
    finalityGap: Severity;
    peerCount: Severity;
  } | null;

  alerts: ReportAlertRow[] | null;
  validators: ReportValidatorRow[] | null;
  attestation: ReportAttestationRow[] | null;
  infrastructure: ReportInfraRow[] | null;
}
