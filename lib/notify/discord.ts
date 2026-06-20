import { NetworkId, NETWORKS } from "@/lib/telemetry/networks";
import { OutboundAlert, ResolvedAlert, NotifyKind } from "./engine";

/**
 * Discord webhook payload construction + delivery. Discord's webhook execute
 * endpoint accepts cross-origin browser POSTs, so this works without a
 * backend — consistent with the rest of the app being client-only.
 */

const WEBHOOK_RE =
  /^https:\/\/((ptb|canary)\.)?(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export function isValidDiscordWebhook(url: string): boolean {
  return WEBHOOK_RE.test(url.trim());
}

const COLOR_CRITICAL = 0xef4444;
const COLOR_WARNING = 0xeab308;
const COLOR_RESOLVED = 0x22c55e;

const KIND_TAG: Record<NotifyKind, string> = {
  new: "",
  escalated: " · escalated",
  renotify: " · still active",
};

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordPayload {
  content?: string;
  embeds: DiscordEmbed[];
  allowed_mentions: { parse: ("roles" | "users" | "everyone")[] };
}

const MAX_EMBEDS = 10;

export function buildAlertPayload(input: {
  network: NetworkId;
  outbound: OutboundAlert[];
  resolved: ResolvedAlert[];
  mention?: string;
  now: number;
}): DiscordPayload {
  const { network, outbound, resolved, mention, now } = input;
  const label = NETWORKS[network].label;
  const footer = { text: `PO Dash 2.0 · ${label}` };
  const timestamp = new Date(now).toISOString();

  const embeds: DiscordEmbed[] = [];

  const criticals = outbound.filter((o) => o.alert.severity === "critical");
  const warnings = outbound.filter((o) => o.alert.severity === "warning");

  for (const o of [...criticals, ...warnings]) {
    if (embeds.length >= MAX_EMBEDS - 1) break;
    embeds.push({
      title: `${o.alert.severity === "critical" ? "🔴 CRITICAL" : "🟡 WARNING"}${KIND_TAG[o.kind]}`,
      description:
        o.alert.message + (o.alert.runbook ? `\nRunbook: \`${o.alert.runbook}\`` : ""),
      color: o.alert.severity === "critical" ? COLOR_CRITICAL : COLOR_WARNING,
      footer,
      timestamp,
    });
  }

  const overflow = criticals.length + warnings.length - embeds.length;
  if (overflow > 0) {
    embeds.push({
      title: `…and ${overflow} more active alert${overflow === 1 ? "" : "s"}`,
      description: "See the dashboard for the full list.",
      color: COLOR_WARNING,
      footer,
      timestamp,
    });
  }

  if (resolved.length > 0 && embeds.length < MAX_EMBEDS) {
    embeds.push({
      title: `🟢 RESOLVED (${resolved.length})`,
      description: resolved.map((r) => `• ${r.message}`).join("\n").slice(0, 4000),
      color: COLOR_RESOLVED,
      footer,
      timestamp,
    });
  }

  const headline =
    criticals.length > 0
      ? `Consensus alert on ${label}: ${criticals.length} critical`
      : warnings.length > 0
        ? `Degradation on ${label}: ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
        : `Recovery on ${label}`;

  return {
    content: [mention?.trim(), headline].filter(Boolean).join(" — "),
    embeds,
    // Only allow role/user pings that the operator explicitly typed into the
    // mention field; never let alert text itself ping anyone.
    allowed_mentions: { parse: mention?.trim() ? ["roles", "users"] : [] },
  };
}

export function buildTestPayload(network: NetworkId, mention: string, now: number): DiscordPayload {
  const label = NETWORKS[network].label;
  return {
    content: [mention.trim(), `Test message from PO Dash 2.0 (${label})`]
      .filter(Boolean)
      .join(" — "),
    embeds: [
      {
        title: "🔧 Webhook test",
        description:
          "Discord alerting is wired up. You will be pinged here on degradation or consensus failures.",
        color: COLOR_RESOLVED,
        footer: { text: `PO Dash 2.0 · ${label}` },
        timestamp: new Date(now).toISOString(),
      },
    ],
    allowed_mentions: { parse: mention.trim() ? ["roles", "users"] : [] },
  };
}

export interface SendResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function sendDiscordWebhook(url: string, payload: DiscordPayload): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Discord returned HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
