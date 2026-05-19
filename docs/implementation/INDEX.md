# Implementation Plan — aiDeck v0.1

> **New to this repo?** Read [`00-start-here.md`](./00-start-here.md) first. It captures the load-bearing decisions from prior planning sessions and the recommended reading order before writing any code.

This index lists every implementation step needed to reach v0.1. Each step is sized for **one focused implementation session** and lives in its own file under `docs/implementation/`. Steps proceed **layer-by-layer** (backend → MCP → CLI/demo → frontend → closeout) per the design decision recorded on 2026-05-19.

Before executing any step, the agent MUST:

1. Read [CLAUDE.md](../../CLAUDE.md) (iron laws + code discipline).
2. Read [feature-contracts.md](../feature-contracts.md) (verifiable gates F1-F13).
3. Read the specific step file plus any docs it cross-references.
4. Read the previous step's file (to inherit context, never to re-do its work).

## Conventions

- Each step file has the same sections: **Objetivo**, **Pré-requisitos**, **Gates cobertos**, **Arquivos**, **Passos**, **Testes**, **Definition of Done**, **Notas/decisões**.
- "Consumer" appears as a **string identifier** in URLs, MCP payloads, and the data directory layout (`.atomic-skills/<consumer-id>/`). It is NOT a code abstraction — aiDeck v0.1 ships one schema (project-status) and one set of parsers/renderers for it. The terminology is opened (anyone can write conforming files), not specialized in code.
- Status: when a step finishes, append `· done <YYYY-MM-DD>` to its line below. If a step needs to split, update INDEX + create new file BEFORE starting work.
- If a step's contract proves wrong mid-session, **stop**, update the doc, then resume.

## Steps

### Backend foundation

01. [Foundation + dependencies](./01-foundation-deps.md) — pin missing deps (Zod, pinia, vue-router, marked, mermaid, coverage tooling), create `vitest.config.ts`, scaffold empty directories for every layer, ensure `typecheck` + `test` + `dev:client` all run on a clean checkout. · done 2026-05-19

02. [Runtime schema validators (Zod)](./02-zod-validators.md) — write Zod schemas mirroring the existing TypeScript types in `src/schemas/*.ts`, expose `parsePlan`/`parseInitiative`/`parseAnnotation`/etc. helpers that return `Result<T, ErrorResponse>` and enforce `schemaVersion === '0.1'`. Covers F1 (validation half). · done 2026-05-19

03. [Canonical parser — project-status](./03-parser-project-status.md) — YAML frontmatter + Markdown body parser for `plans/*.md` and `initiatives/*.md`, JSONL line parser for `annotations/`/`highlights/`/`inbox/`, fixture round-trip test (parse → re-serialize frontmatter → byte-equal), performance test (1000-line file < 50ms). Covers F1 (parsing half). · done 2026-05-19

04. [Writers + watcher + event bus](./04-writers-watcher.md) — atomic JSONL appender (open in `a`, write+newline+flush), chokidar watcher on `.atomic-skills/**/*.{md,yaml,jsonl}`, in-process event bus with 60-second `Last-Event-ID` ring buffer. Covers F2 plumbing (server-side). · done 2026-05-19

05. [Hono server: REST + SSE](./05-hono-rest-sse.md) — Hono app bound to `127.0.0.1:7777`, all 10 endpoints from [api-examples.md](../api-examples.md), `/sse` stream emitting `state-change`/`annotation-added`/`highlight-added`/`error`/`health-tick`, CORS allowlist for `localhost`/`127.0.0.1`, all errors shaped as `ErrorResponse`. Covers F2 (SSE wire) + F3.

### MCP

06. [MCP bootstrap + read tools](./06-mcp-read.md) — `@modelcontextprotocol/sdk` server over stdio, tool registration framework, the 7 read tools (`get_state`, `get_plan`, `get_phase`, `get_initiative`, `get_task`, `get_next_action`, `get_dependencies`), Zod-validated inputs, integration tests via MCP test harness. Covers F4 (read half).

07. [MCP mutation tools (append-only intents)](./07-mcp-mutate.md) — the 9 mutation tools as **append-only `IntentRecord` JSONL writes to `inbox/`** — aiDeck never mutates `plans/*.md` or `initiatives/*.md` (Iron Law 1). Consumer skill (or demo `fake-consumer`) tails inbox and applies. Tools: `mark_task_done`, `update_initiative_status`, `update_next_action`, `push_frame`, `pop_frame`, `park_item`, `emerge_item`, `promote_parked`, `add_task`. Covers F4 (mutate half).

