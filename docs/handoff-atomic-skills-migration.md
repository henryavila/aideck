# Handoff: atomic-skills Migration to aiDeck v2

**Audience**: An AI agent implementing the atomic-skills side of the migration.
**Prerequisite knowledge**: TypeScript, YAML, JSON Schema. Zero prior knowledge of aiDeck assumed.
**Scope**: Everything you need to migrate the `project-status` consumer from v0.1 hardcoded coupling to v2 consumer-based architecture.

---

## 1. Overview

### What changed

aiDeck v0.1 was tightly coupled to atomic-skills. The root data directory was hardcoded as `.atomic-skills/` in the project working directory. Domain schemas (Plan, Initiative, Task) were compiled into aiDeck's core. MCP tools like `aideck_mark_task_done` implemented atomic-skills-specific logic directly in aiDeck.

aiDeck v2 is a **generic runtime**. It knows nothing about plans, initiatives, or tasks. Every domain concept is owned by a consumer. aiDeck provides:

- A manifest-driven layout engine (12-column grid, 3 layout modes)
- A component library (25 built-in widgets)
- File watching + SSE for real-time browser updates
- AJV-based schema validation from consumer-published `schema.json`
- A MCP server with generic CRUD tools + consumer-declared domain tools
- The `aideck validate` CLI for agent generate-validate-fix loops

### What atomic-skills needs to provide

| Artifact | Location | Purpose |
|---|---|---|
| `manifest.yaml` | `~/.aideck/consumers/atomic-skills/manifest.yaml` | Declares pages, data sources, widgets, MCP tools |
| `schema.json` | `~/.aideck/consumers/atomic-skills/schema.json` | JSON Schema for AJV validation |
| Script handlers | `~/.aideck/consumers/atomic-skills/handlers/*.js` | Complex MCP tool logic (7 tools) |
| Custom components | `~/.aideck/consumers/atomic-skills/components/` | Optional Vue/Web Components |
| Data files | `~/.aideck/consumers/atomic-skills/data/` | Plans, initiatives, annotations, etc. |

aiDeck discovers all consumers by scanning `~/.aideck/consumers/*/manifest.yaml` at startup.

---

## 2. Manifest Schema Reference

The manifest is validated by `src/server/manifest-schema.ts` (Zod). Every field below maps directly to that schema.

### Top-level fields

```yaml
schemaVersion: '0.1'       # required — must be literal '0.1'
id: atomic-skills          # required — string, 1-64 chars, used in API paths
mcpNamespace: atomic_skills # required — regex [a-z][a-z0-9_]{0,31}, used in MCP tool names
title: "Project Status"    # required
icon: mdi:clipboard-check  # optional — MDI icon name, shown in nav
```

The `mcpNamespace` is load-bearing. Consumer tools are registered as `aideck_<mcpNamespace>_<tool.name>`. For `atomic_skills` + `mark_task_done` that becomes `aideck_atomic_skills_mark_task_done`.

### dataSources

Each data source is a glob → records mapping. aiDeck reads these at startup and on file changes.

```yaml
dataSources:
  - id: plans              # required — string, referenced in widget source.ref
    path: "data/plans/*.yaml"  # required — relative to consumer dir, supports single '*' glob
    format: frontmatter    # required — enum: yaml | frontmatter | json | jsonl
    schema:                # optional — used internally by validate CLI
      $ref: "schema.json#/definitions/plan"

  - id: initiatives
    path: "data/initiatives/*.yaml"
    format: frontmatter
    schema:
      $ref: "schema.json#/definitions/initiative"

  - id: inbox
    path: "data/inbox/*.jsonl"
    format: jsonl

  - id: annotations
    path: "data/annotations/*.jsonl"
    format: jsonl
```

**Format semantics**:
- `yaml`: file parsed as YAML; if root is array, each element is one record; if root is object, it becomes one record.
- `frontmatter`: YAML between `---` delimiters becomes the record, markdown body is stored as `_body`, filename (without path) as `_file`.
- `json`: same as yaml but JSON-parsed.
- `jsonl`: each non-empty line is parsed as a separate JSON record.

Implementation: `src/server/data-source-reader.ts`

### pages

Three layout modes. One page must have `default: true`.

#### sections layout (recommended default)

Flowing sections, each with a widget grid. Easiest to author.

