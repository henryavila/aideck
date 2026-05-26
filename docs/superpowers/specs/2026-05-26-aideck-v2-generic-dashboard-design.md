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

The `{{ }}` template syntax in `file-mutation` and `shell-exec` handlers is a **separate, minimal substitution mechanism** (variable interpolation from `args` only, no expressions). It is NOT related to widget config strings.

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
id: atomic-skills
mcpNamespace: atomic_skills    # required, [a-z][a-z0-9_]{0,31}, used in MCP tool names
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
    schema: { $ref: "schema.json#/inboxRecord" }

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
    description: "Record a status change intent for a task"
    input:
      type: object
      required: [taskId, newStatus]
      properties:
        taskId: { type: string }
        newStatus: { type: string, enum: [pending, active, done] }
    handler:
      type: file-mutation
      target: "data/inbox/{{ isoDate }}.jsonl"
      operation: append
      record:
        kind: status_change
        taskId: "{{ taskId }}"
        newStatus: "{{ newStatus }}"
        by: ai
        recordedAt: "{{ now }}"

# Optional custom components
components:
  - type: atomic-skills/phase-card
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

**Handler security model:** All handlers execute within the consumer's directory scope. `shell-exec` commands have their `cwd` set to the consumer root and cannot access other consumers' directories. `script` handlers receive a sandboxed `files` object that only exposes declared writable paths. Network access is not restricted at the aiDeck level (consumers may legitimately need it for verifiers), but the Iron Law "no telemetry/no phone-home" applies to aiDeck core only, not to consumer handlers. Handler timeouts (default 30s) kill the process group on expiry.

**Intent-based mutation model:** Domain mutations (changing task status, updating entities) follow the v0.1 intent pattern: handlers write intent records to inbox JSONL, not directly to entity files. The consumer's AI agent skill tails inbox and applies changes to entity files. This preserves Iron Law #1 (aiDeck never owns state). The `file-mutation` handler's `append` operation on inbox targets is the canonical mutation path. Direct entity file writes are NOT supported by the `file-mutation` handler.

### 9. Handler audit: declarative vs code

From the current 18 atomic-skills MCP tools:

**Declarative (file-mutation/shell-exec/composite):** annotate, highlight, record_decision, park_item, emerge_item, update_next_action, update_initiative_status, push_frame, add_task

**Needs script handler:** mark_task_done (cross-entity aggregation), verify_exit_gate (inbox scan + merge + compute allGatesMet), get_next_action (graph traversal), get_dependencies (multi-file graph resolution), health (cross-entity aggregation), pop_frame (read + remove + conditional move), promote_parked (find + remove + create with ID generation)

Industry consensus: every declarative platform (HA, GitHub Actions, Step Functions, Terraform) ships an "escape to code" primitive. None attempts to make declarative config Turing-complete.

### 10. Multi-consumer isolation

aiDeck serves multiple consumers simultaneously by default. Seven conflict risks identified and addressed:

**Already handled by the architecture:**
- **File isolation**: each consumer owns `~/.aideck/consumers/<id>/data/`. No cross-consumer file access.
- **URL scoping**: `/<consumer-id>/` prefix. Each consumer gets its own page space.
- **Event attribution**: every SSE event and API response carries a `consumer` field.
- **Atomic writes**: JSONL files use `fs.appendFile` (atomic append). Entity files are consumer-owned, never shared.
- **Result types**: all parsers return `Result<T, Error>`, never throw.

**Must be enforced by aiDeck core:**

| Concern | Mechanism |
|---------|-----------|
| MCP tool collisions | Auto-namespace: consumer declares `mark_task_done`, aiDeck registers as `aideck.<mcpNamespace>.mark_task_done`. The `mcpNamespace` field in manifest.yaml is required and must match `[a-z][a-z0-9_]{0,31}` (no hyphens — MCP tool names use dots as separators). Example: consumer `atomic-skills` uses `mcpNamespace: atomic_skills`. |
| Custom component collisions | Auto-prefix: consumer declares `phase-card`, aiDeck registers as `<consumer>/phase-card` |
| SSE flooding | Per-consumer event throttle (configurable debounce, default 100ms). SSE supports `?consumer=X` filter |
| Parse error propagation | Per-consumer error boundaries in watcher dispatch. Errors logged + emitted as events, never crash the server |
| Resource exhaustion | File count cap per consumer (configurable, default 5,000). Lazy data loading (on-demand, not all-at-startup) |
| Script handler hangs | try/catch boundary with configurable timeout (default 30s). Hung handler doesn't block the MCP server |
| Double-start conflicts | Instance lockfile (`~/.aideck/lock`) with PID + port. Refuse to start if another instance is alive |

