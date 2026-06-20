# 🚀 Workflow: Interactive Project Bootstrapper

**Invoke:** "Read `.spec/workflows/onboarding.md` and execute the workflow."

**When to use:** when this repo has been **forked as a template for a new project** and the `.spec/` files are placeholders, or to re-derive a clean spec. (PO Dash 2.0's own `.spec/` is already populated — running this here is for starting fresh, not for the live dashboard.)

## 🎯 Role
Act as a collaborative, friendly Product Manager **and** Software Architect. Extract the project vision through conversation and generate the core `.spec/` files + sync the root `CLAUDE.md`.

## 🚦 Execution rules
1. **One step at a time.** Ask one foundational question, wait, then continue. Never dump all questions at once.
2. **Draft, don't guess.** Turn casual answers into clean, professional markdown for the target file.
3. **Get approval.** Show the draft and ask: *"Does this look right, or should we tweak it before I write the file?"* Only then write.
4. **Be supportive.** If the user is unsure (e.g. tech stack), offer 2–3 sensible recommendations for their project type.
5. **Honor the guardrails.** If they describe something needing a backend/secrets/history and the template is client-only, surface the trade-off rather than silently accepting it.

## 🗺️ The journey

**Step 0 — Welcome.** Greet them, explain you'll stand up their `.spec/`. Ask: *"What's the working title, and in a sentence or two, what are you building?"*

**Step 1 — `project-purpose.md`.** From their answer, ask 1–2 clarifiers about **target audience** and **what's strictly OUT of scope for v1** (the anti-creep guardrail). Draft → approve → write.

**Step 2 — `architecture/tech-stack.md`.** Ask preferred framework / language / styling / data layer / hosting. *Fallback:* if "just a standard web app," suggest a modern default (e.g. Next.js App Router + TypeScript + Tailwind, client-only unless they need a backend). Capture hard constraints. Draft → approve → write.

**Step 3 — `architecture/system-design.md`.** Propose a layering rule (for the default stack: pure logic separate from React, components presentational, routes thin) and a short "Banned practices" list. Draft → approve → write.

**Step 4 — `standards/coding-standards.md` + `hygiene-rules.md`.** Ask styling/typing preferences; derive opinionated standards from the chosen stack. Define the verification gate from their actual `package.json` scripts (**don't invent a `test` command** — if none exists, say the gate is lint+build and note adding a runner). Draft → approve → write.

**Step 5 — `user-stories/01-initial-feature.md`.** Ask: *"What's the first feature that makes this usable?"* Turn it into a story with `As a… I want… So that…` + checkbox acceptance criteria. Draft → approve → write.

**Step 6 — Initialize the router.** Update root `CLAUDE.md`: Operational Commands (from real scripts), the `.spec` Router table, and Critical Constraints (from steps 2–4). Update `.spec/README.md` layout if files differ.

**Step 7 — Close.** Summarize what was created, then ask: *"Your project engine is primed. Ready to write the first feature?"* and point them at the `add-feature` workflow.

## After bootstrapping
All future spec edits follow [`spec-sync.md`](spec-sync.md). All feature work follows [`add-feature.md`](add-feature.md) and ends with [`review-and-verify.md`](review-and-verify.md).
