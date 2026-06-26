"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTelemetry } from "@/providers/TelemetryProvider";
import { NETWORKS, NETWORK_IDS, NetworkId, TELEMETRY_WEB_URL } from "@/lib/telemetry/networks";
import { BASE_PATH } from "@/lib/basePath";
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
  { href: "/network-change", label: "Network Change" },
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
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <img
                src={`${BASE_PATH}/logos/mn-logo-horizontal.svg`}
                alt="Midnight"
                className="h-5 w-auto [[data-theme=light]_&]:invert"
              />
              <span className="hidden md:inline font-mono text-[10px] text-mn-muted border border-mn-border rounded-full px-2 py-0.5 tracking-widest">
                PO DASH 2.0
              </span>
            </Link>

            <span data-tour="network" className="inline-flex shrink-0">
              <NetworkSwitcher network={network} setNetwork={setNetwork} />
            </span>

            <div className="flex items-center gap-0.5 min-w-0">
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
