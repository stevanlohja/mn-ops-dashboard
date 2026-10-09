"use client";

/**
 * Nighthawk brand mark — angular delta-wing inside HUD targeting brackets.
 * Uses `currentColor` so it follows the surrounding text token (theme-aware,
 * no invert hacks). Pure SVG, no image asset to keep in sync.
 */
export function NighthawkSymbol({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      aria-hidden="true"
      className={className}
    >
      {/* Targeting brackets */}
      <path d="M3 8.5V3h5.5M15.5 3H21v5.5M21 15.5V21h-5.5M8.5 21H3v-5.5" />
      {/* Delta wing — the hawk in a dive */}
      <path d="M12 5.6 19.2 18.4 12 14.9 4.8 18.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Symbol + stencil wordmark. Used in the nav and the board kiosk header. */
export default function NighthawkWordmark({
  className = "",
  labelClassName = "",
}: {
  className?: string;
  /** Extra classes for the "Nighthawk" text (e.g. collapse it on phones). */
  labelClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <NighthawkSymbol className="h-[1.4em] w-[1.4em] shrink-0 text-mn-accent" />
      <span
        className={`font-display font-semibold uppercase tracking-[0.28em] leading-none ${labelClassName}`}
      >
        Nighthawk
      </span>
    </span>
  );
}
