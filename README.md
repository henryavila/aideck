# aiDeck

Generic AI dashboard runtime. Reads consumer manifests, renders 25 built-in widgets across 3 layout modes, serves data via HTTP/SSE/MCP -- all on localhost.

## What is aiDeck

aiDeck is a local dashboard server for AI-powered developer tools. Any tool ("consumer") publishes a `manifest.yaml` declaring its pages, data sources, and widgets. aiDeck watches the data files, validates them against consumer-published JSON Schema, renders a live dashboard in the browser, and exposes generic + consumer-declared MCP tools for AI agents. No database, no cloud, no telemetry -- files are the source of truth.

## Quick Start

```bash
npm install -g @henryavila/aideck

# Instant preview with sample data (opens browser)
aideck demo

# Scaffold your own consumer
aideck init-consumer --id my-app --title "My App" --mcp-namespace my_app

# Start the server (watches ~/.aideck/consumers/)
aideck serve
```

## Architecture

```
~/.aideck/consumers/
  my-app/
    manifest.yaml          Declares pages, widgets, data sources, MCP tools
    schema.json            JSON Schema (from Zod, Pydantic, or hand-written)
    data/                  YAML / JSON / JSONL files (watched by aiDeck)
      tasks.yaml
      events.jsonl
    handlers/              Optional script handlers for complex MCP tools
    components/            Optional custom Vue/Web Components
        |
        v
    aiDeck core
    - Watches data files (chokidar)
    - Validates against schema.json (AJV)
    - Projects to REST API + SSE stream
    - Registers MCP tools (generic + consumer-declared)
    - Renders 25 built-in widgets via Vue dashboard
        |
        v
    Browser (127.0.0.1:7777)       AI agent (MCP stdio)
```

Consumers own their domain. aiDeck has zero knowledge of any domain type -- all domain logic lives in consumer packages.

## Consumers

A consumer is any tool that publishes a `manifest.yaml` under `~/.aideck/consumers/<id>/`. aiDeck scans this directory at startup and watches for new consumers at runtime.

### manifest.yaml

The manifest declares everything aiDeck needs to render a consumer's dashboard and register its MCP tools.

```yaml
schemaVersion: '0.1'
id: aideck-demo
mcpNamespace: aideck_demo        # [a-z][a-z0-9_]{0,31}, used in MCP tool names
title: 'aiDeck Demo'
icon: 'mdi:rocket'

dataSources:
  - id: projects
    path: 'data/projects.yaml'
    format: yaml
  - id: tasks
    path: 'data/tasks.yaml'
    format: yaml
  - id: events
    path: 'data/events.jsonl'
    format: jsonl

pages:
  - slug: overview
    title: 'Overview'
    icon: 'mdi:view-dashboard'
    default: true
    layout: sections
    sections:
      - title: 'Project Stats'
        columns: 12
        gap: 16
        widgets:
          - widget: stat
            colSpan: 3
            source: { ref: projects }
            config: { value: 'count()', label: 'Total Projects' }
          - widget: stat
            colSpan: 3
            source: { ref: tasks }
            config: { value: 'count(status=done)', label: 'Tasks Done' }
      - title: 'Projects'
        widgets:
          - widget: table
            colSpan: 8
            source: { ref: projects }
          - widget: key-value
            colSpan: 4
            source: { ref: projects, filter: { id: 'proj-1' } }
            config: { fields: ['title', 'status', 'owner'] }
```

Supported data formats: `yaml`, `json`, `jsonl`, `frontmatter`.

### Schema validation

Consumers publish a `schema.json` (JSON Schema) alongside the manifest. aiDeck validates every data file against it using AJV. The `aideck validate-file` CLI outputs structured, LLM-friendly errors for agent generate-validate-fix loops.

## Component Library

25 built-in widgets, grouped by category:

| Category | Widgets |
|----------|---------|
| **Data Display** | `table`, `stat`, `list`, `key-value` |
| **Charts** | `line-chart`, `bar-chart`, `gauge`, `progress-bar` |
| **Text / Content** | `markdown`, `code-block` |
| **Navigation / Layout** | `tabs`, `grid-columns`, `accordion`, `container` |
| **Status** | `badge` |
| **AI-Specific** | `kanban-board`, `timeline`, `log-feed` |
| **Gap Analysis** | `tree-view`, `card`, `tag-chip`, `breadcrumb`, `drawer`, `header-nav`, `search-filter` |
| **Specialized** | `graph-dag` (Mermaid) |

Consumers can also register custom Vue or Web Components for anything not covered by the built-in set.

## Layout Modes

Each page declares one of three layout modes:

| Mode | Description |
|------|-------------|
| **`sections`** | Flowing content in named, collapsible sections. Widgets auto-stack within a 12-column grid. Easiest default. |
| **`grid`** | Full 12-column grid with explicit `colStart`, `colSpan`, `rowSpan` placement. Supports `rowHeight` and `gap` at the page level. |
| **`single`** | One widget fills the entire page. Use for detail views and full-screen visualizations. |

All modes support responsive overrides (`responsive.sm`, `.md`, `.lg`, `.xl`) per widget.

## CLI

| Command | Purpose |
|---------|---------|
| `aideck serve [--port=N]` | Start HTTP + SSE server, watch all consumers (default port 7777) |
| `aideck demo` | Seed a demo consumer exercising all 25 widgets, start server, open browser |
| `aideck mcp` | Start MCP server in stdio mode (no HTTP) |
| `aideck up` | Ensure aiDeck is running (idempotent), print URL |
| `aideck down` | Stop a running instance gracefully |
| `aideck env` | Print `AIDECK_URL`/`AIDECK_PORT` shell exports (`eval "$(aideck env)"`) |
| `aideck validate-file <file>` | Validate a data file against its consumer's schema.json (exit 0=valid, 1=errors) |
| `aideck init-consumer` | Scaffold a new consumer with manifest.yaml, schema.json, and sample data |

Options: `--port=N`, `--static-dir=<path>`, `--config=<path>`, `--id`, `--title`, `--mcp-namespace`.

## MCP Tools

aiDeck exposes a two-tier MCP tool model.

### Tier 1 -- Generic (always available)

| Tool | Purpose |
|------|---------|
| `aideck_list_consumers` | Enumerate registered consumers with metadata |
| `aideck_list` | List records from a data source, with optional key=value filtering |
| `aideck_read` | Read records by consumer + dataSource + optional slug |
| `aideck_write` | Append a JSONL record to a writable path within a consumer |
| `aideck_health` | Runtime status, version, consumer count, uptime |
| `aideck_schema_version` | Schema and API version supported by the server |

### Tier 2 -- Consumer-declared (from manifest)

Consumers declare domain-specific tools in their `manifest.yaml`. aiDeck auto-namespaces them as `aideck.<mcpNamespace>.<tool>` and registers them dynamically.

Four handler types:

| Handler | Use case |
|---------|----------|
| `file-mutation` | Simple field updates, JSONL appends (~55% of tools) |
| `shell-exec` | Run a command, capture output (verifiers, build scripts) |
| `composite` | Chain multiple simple operations |
| `script` | Full JS module with typed context (`{ args, data, files, log }`) |

Tools are registered/unregistered at runtime via MCP `tools/list_changed` notifications when consumers are added or removed.

### Connecting

```bash
# stdio mode (Claude Code, Cursor, custom agents)
aideck mcp
```

## Development

```bash
git clone https://github.com/henryavila/aideck.git
cd aideck
npm install

npm run dev          # Start dev server with file watching
npm test             # Run vitest test suite
npm run typecheck    # TypeScript strict mode check
npm run build        # Production build
```

## License

MIT
