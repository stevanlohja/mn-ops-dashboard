# ✅ Workflow: Review & Verify (before declaring "done")

**Invoke:** "Run review-and-verify." Never claim a change is complete without this.

## 1. Self-review against the rules
Re-read the Critical Constraints in [`../../CLAUDE.md`](../../CLAUDE.md) and check the diff for the common violations:
- React import in `lib/`? → move logic out of React.
- Hardcoded color instead of an `mn-*` token? → fix (theme-break).
- `setState` directly in a `useEffect` body? → defer to callback/`rAF`.
- Function-reference remark plugin in `next.config.ts`? → string path.
- A number implying history/precision the feed can't back? → label it.
- New backend/secret/server state? → not allowed; raise it.

If the project has the `/code-review` skill available, use it on the diff and triage findings before proceeding.

## 2. Static gate (must be clean)
```bash
pnpm lint
pnpm build      # includes the TypeScript typecheck
```
Fix all errors. Don't add new warnings (the SiteNav `<img>` warning is the one known/accepted exception). **Do not run `pnpm test` — there is no test runner.**

## 3. Behavioral verify (for anything visual or live-data)
A clean build is not proof it works. Run it:
```bash
pnpm dev   # then open the affected route
```
Confirm the actual behavior — globe renders, tickers update, alerts fire, theme toggles, route loads. Canvas/live features only fully exercise in a browser against the telemetry feed. If you start `pnpm dev` in the background, **kill it when done.**

## 4. Report honestly
State what you verified and how (commands run, route opened, what you observed). If you skipped behavioral verification (e.g. needs a live feed you can't reach), say so explicitly — don't imply it passed.

## 5. Spec sync
If the change affects something a `.spec/` file describes, run [`spec-sync.md`](spec-sync.md).