08. [MCP exit-gate + feedback + meta + verifier execution](./08-mcp-rest-tools.md) — `verify_exit_gate` (shell + manual paths fully working; appends `VerifierResult` JSONL — never mutates frontmatter; `query` and `test` schemas accepted but execution returns `precondition_failed` with v0.2 hint), `annotate`/`highlight`/`record_decision`/`inbox` (JSONL writes via step 04 writers), `list_consumers`/`health`/`schema_version` (toolCount: **24**). Covers F4 (remainder) + F13 (shell+manual) + data side of F11/F12.

### CLI + demo

09. [CLI + demo seed + detection](./09-cli-demo.md) — `aideck serve` (HTTP-only + writes `~/.aideck/env` + auto-port fallback 7777→7787 when default), `aideck demo` (HTTP + fake-consumer + env file), `aideck mcp` (stdio-only, no env file), `aideck env` (prints shell exports), `aideck --help`, `aideck --version`. Explicit `--port` collision = exit 1; default port collision auto-falls-back. Env file uses `O_EXCL|0o600` (no chmod-leak). Detection per [integration-spec § Detection](../integration-spec.md): MCP tool availability for AI; `/api/health` probe + env file for shell. Covers F8 + F10.

### Frontend

10. [Vue foundation](./10-vue-foundation.md) — Vue 3 + `<script setup>` app skeleton (`main.ts`, `App.vue`, `router.ts` with `/`, `/plans/:slug`, `/initiatives/:slug`, `/help`, `/demo`), pinia store for runtime state, SSE client wired to pinia, dark theme CSS variables from [ui-layouts.md](../ui-layouts.md), TopChrome with Logo + Breadcrumb + Help/Highlights/Menu buttons, no FOUC. Covers F9 baseline.

11. [Plan bird's-eye view (F5)](./11-plan-view.md) — `/plans/:slug` rendering: PlanHeader, collapsible Principles/Glossary, PhaseTree grouped by Track, PhaseCard with exit-gate-type badge + sub-phase count + highlights count, parallel-allowed pairs side-by-side, dependency overlay via Mermaid (lazy-loaded), References modal with gitignored badge, Narrative expandable. Click phase → Initiative view. Covers F5.

12. [Initiative zoom view (F6)](./12-initiative-view.md) — `/initiatives/:slug` rendering: InitiativeHeader with breadcrumb `<phaseId>/<total> · plan: <slug>`, ExitGateList with VerifierBadge per criterion, StackTree colored by frame type, TaskTable with expandable rows + StatusIcon + TagChip + verifier preview, Parked + Emerged side-by-side panel, References + CrossTaskRefs as in-app links, MarkdownBody renderer (marked). Covers F6.

13. [Help page (F7)](./13-help-page.md) — `/help` route reading `/api/help`, SkillCard grid with name/purpose/whenToUse/example, real-time search/filter, expanded card view with related-skills cross-links, copy-command button, frontmatter-missing fallback. Covers F7.

14. [Annotation panel + highlight indicators (F11 + F12)](./14-annotations-highlights.md) — Slide drawer AnnotationPanel (filter by target/author/resolved, resolve button calls `POST /api/annotation/:id/resolve` defined in step 05; persists as append-only `Resolution`), HighlightBadge component rendered inline on phases/tasks/etc., severity color mapping, hover-reason tooltip, acknowledge as append-only `Acknowledgement`, SSE-driven < 200ms updates through pinia. Covers F11 + F12 (UI side). Schemas + endpoints + parsers already defined in steps 02/03/05.

### Closeout

15. [Smoke + publish prep](./15-smoke-publish.md) — Render a real `.atomic-skills/`-shaped fixture end-to-end (Plan + Initiative + annotations + highlights), tick off all F1-F13 gates against the running app, axe DevTools accessibility audit (WCAG AA), bump version `0.0.1` → `0.1.0`, write `CHANGELOG.md`, verify `npm pack` tarball + `npx ./<tarball> demo` works clean, README quickstart manual run. Covers v0.1 DoD composite gate.

## Cross-references

- Iron laws + code discipline: [CLAUDE.md](../../CLAUDE.md)
- Verifiable feature gates: [feature-contracts.md](../feature-contracts.md)
- Data layout + parser rules: [data-format.md](../data-format.md)
- MCP tool surface: [mcp-tools.md](../mcp-tools.md)
- REST + SSE wire format: [api-examples.md](../api-examples.md)
- UI wireframes + components: [ui-layouts.md](../ui-layouts.md)
- Dev workflow: [development.md](../development.md)
- Architectural decisions: [decisions.md](../decisions.md)

## How to use this plan in a session

1. Pick the next step whose `done` mark is absent.
2. Open its file. Read it top to bottom.
3. Re-read referenced specs.
4. Execute the **Passos** in order. Write tests as you go (or first, where the file says so).
5. Tick the **Definition of Done** checkboxes as you complete them.
6. When all DoD items are checked, append `· done <YYYY-MM-DD>` to the step's line in this INDEX.
7. If you found something worth recording for future sessions, append to [decisions.md](../decisions.md).
