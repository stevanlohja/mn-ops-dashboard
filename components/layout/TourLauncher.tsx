"use client";

import { useTour } from "@/providers/TourProvider";

/** Top-bar "?" button that replays the product tour on demand. */
export default function TourLauncher() {
  const { start } = useTour();
  return (
    <button
      onClick={start}
      title="Take a tour"
      aria-label="Take a tour"
      className="p-1.5 rounded-lg hover:bg-mn-surface-2 text-mn-muted hover:text-mn-text transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1.5 2-2.3 2.7-.4.4-.7.9-.7 1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
      </svg>
    </button>
  );
}
