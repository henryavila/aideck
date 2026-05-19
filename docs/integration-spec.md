# Integration Spec

How to make a tool, skill, or AI agent integrate with aiDeck.

## Two integration tiers

### Tier 1 — Read-only (minimal)

Your tool writes canonical YAML/Markdown files. aiDeck reads them and renders.

**Requirements**:
1. Write files under a known root (default: `.atomic-skills/<consumer-id>/`).
2. Each file conforms to the consumer's schema (see [schemas](../src/schemas/)).
3. Include `schemaVersion` field on every payload.

That's it. aiDeck auto-discovers known consumers via directory layout.

### Tier 2 — Read-write (bidirectional)

Your tool also consumes human input from the dashboard.

**Adds**:
4. Poll `aideck_inbox` via MCP, or tail `<consumer-root>/inbox/*.jsonl`.
5. React to annotations, highlights, decisions in your skill logic.

## Registering as a consumer

aiDeck v0.1 ships with `project-status` as the first registered consumer. Future versions allow custom consumers via a registration manifest:

```yaml
# .atomic-skills/<consumer-id>/consumer.yaml
schemaVersion: '0.1'
id: my-custom-tool
title: "My Custom Tool"
rootPath: .atomic-skills/my-custom-tool
schemas:
  - entity: WorkItem
    file: work-items/*.yaml
renderer: builtin  # or 'custom' (Vue component bundled with consumer)
```

(Custom consumer support lands in v0.2+. For v0.1, the builtin `project-status` renderer is the only path.)

## Consumer canonical structure

```
.atomic-skills/<consumer-id>/
├── consumer.yaml            ← registration manifest (v0.2+)
├── *.yaml                   ← entity files (e.g., plans/, initiatives/)
├── annotations/
│   └── YYYY-MM-DD.jsonl     ← append-only AI/human annotations
├── highlights/
│   └── YYYY-MM-DD.jsonl     ← append-only flags
└── inbox/
    └── YYYY-MM-DD.jsonl     ← pending human-to-AI signals
```

JSON Lines (one JSON object per line) is required for append-only logs — multiple writers can append without locking.

## File watching

aiDeck uses `chokidar` to watch `.atomic-skills/**`. Changes propagate to:

1. The dashboard via SSE (browser auto-updates).
2. MCP tool responses (next call returns fresh state).

Latency target: < 200ms from file write to browser DOM update.

## Conflict handling

aiDeck does NOT mutate consumer entity files. All AI/human inputs land in `annotations/`, `highlights/`, `inbox/` subdirectories.

The consumer's skill logic is responsible for:
- Reading inbox items.
- Deciding whether to mutate entity files in response.
- Marking inbox items consumed.

This guarantees aiDeck cannot race the skill on entity state.

## MCP server lifecycle

When aiDeck runs (`aideck serve`), it exposes:
- HTTP server on `127.0.0.1:7777` (dashboard + REST API)
- MCP server on stdio (for Claude Code, Cursor, etc.) — connect via your IDE's MCP config

MCP-only mode (no browser):
```bash
aideck mcp
```

HTTP-only mode (no MCP):
```bash
aideck serve --no-mcp
```

## Detection / lifecycle (how consumers know aiDeck is running)

aiDeck publishes its presence so consumers can detect it without probing.

### Runtime file

On `aideck serve` (or `aideck mcp` in HTTP+MCP mode) startup, aiDeck writes:

```
~/.aideck/runtime.json
```

```json
{
  "schemaVersion": "0.1",
  "apiVersion": "0.1",
  "pid": 12345,
  "url": "http://127.0.0.1:7777",
  "port": 7777,
  "modes": ["http", "sse", "mcp"],
  "startedAt": "2026-05-19T18:00:00Z",
  "version": "0.1.0"
}
```

On graceful shutdown (SIGINT, SIGTERM, clean exit): aiDeck removes the file.

On crash or `kill -9`: file remains. Consumers MUST verify PID liveness before trusting the URL.

If the user runs multiple aiDeck instances simultaneously (different ports), the runtime file holds the LAST started — `kill -0 $pid` on a stale entry returns failure, so consumers know to ignore stale files.

### Detection patterns

#### For AI agents running inside an MCP-capable IDE (Claude Code, Cursor)

Use **MCP tool availability** as the signal — no probing needed:

```
If aideck_get_state, aideck_annotate, etc. appear in the AI's tool list:
  → aiDeck MCP server is registered AND running.
  → Use MCP tools.
Otherwise:
  → Fall back to direct file mutation (canonical files in .atomic-skills/).
```

The IDE's MCP discovery handles the connection. The AI doesn't need to read `runtime.json`.

#### For CLI consumers / shell scripts

```bash
# 1. Stat the runtime file
test -f ~/.aideck/runtime.json || { echo "aiDeck not running"; exit 0; }

# 2. Read URL + PID
URL=$(jq -r .url ~/.aideck/runtime.json)
PID=$(jq -r .pid ~/.aideck/runtime.json)

# 3. Verify PID alive (POSIX)
kill -0 "$PID" 2>/dev/null || { echo "aiDeck pid $PID dead — stale runtime file"; exit 0; }

# 4. Final liveness check via HTTP (200ms timeout)
curl -fsS --max-time 0.2 "$URL/api/health" >/dev/null || { echo "aiDeck unreachable at $URL"; exit 0; }

# All good — proceed with API calls
curl -fsS "$URL/api/state/project-status"
```

#### For skill markdown files (instructions to AI)

Recommended directive in skill source:

> "Before mutating state files, check if `aideck_*` MCP tools are available.
> If yes: use the appropriate MCP tool (e.g., `aideck_mark_task_done`).
> If no: write directly to canonical files in `.atomic-skills/<consumer>/`.
> Both paths are valid — MCP is an optimization, not a requirement."

This graceful-degradation pattern keeps skills compatible with environments where aiDeck is not installed or not running.

### Concurrency / multiple instances

aiDeck v0.1 supports ONE running instance per machine. Starting a second instance writes a new `runtime.json`, overwriting the first. The first instance keeps running but becomes "undiscoverable" via the runtime file.

This is intentional for v0.1 simplicity. Multi-instance discovery (multiple ports, multiple projects) is deferred to v0.2+.

### Permissions

`~/.aideck/` is created with mode `0700` (user-only access). The runtime file is mode `0600`. No other users on the machine can read aiDeck's runtime state.

## Reference implementation

See `@henryavila/atomic-skills` for a reference Tier 2 consumer. Its `project-status` skill writes canonical files AND consumes the aiDeck inbox.
