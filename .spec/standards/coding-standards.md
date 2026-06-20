# Coding Standards

Generated code must look like *this* codebase, not a generic tutorial. When in doubt, open a neighboring file and match it.

## Components & React

- **Functional components only**, typed props via inline interfaces or `type`. No class components.
- **RSC by default.** Add `"use client"` only when the file needs hooks, browser APIs, or event handlers. Route pages (`app/**/page.tsx`) stay server unless they must be client; push interactivity down into a client component.
- **No `setState` in a `useEffect` body.** The `react-hooks/set-state-in-effect` lint rule is enforced. Set state from timers, `requestAnimationFrame`, or event/async callbacks instead. For values that differ server vs client (clocks, `localStorage`), initialize `null` and hydrate after mount to avoid SSR mismatch.
- **Provider hooks for shared state:** consume telemetry via `useTelemetry()`, theme via `useTheme()`, etc. Don't reach around providers.
- Use `next/link` for internal navigation.

## Styling

- **`mn-*` Tailwind tokens only** (`bg-mn-surface`, `text-mn-muted`, `border-mn-border`, `text-mn-accent-2`, severity `text-mn-p1/p2/p3`, `text-mn-ok`, …). These resolve through `data-theme` CSS variables.
- **Never hardcode hex/rgb in components.** If a canvas/SVG needs a concrete color, read the CSS variable at runtime (see `cssVar()` in `components/executive/ValidatorGlobe.tsx`) so it stays theme-aware.
- Match existing spacing/rounding/typography scales (`rounded-2xl` cards, `text-xs uppercase tracking-wider` labels, `font-mono` for numbers/hashes).

## Domain logic (`lib/`)

- **Pure functions, no React, no DOM.** Inputs in, values out. This is the testable core.
- Keep wire/parse types in `lib/telemetry/types.ts`; derive view models with pure builders (`buildExecutiveMetrics`, `buildReport`, `evaluateHealth`).
- Per-network constants live in `lib/telemetry/networks.ts` — don't scatter thresholds through the UI.

## TypeScript

- `strict` mode; avoid `any` (the lint config flags it). Prefer precise unions and `unknown` + narrowing. Casts are a smell — use them sparingly and comment why (see the `Parameters<typeof feature>` cast in the globe for the pattern).
- Export shared types from the relevant `lib/` module; don't redefine shapes per component.

## Persistence & browser APIs

- Persist user choices in `localStorage` with an `mn-`-prefixed key; read it in an effect (not in a `useState` initializer) to stay SSR-safe.
- **Feature-detect** every optional browser API (`"wakeLock" in navigator`, `el.requestFullscreen?.()`), and no-op gracefully when absent.

## Honesty in the UI

- Label any number that is **modeled** (e.g. cost), **approximate**, or **session-scoped** (no history). Mirror the methodology caveats already present in the attestation and executive views. Never present a heuristic as proof.

## Comments & naming

- Comment the *why*, not the *what*. Match the surrounding density (this codebase uses short section banners and rationale comments on non-obvious decisions).
- File/identifier naming follows the existing modules; co-locate a feature's component(s) under `components/<feature>/` and its logic under `lib/<feature>/`.

## Don't

- Don't import React into `lib/`.
- Don't add a backend, global mutable singletons, or secrets.
- Don't fetch remote assets at runtime for something that can be bundled.
- Don't invent npm scripts or a test command (see `hygiene-rules.md`).