```yaml
pages:
  - slug: overview          # required — URL-safe string
    title: "Overview"       # required
    layout: sections        # required
    icon: mdi:view-dashboard # optional
    default: true           # optional — first page shown on load
    sections:
      - title: "Active Plans"  # optional
        collapsible: true      # optional
        columns: 12            # optional — column count override for this section
        gap: 16                # optional — pixel gap between widgets
        widgets:
          - widget: stat        # required — built-in or custom widget name
            colSpan: 3          # 1-12
            source:
              ref: plans        # data source id
              filter: { status: active }  # optional key=value filter
            config:
              value: "count(status=active)"
              label: "Active Plans"
            responsive:
              sm: { colSpan: 6 }  # override at <640px
```

#### grid layout

Explicit 12-column grid with `colStart` placement.

```yaml
  - slug: board
    title: "Task Board"
    layout: grid
    columns: 12             # optional — default 12
    rowHeight: 48           # optional — pixels per row unit
    gap: 12                 # optional
    widgets:
      - widget: kanban-board
        colStart: 1         # 1-13
        colSpan: 12
        rowSpan: 8
        source: { ref: tasks }
        config: { columns: ['pending', 'active', 'done'], statusField: 'status' }
```

#### single layout

One widget fills the full page.

```yaml
  - slug: initiative-detail
    title: "Initiative"
    layout: single
    widget: initiative-card  # widget name
    source: { ref: initiatives, param: slug }  # param = URL param name
    config: { showStack: true }
```

### tools

MCP tools declared here are registered as `aideck_<mcpNamespace>_<tool.name>`. The `input` field is a JSON Schema object (type=object with properties). The `handler` field selects one of four execution strategies.

```yaml
tools:
  - name: mark_task_done          # registered as aideck_atomic_skills_mark_task_done
    description: "Mark a task done and apply the mutation to the initiative file."
    input:
      type: object
      required: [initiativeSlug, taskId]
      properties:
        initiativeSlug: { type: string }
        taskId: { type: string }
        by: { type: string, enum: [human, ai] }
    handler:
      type: script
      source: handlers/mark-task-done.js
```

**Handler types** (4 options):

| Type | Use when | Key fields |
|---|---|---|
| `file-mutation` | Append a JSONL record | `target`, `operation: append`, `record: {}` |
| `shell-exec` | Run a shell command | `command` (template vars OK) |
| `script` | Complex logic in JS/TS | `source` (path relative to consumer dir) |
| `composite` | Multiple steps in sequence | `steps: [HandlerDecl, ...]` |

`file-mutation` and `shell-exec` support `{{ varName }}` template substitution from `args`. Built-in variables: `{{ isoDate }}`, `{{ now }}`. Implementation: `src/server/handlers/template.ts`.

`file-mutation` target must be within the consumer directory. Current limitation: `operation: set` is not implemented (v0.2); use `operation: append` for JSONL writes.

### components

Optional custom component registration. Components are auto-namespaced as `<consumerId/componentType>` and available in widget declarations.

```yaml
components:
  - type: phase-card          # becomes usable as widget: atomic-skills/phase-card
    source: components/phase-card.js  # path relative to consumer dir
```

### nav

Navigation style at the top/side of the dashboard.

```yaml
nav:
  style: tabs      # tabs | sidebar — default: tabs
  showIcons: true  # default: true
```

### Complete atomic-skills manifest example

