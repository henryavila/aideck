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

## Process lifecycle

`aideck` has two independent process types — they do not share memory or transport, and either may run without the other:

- `aideck serve` — HTTP daemon (dashboard + REST + SSE) on `127.0.0.1:7777` (or `--port`).
- `aideck mcp` — MCP server over **stdio**, spawned by an MCP-capable IDE (Claude Code, Cursor, etc.) via the IDE's MCP config. It is NOT a long-running daemon — the IDE owns its lifecycle.

Both read from the same canonical files and produce the same projections — so a consumer may have one, both, or neither running and the behavior is consistent.

## Detection / lifecycle (how consumers know aiDeck is running)

aiDeck v0.1 follows the dominant pattern of local HTTP daemons (Ollama, LM Studio, Vite, Wrangler, n8n): **HTTP probe with a fingerprint endpoint**, plus a minimal env file to bridge non-default port discovery for shell consumers. No PID file, no fcntl lock, no permission gymnastics.

### Detection by consumer type

#### For AI agents in MCP-capable IDEs (Claude Code, Cursor)

Use **MCP tool availability** as the signal — no probing, no file:

```
If aideck_* MCP tools appear in the AI's tool list:
  → aiDeck MCP server is registered AND running.
  → Use MCP tools.
Otherwise:
  → Fall back to direct file mutation under .atomic-skills/<consumer>/.
```

The IDE handles MCP discovery and lifecycle. aiDeck does nothing extra for this case.

#### For CLI consumers / shell scripts / Tier 2 tools

Use the `/api/health` HTTP probe with a `service` fingerprint. URL/port discovery has 3 progressive fallbacks:

```bash
# 1. Resolve URL: env var > env file > default
if [ -n "$AIDECK_URL" ]; then
  URL="$AIDECK_URL"
elif [ -f ~/.aideck/env ]; then
  # shellcheck disable=SC1090
  . ~/.aideck/env
  URL="$AIDECK_URL"
else
  URL="http://127.0.0.1:7777"
fi

# 2. Probe with identity check (200ms timeout)
RESP=$(curl -fsS --max-time 0.2 "$URL/api/health" 2>/dev/null) || {
  echo "aiDeck unreachable at $URL — falling back to direct file write"
  exit 0
}

# 3. Verify it's actually aiDeck (not some other server on the port)
echo "$RESP" | grep -q '"service":"aideck"' || {
  echo "$URL responded but is not aiDeck"
  exit 0
}

# OK — proceed
curl -fsS "$URL/api/state/project-status"
```

Or, equivalently, source via the CLI:

```bash
eval "$(aideck env 2>/dev/null)"
curl -fsS --max-time 0.2 "$AIDECK_URL/api/health"
```

#### For skill markdown files (directive to AI)

```
Before mutating state files:
1. If aideck_* MCP tools are available → use them.
2. Else: probe http://127.0.0.1:${AIDECK_PORT:-7777}/api/health with 200ms timeout.
   If response body contains "service":"aideck" → use REST API.
3. Else: write directly to canonical files under .atomic-skills/<consumer>/.
```

All three paths are valid. MCP is the fast path; HTTP is the medium path; direct file write is the slow-but-always-works path.

### Env file (port discovery aid)

When `aideck serve` binds successfully on port `N`, it writes a 3-line file:

```
~/.aideck/env
```

```
# aiDeck environment — generated, do not edit
export AIDECK_URL="http://127.0.0.1:7777"
export AIDECK_PORT=7777
```

- File mode `0600`, parent dir `0700` (both created with `O_EXCL | O_CREAT, mode` at `open()` — no chmod-after-write, which has produced real credential leaks in similar tools).
- Removed on graceful shutdown (SIGINT/SIGTERM).
- Stale after crash: probe `/api/health` fails → consumer falls back to direct file write. **No PID, no liveness check needed** — probe failure IS the liveness check.
- Multi-instance v0.1: file reflects the last `aideck serve` to start successfully. Multiple instances not supported (deferred to v0.2+).

### Port collision behavior

- Default port (no `--port`): if 7777 is busy, `aideck serve` auto-tries 7778…7787 (10 attempts). Picks the first free port. Updates env file with chosen port. Prints `aiDeck running at http://127.0.0.1:NNNN`.
- Explicit `--port=N`: if N is busy, `aideck serve` exits 1 (user made an explicit choice; surprise port change would break their setup).

### `/api/health` fingerprint

The endpoint returns:

```json
{
  "schemaVersion": "0.1",
  "apiVersion": "0.1",
  "service": "aideck",
  "version": "0.1.0",
  "status": "ok",
  "uptimeMs": 12345,
  "consumerCount": 1,
  "demo": false,
  "modes": ["http", "sse"]
}
```

The `service` field is the identity check (Ollama uses "Ollama is running"; LM Studio uses `/lmstudio-greeting`). Consumers MUST verify `service === "aideck"` before trusting other fields.

### What this design does NOT include (and why)

- **No PID file**: PID-based liveness has TOCTOU races (kernel recycles PIDs); fcntl locks fix it but add code; for v0.1, probe failure is a sufficient liveness signal.
- **No JSON manifest with version/modes/pid**: those fields live in `/api/health`. Single source of truth.
- **No mDNS, no Unix socket, no systemd integration**: each adds platform-specific complexity. v0.1 prefers convention over service discovery.
- **No multi-instance**: deferred to v0.2+ (would require multi-port env file format).

## Reference implementation

See `@henryavila/atomic-skills` for a reference Tier 2 consumer. Its `project-status` skill writes canonical files AND consumes the aiDeck inbox.
