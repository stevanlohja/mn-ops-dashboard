# PO Dash 2.0 — AI Development Guide

Welcome, Assistant. This file is the always-loaded operational guide for the **Midnight Network operations dashboard** (`po_dash_2.0`).

> **CRITICAL:** The complete specification — purpose, architecture, standards, and user stories — lives in [`.spec/`](.spec/). **Read the relevant `.spec/` file(s) before writing code or proposing architecture changes.** Use the router below to pull in only what the task needs (don't load the whole directory).

This is an internal, **100% client-side** Next.js app that visualizes the live Substrate telemetry feed. There is no backend, database, or API key.

---

## 🛠️ Operational Commands

Package manager is **pnpm** (Node 20+, tested on 22). Use these exact scripts; do not invent others.

- **Install:** `pnpm install`
- **Dev server:** `pnpm dev` → http://localhost:3000
- **Production build:** `pnpm build` (this also runs the TypeScript typecheck)
- **Serve build:** `pnpm start`
- **Lint:** `pnpm lint`
- **Regenerate vendored docs:** `pnpm docs:sync` (pulls from the read-only ops clone at `../git/midnight-network-ops`)

> **There is no test runner configured.** Do **not** run `pnpm test`. The verification gate is **`pnpm lint && pnpm build`** (a clean typecheck + lint). Adding a test framework is a tracked item in [`.spec/standards/hygiene-rules.md`](.spec/standards/hygiene-rules.md).

---

## 🎯 Project Blueprint Router (`.spec`)

| Read this… | …before you |
|---|---|
| [`.spec/project-purpose.md`](.spec/project-purpose.md) | Make any scope decision (prevents feature creep) |
| [`.spec/architecture/system-design.md`](.spec/architecture/system-design.md) | Add/modify data flow, state, providers, or routes |
| [`.spec/architecture/tech-stack.md`](.spec/architecture/tech-stack.md) | Add a dependency or use a framework feature |
| [`.spec/standards/coding-standards.md`](.spec/standards/coding-standards.md) | Write or refactor any component/module |
| [`.spec/standards/hygiene-rules.md`](.spec/standards/hygiene-rules.md) | Open a PR / decide "done" |
| [`.spec/user-stories/`](.spec/user-stories/) | Build a feature (read its acceptance criteria first) |
| [`.spec/workflows/`](.spec/workflows/) | Run a recurring task (onboarding, add-feature, review, spec-sync) |

---

## 🚫 Critical Constraints & Guardrails

These are the load-bearing rules of this codebase. Violating them breaks the architecture.

1. **`lib/` is pure TypeScript — ZERO React imports.** Domain logic lives in `lib/` (framework-free, unit-testable). `providers/` bind it to React, `components/` render it, `app/` only routes. Never put logic in a route or a `<Component>`.
2. **Theme tokens only.** Components reference `mn-*` Tailwind utilities (which resolve through `data-theme` CSS variables). **Never hardcode colors** — every component must work in dark and light.
3. **No backend, no DB, no secrets.** Everything runs in the browser against a Substrate telemetry WebSocket feed — default `wss://telemetry.shielded.tools/feed/`, but **user-configurable with ordered failover** (see `lib/telemetry/endpoints.ts` + the provider's rotation loop). Persist user state in `localStorage`; **feature-detect** browser APIs (e.g. `wakeLock`, `requestFullscreen`).
4. **One pure reducer owns telemetry state** ([`lib/state/telemetry-reducer.ts`](lib/state/telemetry-reducer.ts)): each WebSocket message → one event batch → one render. Attestation is keyed by node **name** (telemetry ids churn on reconnect).
5. **No `setState` directly in a `useEffect` body** (the `react-hooks/set-state-in-effect` rule is enforced). Defer to a timer/`requestAnimationFrame`/event callback.
6. **Turbopack is the default bundler.** MDX remark plugins in [`next.config.ts`](next.config.ts) must be passed as **string paths**, never function references (Turbopack can't serialize functions across the loader boundary).
7. **Be honest about data.** The feed is session-scoped with only capped buffers — there is **no historical persistence**. Label anything modeled/approximate/session-scoped as such; never imply multi-day history.
8. **Generated files are not hand-edited.** `content/docs/**` and `lib/docs/*` are produced by `pnpm docs:sync`. Change the source in the ops repo and re-sync.
9. **Verify before declaring done:** `pnpm lint && pnpm build` must be clean.
10. **Keep the spec in sync (mandatory).** Whenever a change introduces or alters a rule, constraint, command, dependency, route, or behavior that a [`.spec/`](.spec/) file or this `CLAUDE.md` describes, you **must** update the affected spec file(s) **and** this file in the *same* change — never let code and spec drift. Run the Spec Maintenance & Synchronization Protocol below (and [`.spec/workflows/spec-sync.md`](.spec/workflows/spec-sync.md)); if the impact is ambiguous, stop and emit a Context Gap Report instead of guessing.

---

## 🔄 Spec Maintenance & Synchronization Protocol

When you **add, modify, or delete anything under `.spec/`** (or change behavior that a spec describes), run this loop before finishing:

**1. Cross-check the root.** Re-read this `CLAUDE.md`. Ensure spec changes don't conflict with the Operational Commands, the Router, or the Critical Constraints. If a spec change invalidates this file (e.g. a new script, a renamed spec file, a changed constraint), **update this file in the same change.**

**2. Clarification gate — don't guess.** If you hit a vague acceptance criterion, a conflict with existing standards, or a missing schema/dependency/decision, **stop** and emit a Context Gap Report, then wait for the user:

```
### 🔍 Context Gap Report
- Ambiguity: <what is unclear or conflicting>
- Impact if guessed: <e.g. tech debt, broken build, wrong scope>
- Options:
  1. <option A>
  2. <option B>
- Need from you: <1–2 direct questions>
```

**3. Bidirectional update.** After clarification: update the target `.spec/` file, update the Router table above if a spec file was added/renamed, and summarize what changed and which constraints you checked.

---

## Tooling note

This file is the canonical router. [`LLM.md`](LLM.md) is a thin pointer to it for non-Claude tools; if you maintain `.cursorrules` or similar, mirror the constraints above.
