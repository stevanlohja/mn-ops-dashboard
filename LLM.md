# AI Assistant Entry Point

This repository's AI operating guide is **[`CLAUDE.md`](CLAUDE.md)** (canonical router) and the specification under **[`.spec/`](.spec/)** (source of truth).

Whatever assistant or tool you are: **read `CLAUDE.md` first**, then load only the `.spec/` files the task requires (the router table in `CLAUDE.md` says which to read when).

This file exists so tools that look for a generic `LLM.md`/`AI.md` are routed to the same place Claude Code loads automatically. Keep it a pointer — do not duplicate content here.
