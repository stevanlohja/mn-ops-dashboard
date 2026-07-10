"use client";

import { useEffect, useState } from "react";
import { YMD } from "@/lib/roadmap/date";

/**
 * Client-only "today" as local Y/M/D. Returns null until after mount so the
 * statically-exported markup and the first client render agree (no hydration
 * mismatch); the value is set inside requestAnimationFrame so we never call
 * setState synchronously in an effect body (enforced by
 * react-hooks/set-state-in-effect).
 */
export function useToday(): YMD | null {
  const [today, setToday] = useState<YMD | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const now = new Date();
      setToday({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return today;
}