```yaml
schemaVersion: '0.1'
id: atomic-skills
mcpNamespace: atomic_skills
title: "Project Status"
icon: mdi:clipboard-check

dataSources:
  - id: plans
    path: "data/plans/*.yaml"
    format: frontmatter
    schema: { $ref: "schema.json#/definitions/plan" }

  - id: initiatives
    path: "data/initiatives/*.yaml"
    format: frontmatter
    schema: { $ref: "schema.json#/definitions/initiative" }

  - id: inbox
    path: "data/inbox/*.jsonl"
    format: jsonl

  - id: annotations
    path: "data/annotations/*.jsonl"
    format: jsonl

  - id: highlights
    path: "data/highlights/*.jsonl"
    format: jsonl

nav:
  style: tabs
  showIcons: true

pages:
  - slug: overview
    title: "Overview"
    icon: mdi:view-dashboard
    default: true
    layout: sections
    sections:
      - title: "Plans"
        columns: 12
        gap: 16
        widgets:
          - widget: stat
            colSpan: 3
            source: { ref: plans }
            config: { value: "count(status=active)", label: "Active Plans" }
          - widget: stat
            colSpan: 3
            source: { ref: initiatives }
            config: { value: "count(status=active)", label: "Active Initiatives" }
          - widget: stat
            colSpan: 3
            source: { ref: inbox }
            config: { value: "count()", label: "Inbox Items" }
          - widget: table
            colSpan: 12
            source: { ref: plans, filter: { status: active } }

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
        rowSpan: 10
        source: { ref: initiatives }
        config:
          columns: [pending, active, done]
          statusField: status

  - slug: health
    title: "Health"
    icon: mdi:heart-pulse
    layout: sections
    sections:
      - title: "Inbox"
        widgets:
          - widget: log-feed
            colSpan: 12
            source: { ref: inbox }
            config: { timestampField: requestedAt, messageField: operation }
      - title: "Highlights"
        widgets:
          - widget: timeline
            colSpan: 12
            source: { ref: highlights }
            config: { timestampField: createdAt, titleField: reason, bodyField: severity }

tools:
  - name: mark_task_done
    description: "Mark a task as done. Reads initiative file, records intent, returns phaseCompleteHint when last task."
    input:
      type: object
      required: [initiativeSlug, taskId]
      properties:
        initiativeSlug: { type: string }
        taskId: { type: string }
        verifierResultId: { type: string }
        by: { type: string }
    handler:
      type: script
      source: handlers/mark-task-done.js

  - name: verify_exit_gate
    description: "Run or accept a manual verifier result for an exit-gate criterion."
    input:
      type: object
      required: [target, criterionId]
      properties:
        target: { type: string }
        planSlug: { type: string }
        phaseId: { type: string }
        initiativeSlug: { type: string }
        taskId: { type: string }
        criterionId: { type: string }
        result: { type: string }
        deferredReason: { type: string }
        evidence: { type: string }
    handler:
      type: script
      source: handlers/verify-exit-gate.js

  - name: get_next_action
    description: "Compute the next recommended action across plans and initiatives."
    input:
      type: object
      properties:
        planSlug: { type: string }
        initiativeSlug: { type: string }
    handler:
      type: script
      source: handlers/get-next-action.js

  - name: get_dependencies
    description: "Resolve dependencies for a phase or task."
    input:
      type: object
      required: [scope]
      properties:
        scope: { type: string, enum: [phase, task] }
        planSlug: { type: string }
        phaseId: { type: string }
        initiativeSlug: { type: string }
        taskId: { type: string }
    handler:
      type: script
      source: handlers/get-dependencies.js

  - name: health
    description: "Cross-entity health report: stale initiatives, unmet gates, open highlights, inbox count."
    input:
      type: object
      properties:
        staleDays: { type: number }
    handler:
      type: script
      source: handlers/health.js

  - name: pop_frame
    description: "Pop the top stack frame from an initiative."
    input:
      type: object
      required: [initiativeSlug]
      properties:
        initiativeSlug: { type: string }
        destination: { type: string }
        by: { type: string }
    handler:
      type: script
      source: handlers/pop-frame.js

  - name: promote_parked
    description: "Promote a parked item to a real task or initiative."
    input:
      type: object
      required: [initiativeSlug, parkedTitleOrIndex]
      properties:
        initiativeSlug: { type: string }
        parkedTitleOrIndex: {}
        by: { type: string }
    handler:
      type: script
      source: handlers/promote-parked.js
```

---

## 3. Schema.json Contract

### How to publish from Zod

`zod-to-json-schema` is already in aiDeck's `package.json` (`^3.25.2`). Run it once when schemas change to regenerate `schema.json`.

```typescript
// publish-schema.ts (run from atomic-skills repo)
import { zodToJsonSchema } from 'zod-to-json-schema'
import { writeFileSync } from 'node:fs'
import { planSchema, initiativeSchema } from './src/schemas/validators/project-status.js'

// Source: src/schemas/validators/project-status.ts in the aideck repo
// Port these schemas to atomic-skills (they are the canonical Zod definitions for
// Plan, Initiative, Task, ExitCriterion, etc.)

const schema = {
  $id: 'atomic-skills-schema',
  definitions: {
    plan: zodToJsonSchema(planSchema, { target: 'jsonSchema7', $refStrategy: 'none' }),
    initiative: zodToJsonSchema(initiativeSchema, { target: 'jsonSchema7', $refStrategy: 'none' }),
  }
}

writeFileSync('~/.aideck/consumers/atomic-skills/schema.json', JSON.stringify(schema, null, 2))
```

