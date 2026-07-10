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
- [x] **Executive overview** (`/executive`) — resilience score (availability 45% / finality 35% / stability 20% — decentralization is intentionally **not** scored), RAG domains, a **Network Model** card stating the federated-by-design posture per environment, validator globe (real continents, d3-geo), distribution panels (a Geographic Zone panel buckets validators into continental zones by lat/lng — Europe, Americas, etc. — folding any tail into an "Other" bucket so shares sum to 100%; an Infrastructure Provider panel is a "coming soon" placeholder until the feed exposes that data), reliability strip; "Present" link to board. No operating-cost/economics figures are shown.
- [x] **Board mode** (`/board`) — full-screen kiosk: resilience gauge, globe, rotating KPI spotlight, block/alert tickers; wake-lock, fullscreen, idle-cursor; nav chrome suppressed.
- [x] **Theming** — dark/light on the Midnight palette via `mn-*` CSS-variable tokens.
- [x] **Network Change** (`/network-change`, Resources dropdown) — *experimental*, read-only status board of coordinated changes (Cardano/Midnight HFs, node releases, host migrations) per environment (Preview/Preprod/Mainnet), with type tag, on-track flag, and links. Manually-maintained seed data in `lib/changes/` (env status mirrors a future ops-repo change record). A compact thumbnail of in-flight changes also appears on the executive overview, and a richer **Coordination banner** of in-flight changes appears on the home hero (`CoordinationBanner`), both linking through. Two signal types augment the manual env status:
  - **Live rollout readiness** (`ReadinessSpec` + `lib/changes/readiness.ts`, rendered by `ReadinessGauge`) — telemetry-derived % of the target-env FNO set already reporting ≥ a target version, with the governance-trigger threshold. Used for the node-1.0.0 Mainnet runtime upgrade (threshold 100% = full set). Measurable only when the change's target env is the selected network (the feed is scoped to one network); otherwise it prompts to switch network rather than imply a number.
  - **External dependency** (`ExternalDependency`) — for changes with no Midnight telemetry signal (e.g. the Cardano Van Rossem HF, which depends on FNOs upgrading their Cardano stack); shown as an "externally tracked" status with the reason, not a fabricated %.
- [x] **Roadmap** (`/roadmap`, Resources dropdown) — *experimental*, manually-maintained planning calendar of coordinated changes and events across environments. A fixed 6-week month grid renders **multi-day windows as highlighted spanning bars** (Gantt-style lane packing, `lib/roadmap/layout.ts`), plus an **Agenda** list view (grouped In progress / Upcoming / Completed). Events come from two sources merged in `lib/roadmap/select.ts`: the Network-Change board projected automatically (`lib/roadmap/derive.ts`, so change status flows onto the calendar with no second source of truth) and a hand-authored, easy-to-edit file (`lib/roadmap/events.ts`) for granular items the change model can't express (maintenance/governance windows, epochs). Colour = category, style = status (done ✓ / active pulse / dashed planned / at-risk ring); month/undated events surface in the agenda, not the grid. "Today" is client-only (`useToday`, set in rAF) so the static export has no hydration mismatch; the opening month is a deterministic `defaultMonth`. Pure, framework-free date math in `lib/roadmap/date.ts` (UTC ordinals — timezone-safe). Not live telemetry; labeled forward-looking.
- [x] **Configurable telemetry endpoints** (nav settings gear) — user-editable ordered feed-URL list (primary + fallbacks), persisted in `localStorage`, with automatic failover when a provider is unreachable and reset-to-default. Logic in `lib/telemetry/endpoints.ts` + `TelemetryProvider`.
- [x] **First-visit product tour** — a guided spotlight overlay that auto-opens once (tracked by a `localStorage` "seen" flag) and walks through the key nav features (network switcher, Overview/Dashboard/Attestation/Reports, Resources, notifications, settings, theme). Replayable anytime via the nav "?" button. In-house (no tour dependency); steps in `lib/tour/steps.ts`, state in `TourProvider`, rendered by `TourOverlay` against `data-tour` anchors. Suppressed in board kiosk mode.

## 💡 Candidate / not committed

Ideas surfaced but **not** in scope until explicitly accepted (and only if they respect the OUT-of-scope guardrails in `../project-purpose.md`):

- [ ] Living-globe propagation arcs (great-circle peer mesh + per-block pulse).
- [ ] AI "State of the Network" briefing from a `ReportModel` snapshot (needs an API-key/proxy decision — currently no backend).
- [ ] Persisted local time-series for real trend windows (needs an explicit, labeled persistence design — today the app is session-scoped by design).
- [ ] SLA / network-health report card export.
- [ ] Automated test runner (Vitest) — see `../standards/hygiene-rules.md`.

> A previous broad "FNO Coordination" suite (readiness/versions/epoch) was prototyped and **removed** at the user's request. A **focused, telemetry-backed readiness signal** was later re-added (2026-06-26, by user request) — scoped to specific coordinated changes on the Network Change board/banner (see above), not the removed standalone suite. Don't broaden it back into a general coordination page without a fresh decision.
