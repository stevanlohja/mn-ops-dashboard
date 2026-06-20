import { FEED_URL } from "./networks";

/**
 * Telemetry feed endpoints. The dashboard's only data source is a Substrate
 * telemetry WebSocket feed; if the default provider is down the whole app goes
 * dark. Users can configure an ordered list of endpoints (primary + fallbacks)
 * that the TelemetryProvider rotates through on connection failure.
 *
 * Pure helpers only — persistence (localStorage) lives in the provider.
 */

/** Built-in default: the canonical shielded.tools feed. */
export const DEFAULT_FEED_URLS: string[] = [FEED_URL];

export const FEED_ENDPOINTS_STORAGE_KEY = "mn-feed-endpoints";

/** A valid feed endpoint is a parseable ws:// or wss:// URL. */
export function isValidFeedUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "ws:" || u.protocol === "wss:";
  } catch {
    return false;
  }
}

/**
 * Clean a candidate list: trim, drop invalid/duplicate entries, preserve order
 * (order = priority). Falls back to the default list if nothing valid remains.
 */
export function normalizeFeedUrls(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const u = raw.trim();
    if (u && isValidFeedUrl(u) && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out.length ? out : [...DEFAULT_FEED_URLS];
}

/** True when the list is exactly the built-in default (for "reset" UI state). */
export function isDefaultFeedUrls(list: string[]): boolean {
  return (
    list.length === DEFAULT_FEED_URLS.length &&
    list.every((u, i) => u === DEFAULT_FEED_URLS[i])
  );
}
