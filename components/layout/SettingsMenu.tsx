"use client";

import { useState } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { WsStatus } from "@/lib/telemetry/types";
import {
  DEFAULT_FEED_URLS,
  isValidFeedUrl,
  isDefaultFeedUrls,
} from "@/lib/telemetry/endpoints";

const STATUS: Record<WsStatus, { dot: string; label: string }> = {
  connecting: { dot: "bg-mn-p3", label: "Connecting" },
  live: { dot: "bg-mn-ok", label: "Live" },
  fallback: { dot: "bg-mn-p3", label: "Reconnecting" },
  error: { dot: "bg-mn-p1", label: "Offline" },
};

/**
 * Settings gear: lets a visitor override the telemetry feed endpoint(s) so the
 * dashboard can fail over to a backup provider if the default is down. The list
 * is ordered — primary first, fallbacks tried in turn — and persisted locally.
 */
export default function SettingsMenu() {
  const { feedUrls, setFeedUrls, activeFeedUrl, wsStatus } = useTelemetry();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([...feedUrls]);

  function toggle() {
    if (!open) setDraft(feedUrls.length ? [...feedUrls] : [...DEFAULT_FEED_URLS]);
    setOpen((o) => !o);
  }

  const trimmed = draft.map((d) => d.trim()).filter(Boolean);
  const validCount = trimmed.filter(isValidFeedUrl).length;
  const changed = trimmed.join("|") !== feedUrls.join("|");
  const canSave = validCount > 0 && changed;
  const status = STATUS[wsStatus];

  function update(i: number, v: string) {
    setDraft((d) => d.map((x, j) => (j === i ? v : x)));
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, j) => j !== i));
  }
  function moveUp(i: number) {
    if (i === 0) return;
    setDraft((d) => {
      const next = [...d];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }
  function add() {
    setDraft((d) => [...d, ""]);
  }
  function save() {
    setFeedUrls(draft);
  }
  function reset() {
    setDraft([...DEFAULT_FEED_URLS]);
    setFeedUrls([...DEFAULT_FEED_URLS]);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title="Telemetry settings"
        aria-label="Telemetry settings"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-mn-surface-2 text-mn-muted hover:text-mn-text transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 110-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V2a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H22a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-mn-surface border border-mn-border rounded-xl shadow-xl z-50 p-4 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-mn-text">Telemetry Endpoints</h3>
              <p className="text-[11px] text-mn-muted mt-0.5">
                Primary first; fallbacks are tried in order if a provider is unreachable.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-mn-muted">
              <span className={`w-2 h-2 rounded-full ${status.dot} ${wsStatus === "live" ? "animate-pulse" : ""}`} />
              {status.label}
              <span className="font-mono text-mn-text-2 truncate" title={activeFeedUrl}>
                · {activeFeedUrl}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {draft.map((url, i) => {
                const invalid = url.trim() !== "" && !isValidFeedUrl(url);
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-mn-muted w-12 shrink-0">
                        {i === 0 ? "Primary" : "Fallback"}
                      </span>
                      <input
                        value={url}
                        onChange={(e) => update(i, e.target.value)}
                        placeholder="wss://host/feed/"
                        spellCheck={false}
                        autoComplete="off"
                        className={`flex-1 min-w-0 bg-mn-bg border rounded-lg px-2 py-1 text-xs font-mono text-mn-text placeholder:text-mn-muted/50 focus:outline-none ${
                          invalid ? "border-mn-p1 focus:border-mn-p1" : "border-mn-border focus:border-mn-accent"
                        }`}
                      />
                      <button
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        title="Move up (higher priority)"
                        className="p-1 rounded text-mn-muted hover:text-mn-text disabled:opacity-30 disabled:hover:text-mn-muted"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => remove(i)}
                        title="Remove"
                        className="p-1 rounded text-mn-muted hover:text-mn-p1"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                        </svg>
                      </button>
                    </div>
                    {invalid && (
                      <span className="text-[10px] text-mn-p1 pl-[3.4rem]">Must be a ws:// or wss:// URL</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={add}
              className="self-start text-[11px] font-medium text-mn-accent-2 hover:text-mn-accent transition-colors"
            >
              + Add fallback
            </button>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-mn-border">
              <button
                onClick={reset}
                disabled={isDefaultFeedUrls(feedUrls)}
                className="text-[11px] text-mn-muted hover:text-mn-text disabled:opacity-40 transition-colors"
              >
                Reset to default
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-mn-accent text-mn-on-accent disabled:opacity-40 transition-colors"
              >
                Save &amp; reconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