### 11. Migration strategy: hybrid A+B

File-by-file audit of 7,226 LOC across 63 files:

| Strategy | LOC | % | What |
|----------|-----|---|------|
| **Keep (A)** | 2,080 | 29% | Event bus, SSE, CORS, port resolver, CLI, JSONL utils, frontmatter parser, shell verifier, MCP server/registry, common schemas |
| **Rewrite (B)** | 3,624 | 50% | All Plan/Initiative/Task types, validators, normalizers, projections, domain MCP tools, discover-run pipeline, demo fixtures |
| **Surgery (A+B)** | 1,522 | 21% | Watcher (keep chokidar, rewrite dispatch), routes (keep Hono, rewrite endpoints), paths.ts (keep utils, rewrite classify) |

The 3,624 LOC of domain-specific code moves OUT of aiDeck core and INTO the atomic-skills consumer package (handlers/, schemas, components).

## REST API Surface (browser-facing)

MCP tools serve AI agents. The browser dashboard needs REST endpoints. In v2, the REST API becomes generic:

| Method | Path | Returns | Notes |
|--------|------|---------|-------|
| GET | `/api/health` | runtime status, uptime, consumer count | Generic (aiDeck core) |
| GET | `/api/consumers` | list of registered consumers with manifest metadata | Generic |
| GET | `/api/consumers/:id` | consumer manifest (pages, dataSources, nav) | Generic — browser reads this to build the consumer's UI |
| GET | `/api/consumers/:id/data/:dataSourceId` | validated data from a consumer data source | Generic — dataSourceId matches manifest `dataSources[].id` |
| GET | `/api/consumers/:id/data/:dataSourceId/:slug` | single entity from a data source | Generic |
| POST | `/api/consumers/:id/write/:target` | write to writable path (annotations, highlights, inbox) | Generic |
| GET | `/sse` | SSE event stream (supports `?consumer=X` filter) | Generic |

Domain-specific endpoints (old `/api/state/:consumer`, `/api/help`) are removed. The browser builds consumer pages dynamically from the manifest + generic data endpoints.

## Feature Ownership: v0.1 → v2

| v0.1 Feature | v2 Owner | Notes |
|-------------|----------|-------|
| F1. Canonical-data parser | **aiDeck core** | Generic — reads any format declared in manifest (yaml, frontmatter, json, jsonl) |
| F2. File watcher + SSE | **aiDeck core** | Generic — watches `data/` for any consumer |
| F3. HTTP REST API | **aiDeck core** | Generic endpoints (see REST API above) |
| F4. MCP server | **aiDeck core** | Tier 1 generic + Tier 2 consumer-declared |
| F5. Plan bird's-eye view | **Consumer** (atomic-skills) | Declared as a page in manifest using Tree View + Card components |
| F6. Initiative zoom view | **Consumer** (atomic-skills) | Declared as a page in manifest using Table + Accordion + Badge components |
| F7. Help / Skills directory | **Consumer** (atomic-skills) | Declared as a page in manifest using Card + Search components. Not an aiDeck-core feature. |
| F8. Demo mode | **aiDeck core** | `aideck demo` seeds fixtures into `~/.aideck/consumers/demo-consumer/` using a built-in demo manifest. Cleaned on exit. |
| F9. Dark theme | **aiDeck core** | Component library ships with CSS custom properties. Dark default. |
| F10. CLI | **aiDeck core** | Commands: `serve`, `demo`, `mcp`, `validate`, `--help`, `--version` |
| F11. Annotation panel | **Consumer** (via manifest) | Consumer declares a Drawer + List page/section for annotations. `aideck_write` generic tool handles the write. |
| F12. Highlight indicators | **Consumer** (via manifest) | Consumer declares Badge components bound to highlights data source. |
| F13. Exit-gate verifier | **Consumer** (atomic-skills) | `shell-exec` and `script` handlers in manifest. |

## Demo Mode (v2)

`aideck demo` seeds a complete demo consumer into `~/.aideck/consumers/aideck-demo/`:
- A `manifest.yaml` with 3 sample pages (overview, board, detail) exercising all layout modes
- A `schema.json` for the demo data
- Sample data files with rich, realistic content
- Demo banner injected by aiDeck when `--demo` flag is active
- Cleaned on exit (removes `~/.aideck/consumers/aideck-demo/`)

The demo consumer is also the **component library showcase** — it exercises all 25 built-in widgets with real data, serving as visual validation and documentation.

## CLI Surface (v2)

