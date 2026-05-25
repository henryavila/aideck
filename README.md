# aiDeck

A local HTTP server that gives AI agents a structured API to read and write project state — and gives humans a live dashboard to see what the AI is doing.

## The problem

AI coding agents work in terminals. Their output scrolls away. When an agent runs a multi-phase plan with 30 tasks across 6 phases, or dispatches parallel sub-agents, or produces a code review with 12 findings — the human has no persistent surface to see the big picture, track progress, or respond.

aiDeck fixes this by sitting between the AI's state files and the human's browser:

```
.atomic-skills/         aiDeck               Browser
  plans/*.md      ──→  HTTP + SSE  ──→    Dashboard
  initiatives/*.md      REST API           (React SPA)
  annotations/          MCP Server
  highlights/
```

Files remain the source of truth. aiDeck is a read-mostly gateway — it watches, parses, projects, and streams. The AI writes files directly; the dashboard renders them in real time.

## Features

### REST API

A full JSON API on `127.0.0.1:7777` for reading project state:

```bash
# Project state (all plans + initiatives for a consumer)
curl http://127.0.0.1:7777/api/state/project-status

# Single plan or initiative by slug
curl http://127.0.0.1:7777/api/state/project-status/my-plan

# Health check
curl http://127.0.0.1:7777/api/health

# List consumers (project-status, bootstrap-drafts, custom...)
curl http://127.0.0.1:7777/api/consumers
```

Write endpoints for annotations, highlights, and decisions:

```bash
# Human annotates a plan from the dashboard
curl -X POST http://127.0.0.1:7777/api/annotate \
  -H 'Content-Type: application/json' \
  -d '{"target":{"consumer":"project-status","path":"plans/foo"},"author":"human","body":"Why not merge F2 and F3?"}'

# AI highlights a risk
curl -X POST http://127.0.0.1:7777/api/highlight \
  -H 'Content-Type: application/json' \
  -d '{"target":{"consumer":"project-status","path":"plans/foo"},"reason":"Exit gate F2-G3 has no verifier","severity":"warn","source":"ai"}'
```

### Real-time SSE

Server-Sent Events stream at `/sse`. Every file change, annotation, or highlight is pushed to connected clients within ~200ms. Supports `Last-Event-ID` for reconnection replay.

```bash
curl -N http://127.0.0.1:7777/sse
# event: state-change
# id: 1748192400001
# data: {"kind":"state-change","consumer":"project-status","slug":"my-plan","entityKind":"plan","changeType":"change"}
```

### Multi-project support

One aiDeck instance serves multiple projects. Each project registers its `rootDir` and gets its own file watcher, scoped API routes, and SSE event filtering.

```bash
# Register a second project
curl -X POST http://127.0.0.1:7777/api/projects/register \
  -H 'Content-Type: application/json' \
  -d '{"rootDir":"/path/to/other-project"}'

# List registered projects
curl http://127.0.0.1:7777/api/projects

# Query a specific project's state
curl http://127.0.0.1:7777/api/projects/other-project/state/project-status

# SSE filtered to one project
curl -N "http://127.0.0.1:7777/sse?project=other-project"
```

Legacy single-project routes (`/api/state/:consumer`) continue working for backward compatibility.

### MCP Server

24 tools for AI agents to read state, mutate work tracking, verify exit gates, and exchange feedback with humans:

| Category | Tools |
|----------|-------|
| **Read** | `get_state`, `get_plan`, `get_phase`, `get_initiative`, `get_task`, `get_next_action`, `get_dependencies` |
| **Mutate** | `mark_task_done`, `update_initiative_status`, `update_next_action`, `push_frame`, `pop_frame`, `add_task`, `park_item`, `emerge_item`, `promote_parked` |
| **Gates** | `verify_exit_gate` |
| **Feedback** | `annotate`, `highlight`, `record_decision`, `inbox` |
| **Meta** | `health`, `schema_version`, `list_consumers` |

Connect from any MCP-capable client (Claude Code, Cursor, custom agents):

```bash
aideck mcp   # stdio mode
```

### Dashboard

A React SPA served by aiDeck when a `--static-dir` is provided. Renders plans with phase dependency graphs, initiative task lists, exit gate status, annotations, and highlights. Updates in real time via SSE.

### CLI

```
aideck serve        Start HTTP server on port 7777
aideck up           Ensure running (idempotent) and print URL
aideck down         Stop a running instance (SIGTERM → SIGKILL fallback)
aideck demo         Spawn with sample data, open browser
aideck mcp          Start MCP server (stdio)
aideck env          Print AIDECK_URL/AIDECK_PORT for shell eval
```

## Install

```bash
npm install -g @henryavila/aideck
```

## Quick start

```bash
# Try with sample data
aideck demo

# Use with a real project (needs .atomic-skills/ directory)
aideck serve

# Or ensure it's running in the background
aideck up
```

### With atomic-skills (batteries included)

```bash
npm install -g @henryavila/atomic-skills
atomic-skills install
atomic-skills serve   # builds dashboard + starts aideck
```

[atomic-skills](https://github.com/henryavila/atomic-skills) writes the `.atomic-skills/` state files. aiDeck renders them. The dashboard bundle is included.

## Design decisions

- **Localhost only.** Binds to `127.0.0.1`. No network exposure, no auth needed, no telemetry.
- **Files are canonical.** aiDeck never owns state. It watches `.atomic-skills/` and projects what it finds. Kill the process, nothing is lost.
- **MCP mutations are intents.** `mark_task_done` and friends record an intent in an append-only JSONL log. A consumer skill (or the human) applies the change to the actual files. This prevents two writers (MCP + file watcher) from racing.
- **Schema-versioned.** Every payload includes `schemaVersion: '0.1'`. Parsers reject mismatches with actionable errors.

## Roadmap

- [ ] Cross-project search (find a plan/initiative across all registered projects)
- [ ] Timeline view (chronological event stream across projects)
- [ ] Parallel-dispatch renderer (agent coordination dashboard)
- [ ] Code review HTML reports (replace/augment `.md` review files)

## API reference

See [docs/mcp-tools.md](./docs/mcp-tools.md) for the full MCP tool reference and [docs/integration-spec.md](./docs/integration-spec.md) for the HTTP API contract.

## License

MIT
