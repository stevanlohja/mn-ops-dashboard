# 🛠️ Workflow: Add a Feature (the layered way)

**Invoke:** "Run the add-feature workflow for &lt;feature&gt;." You act as a software architect who respects this repo's separation of concerns.

## Before anything
1. Read [`../project-purpose.md`](../project-purpose.md) — confirm the feature is in scope (not an OUT-of-scope item). If it implies a backend, history, or secrets, **stop** and raise it.
2. Read [`../architecture/system-design.md`](../architecture/system-design.md) and [`../standards/coding-standards.md`](../standards/coding-standards.md).
3. If there's a user story, read its acceptance criteria. If not, draft one (see `../user-stories/epic-01-network-health.md` template) and confirm it.

## Build order (do NOT skip layers)
1. **`lib/<feature>/`** — pure logic first. Types + pure functions, **zero React**. This is where the real work lives and where it stays testable.
2. **`providers/`** — only if the feature needs shared state/lifecycle. Usually you reuse `useTelemetry()` rather than add a provider.
3. **`components/<feature>/`** — presentational. `mn-*` tokens only. Add `"use client"` only if it uses hooks/browser APIs/handlers. No `setState` in effects.
4. **`app/<route>/page.tsx`** — routing/composition only, no logic. Add a nav entry in `components/layout/SiteNav.tsx` if user-reachable.

## Guardrails to self-check
- No React import landed in `lib/`.
- No hardcoded colors; works in dark + light.
- Browser APIs feature-detected; persistence via `localStorage` (`mn-` key, hydrated in an effect).
- Any modeled/approximate/session-scoped number is labeled.

## Finish
- Run the **review-and-verify** workflow.
- If the feature changes anything a `.spec/` file describes (new route, new constraint, new dep), run the **spec-sync** workflow and update `../../CLAUDE.md`.
- Mark the story's acceptance criteria and link the implementing files.
