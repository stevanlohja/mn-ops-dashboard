"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "@/providers/TourProvider";
import { TOUR_STEPS } from "@/lib/tour/steps";

const PAD = 8; // breathing room around the spotlit element
const CARD_W = 320;

/**
 * Full-screen guided tour overlay. Dims the page with theme-token panels and
 * cuts a "hole" around the current step's target (a `data-tour` anchor), then
 * floats an explanatory card. Centered card when a step has no target.
 *
 * Measurement happens in rAF / event callbacks (never directly in an effect
 * body) to satisfy the set-state-in-effect rule, and re-runs on scroll/resize.
 */
export default function TourOverlay() {
  const pathname = usePathname();
  const { active, stepIndex, total, next, prev, end } = useTour();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR_STEPS[stepIndex];

  // Spotlight measurement.
  useEffect(() => {
    if (!active || !step?.target) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const measure = () => setRect(el.getBoundingClientRect());
    const id = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  // Keyboard: Esc skips, arrows navigate.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, end, next, prev]);

  if (!active || pathname.startsWith("/board") || !step) return null;

  const isLast = stepIndex >= total - 1;
  const hole = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Card sits just below the spotlight, horizontally centered on it and clamped
  // to the viewport. Centered on screen when there's no target.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const cardStyle: React.CSSProperties | undefined = hole
    ? {
        top: hole.top + hole.height + 14,
        left: Math.min(
          Math.max(12, hole.left + hole.width / 2 - CARD_W / 2),
          vw - CARD_W - 12
        ),
        width: CARD_W,
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[100] no-print" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim mask: one full-screen panel, or four panels framing the hole. */}
      {hole ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-mn-bg/70" style={{ height: Math.max(0, hole.top) }} />
          <div className="absolute inset-x-0 bottom-0 bg-mn-bg/70" style={{ top: hole.top + hole.height }} />
          <div
            className="absolute bg-mn-bg/70"
            style={{ top: hole.top, height: hole.height, left: 0, width: Math.max(0, hole.left) }}
          />
          <div
            className="absolute bg-mn-bg/70"
            style={{ top: hole.top, height: hole.height, left: hole.left + hole.width, right: 0 }}
          />
          {/* Ring around the spotlight (non-interactive). */}
          <div
            className="absolute rounded-xl border-2 border-mn-accent pointer-events-none transition-all duration-200"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-mn-bg/75" />
      )}

      {/* Step card */}
      <div
        className={`absolute bg-mn-surface border border-mn-border rounded-2xl shadow-2xl p-5 flex flex-col gap-3 ${
          hole ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,360px)]"
        }`}
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-mn-text">{step.title}</h3>
          <span className="font-mono text-[10px] text-mn-muted shrink-0">
            {stepIndex + 1} / {total}
          </span>
        </div>
        <p className="text-xs text-mn-muted leading-relaxed">{step.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {TOUR_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 rounded-full transition-all ${
                i === stepIndex ? "w-5 bg-mn-accent" : "w-1.5 bg-mn-surface-2"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={end}
            className="text-[11px] text-mn-muted hover:text-mn-text transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1 text-[11px] font-medium rounded-lg border border-mn-border text-mn-text hover:bg-mn-surface-2 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-mn-accent text-mn-on-accent hover:opacity-90 transition-opacity"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
