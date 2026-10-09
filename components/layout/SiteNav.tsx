"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS, NETWORK_IDS, NetworkId, TELEMETRY_WEB_URL } from "@/lib/telemetry/networks";
import NighthawkWordmark from "@/components/ui/NighthawkWordmark";
import ThemeToggle from "./ThemeToggle";
import SettingsMenu from "./SettingsMenu";
import TourLauncher from "./TourLauncher";
import NotifyMenu from "@/components/notify/NotifyMenu";

// Live monitoring views — always visible in the nav. `tour` is the product-tour
// anchor id (see lib/tour/steps.ts).
const PRIMARY_LINKS = [
  { href: "/executive", label: "Overview", tour: "overview" },
  { href: "/dashboard", label: "Dashboard", tour: "dashboard" },
  { href: "/attestation", label: "Attestation", tour: "attestation" },
  { href: "/reports", label: "Reports", tour: "reports" },
];

// Reference surfaces — grouped under a single "Resources" dropdown to keep the
// nav row uncluttered.
const RESOURCE_LINKS = [
  { href: "/diagnostic", label: "Diagnose" },
  { href: "/runbooks", label: "Runbooks" },
  { href: "/docs", label: "Docs" },
];

export default function SiteNav() {
  const { network, setNetwork } = useTelemetry();
  const pathname = usePathname();

  // Board mode is a full-screen kiosk view — no nav chrome.
  if (pathname.startsWith("/board")) return null;

  return (
    <nav className="border-b border-mn-border bg-mn-surface sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" aria-label="Nighthawk — home" className="flex items-center">
                {/* Label collapses below sm so the centered trigger never
                    collides with the sides on narrow phones; the symbol alone
                    still links home. */}
                <NighthawkWordmark className="text-[13px]" labelClassName="hidden sm:inline" />
              </Link>
            </div>

            <span data-tour="network" className="inline-flex shrink-0">
              <NetworkSwitcher network={network} setNetwork={setNetwork} />
            </span>

            {/* Desktop nav (lg+): inline primary links + Resources dropdown. */}
            <div className="hidden lg:flex items-center gap-0.5 min-w-0">
              {/* Primary links scroll horizontally if they ever overflow; the
                  Resources dropdown sits outside the scroll container so its
                  panel is never clipped by overflow-x. */}
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {PRIMARY_LINKS.map((l) => (
                  <NavLink
                    key={l.href}
                    href={l.href}
                    active={pathname.startsWith(l.href)}
                    dataTour={l.tour}
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
              <span data-tour="resources" className="inline-flex">
                <ResourcesMenu pathname={pathname} />
              </span>
            </div>

          </div>

          {/* Centered compact trigger + menu (below lg). `key` remounts it per
              route so navigation resets the open state without an effect. */}
          <NavBarMenu key={pathname} pathname={pathname} />

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`${TELEMETRY_WEB_URL}/#list/${NETWORKS[network].genesis}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-mn-muted hover:text-mn-text transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-mn-ok animate-pulse" />
              Telemetry
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
            <TourLauncher />
            <span data-tour="settings" className="inline-flex">
              <SettingsMenu />
            </span>
            <span data-tour="notify" className="inline-flex">
              <NotifyMenu />
            </span>
            <span data-tour="theme" className="inline-flex">
              <ThemeToggle />
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NetworkSwitcher({
  network,
  setNetwork,
}: {
  network: NetworkId;
  setNetwork: (id: NetworkId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 bg-mn-bg rounded-full pl-2.5 pr-2 py-1 border border-mn-border text-[10px] font-semibold uppercase tracking-wider text-mn-text hover:bg-mn-surface-2 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-mn-accent" />
        {NETWORKS[network].label}
        <svg
          className={`w-3 h-3 text-mn-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute left-0 top-full mt-2 w-36 bg-mn-surface border border-mn-border rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5"
          >
            {NETWORK_IDS.map((id) => {
              const active = network === id;
              return (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setNetwork(id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                    active
                      ? "text-mn-text bg-mn-surface-2 font-medium"
                      : "text-mn-muted hover:text-mn-text hover:bg-mn-surface-2"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${active ? "bg-mn-accent" : "bg-mn-border"}`}
                  />
                  {NETWORKS[id].label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
  dataTour,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  dataTour?: string;
}) {
  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
        active
          ? "text-mn-text bg-mn-surface-2"
          : "text-mn-muted hover:text-mn-text hover:bg-mn-surface-2"
      }`}
    >
      {children}
    </Link>
  );
}

function ResourcesMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const active = RESOURCE_LINKS.some((l) => pathname.startsWith(l.href));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
          active || open
            ? "text-mn-text bg-mn-surface-2"
            : "text-mn-muted hover:text-mn-text hover:bg-mn-surface-2"
        }`}
      >
        Resources
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute left-0 top-full mt-2 w-44 bg-mn-surface border border-mn-border rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5"
          >
            {RESOURCE_LINKS.map((l) => {
              const itemActive = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                    itemActive
                      ? "text-mn-text bg-mn-surface-2 font-medium"
                      : "text-mn-muted hover:text-mn-text hover:bg-mn-surface-2"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Centered hamburger menu — compact navigation (below lg) ──────────────────
//
// The trigger sits in the middle of the nav bar: two lines that slide
// together and rotate into an X when open, revealing a clearly-backgrounded
// panel below the bar (the page dims behind it, so the menu is unmissable).
// Menu-button semantics: aria-haspopup/expanded, Escape closes and restores
// focus to the trigger, outside click and route changes dismiss it, and every
// animated layer is disabled under prefers-reduced-motion.

// One icon per destination — 24-grid strokes, currentColor, so each row picks
// up its active/inactive token automatically.
const MENU_ICONS: Record<string, React.ReactNode> = {
  "/executive": ( // gauge
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 17l4-4" />
    </svg>
  ),
  "/dashboard": ( // ECG pulse
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h4l2.5-6 4 12L16 12h5" />
    </svg>
  ),
  "/attestation": ( // shield + check
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5.5c0 4.2-2.9 7.2-7 8.5-4.1-1.3-7-4.3-7-8.5V6l7-3z" />
      <path d="M9 12l2.2 2.2 4.5-4.5" />
    </svg>
  ),
  "/reports": ( // document
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4" />
      <path d="M9.5 12h5M9.5 15.5h5" />
    </svg>
  ),
  "/diagnostic": ( // crosshair
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  ),
  "/runbooks": ( // notebook
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h10v17H7z" />
      <path d="M10.2 3.5v17" />
      <path d="M12.5 8h3.5M12.5 11.5h3.5M12.5 15h2.5" />
    </svg>
  ),
  "/docs": ( // open book
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6.8C10.4 5.3 8.2 4.6 4.5 4.6v12.6c3.7 0 5.9 0.7 7.5 2.2 1.5-1.5 3.7-2.2 7.5-2.2V4.6c-3.7 0-5.9 0.7-7.5 2.2z" />
      <path d="M12 6.8v12.6" />
    </svg>
  ),
};

// The menu shows the same two groups the desktop nav does.
const MENU_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  { label: "Navigate", items: PRIMARY_LINKS },
  { label: "Resources", items: RESOURCE_LINKS },
];

function NavBarMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Route changes reset the menu via a remount at the call site (`key`), so
  // there is deliberately no pathname effect here — this repo bans
  // setState-in-effect. Escape closes and hands focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative flex min-w-0 flex-1 items-center justify-center self-stretch lg:hidden">
      {/* Dismiss layer — dims the page so the panel reads as the obvious
          foreground surface (same z-40 pattern the other menus use). */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        className={`relative z-50 flex h-9 w-9 items-center justify-center rounded-full border transition-colors motion-reduce:transition-none ${
          open
            ? "border-mn-accent/50 text-mn-accent"
            : "border-mn-border text-mn-text hover:bg-mn-surface-2"
        }`}
      >
        {/* Two lines that slide together and rotate into an X. */}
        <span className="relative block h-5 w-5" aria-hidden="true">
          <span
            className={`absolute left-0 top-[5px] h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none ${
              open ? "translate-y-[4px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[13px] h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out motion-reduce:transition-none ${
              open ? "-translate-y-[4px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Navigation destinations"
          className="absolute left-1/2 top-full z-50 mt-2 w-64 max-h-[calc(100dvh_-_5rem)] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-mn-border bg-mn-surface-2 p-2 shadow-2xl motion-safe:animate-[fadeSlide_0.18s_ease-out]"
        >
          {MENU_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-1 border-t border-mn-border pt-1" : ""}>
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-mn-muted">
                {group.label}
              </p>
              {group.items.map((l) => (
                <MenuRow
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  icon={MENU_ICONS[l.href]}
                  active={pathname.startsWith(l.href)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors motion-reduce:transition-none ${
        active
          ? "bg-mn-accent/15 font-medium text-mn-accent"
          : "text-mn-text-2 hover:bg-mn-surface hover:text-mn-text"
      }`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 ${active ? "text-mn-accent" : "text-mn-muted"}`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
