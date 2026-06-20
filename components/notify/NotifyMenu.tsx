"use client";

import { useEffect, useState } from "react";
import { useNotify } from "@/providers/NotifyProvider";
import { isValidDiscordWebhook } from "@/lib/notify/discord";
import { MinSeverity } from "@/lib/notify/types";

/**
 * Bell icon + dropdown panel for configuring Discord alert delivery.
 * Lives in the site nav so it is reachable from every page.
 */
export default function NotifyMenu() {
  const { config, setConfig, lastDelivery, sendTest } = useNotify();
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  const urlValid = isValidDiscordWebhook(config.webhookUrl);
  const urlEntered = config.webhookUrl.trim().length > 0;
  const armed = config.enabled && urlValid;

  // Playful nudge: gently wiggle the bell on an interval until the visitor has
  // opened the menu once (remembered in localStorage), inviting them to
  // subscribe. Stops on first open; honors prefers-reduced-motion via CSS.
  const [nudge, setNudge] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        setNudge(localStorage.getItem("mn-notify-seen") !== "1");
      } catch {
        setNudge(false);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!nudge || open) return;
    let t: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setWiggle(true);
      t = setTimeout(() => setWiggle(false), 900);
    }, 9000);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [nudge, open]);

  function toggleMenu() {
    setOpen((o) => !o);
    if (nudge) {
      setNudge(false);
      setWiggle(false);
      try {
        localStorage.setItem("mn-notify-seen", "1");
      } catch {
        /* storage unavailable — nudge just won't persist */
      }
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      await sendTest();
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        title="Notifications"
        aria-label="Notifications"
        className="relative p-1.5 rounded-lg hover:bg-mn-surface-2 text-mn-muted hover:text-mn-text transition-colors"
      >
        <svg
          className={`w-4 h-4 ${wiggle ? "bell-wiggle" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {armed ? (
          <span
            className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
              lastDelivery && !lastDelivery.ok ? "bg-mn-p1" : "bg-mn-ok"
            }`}
          />
        ) : (
          nudge && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-mn-accent-2 animate-pulse" />
          )
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-mn-surface border border-mn-border rounded-xl shadow-xl z-50 p-4 flex flex-col gap-4">
            {/* Official broadcast comms — anyone can subscribe via Notifi. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest">
                Official Announcements
              </span>
              <a
                href="https://midnight.notifi.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border border-mn-border bg-mn-surface-2 px-3 py-2.5 hover:border-mn-accent transition-colors group"
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-mn-accent-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l18-5v12L3 14v-3z M11.6 16.8a3 3 0 11-5.8-1.6" />
                </svg>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium text-mn-text">
                    Subscribe to operations updates
                    <svg className="w-3 h-3 text-mn-muted group-hover:text-mn-text transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                  <span className="block text-[11px] text-mn-muted leading-snug mt-0.5">
                    Midnight Network Operations announcements &amp; alerts via Notifi — Discord, Email, SMS, or Telegram.
                  </span>
                </span>
              </a>
            </div>

            <div className="border-t border-mn-border" />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-mn-text">Discord Alerts</h3>
                <p className="text-[11px] text-mn-muted mt-0.5">
                  Push this dashboard&apos;s degradation/consensus alerts to your own channel
                </p>
              </div>
              <button
                role="switch"
                aria-checked={config.enabled}
                onClick={() => setConfig({ enabled: !config.enabled })}
                disabled={!urlValid && !config.enabled}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40 ${
                  config.enabled ? "bg-mn-accent" : "bg-mn-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    config.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest">
                Webhook URL
              </span>
              <input
                type="text"
                value={config.webhookUrl}
                onChange={(e) => {
                  const webhookUrl = e.target.value;
                  // Auto-disarm if the URL becomes invalid
                  setConfig(
                    isValidDiscordWebhook(webhookUrl)
                      ? { webhookUrl }
                      : { webhookUrl, enabled: false }
                  );
                }}
                placeholder="https://discord.com/api/webhooks/…"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-mn-bg border border-mn-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-mn-text placeholder:text-mn-muted/60 focus:outline-none focus:border-mn-accent"
              />
              {urlEntered && !urlValid && (
                <span className="text-[11px] text-mn-p3">
                  Expected https://discord.com/api/webhooks/&lt;id&gt;/&lt;token&gt;
                </span>
              )}
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest">
                Trigger On
              </span>
              <div className="flex flex-col gap-1">
                <SeverityOption
                  value="critical"
                  current={config.minSeverity}
                  onSelect={(minSeverity) => setConfig({ minSeverity })}
                  label="Consensus failures only"
                  hint="Validators below GRANDPA 2/3, finality stalled, block production stalled, isolated validators"
                />
                <SeverityOption
                  value="warning"
                  current={config.minSeverity}
                  onSelect={(minSeverity) => setConfig({ minSeverity })}
                  label="Degradation + consensus failures"
                  hint="Also reduced validator set, low peer counts, elevated block time, growing finality gap"
                />
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-mn-muted uppercase tracking-widest">
                Mention <span className="normal-case font-normal">(optional)</span>
              </span>
              <input
                type="text"
                value={config.mention}
                onChange={(e) => setConfig({ mention: e.target.value })}
                placeholder="<@&role-id> or @here"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-mn-bg border border-mn-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-mn-text placeholder:text-mn-muted/60 focus:outline-none focus:border-mn-accent"
              />
            </label>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-mn-border">
              <span className="text-[11px] text-mn-muted min-w-0 truncate">
                {lastDelivery
                  ? lastDelivery.ok
                    ? `Delivered ${new Date(lastDelivery.at).toLocaleTimeString()}`
                    : `Failed: ${lastDelivery.error ?? `HTTP ${lastDelivery.status}`}`
                  : armed
                    ? "Armed — watching for alerts"
                    : "Not armed"}
              </span>
              <button
                onClick={onTest}
                disabled={!urlValid || testing}
                className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-mn-surface-2 border border-mn-border text-mn-text hover:border-mn-accent transition-colors disabled:opacity-40"
              >
                {testing ? "Sending…" : "Send test"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SeverityOption({
  value,
  current,
  onSelect,
  label,
  hint,
}: {
  value: MinSeverity;
  current: MinSeverity;
  onSelect: (v: MinSeverity) => void;
  label: string;
  hint: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${
        active
          ? "border-mn-accent bg-mn-accent/5"
          : "border-mn-border hover:border-mn-muted"
      }`}
    >
      <span className={`block text-xs font-medium ${active ? "text-mn-text" : "text-mn-text-2"}`}>
        {label}
      </span>
      <span className="block text-[10px] text-mn-muted mt-0.5 leading-snug">{hint}</span>
    </button>
  );
}
