"use client";

import { useEffect, useRef } from "react";

export interface BlockPulse {
  blockNumber: number;
  authorName: string | null;
  propagationMs: number | null;
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

interface Ping {
  start: number; // performance.now()
  origin: number; // node index, or -1 for center burst
  travelMs: number; // visual travel duration
}

/**
 * Nighthawk target scope — block propagation drawn as an engagement display.
 * Validators sit as stable contacts on the range ring while a beam sweeps the
 * scope (contacts glint as it passes). When a new block height is observed the
 * author contact is bracketed by a closing lock-on reticle, and dashed
 * lock-lines plus a ranging ping race to every peer — travel time scaled from
 * the block's real propagation sample. The beam sweeps one revolution per
 * observed block, so the dial beats at the network's own cadence. Pure canvas,
 * no dependencies; theme-aware through cssVar(). Beam sweep and ranging ping
 * are dropped under prefers-reduced-motion; the lock-on and lock-lines stay —
 * they carry the data.
 */
export default function BlockPropagation({
  nodeNames,
  latest,
  blockTimeMs = null,
  className = "",
}: {
  nodeNames: string[];
  latest: BlockPulse | null;
  /** Feed-reported average block time (ms) — sets the beam's cadence. */
  blockTimeMs?: number | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const namesRef = useRef(nodeNames);
  useEffect(() => {
    namesRef.current = nodeNames;
  }, [nodeNames]);
  const blockTimeRef = useRef(blockTimeMs);
  useEffect(() => {
    blockTimeRef.current = blockTimeMs;
  }, [blockTimeMs]);
  const pingsRef = useRef<Ping[]>([]);
  const lastBlockRef = useRef<number>(-1);

  // Enqueue a ping whenever a new block height arrives.
  useEffect(() => {
    if (!latest) return;
    if (latest.blockNumber <= lastBlockRef.current) return;
    lastBlockRef.current = latest.blockNumber;

    const names = namesRef.current;
    const idx = latest.authorName ? names.indexOf(latest.authorName) : -1;
    // Scale real propagation (ms) into a visible 700–2200ms travel window.
    const prop = latest.propagationMs ?? 400;
    const travelMs = Math.max(700, Math.min(2200, 700 + prop * 2));
    pingsRef.current.push({ start: performance.now(), origin: idx, travelMs });
    if (pingsRef.current.length > 12) pingsRef.current = pingsRef.current.slice(-12);
  }, [latest]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    // Beam sweep and ranging ping are decoration — dropped for reduced-motion
    // users. The lock-on brackets and lock-lines stay: they are the signal.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let dpr = 1;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let ring = 0;
    let sweep = -Math.PI / 2; // beam angle, radians
    let lastNow = 0;

    const colors = {
      accent: cssVar("--mn-accent", "#0000fe"),
      accent2: cssVar("--mn-accent-2", "#4d4dfe"),
      grid: cssVar("--mn-border", "#2a2a2a"),
      muted: cssVar("--mn-muted", "#7a7a7a"),
      text: cssVar("--mn-text", "#ffffff"),
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      cx = w / 2;
      cy = h / 2;
      ring = Math.min(cx, cy) * 0.74;
    }

    type Pt = { x: number; y: number };

    // Contacts hold a fixed bearing per slot — a tracking plot doesn't drift.
    function contactAngle(i: number, count: number) {
      return (i / count) * Math.PI * 2 - Math.PI / 2;
    }
    function contactPos(i: number, count: number): Pt {
      const a = contactAngle(i, count);
      return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring };
    }

    /** Static HUD layer: corner brackets, range rings, gunsight, bearings. */
    function drawScope() {
      // Corner brackets — same geometry as the Nighthawk mark.
      const inset = 10 * dpr;
      const arm = 24 * dpr;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.5 * dpr;
      ctx.globalAlpha = 0.5;
      const corners: [number, number, number, number][] = [
        [inset, inset, 1, 1],
        [w - inset, inset, -1, 1],
        [w - inset, h - inset, -1, -1],
        [inset, h - inset, 1, -1],
      ];
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + sx * arm, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * arm);
        ctx.stroke();
      }

      // Range rings + gunsight crosshair with a centre gap.
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = dpr;
      for (const k of [0.34, 0.67, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, ring * k, 0, Math.PI * 2);
        ctx.globalAlpha = k === 1 ? 0.9 : 0.5;
        ctx.stroke();
      }
      const gap = ring * 0.15;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + dx * gap, cy + dy * gap);
        ctx.lineTo(cx + dx * ring, cy + dy * ring);
        ctx.stroke();
      }

      // Bearing ticks every 15°, cardinals emphasized.
      for (let deg = 0; deg < 360; deg += 15) {
        const a = (deg * Math.PI) / 180 - Math.PI / 2;
        const cardinal = deg % 90 === 0;
        const r0 = ring + 5 * dpr;
        ctx.strokeStyle = cardinal ? colors.muted : colors.grid;
        ctx.lineWidth = (cardinal ? 1.4 : 1) * dpr;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + (cardinal ? 9 : 5) * dpr), cy + Math.sin(a) * (r0 + (cardinal ? 9 : 5) * dpr));
        ctx.stroke();
      }

      // Cardinal bearing readout.
      ctx.fillStyle = colors.muted;
      ctx.globalAlpha = 0.9;
      ctx.font = `${9 * dpr}px ui-monospace, SFMono-Regular, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const rLabel = ring + 24 * dpr;
      const bearings: [number, string][] = [
        [0, "000"],
        [90, "090"],
        [180, "180"],
        [270, "270"],
      ];
      for (const [deg, label] of bearings) {
        const a = (deg * Math.PI) / 180 - Math.PI / 2;
        ctx.fillText(label, cx + Math.cos(a) * rLabel, cy + Math.sin(a) * rLabel);
      }
      ctx.globalAlpha = 1;
    }

    /** Rotating search beam: bright leading edge with a fading wedge tail. */
    function drawSweep() {
      if (reducedMotion) return;
      const span = Math.PI / 3.2;
      const slices = 18;
      for (let s = 0; s < slices; s++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, ring, sweep - (span * (s + 1)) / slices, sweep - (span * s) / slices);
        ctx.closePath();
        ctx.fillStyle = colors.accent2;
        ctx.globalAlpha = 0.09 * (1 - s / slices);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * ring, cy + Math.sin(sweep) * ring);
      ctx.strokeStyle = colors.accent2;
      ctx.lineWidth = 1.4 * dpr;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /** Tracked contacts: diamonds on the ring, glinting as the beam crosses. */
    function drawContacts(pts: Pt[], angles: number[], count: number) {
      const pings = pingsRef.current;
      const active = pings.length ? pings[pings.length - 1] : null;
      for (let i = 0; i < count; i++) {
        const p = pts[i];
        // Narrow beam-proximity boost (skipped when the sweep is off).
        const lit = reducedMotion ? 0 : Math.pow(Math.max(0, Math.cos(sweep - angles[i])), 20);
        const isAuthor = !!active && i === active.origin;
        const s = (isAuthor ? 6 : 4.5 + lit * 1.5) * dpr;

        if (isAuthor) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 4);
          glow.addColorStop(0, colors.accent2);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s, p.y);
        ctx.closePath();
        ctx.strokeStyle = isAuthor ? colors.text : colors.accent;
        ctx.globalAlpha = isAuthor ? 1 : 0.5 + lit * 0.5;
        ctx.lineWidth = (isAuthor ? 1.6 : 1.2) * dpr;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, (isAuthor ? 2 : 1.4) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = isAuthor ? colors.text : colors.accent2;
        ctx.globalAlpha = isAuthor ? 1 : 0.55 + lit * 0.45;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /**
     * Per-block engagement: dashed lock-lines race from the author to every
     * peer (travel = real propagation), acquisition heads ride the ends, a
     * ranging ring expands, and corner brackets close onto the author — the
     * lock-on. Lines stay under reduced motion; only the ring is dropped.
     */
    function drawPings(pts: Pt[], count: number, now: number) {
      const pings = pingsRef.current;
      for (let i = pings.length - 1; i >= 0; i--) {
        const pg = pings[i];
        // Clamp to >= 0: a ping can be pushed after this frame's rAF timestamp
        // was sampled, making `now - start` momentarily negative.
        const t = Math.max(0, (now - pg.start) / pg.travelMs);
        if (t >= 1.15) {
          pings.splice(i, 1);
          continue;
        }
        const origin = pg.origin >= 0 && pg.origin < count ? pts[pg.origin] : { x: cx, y: cy };
        const prog = Math.min(1, t);

        // Dashed lock-lines sweeping out to each peer.
        ctx.setLineDash([4 * dpr, 6 * dpr]);
        ctx.strokeStyle = colors.accent2;
        ctx.lineWidth = 1.1 * dpr;
        for (let j = 0; j < count; j++) {
          if (j === pg.origin) continue;
          const target = pts[j];
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(
            origin.x + (target.x - origin.x) * prog,
            origin.y + (target.y - origin.y) * prog
          );
          ctx.globalAlpha = 0.45 * (1 - t) + 0.08;
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Acquisition heads riding the line ends.
        ctx.fillStyle = colors.accent2;
        ctx.globalAlpha = Math.max(0, 1 - t);
        for (let j = 0; j < count; j++) {
          if (j === pg.origin) continue;
          const target = pts[j];
          ctx.beginPath();
          ctx.arc(
            origin.x + (target.x - origin.x) * prog,
            origin.y + (target.y - origin.y) * prog,
            2 * dpr,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Ranging ping (decorative — skipped under reduced motion).
        if (!reducedMotion) {
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, ring * 1.1 * t, 0, Math.PI * 2);
          ctx.strokeStyle = colors.accent2;
          ctx.lineWidth = 1.5 * dpr;
          ctx.globalAlpha = Math.max(0, 0.4 * (1 - t));
          ctx.stroke();
        }

        // Lock-on brackets closing onto the author contact.
        const closing = reducedMotion ? 1 : Math.min(1, t / 0.45);
        const size = (26 - 12 * closing) * dpr;
        const arm = size * 0.45;
        const fade = t < 0.8 ? 1 : Math.max(0, (1.15 - t) / 0.35);
        ctx.strokeStyle = colors.accent2;
        ctx.lineWidth = 1.6 * dpr;
        ctx.globalAlpha = 0.9 * fade;
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          ctx.beginPath();
          ctx.moveTo(origin.x + sx * size, origin.y + sy * size - sy * arm);
          ctx.lineTo(origin.x + sx * size, origin.y + sy * size);
          ctx.lineTo(origin.x + sx * size - sx * arm, origin.y + sy * size);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    /** Centre-core flash on a fresh block — the readout sits over it. */
    function drawCore(now: number) {
      const pings = pingsRef.current;
      const newest = pings.length ? pings[pings.length - 1] : null;
      if (!newest) return;
      const pulse = 1 - Math.min(1, Math.max(0, (now - newest.start) / 600));
      if (pulse <= 0) return;
      const r = (8 + pulse * 10) * dpr;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      glow.addColorStop(0, colors.accent2);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /**
     * One sweep per block: the dial beats at the network's own cadence. The
     * clamp keeps a stalled or noisy feed from freezing or strobing the beam;
     * the fallback covers the bootstrap window before one is reported.
     */
    function sweepPeriodMs() {
      const raw = blockTimeRef.current;
      if (raw == null || !Number.isFinite(raw) || raw <= 0) return 6500;
      return Math.min(30000, Math.max(1500, raw));
    }

    function frame(now: number) {
      const dt = lastNow ? Math.min(now - lastNow, 100) : 16;
      lastNow = now;
      if (!reducedMotion) sweep += (dt / sweepPeriodMs()) * Math.PI * 2;

      const names = namesRef.current;
      const count = Math.max(names.length, 1);
      ctx.clearRect(0, 0, w, h);

      drawScope();
      drawSweep();

      const pts = Array.from({ length: count }, (_, i) => contactPos(i, count));
      const angles = Array.from({ length: count }, (_, i) => contactAngle(i, count));
      drawPings(pts, count, now); // signals below the markers…
      drawContacts(pts, angles, count); // …contacts drawn on top
      drawCore(now);

      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />;
}