### What AJV validates

aiDeck loads `schema.json` at startup with `Ajv({ strict: false, allErrors: false })`. When a data file is validated (via `aideck validate <file>` or inline), it:

1. Finds the matching `dataSource` from `manifest.yaml` by glob-matching the file path.
2. Looks for `#/definitions/<dataSourceId>` in the schema (falls back to singular: strips trailing `s`).
3. Validates each record against that definition.

Implementation: `src/server/schema-validator.ts`, `src/cli/validate.ts`.

### Error format

On validation failure, the error conforms to `ErrorResponse` from `src/schemas/common.ts`:

```typescript
interface ErrorResponse {
  code: 'validation_error' | ...
  message: string       // e.g. "/status: must be equal to one of the allowed values"
  suggestion?: string   // e.g. "expected one of: pending, active, done"
  details: {
    path: string        // JSON pointer to the failing field
    keyword: string     // AJV keyword: type | enum | required | additionalProperties
    params: object
    totalErrors: number
  }
}
```

CLI output:
```
✗ invalid: data/initiatives/my-work.yaml
  /status: must be equal to one of the allowed values
  Fix: expected one of: "pending", "active", "paused", "done", "archived"
  Consumer: atomic-skills, dataSource: initiatives
```

### Example: current Zod schemas → JSON Schema

The Zod schemas to port live in `src/schemas/validators/project-status.ts`:

- `planSchema` → `definitions.plan`
- `initiativeSchema` → `definitions.initiative`
- `taskSchema` → embed inside `initiative.properties.tasks.items` (or define separately as `definitions.task`)

Key Zod types used: `z.enum`, `z.string`, `z.number.int`, `z.array`, `z.object.strict()`, `z.discriminatedUnion`, `isoTimestampSchema` (just `z.string()`), `schemaVersionSchema` (`z.literal('0.1')`).

---

## 4. Script Handler API

Script handlers are Node.js ESM modules with a default-exported async function. They are dynamically `import()`ed by aiDeck at tool-call time.

Implementation: `src/server/handlers/script.ts`

### Handler signature

```typescript
// handlers/mark-task-done.js
export default async function handler(context) {
  const { args, data, files, log } = context
  // ... your logic ...
  return { accepted: true, note: 'Intent recorded.' }
}
```

### Context object

```typescript
interface ScriptContext {
  args: Record<string, unknown>         // validated input parameters from tool call
  data: Map<string, unknown[]>          // all consumer dataSources pre-loaded
  files: {
    append(target: string, record: Record<string, unknown>): Promise<void>
    // target is relative to consumer dir (e.g. "data/inbox/2026-05-26.jsonl")
    // creates parent dirs if missing
  }
  log: {
    info(...parts: unknown[]): void     // → console.log with [script:filename] prefix
    warn(...parts: unknown[]): void
    error(...parts: unknown[]): void
  }
}
```

**`args`**: The raw arguments from the MCP tool call. AJV validates against the `input` schema in manifest; what arrives in `args` passed that validation. Cast to your types.

**`data`**: A `Map<string, unknown[]>` keyed by data source id. All consumer data sources are pre-loaded before the handler runs. Example: `data.get('initiatives')` returns all initiative records as plain objects (frontmatter parsed). This is a snapshot taken at call time — it won't reflect file changes that happen mid-execution.

**`files.append`**: Append a single JSONL record to a path within the consumer directory. Path must be relative to the consumer dir. aiDeck creates parent directories if needed. Use this for writing intent records, verifier results, etc.

**`log`**: Write to stderr. No-op in test mode (future). Prefix `[script:handlers/your-file.js]` is automatic.

**Timeout**: 30 seconds. Exceeded → `script_error: ... timed out after 30000ms`.

**Return value**: Must be a JSON-serializable plain object. This becomes the MCP tool response body.

**Error handling**: Throw an `Error` (or any subclass) to signal failure. aiDeck wraps it in `ErrorResponse { code: 'internal_error', message: 'script_error: ...' }`. Do not throw strings.

### Example handler: mark_task_done

