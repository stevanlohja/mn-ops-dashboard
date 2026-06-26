"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TOUR_STEPS, TOUR_STORAGE_KEY } from "@/lib/tour/steps";

interface TourCtx {
  active: boolean;
  stepIndex: number;
  total: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  end: () => void;
}

const Ctx = createContext<TourCtx>({
  active: false,
  stepIndex: 0,
  total: TOUR_STEPS.length,
  start: () => {},
  next: () => {},
  prev: () => {},
  end: () => {},
});

export function useTour() {
  return useContext(Ctx);
}

/**
 * Drives the first-visit product tour. State is in-memory; the only persisted
 * bit is a "seen" flag in localStorage so the tour auto-opens exactly once.
 * Replay is always available via start() (the ? button in the nav).
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) end();
    else setStepIndex(stepIndex + 1);
  }, [stepIndex, end]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-open once on first visit. Skipped in the board kiosk (no nav chrome to
  // anchor to). Deferred via a timer so we never setState in the effect body
  // and so the nav has mounted before we measure.
  useEffect(() => {
    if (pathname.startsWith("/board")) return;
    let seen = true;
    try {
      seen = localStorage.getItem(TOUR_STORAGE_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <Ctx.Provider value={{ active, stepIndex, total: TOUR_STEPS.length, start, next, prev, end }}>
      {children}
    </Ctx.Provider>
  );
}
