# Feature Backlog

Single list of capability areas: what's shipped (the contract the app must keep honoring) and candidate work. Keep this in sync as features land or are cut.

## ✅ Shipped (must keep working)

- [x] **Network health** (`/dashboard`) — see `epic-01-network-health.md`.
- [x] **Validator attestation** (`/attestation`) — authorship share vs expected round-robin, finality lag, propagation, uptime, disconnect flaps, composite 0–100 score. Methodology caveat shown (first-report heuristic, session-scoped).
- [x] **Report builder** (`/reports`) — frozen `ReportModel` → Markdown / **Notifi-safe plain text** / JSON / CSV; copy/download/print.
- [x] **Discord alerting** (nav bell) — browser → webhook, edge-triggered, dedup/escalation/recovery, role-mention guardrails. Config in `localStorage`.
- [x] **Subscribe to official announcements** (nav bell, top section) — outbound link to Midnight Notifi (`https://midnight.notifi.network/`) so any visitor can subscribe to the Midnight Network Operations topic (Discord/Email/SMS/Telegram). Distinct from the personal Discord-webhook config below it. The bell does a one-time periodic wiggle (+ accent dot) for first-time visitors to invite a click, stopping once the menu is opened (remembered in `localStorage`); honors `prefers-reduced-motion`.
- [x] **Diagnostic tree** (`/diagnostic`) — guided incident triage.
- [x] **Runbooks** (`/runbooks`) — MDX runbooks via static import registry + manifest.
- [x] **FNO docs** (`/docs`) — vendored from the ops-repo MkDocs site via `pnpm docs:sync`, rendered in-theme (admonitions → directives, mermaid client-side).
- [x] **Executive overview** (`/executive`) — resilience score (availability/finality/stability — decentralization is intentionally **not** scored), RAG domains, a **Network Model** card stating the federated-by-design posture per environment, validator globe (real continents, d3-geo), distribution panels, reliability strip; "Present" link to board.
- [x] **Board mode** (`/board`) — full-screen kiosk: resilience gauge, globe, rotating KPI spotlight, block/alert tickers; wake-lock, fullscreen, idle-cursor; nav chrome suppressed.
- [x] **Theming** — dark/light on the Midnight palette via `mn-*` CSS-variable tokens.
- [x] **Configurable telemetry endpoints** (nav settings gear) — user-editable ordered feed-URL list (primary + fallbacks), persisted in `localStorage`, with automatic failover when a provider is unreachable and reset-to-default. Logic in `lib/telemetry/endpoints.ts` + `TelemetryProvider`.

## 💡 Candidate / not committed

Ideas surfaced but **not** in scope until explicitly accepted (and only if they respect the OUT-of-scope guardrails in `../project-purpose.md`):

- [ ] Living-globe propagation arcs (great-circle peer mesh + per-block pulse).
- [ ] AI "State of the Network" briefing from a `ReportModel` snapshot (needs an API-key/proxy decision — currently no backend).
- [ ] Persisted local time-series for real trend windows (needs an explicit, labeled persistence design — today the app is session-scoped by design).
- [ ] SLA / network-health report card export.
- [ ] Automated test runner (Vitest) — see `../standards/hygiene-rules.md`.

> A previous "FNO Coordination" suite (readiness/versions/epoch) was prototyped and **removed** at the user's request. Don't reintroduce it without a fresh decision.
