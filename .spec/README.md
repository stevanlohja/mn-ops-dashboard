# `.spec/` — Source of Truth

This directory is the authoritative specification for **PO Dash 2.0**. It is written for AI assistants first (deterministic, parseable markdown) and humans second. The root [`../CLAUDE.md`](../CLAUDE.md) is the *router*; this directory is the *reference library*.

## How to use this directory

- **Don't read it all at once.** The router table in `../CLAUDE.md` tells you which file to read for a given task. Loading only what's relevant keeps the context window focused and prevents drift.
- **It is the source of truth.** When code and spec disagree, the spec is the intended design — reconcile them (fix the code, or update the spec via the sync protocol). Never silently diverge.
- **The human `README.md`** (in the project root) is end-user/contributor onboarding. This `.spec/` is the machine-facing contract. Some overlap is expected; this directory is authoritative on *intent and rules*.

## Layout

```
.spec/
├── README.md                       # You are here
├── project-purpose.md              # The "why", audience, and OUT-of-scope
├── architecture/
│   ├── system-design.md            # Layering, data flow, state, key decisions
│   └── tech-stack.md               # Allowed deps, versions, constraints
├── standards/
│   ├── coding-standards.md         # How code in this repo must look
│   └── hygiene-rules.md            # Lint/build gates, PR criteria, "done"
├── user-stories/
│   ├── epic-01-network-health.md   # Worked example w/ acceptance criteria
│   └── feature-backlog.md          # Shipped features + candidate work
└── workflows/
    ├── onboarding.md               # Interactive bootstrapper (for forks)
    ├── add-feature.md              # Layered add-a-feature recipe
    ├── review-and-verify.md        # Self-check before "done"
    └── spec-sync.md                # Keep .spec ↔ CLAUDE.md aligned
```

## Maintaining this directory

Changes here follow the **Spec Maintenance & Synchronization Protocol** in [`../CLAUDE.md`](../CLAUDE.md): cross-check the router, stop and ask (Context Gap Report) when something is ambiguous, then update the spec *and* the router together. See [`workflows/spec-sync.md`](workflows/spec-sync.md).