```typescript
// handlers/mark-task-done.js
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

// consumerDir is NOT in context — use files.append for writes aiDeck owns,
// and import node:fs directly for entity file writes that atomic-skills owns.
// The consumerDir for your handlers is process.env.AIDECK_CONSUMER_DIR (set
// by the runtime before invoking the script — see note below).

export default async function handler({ args, data, files, log }) {
  const { initiativeSlug, taskId, by = 'ai' } = args
  const now = new Date().toISOString()

  // Read the initiative from pre-loaded data (snapshot)
  const initiatives = data.get('initiatives') ?? []
  const initiative = initiatives.find(i => i.slug === initiativeSlug)
  if (!initiative) {
    throw new Error(`initiative not found: ${initiativeSlug}`)
  }

  // Check precondition: task must exist
  const tasks = initiative.tasks ?? []
  const task = tasks.find(t => t.id === taskId)
  if (!task) {
    throw new Error(`task ${taskId} not found in initiative ${initiativeSlug}`)
  }

  // Append intent to inbox (aiDeck writes via files.append)
  const isoDay = now.slice(0, 10)
  await files.append(`data/inbox/${isoDay}.jsonl`, {
    schemaVersion: '0.1',
    kind: 'intent',
    intentId: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    operation: 'mark_task_done',
    target: { initiativeSlug, taskId },
    args: args.verifierResultId ? { verifierResultId: args.verifierResultId } : {},
    by,
    requestedAt: now,
  })

  // Compute phaseCompleteHint
  const remaining = tasks.filter(t => t.status !== 'done' && t.id !== taskId).length
  const result = {
    accepted: true,
    note: 'Intent recorded; consumer skill applies.',
  }
  if (remaining === 0) {
    result.phaseCompleteHint = { initiativeSlug, remaining, lastTaskId: taskId }
  }
  log.info(`mark_task_done: ${initiativeSlug}/${taskId}, remaining=${remaining}`)
  return result
}
```

**Note on consumer dir access**: Script handlers run with `cwd` set to the consumer directory (`~/.aideck/consumers/atomic-skills/`). Use `process.cwd()` to get the absolute consumer dir path when you need to read/write entity files directly (which atomic-skills owns per Iron Law 1 — aiDeck never writes entity files, but the atomic-skills skill running inside the handler context can).

---

## 5. Data Directory Layout

### New location (v2)

```
~/.aideck/
  consumers/
    atomic-skills/
      manifest.yaml
      schema.json
      handlers/
        mark-task-done.js
        verify-exit-gate.js
        get-next-action.js
        get-dependencies.js
        health.js
        pop-frame.js
        promote-parked.js
      components/           # optional custom Vue/Web Components
      data/
        plans/
          my-plan.yaml      # frontmatter + markdown body
        initiatives/
          my-initiative.yaml
        inbox/
          2026-05-26.jsonl  # append-only intent records
        annotations/
          2026-05-26.jsonl
        highlights/
          2026-05-26.jsonl
```

Consumer dir: `~/.aideck/consumers/atomic-skills/` (the `baseDir` from `src/cli/init-consumer.ts`).

### Old location (v0.1)

```
<project-root>/
  .atomic-skills/
    plans/*.yaml
    initiatives/*.yaml
    inbox/*.jsonl
    annotations/*.jsonl
    highlights/*.jsonl
```

The v0.1 `consumerRoot()` function (`src/server/writers/paths.ts`) resolved this as `<rootDir>/.atomic-skills/<consumerId>/`. The default consumer id was `project-status`, with a flat-layout fallback where `plans/` and `initiatives/` lived directly under `.atomic-skills/` (not under a consumer subdirectory).

### How to structure data files

`manifest.yaml` dataSources define what aiDeck reads. The paths are relative to the consumer dir. You have full control of the `data/` tree. Recommended layout matching v0.1 semantics:

```yaml
dataSources:
  - id: plans
    path: "data/plans/*.yaml"
    format: frontmatter
  - id: initiatives
    path: "data/initiatives/*.yaml"
    format: frontmatter
  - id: inbox
    path: "data/inbox/*.jsonl"
    format: jsonl
```

This maps old `.atomic-skills/plans/*.yaml` → new `~/.aideck/consumers/atomic-skills/data/plans/*.yaml`.

### Multi-project support

aiDeck does not impose project-level structure inside `data/`. If atomic-skills needs per-project data, organize it yourself:

