"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * TEMPORARY site-wide notice pinned above the nav.
 *
 * Static by design: no dismiss button, no timers, no storage — it renders on
 * every page until the notice expires. Retiring it is a two-line delete (this
 * file's import/usage in `app/layout.tsx`, then the file).
 *
 * Everything worth changing lives in `NOTICE` below: rewording the message or
 * re-pointing the link never touches the markup, and both internal routes and
 * absolute URLs work through `next/link`.
 */
const NOTICE = {
  label: "Notice",
  message: "A message from our maintainer",
  linkLabel: "Read the announcement",
  // TEMPORARY — swap for the real announcement target before relying on it.
  href: "https://x.com/stevanlohja/status/2098454062454772000?s=20",
};

export default function MaintainerBanner() {
  const pathname = usePathname();

  // Kiosk view is full-bleed chrome-free, same rule SiteNav applies.
  if (pathname.startsWith("/board")) return null;

  return (
    <aside
      aria-label={`${NOTICE.label} — ${NOTICE.message}`}
      className="no-print border-b border-mn-p3/30 bg-mn-p3"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-mn-on-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mn-on-accent" />
          {NOTICE.label}
        </span>
        <span className="text-xs text-mn-on-accent sm:text-sm">{NOTICE.message}</span>
        <Link
          href={NOTICE.href}
          className="text-xs font-semibold text-mn-on-accent underline-offset-2 hover:underline sm:text-sm"
        >
          {NOTICE.linkLabel} →
        </Link>
      </div>
    </aside>
  );
}