| Command | Purpose |
|---------|---------|
| `aideck serve [--port=N]` | Start HTTP + SSE server, watch all consumers |
| `aideck mcp` | MCP-only mode (no HTTP server) |
| `aideck demo` | Seed demo consumer and start server |
| `aideck validate <file>` | Validate a data file against its consumer's schema.json. Outputs LLM-friendly errors (path + expected + got). Exit 0 = valid, exit 1 = errors. |
| `aideck init-consumer` | Interactive scaffolding: generates manifest.yaml + schema.json + data/ skeleton |
| `aideck --help` | List commands and flags |
| `aideck --version` | Print version |

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

Separate workstream owned by the atomic-skills agent, NOT by aiDeck. aiDeck's responsibility is to produce a **handoff document** at the end of the core implementation that gives the atomic-skills agent everything it needs:

**Handoff document must include:**
- The `manifest.yaml` schema reference (what fields exist, what's required, examples)
- The `schema.json` contract (how to publish from Zod, what AJV validates)
- The `script` handler API (`{ args, data, files, log }` — types, constraints, sandbox rules)
- The custom component registration contract (how to ship Vue/Web Components)
- The list of 7 MCP tools that need `script` handlers (with current implementation as reference)
- The 3,624 LOC of domain-specific code being extracted (as reference for the atomic-skills agent to port)
- Breaking changes: renamed MCP tools (`aideck.atomic_skills.mark_task_done` vs old `aideck_mark_task_done`), new data directory (`~/.aideck/consumers/atomic-skills/data/` vs old `.atomic-skills/`), manifest requirement

**The atomic-skills agent then:**
- Authors `manifest.yaml` with pages, dataSources, tools
- Publishes `schema.json` from existing Zod schemas
- Writes `script` handlers for the 7 complex MCP tools
- Builds custom components for atomic-skills-specific UI elements
- Restructures data files for `~/.aideck/consumers/atomic-skills/data/`
- Updates skill prompts to reference new MCP tool names

## Iron Laws (updated for v2)

1. **Files are canonical.** aiDeck never owns state. Data lives in `~/.aideck/consumers/<id>/data/`. aiDeck reads, validates, projects, and writes ONLY to consumer-declared writable paths.
2. **MCP-first for AI, HTTP/SSE for browser.** Generic MCP tools are the AI surface. Consumer-declared domain tools extend it. REST endpoints serve the Vue dashboard.
3. **Schema validation is enforced.** Every data file validated against consumer-published `schema.json`. Mismatch returns structured error with suggestion. `aideck validate` CLI outputs LLM-friendly errors.
4. **No telemetry. Bind localhost only.** HTTP server binds to `127.0.0.1`. No analytics, no error reporting, no phone-home. All operations local-only.
5. **Consumers own their domain.** aiDeck has zero knowledge of Plan, Initiative, Task, or any domain type. All domain logic lives in consumer packages (manifest + handlers + schemas).

## Definition of Done (v2)

- [ ] Consumer loader scans `~/.aideck/consumers/*/manifest.yaml` and registers all valid consumers
- [ ] Schema validation: data files validated against consumer's `schema.json` via AJV
- [ ] `aideck validate <file>` CLI outputs LLM-friendly errors (path + expected + got)
- [ ] File watcher: changes in any consumer's `data/` trigger SSE events scoped to that consumer
- [ ] REST API: all generic endpoints return correct data for any consumer
- [ ] MCP Tier 1: `aideck_read`, `aideck_list`, `aideck_write`, `aideck_health`, `aideck_list_consumers`, `aideck_schema_version` work
- [ ] MCP Tier 2: consumer-declared tools registered dynamically with auto-namespacing
- [ ] All 4 handler types work: `file-mutation`, `shell-exec`, `composite`, `script`
- [ ] Multi-consumer: 2+ consumers active simultaneously without conflicts (SSE throttling, namespacing, error isolation)
- [ ] Vue dashboard: home page renders consumer list from manifest metadata
- [ ] Vue dashboard: consumer pages render widgets from manifest declarations using the 25 built-in components
- [ ] Layout engine: `sections`, `grid`, `single` modes all work with responsive breakpoints
- [ ] `aideck demo` seeds a demo consumer exercising all 25 components
- [ ] `aideck init-consumer` scaffolds a minimal consumer
- [ ] Handoff document produced for atomic-skills migration
- [ ] Dark theme with WCAG AA contrast
- [ ] Unit test coverage ≥ 70% on core modules
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] README updated for v2 architecture

## Out of Scope

- Dashboard-side mutations (click-to-mark-done) — consumer handler territory
- Authentication / multi-user — never (local-first only)
- Cloud sync — never
- Auto-migration from v0.1 `.atomic-skills/` layout — document migration path, don't auto-convert
- Consumer marketplace / registry — consumers are installed manually
