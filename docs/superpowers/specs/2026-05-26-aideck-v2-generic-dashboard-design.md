# aiDeck v2 — Generic Dashboard Runtime

## Problem

aiDeck v0.1 was built with deep coupling to atomic-skills: the directory `.atomic-skills/` is hardcoded, the consumer default is `'project-status'`, schemas define Plan/Initiative/Task explicitly, and MCP tools implement domain-specific operations like `mark_task_done`. This makes it impossible for other tools to integrate without forking or monkey-patching.

The goal: aiDeck becomes a **generic AI dashboard runtime** that any app can integrate with. The first deep integration remains atomic-skills, but the architecture supports arbitrary consumers.

## Vision

aiDeck provides:
- A **home page** listing all registered consumers
- A **component library** (25 built-in widgets)
- A **layout engine** (12-column grid)
- **File watching** + **SSE** for real-time updates
- **Schema validation** (AJV, from consumer-published JSON Schema)
- A **MCP server** with generic CRUD tools + consumer-declared domain tools
- An `aideck validate` CLI for AI agent generate-validate-fix loops

Consumers provide:
- A `manifest.yaml` declaring pages, data sources, widgets, and MCP tools
- A `schema.json` (JSON Schema, published from Zod/Pydantic/etc.)
- Data files (YAML, JSON, JSONL)
- Optional custom components (Vue/Web Components)
- Optional script handlers for complex MCP tool logic

## Architecture Decisions

### 1. Data flow: files + projections + SSE

Files are canonical truth. aiDeck watches consumer data files, materializes them into in-memory projections, serves via REST API, and pushes SSE change events to the browser.

Validated by industry research: Grafana, Backstage, and Obsidian all separate "source of truth" from "query surface." None stores authoritative data in the dashboard itself.

### 2. Data location: centralized `~/.aideck/`

Everything lives under `~/.aideck/consumers/<consumer-id>/`:

```
~/.aideck/
  consumers/
    atomic-skills/
      manifest.yaml          # declaration (pages, widgets, data sources, tools)
      schema.json            # JSON Schema (published from Zod)
      components/            # optional custom Vue/Web Components
      handlers/              # script handlers for complex MCP tools
        mark-task-done.js
        verify-exit-gate.js
      data/                  # consumer's data files (watched by aiDeck)
        plans/*.yaml
        tasks.yaml
        annotations/*.jsonl
    py-code-health/
      manifest.yaml
      schema.json
      data/
        coverage.yaml
```

Discovery: aiDeck scans `~/.aideck/consumers/*/manifest.yaml` at startup. Home page shows all consumers with a manifest + data.

If a consumer needs multi-project support internally, it organizes its own `data/` directory however it wants — aiDeck doesn't impose project-level structure.

### 3. Schema approach: Kubernetes pattern

Consumers author schemas in their own language, publish as JSON Schema, aiDeck validates with standard tools.

```
Consumer authors schema (any language)
        ↓ one-time publish
JSON Schema file (universal format)
        ↓ validate with
  JS → AJV (aiDeck uses this internally)
  Python → jsonschema
  Any → aideck validate CLI
```

Concrete flow:
- **TS consumer** (atomic-skills): authors Zod schemas → runs `zod-to-json-schema` → publishes `schema.json`
- **Python consumer**: authors Pydantic models → calls `.model_json_schema()` → publishes `schema.json`
- **Any language**: can hand-write JSON Schema or use their ecosystem's equivalent
- **aiDeck**: reads `schema.json`, validates data files with AJV + `better-ajv-errors`, outputs LLM-friendly error messages via `aideck validate` CLI

Evidence: TS-only would lock out ~40% of the MCP server ecosystem (primarily Python). The Kubernetes pattern (schemas neutral, validators per-language) has proven this at massive scale.

### 4. Integration surface: hybrid manifest + optional JS

- **Declarative manifest** (`manifest.yaml`): pages, layout, data source declarations, widget bindings, MCP tool declarations with declarative handlers
- **Optional JS/TS**: custom components (Vue SFCs or Web Components), script handlers for complex MCP tool logic

This gives low barrier for simple consumers (just write YAML) and full power when needed (ship JS modules).

Note: widget `config` values like `count(status=active)` in the manifest examples are **widget-specific config strings**, not a general expression language. Each widget defines its own config schema (e.g., the Stat widget accepts a `value` string with a small set of aggregate functions). aiDeck does NOT ship a general-purpose expression engine.

### 5. Component library: 25 built-in widgets

Cross-referenced from Grafana, Home Assistant, Retool, Appsmith, Superset, and Streamlit. Gap-analyzed against the atomic-skills wireframes.

**Data display (4):** Table, Stat/Metric, List, Key-Value

**Charts (4):** Line Chart, Bar Chart, Gauge, Progress Bar