```
data/
  projects/
    proj-a/
      plans/*.yaml
      initiatives/*.yaml
    proj-b/
      plans/*.yaml
      initiatives/*.yaml
```

Update manifest `dataSources` paths accordingly:
```yaml
  - id: plans
    path: "data/projects/*/plans/*.yaml"   # Note: single-segment '*' only
    format: frontmatter
```

The glob expander supports a single `*` per path (not `**`). For multi-level traversal, add multiple data sources.

---

## 6. MCP Tool Names (Breaking Changes)

### v0.1 tool names (being removed)

All 18 v0.1 tools with `aideck_` prefix and no namespace:

```
aideck_get_state            aideck_get_plan
aideck_get_phase            aideck_get_initiative
aideck_get_task             aideck_get_next_action
aideck_get_dependencies     aideck_mark_task_done
aideck_update_initiative_status  aideck_update_next_action
aideck_push_frame           aideck_pop_frame
aideck_park_item            aideck_emerge_item
aideck_promote_parked       aideck_add_task
aideck_verify_exit_gate     aideck_annotate
aideck_highlight            aideck_record_decision
aideck_inbox                aideck_list_consumers
aideck_health               aideck_schema_version
```

### v2 generic tools (always available)

These replace most of the read/write tools:

| Tool | Replaces | Notes |
|---|---|---|
| `aideck_read` | `aideck_get_plan`, `aideck_get_initiative`, `aideck_get_task`, `aideck_get_state` | Read from any declared dataSource; optionally filter by slug |
| `aideck_list` | `aideck_get_state` (list mode) | List records with optional key=value filter |
| `aideck_write` | `aideck_annotate`, `aideck_highlight` (raw) | Append JSONL to `data/` path |
| `aideck_list_consumers` | same name | Now uses manifest registry, not `.atomic-skills/` scan |
| `aideck_health` | same name | Now returns server health (version, uptime, consumer count), not domain health |
| `aideck_schema_version` | same name | Unchanged semantics |

`aideck_read` input: `{ consumer: string; dataSource: string; slug?: string }`.
`aideck_list` input: `{ consumer: string; dataSource: string; filter?: Record<string, unknown> }`.
`aideck_write` input: `{ consumer: string; target: string; record: Record<string, unknown> }` — target must start with `data/`.

Implementation: `src/mcp/tools/generic.ts`

### v2 consumer-declared tools

Consumer tools are registered as `aideck_<mcpNamespace>_<tool.name>`. For `mcpNamespace: atomic_skills`:

| New tool name | Replaces v0.1 tool | Handler type |
|---|---|---|
| `aideck_atomic_skills_mark_task_done` | `aideck_mark_task_done` | script |
| `aideck_atomic_skills_verify_exit_gate` | `aideck_verify_exit_gate` | script |
| `aideck_atomic_skills_get_next_action` | `aideck_get_next_action` | script |
| `aideck_atomic_skills_get_dependencies` | `aideck_get_dependencies` | script |
| `aideck_atomic_skills_health` | `aideck_health` (domain) | script |
| `aideck_atomic_skills_pop_frame` | `aideck_pop_frame` | script |
| `aideck_atomic_skills_promote_parked` | `aideck_promote_parked` | script |

Tools that become generic reads (no script needed):

| Old tool | New approach |
|---|---|
| `aideck_get_plan` | `aideck_read { consumer: "atomic-skills", dataSource: "plans", slug: "..." }` |
| `aideck_get_initiative` | `aideck_read { consumer: "atomic-skills", dataSource: "initiatives", slug: "..." }` |
| `aideck_get_state` | `aideck_list { consumer: "atomic-skills", dataSource: "plans" }` + same for initiatives |
| `aideck_get_task` | `aideck_read` initiative → find task in response |
| `aideck_get_phase` | `aideck_read` plan → find phase in response |
| `aideck_update_initiative_status` | write intent via `aideck_atomic_skills_mark_task_done` or declare a `file-mutation` handler |
| `aideck_push_frame` / `aideck_park_item` / `aideck_emerge_item` / `aideck_add_task` | declare as `file-mutation` handlers (append JSONL intent) |
| `aideck_annotate` | `aideck_write { target: "data/annotations/..." }` |
| `aideck_highlight` | `aideck_write { target: "data/highlights/..." }` |
| `aideck_inbox` | `aideck_list { consumer: "atomic-skills", dataSource: "inbox" }` |

