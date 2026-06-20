"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Samples a live numeric value on a fixed interval into a capped ring buffer.
 *
 * This is an HONEST short-horizon trend: it only reflects movement observed
 * since this view was opened (there is no historical persistence layer). The
 * UI labels it accordingly — it is not quarter-over-quarter history.
 */
export function useMetricTrend(value: number | null, intervalMs = 5_000, cap = 48): number[] {
  const [series, setSeries] = useState<number[]>(value == null ? [] : [value]);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const id = setInterval(() => {
      const v = valueRef.current;
      if (v == null || Number.isNaN(v)) return;
      setSeries((prev) => [...prev, v].slice(-cap));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, cap]);

  return series;
}
