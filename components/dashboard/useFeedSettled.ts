"use client";

import { useEffect, useState } from "react";
import { useTelemetry } from "@/providers/TelemetryProvider";

/**
 * After (re)connecting or switching networks the node list fills in over several
 * seconds, so "this validator is missing" is bootstrap noise until the feed has
 * settled. Returns false until the feed has been continuously live this long —
 * the same reasoning as the Discord arming delay in providers/NotifyProvider.tsx,
 * applied to the roll-call UI.
 *
 * Every setState happens inside a timer callback, never in the effect body
 * (enforced by react-hooks/set-state-in-effect).
 */
const SETTLE_MS = 20_000;

export function useFeedSettled(settleMs = SETTLE_MS): boolean {
  const { wsStatus } = useTelemetry();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (wsStatus !== "live") {
      const reset = setTimeout(() => setSettled(false), 0);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setSettled(true), settleMs);
    return () => clearTimeout(t);
  }, [wsStatus, settleMs]);

  return settled;
}
