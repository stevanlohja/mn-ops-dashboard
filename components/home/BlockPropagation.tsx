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

interface Wave {
  start: number; // performance.now()
  origin: number; // node index, or -1 for center burst
  travelMs: number; // visual travel duration
}

/**
 * Geometric, real-time block-propagation visual. Validators sit on a rotating
 * ring; when a new block height is observed, a pulse radiates from the author
 * node and travels along edges to every peer — the travel time scaled from the
 * block's real propagation sample. Pure canvas, no dependencies.
 */
export default function BlockPropagation({
  nodeNames,
  latest,
  className = "",
}: {
  nodeNames: string[];
  latest: BlockPulse | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const namesRef = useRef(nodeNames);
  useEffect(() => {
    namesRef.current = nodeNames;
  }, [nodeNames]);
  const wavesRef = useRef<Wave[]>([]);
  const lastBlockRef = useRef<number>(-1);

  // Enqueue a wave whenever a new block height arrives.
  useEffect(() => {
    if (!latest) return;
    if (latest.blockNumber <= lastBlockRef.current) return;
    lastBlockRef.current = latest.blockNumber;

    const names = namesRef.current;
    const idx = latest.authorName ? names.indexOf(latest.authorName) : -1;
    // Scale real propagation (ms) into a visible 700–2200ms travel window.
    const prop = latest.propagationMs ?? 400;
    const travelMs = Math.max(700, Math.min(2200, 700 + prop * 2));
    wavesRef.current.push({ start: performance.now(), origin: idx, travelMs });
    if (wavesRef.current.length > 12) wavesRef.current = wavesRef.current.slice(-12);
  }, [latest]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    let raf = 0;
    let dpr = 1;
    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let ring = 0;
    let spin = 0;

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

    function nodePos(i: number, count: number) {
      const a = spin + (i / count) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * ring, y: cy + Math.sin(a) * ring };
    }

    function frame(now: number) {
      spin += 0.0009;
      const names = namesRef.current;
      const count = Math.max(names.length, 1);
      ctx.clearRect(0, 0, w, h);

      // Ambient concentric hexagons (geometric backdrop)
      for (let k = 1; k <= 3; k++) {
        const rr = ring * (0.28 + k * 0.04);
        ctx.beginPath();
        for (let s = 0; s <= 6; s++) {
          const a = -spin * (k % 2 ? 1 : -1) + (s / 6) * Math.PI * 2;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = colors.grid;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Ring polygon connecting validators
      const pts = Array.from({ length: count }, (_, i) => nodePos(i, count));
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.strokeStyle = colors.grid;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Active propagation waves
      const waves = wavesRef.current;
      for (let i = waves.length - 1; i >= 0; i--) {
        const wv = waves[i];
        const t = (now - wv.start) / wv.travelMs;
        if (t >= 1.15) {
          waves.splice(i, 1);
          continue;
        }
        const origin = wv.origin >= 0 && wv.origin < count ? pts[wv.origin] : { x: cx, y: cy };

        // Edges lighting up from origin to each node
        for (let j = 0; j < count; j++) {
          if (j === wv.origin) continue;
          const target = pts[j];
          const prog = Math.min(1, t);
          const ex = origin.x + (target.x - origin.x) * prog;
          const ey = origin.y + (target.y - origin.y) * prog;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = colors.accent2;
          ctx.globalAlpha = 0.5 * (1 - t) + 0.1;
          ctx.lineWidth = dpr * 1.2;
          ctx.stroke();
          // travelling head
          ctx.beginPath();
          ctx.arc(ex, ey, dpr * 2, 0, Math.PI * 2);
          ctx.fillStyle = colors.accent2;
          ctx.globalAlpha = Math.max(0, 1 - t);
          ctx.fill();
        }

        // Expanding shockwave ring
        const rad = ring * 1.1 * t;
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = colors.accent2;
        ctx.globalAlpha = Math.max(0, 0.45 * (1 - t));
        ctx.lineWidth = dpr * 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Validator nodes (drawn on top), author of newest wave glows
      const activeOrigin = waves.length ? waves[waves.length - 1].origin : -2;
      pts.forEach((p, i) => {
        const isAuthor = i === activeOrigin;
        const r = (isAuthor ? 4.5 : 3) * dpr;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
        glow.addColorStop(0, isAuthor ? colors.accent2 : colors.accent);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = isAuthor ? 0.6 : 0.3;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isAuthor ? colors.text : colors.accent2;
        ctx.fill();
      });

      // Center core
      const pulse = waves.length ? 1 - Math.min(1, (now - waves[waves.length - 1].start) / 600) : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, (8 + pulse * 10) * dpr, 0, Math.PI * 2);
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, (8 + pulse * 10) * dpr);
      coreGlow.addColorStop(0, colors.accent2);
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

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