### The 7 tools requiring script handlers

These cannot be replaced by declarative YAML because they involve multi-entity reads, graph traversal, or conditional logic.

**1. `mark_task_done`** — reads initiative to count remaining tasks, computes `phaseCompleteHint`, appends intent to inbox JSONL.
Port from: `src/mcp/tools/mutate.ts` (`aideck_mark_task_done` handler)

**2. `verify_exit_gate`** — reads plan/initiative to locate criterion, runs shell verifier (optional), scans all prior `verifier_result` records from inbox to compute `allGatesMet`, appends new result.
Port from: `src/mcp/tools/gates.ts` (the entire file; includes `readPriorVerifierResults` helper)

**3. `get_next_action`** — traverses plan phases, finds `currentPhase`, matches to an active initiative, finds first unblocked pending task via `firstUnblockedPendingTask`.
Port from: `src/server/projections/next-action.ts` + `src/mcp/tools/read.ts` (`aideck_get_next_action` handler)

**4. `get_dependencies`** — two modes: `scope: 'phase'` reads the plan and checks sibling phase statuses; `scope: 'task'` reads the initiative and resolves `task.blockedBy` against sibling task statuses.
Port from: `src/mcp/tools/dependencies.ts`

**5. `health`** — cross-entity aggregation: iterates all initiatives for stale (>7 days since lastUpdated), unmet exit gates, all plans for unmet phase gates, all highlight JSONL files for unacknowledged items, inbox JSONL for unconsumed intents.
Port from: `src/server/projections/health.ts` (`buildHealthReport`)

**6. `pop_frame`** — reads initiative to verify stack is non-empty, appends `pop_frame` intent to inbox.
Port from: `src/mcp/tools/mutate.ts` (`aideck_pop_frame` handler)

**7. `promote_parked`** — reads initiative to verify the parked item exists by title or index, appends `promote_parked` intent to inbox.
Port from: `src/mcp/tools/mutate.ts` (`aideck_promote_parked` handler)

---

## 7. Custom Component Registration

For atomic-skills-specific UI that doesn't map to any built-in widget (phase card with dependency graph, initiative status timeline, etc.), ship custom components.

### Registration

```yaml
# manifest.yaml
components:
  - type: phase-card
    source: components/phase-card.js   # relative to consumer dir
```

After registration, `phase-card` is available in `widget:` declarations as `atomic-skills/phase-card`.

### Component format

aiDeck loads components as ES modules. The default export must be a Web Component class (registered with `customElements.define`) or a Vue component object.

```javascript
// components/phase-card.js — Web Component
export default class PhaseCard extends HTMLElement {
  static get observedAttributes() { return ['source', 'config'] }

  connectedCallback() {
    this.render()
  }

  attributeChangedCallback() {
    this.render()
  }

  render() {
    const source = JSON.parse(this.getAttribute('source') ?? '{}')
    const config = JSON.parse(this.getAttribute('config') ?? '{}')
    // source.records: Record<string, unknown>[]
    // config: whatever you put in manifest widget.config
    this.innerHTML = `<div class="phase-card">...</div>`
  }
}

customElements.define('atomic-skills-phase-card', PhaseCard)
```

### Props contract

aiDeck passes two attributes to every custom component:

- `source`: JSON-serialized `{ records: Record<string, unknown>[], dataSourceId: string }`
- `config`: JSON-serialized widget config from manifest

If using Vue SFC (compile to JS first), implement the same interface via `defineComponent` props.

---

## 8. Migration Checklist

Work from `~/.aideck/consumers/atomic-skills/`. Bootstrap with:

```bash
aideck init-consumer --id atomic-skills --title "Project Status" --mcpNamespace atomic_skills
```

This creates the directory scaffold. Then replace the generated files with the real content.

### Step-by-step

