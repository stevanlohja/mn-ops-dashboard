# 🔄 Workflow: Spec Sync (prevent drift)

**Invoke:** automatically whenever you add/modify/delete a `.spec/` file, or change behavior a spec describes. Goal: the spec, the code, and the root router never silently diverge.

## The three-step loop

### 1. Cross-check the root
Re-read [`../../CLAUDE.md`](../../CLAUDE.md). Verify your change doesn't contradict its **Operational Commands**, **Router table**, or **Critical Constraints**. If it does, the root file must change in the same edit. Examples:
- Added a script (e.g. a test runner) → update Operational Commands.
- Added/renamed a `.spec/` file → update the Router table.
- Changed a load-bearing rule → update the Critical Constraints (and the relevant `.spec/standards` or `architecture` file).

### 2. Clarification gate — don't guess
If you find a vague acceptance criterion, a conflict with existing standards, or a missing dependency/schema/decision, **stop** and emit a Context Gap Report, then wait:

```
### 🔍 Context Gap Report
- Ambiguity: <what is unclear or conflicting>
- Impact if guessed: <tech debt / broken build / wrong scope>
- Options:
  1. <option A>
  2. <option B>
- Need from you: <1–2 direct questions>
```

### 3. Bidirectional update
After clarification:
- Update the target `.spec/` file.
- Update the `CLAUDE.md` Router (and constraints/commands) if needed.
- Update `.spec/README.md`'s layout block if files were added/removed.
- Summarize what changed and **which constraints you checked**.

## Quick consistency checklist
- [ ] Router table in `CLAUDE.md` lists every `.spec/` file and points to the right path.
- [ ] Operational Commands match `package.json` scripts (no invented commands; still no `pnpm test` unless a runner was actually added).
- [ ] Constraints in `CLAUDE.md` match `.spec/standards/` and `.spec/architecture/`.
- [ ] `feature-backlog.md` reflects what's actually shipped/removed.
