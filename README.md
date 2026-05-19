# aiDeck

> AI-native dashboard runtime for developer workflows.

aiDeck is a local HTTP + MCP runtime that turns AI skill state into a live, interactive dashboard. Skills emit canonical data; aiDeck renders it as a rich visual surface and exposes an MCP server so AI agents can read state, annotate, and coordinate with humans.

**Status**: early development. v0.1 in progress.

## Why aiDeck

Terminal output is fine for one-shot commands. But when AI runs multi-step work — initiatives with phases, parallel agent dispatches, code reviews with dozens of findings — terminal scrollback is the wrong UI.

aiDeck gives the AI a visual surface:

- **Bird's-eye + zoom in one view** — see project structure and current focus simultaneously
- **Bidirectional channel** — humans annotate, flag, approve from the dashboard; AI reads those signals
- **MCP-first integration** — any MCP-capable AI agent can plug in
- **Local-first** — binds to 127.0.0.1, zero telemetry, no cloud

## Architecture

```
.atomic-skills/*.{yaml,md}          ← canonical data (skills write here)
        ↓ file watcher
   ┌─────────────────────────────┐
   │       aiDeck runtime         │
   │       (Hono + Node)          │
   ├─────────────────────────────┤
   │ HTTP/SSE → browser           │  ← human interface (Vue 3 dashboard)
   │ MCP server → AI tools        │  ← AI interface
   └─────────────────────────────┘
        ↑                ↑
[atomic-skills:skills]   [custom integrations]
   (deep integration)    (via MCP or schemas)
```

Files remain canonical. aiDeck is a gateway + UI layer, not the owner of state.

## Install

```bash
npm install -g @henryavila/aideck
```

## Quick start

### Try the demo

```bash
aideck demo
```

Spins up with seeded fixtures (sample project plan, dispatch batch, reviews). Opens browser. AI agents connected via MCP can interact with the demo data.

### Use with atomic-skills (deep integration)

```bash
npm install -g @henryavila/atomic-skills
atomic-skills setup
aideck serve
```

atomic-skills emits canonical data; aiDeck renders it. Skills get visual surface for free.

### Use with custom integration

Implement your own consumer using:
- [Integration spec](./docs/integration-spec.md)
- [MCP tools reference](./docs/mcp-tools.md)
- TypeScript types: `import { ProjectStatusState } from '@henryavila/aideck/schemas'`

## MCP tools (v0.1)

18 tools across 5 categories — read, mutate, exit-gate, feedback, meta. Highlights:

- `aideck_get_state` / `aideck_get_plan` / `aideck_get_phase` / `aideck_get_task` — read state at any granularity
- `aideck_mark_task_done` / `aideck_update_initiative_status` / `aideck_push_frame` — mutate work tracking
- `aideck_verify_exit_gate` — run shell/test/query/manual verifiers
- `aideck_annotate` / `aideck_highlight` / `aideck_record_decision` — bidirectional human↔AI channel
- `aideck_inbox` — receive human inputs from dashboard
- `aideck_health` / `aideck_schema_version` / `aideck_list_consumers` — meta/discovery

Full reference: [docs/mcp-tools.md](./docs/mcp-tools.md).

## Roadmap

- **v0.1** — runtime + project-status renderer + help page + demo + MCP tools
- **v0.2** — parallel-dispatch + audit renderers
- **v0.3** — hunt + review renderers (HTML reports replacing/augmenting .md)
- **v0.4** — cross-cutting views (home, timeline, repo health)

## For contributors / implementing agents

Before touching code, read in order:

1. [docs/why.md](./docs/why.md) — problem, motivation, journey
2. [CLAUDE.md](./CLAUDE.md) — coding rules and discipline
3. [docs/v0.1-scope.md](./docs/v0.1-scope.md) — what's in/out of v0.1
4. [docs/feature-contracts.md](./docs/feature-contracts.md) — features F1-F13 with success gates
5. [docs/canonical-data-pattern.md](./docs/canonical-data-pattern.md) — architectural rule
6. [docs/data-format.md](./docs/data-format.md) — file format with concrete examples
7. [docs/mcp-tools.md](./docs/mcp-tools.md) — MCP tool reference
8. [docs/integration-spec.md](./docs/integration-spec.md) — Tier 1/2 integration
9. [docs/ui-layouts.md](./docs/ui-layouts.md) — wireframes
10. [docs/development.md](./docs/development.md) — dev workflow, test, build, release
11. [docs/decisions.md](./docs/decisions.md) — decision log

Reference fixtures live in [`fixtures/`](./fixtures/) for parser/renderer testing.

## License

MIT
