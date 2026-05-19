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

## Reference implementation

See `@henryavila/atomic-skills` for a reference Tier 2 consumer. Its `project-status` skill writes canonical files AND consumes the aiDeck inbox.