**Text/Content (2):** Markdown, Code Block

**Navigation/Layout (4):** Tabs, Grid/Columns, Accordion, Container

**Status (1):** Badge/Status

**AI-tool specific (3):** Kanban Board, Timeline/History, Log/Activity Feed

**From gap analysis (7):** Tree View, Card, Tag/Chip, Breadcrumb, Drawer/Sidebar, Header/Nav Bar, Search/Filter

**Specialized (1):** Graph/DAG (Mermaid)

Total: 25 + consumer-provided custom components for anything missing.

### 6. Layout system: 12-column grid

3 layout modes:
- **`sections`**: flowing content, auto-stacked. Easiest default.
- **`grid`**: 12-column with explicit `colStart`/`colSpan`/`rowSpan`. Full control.
- **`single`**: one widget fills the entire page.

22 layout properties across 6 categories:

**Placement (per widget):** `colSpan` (1-12), `rowSpan`, `colStart`, `minColSpan`, `maxColSpan`

**Responsive (per widget):** `responsive.sm` (<640px), `.md` (640-1024), `.lg` (1024-1440), `.xl` (>1440). Each overrides colSpan, colStart, rowSpan, visible.

**Spacing (view/section level):** `gap`, `rowGap`, `colGap`, `rowHeight`, `align`, `padding`

**Sections:** `title`, `collapsible`, `collapsed`, `columns` (override), `visible` (conditional)

**Dynamic (Grafana repeat):** `repeat`, `repeatDirection`, `maxRepeatColumns`

**Auto-grid:** `autoGrid`, `maxColumns`, `minCardWidth`, `fillScreen`

### 7. Manifest format

```yaml
schemaVersion: '0.1'
id: project-status
title: "Project Status"
icon: mdi:clipboard-check

dataSources:
  - id: plans
    path: "data/plans/*.yaml"
    format: frontmatter
    schema: { $ref: "schema.json#/plans" }
  - id: tasks
    path: "data/tasks.yaml"
    format: yaml
    schema: { $ref: "schema.json#/tasks" }
  - id: inbox
    path: "data/inbox/*.jsonl"
    format: jsonl

nav:
  style: tabs          # tabs | sidebar
  showIcons: true

pages:
  - slug: overview
    title: "Overview"
    icon: mdi:view-dashboard
    default: true
    layout: sections
    sections:
      - title: "Active Plans"
        collapsible: true
        columns: 12
        gap: 16
        widgets:
          - widget: stat
            colSpan: 3
            source: { ref: plans }
            config:
              value: "count(status=active)"
              label: "Active Plans"
            responsive:
              sm: { colSpan: 6 }

          - widget: card-grid
            colSpan: 12
            source:
              ref: plans
              filter: { status: active }
            config:
              cardFields: [title, status, currentPhase]
              linkTo: plan-detail

  - slug: board
    title: "Task Board"
    icon: mdi:view-column
    layout: grid
    columns: 12
    rowHeight: 48
    gap: 12
    widgets:
      - widget: kanban-board
        colStart: 1
        colSpan: 12
        rowSpan: 8
        source:
          ref: tasks
          filter: { status: active }
        config:
          columns: [pending, active, done]
          cardFields: [title, assignee]

  - slug: plan-detail
    title: "Plan: {plan.title}"
    icon: mdi:sitemap
    layout: single
    route: ":planSlug"        # dynamic route parameter
    widget: tree-view
    source:
      ref: plans
      param: planSlug
    config:
      expandDepth: 2
      showBadges: [status, taskCount]

# MCP tools declared by consumer
tools:
  - name: mark_task_done
    description: "Mark a task as done by ID"
    input:
      type: object
      required: [taskId]
      properties:
        taskId: { type: string }
    handler:
      type: script
      source: handlers/mark-task-done.js

  - name: update_status
    description: "Update a task's status"
    input:
      type: object
      required: [taskId, newStatus]
      properties:
        taskId: { type: string }
        newStatus: { type: string, enum: [pending, active, done] }
    handler:
      type: file-mutation
      target: "data/tasks.yaml"
      match: { field: id, value: "{{ taskId }}" }
      set: { status: "{{ newStatus }}" }

# Optional custom components
components:
  - type: project-status/phase-card
    source: components/phase-card.js
```

### 8. MCP tools: two-tier model

**Tier 1 — Generic (aiDeck provides, always available):**

| Tool | Purpose |
|------|---------|
| `aideck_list_consumers` | Enumerate registered consumers |
| `aideck_read` | Read any entity by consumer + dataSource + slug |
| `aideck_list` | List entities with filtering |
| `aideck_write` | Write to writable paths (annotations, highlights, inbox) |
| `aideck_health` | Runtime status, uptime, consumer count |
| `aideck_schema_version` | Schema + API version |

**Tier 2 — Consumer-declared (from manifest, namespaced `aideck.<consumer>.<tool>`):**

