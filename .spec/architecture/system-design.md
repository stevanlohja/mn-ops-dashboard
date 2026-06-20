# System Design

## The organizing rule: separation of concerns

```
app/         Routes only — no logic. Compose providers + components.
providers/   Bind pure logic to React (context, WebSocket lifecycle, persistence).
components/  Render state. Presentational; receive data via props or provider hooks.
lib/         Pure TypeScript domain logic. ZERO React imports. Unit-testable in isolation.
content/     MDX content (runbooks, vendored docs). Rendered, not logic.
```

> **The cardinal rule:** if it can be a pure function, it goes in `lib/`. React only enters at `providers/` and `components/`. This is what makes the domain logic testable without a browser and keeps render churn down. A reviewer who sees `import ... from "react"` in `lib/` should reject the change.

### `lib/` modules

- `telemetry/` — feed parser, wire types, per-network config (`networks.ts`), node classifier.
- `state/` — `telemetry-reducer.ts`: the single pure state transition.
- `attestation/` — record types + composite scoring.
- `health/` — severity evaluation (`evaluateHealth`) + alert building (`buildAlerts`).
- `notify/` — Discord alert engine (edge-trigger/dedup) + webhook payloads.
- `reports/` — report model build + md/txt/json/csv renderers.
- `runbooks/`, `docs/` — manifest + static import registries for MDX.
- `executive/` — `metrics.ts` (executive rollups), `markers.ts` (globe markers).
- `format.ts` — shared display formatters.

### `providers/`

- `TelemetryProvider` — owns the WebSocket lifecycle (connect, resubscribe per network, backoff, teardown) and dispatches parsed event batches into the reducer. Exposes `useTelemetry()`.
- `NotifyProvider` — the alert watcher → Discord webhook delivery (mounted in the root layout so it runs on every page).
- `ThemeProvider` — dark/light state, `localStorage` persistence, OS sync, pre-paint init script.

## Data flow

```
wss telemetry feed
  → parseFeedMessage()            (lib/telemetry/feed.ts: raw → typed event batch)
  → dispatch({events})            (TelemetryProvider)
  → telemetryReducer()            (lib/state: one pure transition per message)
  → useTelemetry() context        (nodes, summary, attestation, recentBlocks, …)
  → buildExecutiveMetrics() / evaluateHealth() / buildReport()  (pure derivations)
  → components render
```

## Key design decisions (and why)

- **Reducer store, one render per message.** v0.1 called `setState` per feed event (dozens of renders). 2.0 parses each message into a batch and applies it in one pure reducer transition. All attestation bookkeeping lives in the reducer, testable without a browser.
- **Attestation keyed by node name.** Telemetry ids are reassigned on reconnect; names are stable. Keying by name lets uptime/authorship survive restarts.
- **Reports are a frozen model.** `buildReport()` snapshots live state into a serializable `ReportModel`; every renderer (md/txt/json/csv) is a pure function of that snapshot — so exports never read live state mid-render.
- **Theming via CSS variables.** Components only reference `mn-*` tokens, which resolve through `data-theme`-scoped variables. Every component is theme-aware with no per-component work; an inline head script applies the persisted theme before first paint (no flash).
- **Thresholds parameterized per network.** Expected validator count and peer target live in `lib/telemetry/networks.ts`, not hardcoded in UI.
- **Client-only, no server state.** Deploys to any static/serverless host. Persistence is `localStorage`. Browser-only APIs are feature-detected.

## Routes (`app/`)

`/` (home) · `/executive` · `/dashboard` · `/attestation` · `/reports` · `/diagnostic` · `/runbooks` + `/runbooks/[slug]` · `/docs` + `/docs/[...slug]` · `/board` (full-screen kiosk; nav chrome suppressed).

## 🚫 Banned practices

- React imports in `lib/`.
- Hardcoded colors / non-`mn-*` styling that breaks theming.
- Adding a backend, server-side data store, or secret-bearing API.
- `setState` synchronously inside a `useEffect` body.
- Function-reference remark/MDX plugins in `next.config.ts` (must be string paths — Turbopack).
- Implying historical/time-series data the feed cannot provide.
- Bypassing the reducer to mutate telemetry state from a component.
