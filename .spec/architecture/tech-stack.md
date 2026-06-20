# Tech Stack & Constraints

Confirm versions against `package.json` before asserting them — this file documents intent and rules, not a lockfile.

## Core

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | RSC by default; `"use client"` only where needed |
| Bundler | **Turbopack** (Next default) | See remark-plugin constraint below |
| UI runtime | **React 19** | |
| Language | **TypeScript 5**, `strict` | `@/*` path alias → project root |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) | theme via CSS variables; `mn-*` tokens only |
| Content | **`@next/mdx`** + `remark-gfm`, `remark-directive`, local `plugins/remark-admonition.mjs` | `.md`/`.mdx` rendered as React |
| Package manager | **pnpm** | Node 20+ (tested 22) |

## Feature-specific deps

- **Globe:** `d3-geo` + `topojson-client` + `world-atlas` (bundled `land-110m`, vendored to `lib/executive/`). Orthographic projection on canvas; no runtime asset fetch.
- **Diagrams:** `mermaid` (client-only, dynamic import; rendered via a `pre` override in `mdx-components.tsx`).
- **Sync tooling:** `js-yaml` (parses `mkdocs.yml` nav in `scripts/sync-docs.mjs`).

## Hard constraints

1. **No backend / DB / server SDKs.** Data source is the telemetry WebSocket only. Don't add server-state libraries, ORMs, or auth.
2. **No secret-bearing dependencies.** Anything requiring an API key in the client is out.
3. **Turbopack plugin rule.** MDX `remarkPlugins` in `next.config.ts` are passed as **string paths** (resolved by `@next/mdx`), never imported function references — Turbopack can't serialize functions into loader options.
4. **Prefer the platform / existing deps.** Before adding a dependency: can existing code or a small `lib/` function do it? New deps need a clear justification (and must respect constraints 1–2). Heavy/SSR-unfriendly libs (e.g. mermaid) must be dynamically imported client-side.
5. **No CSS-in-JS / component libraries that fight the token system.** Styling is Tailwind v4 + `mn-*` CSS-variable tokens. Don't introduce a second theming system.

## Generated / vendored (do not hand-edit)

- `content/docs/**`, `lib/docs/manifest.ts`, `lib/docs/loader.ts` ← `pnpm docs:sync` (source: `../git/midnight-network-ops/docs` + `mkdocs.yml`).
- `lib/executive/land-110m.json` ← vendored from `world-atlas`.

## Not yet present (and that's intentional / tracked)

- **No test runner.** `lib/` is *designed* to be unit-testable (pure), but no Vitest/Jest is wired up. Verification today = `pnpm lint && pnpm build`. See `../standards/hygiene-rules.md`.