Consumers declare tools in `manifest.yaml` with JSON Schema input + one of 4 handler types:

| Handler | What it does | Use when |
|---------|-------------|----------|
| `file-mutation` | Set field, append to array/JSONL | Simple field updates (~55% of tools) |
| `shell-exec` | Run command, capture output | Verifiers, build scripts |
| `composite` | Chain multiple simple operations | Multi-step simple flows |
| `script` | Full JS module with typed context | Cross-entity reads, aggregation, graphs (~45% of tools) |

The `script` handler receives `{ args, data, files, log }`:
- `args` — validated input parameters
- `data` — read-only access to consumer's parsed data sources
- `files` — write to writable paths (annotations, inbox)
- `log` — structured logging

Dynamic registration via MCP's built-in `tools/list_changed` notification when consumers are loaded/unloaded.

### 9. Handler audit: declarative vs code

From the current 18 atomic-skills MCP tools:

**Declarative (file-mutation/shell-exec/composite):** annotate, highlight, record_decision, park_item, emerge_item, update_next_action, update_initiative_status, push_frame, add_task

**Needs script handler:** mark_task_done (cross-entity aggregation), verify_exit_gate (inbox scan + merge + compute allGatesMet), get_next_action (graph traversal), get_dependencies (multi-file graph resolution), health (cross-entity aggregation), pop_frame (read + remove + conditional move), promote_parked (find + remove + create with ID generation)

Industry consensus: every declarative platform (HA, GitHub Actions, Step Functions, Terraform) ships an "escape to code" primitive. None attempts to make declarative config Turing-complete.

### 10. Migration strategy: hybrid A+B

File-by-file audit of 7,226 LOC across 63 files:

| Strategy | LOC | % | What |
|----------|-----|---|------|
| **Keep (A)** | 2,080 | 29% | Event bus, SSE, CORS, port resolver, CLI, JSONL utils, frontmatter parser, shell verifier, MCP server/registry, common schemas |
| **Rewrite (B)** | 3,624 | 50% | All Plan/Initiative/Task types, validators, normalizers, projections, domain MCP tools, discover-run pipeline, demo fixtures |
| **Surgery (A+B)** | 1,522 | 21% | Watcher (keep chokidar, rewrite dispatch), routes (keep Hono, rewrite endpoints), paths.ts (keep utils, rewrite classify) |

The 3,624 LOC of domain-specific code moves OUT of aiDeck core and INTO the atomic-skills consumer package (handlers/, schemas, components).

## URL Structure

```
/                                         # Home (consumer list)
/<consumer-id>/                           # Consumer landing (default page)
/<consumer-id>/<page-slug>                # Consumer page
/<consumer-id>/<page-slug>/<param>        # Dynamic route
```

## Dependent Workstreams

### UI design via Claude Design

All UI is designed via Claude Design (claude.ai/design web interface). Before frontend implementation:
1. Generate prompts for the home page
2. Generate prompts for each built-in component (rendered in a demo page with rich data)
3. Generate prompts for consumer page templates (sections, grid, single layouts)

### Atomic-skills consumer migration

Separate workstream, brainstormed after this spec is approved:
- Author `manifest.yaml` with pages, dataSources, tools
- Publish `schema.json` from existing Zod schemas
- Write `script` handlers for the 7 complex MCP tools
- Build custom components for atomic-skills-specific UI elements
- Restructure data files for `~/.aideck/consumers/atomic-skills/data/`
- Coordinate changes to atomic-skills skill prompts (MCP tool names change)

## Iron Laws (updated for v2)

1. **Files are canonical.** aiDeck never owns state. Data lives in `~/.aideck/consumers/<id>/data/`. aiDeck reads, validates, projects, and writes ONLY to consumer-declared writable paths.
2. **MCP-first for AI, HTTP/SSE for browser.** Generic MCP tools are the AI surface. Consumer-declared domain tools extend it. REST endpoints serve the Vue dashboard.
3. **Schema validation is enforced.** Every data file validated against consumer-published `schema.json`. Mismatch returns structured error with suggestion. `aideck validate` CLI outputs LLM-friendly errors.
4. **No telemetry. Bind localhost only.** HTTP server binds to `127.0.0.1`. No analytics, no error reporting, no phone-home. All operations local-only.
5. **Consumers own their domain.** aiDeck has zero knowledge of Plan, Initiative, Task, or any domain type. All domain logic lives in consumer packages (manifest + handlers + schemas).

## Out of Scope

- Dashboard-side mutations (click-to-mark-done) — consumer handler territory
- Authentication / multi-user — never (local-first only)
- Cloud sync — never
- Auto-migration from v0.1 `.atomic-skills/` layout — document migration path, don't auto-convert
- Consumer marketplace / registry — consumers are installed manually