- [ ] **Create consumer directory** — `~/.aideck/consumers/atomic-skills/`
- [ ] **Write manifest.yaml** — Use the complete example in Section 2. Include all pages, dataSources, and 7 tool declarations.
- [ ] **Publish schema.json** — Run `zod-to-json-schema` on `planSchema` and `initiativeSchema` from `src/schemas/validators/project-status.ts`. Put result in `~/.aideck/consumers/atomic-skills/schema.json` with `$id: "atomic-skills-schema"` and top-level `definitions` key.
- [ ] **Migrate data files** — Copy existing `.atomic-skills/plans/*.yaml` → `data/plans/*.yaml`, same for initiatives, inbox, annotations, highlights.
- [ ] **Write handler: `mark-task-done.js`** — Port from `src/mcp/tools/mutate.ts`. The intent format (`IntentRecord`) is in `src/schemas/common.ts`.
- [ ] **Write handler: `verify-exit-gate.js`** — Port from `src/mcp/tools/gates.ts`. Include `readPriorVerifierResults` logic and `VerifierResult` record format from `src/schemas/common.ts`.
- [ ] **Write handler: `get-next-action.js`** — Port from `src/server/projections/next-action.ts`. Reads from `data.get('plans')` and `data.get('initiatives')` (pre-loaded in context).
- [ ] **Write handler: `get-dependencies.js`** — Port from `src/mcp/tools/dependencies.ts`.
- [ ] **Write handler: `health.js`** — Port from `src/server/projections/health.ts`. Use `data.get(...)` instead of filesystem reads for plan/initiative data; keep filesystem reads for inbox/highlights JSONL (not in data map unless you declare them as dataSources — they are, so use data map).
- [ ] **Write handler: `pop-frame.js`** — Port from `src/mcp/tools/mutate.ts` (`aideck_pop_frame` handler).
- [ ] **Write handler: `promote-parked.js`** — Port from `src/mcp/tools/mutate.ts` (`aideck_promote_parked` handler).
- [ ] **Build custom components** (optional) — Phase card, initiative detail, exit gate checklist. Register in manifest `components[]`.
- [ ] **Update skill prompts** — Replace all `aideck_get_plan` → `aideck_read`, `aideck_mark_task_done` → `aideck_atomic_skills_mark_task_done`, etc. See full mapping in Section 6.
- [ ] **Validate with aideck CLI**:
  ```bash
  aideck validate ~/.aideck/consumers/atomic-skills/data/plans/my-plan.yaml
  aideck validate ~/.aideck/consumers/atomic-skills/data/initiatives/my-init.yaml
  ```
  Expected: `✓ valid: ...`
- [ ] **Smoke test serve**:
  ```bash
  aideck serve
  # open http://localhost:7400 — should show "Project Status" consumer
  ```
- [ ] **Smoke test MCP**:
  ```bash
  aideck mcp
  # then call aideck_list_consumers → should list atomic-skills
  # call aideck_read { consumer: "atomic-skills", dataSource: "plans" }
  # call aideck_atomic_skills_get_next_action {}
  ```

### Files to port (quick reference)

| v0.1 file | What to migrate to |
|---|---|
| `src/schemas/validators/project-status.ts` | Port Zod schemas → publish `schema.json` via `zod-to-json-schema` |
| `src/schemas/common.ts` | Copy `IntentRecord`, `VerifierResult`, `IntentApplication` types for use in handlers |
| `src/mcp/tools/mutate.ts` | Port 7 tool handlers to `handlers/*.js` |
| `src/mcp/tools/gates.ts` | Port to `handlers/verify-exit-gate.js` |
| `src/mcp/tools/dependencies.ts` | Port to `handlers/get-dependencies.js` |
| `src/server/projections/next-action.ts` | Port to `handlers/get-next-action.js` |
| `src/server/projections/health.ts` | Port to `handlers/health.js` |
| `src/server/writers/intents.ts` | Port `appendIntent` logic to inline in handlers (or copy as a shared helper) |

---

## Notes on Intent Format

The v0.1 intent pattern (write to inbox JSONL → consumer skill reads + applies → writes `intent_application` back) is **preserved in v2**. aiDeck never writes entity files. Script handlers write intent records to `data/inbox/*.jsonl` via `files.append(...)`. The atomic-skills skill (running outside aiDeck) tails the inbox, applies mutations to `*.yaml` entity files, and appends `intent_application` acknowledgements.

The intent JSONL format (`IntentRecord`) is defined in `src/schemas/common.ts`. Copy that type definition to your handlers — it is stable across versions. The required fields are:

```jsonl
{"schemaVersion":"0.1","kind":"intent","intentId":"<uuid>","operation":"mark_task_done","target":{"initiativeSlug":"...","taskId":"..."},"args":{},"by":"ai","requestedAt":"<iso>"}
```

The `intent_application` acknowledgement format (`IntentApplication`) is also in `src/schemas/common.ts`.
