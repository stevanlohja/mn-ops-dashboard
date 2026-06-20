"use client";

import { useEffect, useRef } from "react";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoDistance,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import landTopo from "@/lib/executive/land-110m.json";

export interface GlobeMarker {
  name: string;
  city: string;
  lat: number;
  lng: number;
  online: boolean;
}

// Convert the bundled land TopoJSON to GeoJSON once at module load (pure, no DOM).
// The topology type is derived from feature()'s own signature to avoid a direct
// dependency on the (transitive, un-hoisted) topojson-specification types.
const topo = landTopo as unknown as Parameters<typeof feature>[0];
const LAND = feature(topo, topo.objects.land) as GeoPermissibleObjects;

const GRATICULE = geoGraticule10() as GeoPermissibleObjects;
const SPHERE = { type: "Sphere" } as GeoPermissibleObjects;

/** Read a CSS custom property to a hex/rgb string at runtime (theme-aware). */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** #rrggbb (or #rgb) → rgba() string. Passes through non-hex values unchanged. */
function withAlpha(color: string, alpha: number): string {
  const m = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Orthographic world globe rendered to a 2D canvas with d3-geo: real coastlines
 * (bundled land-110m TopoJSON), a graticule, and glowing validator markers — all
 * sharing one projection so geography and markers stay aligned. Auto-rotates and
 * can be dragged. No runtime network assets; theme-aware via CSS variables.
 */
export default function ValidatorGlobe({
  markers,
  className = "",
}: {
  markers: GlobeMarker[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef(markers);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas: HTMLCanvasElement = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    let raf = 0;
    // d3 rotation: [longitude λ, latitude φ]. Negative φ lifts the northern
    // hemisphere toward the viewer (≈ the old -0.35rad tilt).
    let lambda = 0;
    let phi = -18;
    let velocity = 0.09; // idle auto-rotate speed (deg/frame)
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let R = 0;

    const projection = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(projection, ctx);

    const colors = {
      accent2: cssVar("--mn-accent-2", "#4d4dfe"),
      ok: cssVar("--mn-ok", "#22c55e"),
      grid: cssVar("--mn-border", "#2a2a2a"),
      surface: cssVar("--mn-surface", "#181818"),
      muted: cssVar("--mn-muted", "#7a7a7a"),
    };
    // Sphere body is dark in both themes, so a light-tinted landmass + accent
    // coastline read well regardless of light/dark mode.
    const landFill = withAlpha(colors.accent2, 0.14);
    const coastline = withAlpha(colors.accent2, 0.55);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      cx = canvas.width / 2;
      cy = canvas.height / 2;
      R = Math.min(cx, cy) * 0.82;
      projection.scale(R).translate([cx, cy]);
    }

    function drawSphereBody() {
      const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      grad.addColorStop(0, colors.surface);
      grad.addColorStop(1, "#000000");
      ctx.beginPath();
      path(SPHERE);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    function drawSphereRim() {
      ctx.beginPath();
      path(SPHERE);
      ctx.strokeStyle = colors.accent2;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = dpr * 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawGraticule() {
      ctx.beginPath();
      path(GRATICULE);
      ctx.strokeStyle = colors.grid;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = dpr;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawLand() {
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = landFill;
      ctx.fill();
      ctx.beginPath();
      path(LAND);
      ctx.strokeStyle = coastline;
      ctx.lineWidth = dpr;
      ctx.stroke();
    }

    function drawMarkers() {
      const center: [number, number] = [-lambda, -phi];
      for (const m of markersRef.current) {
        if (m.lat == null || m.lng == null || (m.lat === 0 && m.lng === 0)) continue;
        // Hide markers on the far hemisphere (orthographic doesn't clip points).
        const d = geoDistance([m.lng, m.lat], center);
        if (d >= Math.PI / 2 - 0.02) continue;
        const xy = projection([m.lng, m.lat]);
        if (!xy) continue;
        const [sx, sy] = xy;
        const depth = 0.4 + Math.cos(d) * 0.6; // fade toward the limb
        const color = m.online ? colors.accent2 : colors.muted;
        const r = (m.online ? 3.2 : 2.4) * dpr;

        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.45 * depth;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = depth;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      if (!dragging) {
        lambda += velocity;
        velocity += (0.09 - velocity) * 0.02; // ease back to baseline after a fling
      }
      if (lambda > 180) lambda -= 360;
      if (lambda < -180) lambda += 360;
      projection.rotate([lambda, phi]);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSphereBody();
      drawGraticule();
      drawLand();
      drawSphereRim();
      drawMarkers();
      raf = requestAnimationFrame(frame);
    }

    function onDown(e: PointerEvent) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lambda += dx * 0.3;
      phi = Math.max(-85, Math.min(85, phi - dy * 0.3));
      velocity = dx * 0.3; // fling
    }
    function onUp(e: PointerEvent) {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full cursor-grab active:cursor-grabbing touch-none select-none ${className}`}
    />
  );
}
