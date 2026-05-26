# aiDeck v2 — Generic Dashboard Runtime: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform aiDeck from a hardcoded atomic-skills dashboard into a generic AI dashboard runtime where consumers (plugins) own everything beyond the home page.

**Architecture:** Consumer-driven. Each consumer ships a `manifest.yaml` (pages, widgets, tools), `schema.json` (AJV validation), data files, and optional handlers/components. aiDeck provides the runtime: file watching, SSE streaming, layout engine, 25 built-in widgets, 6 generic MCP tools, and consumer-declared tool registration.

**Tech Stack:** TypeScript (strict, ESM), Hono (HTTP), chokidar (watcher), AJV (validation), Vue 3 (frontend), Vite (build), vitest (tests).

**Spec:** `docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md`

---

## File Structure

### Keep as-is (direct reuse)
```
src/server/event-bus.ts            # EventBus — emit/subscribe/replay (76 LOC)
src/server/cors.ts                 # CORS middleware for localhost (64 LOC)
src/server/project-registry.ts     # Multi-project registration (150 LOC)
src/server/routes/sse.ts           # SSE streaming with project filter (93 LOC)
src/server/writers/jsonl-append.ts # Atomic JSONL append (42 LOC)
src/server/parsers/frontmatter.ts  # splitFrontmatter (42 LOC)
src/server/parsers/jsonl.ts        # JSONL line parser (existing)
src/schemas/validators/result.ts   # Result<T, E> type (existing)
src/schemas/common.ts              # ErrorResponse, SchemaVersion (existing)
src/mcp/registry.ts                # ToolRegistry (96 LOC)
```

### Create new
```
src/server/consumer-registry.ts       # F0: scan ~/.aideck/consumers/*/manifest.yaml
src/server/manifest-loader.ts         # F0: parse + validate manifest.yaml
src/server/manifest-schema.ts         # F0: Zod schema for manifest.yaml
src/server/schema-validator.ts        # F0: AJV wrapper with LLM-friendly errors
src/server/data-source-reader.ts      # F0: read data per manifest dataSources[]
src/server/consumer-watcher.ts        # F0: generic chokidar dispatch per consumer
src/server/handlers/                  # F1: handler execution engine
  file-mutation.ts                    #   declarative field set / JSONL append
  shell-exec.ts                       #   shell command with timeout
  composite.ts                        #   chain multiple handlers
  script.ts                           #   JS module with sandboxed context
  template.ts                         #   {{ var }} substitution for handlers
src/server/routes/api-v2.ts           # F1: generic REST endpoints
src/mcp/tools/generic.ts              # F1: 6 Tier 1 tools
src/mcp/tools/consumer-tools.ts       # F1: Tier 2 dynamic registration
src/cli/validate.ts                   # F2: aideck validate <file>
src/cli/init-consumer.ts              # F2: aideck init-consumer scaffold
src/client/                           # F3-F4: Vue 3 SPA
  App.vue                             #   root component with router
  main.ts                             #   entry point
  router.ts                           #   dynamic routes per consumer
  api.ts                              #   fetch client for REST API
  composables/
    useConsumers.ts                    #   consumer list + SSE updates
    useDataSource.ts                   #   fetch + cache data from API
    useSse.ts                          #   SSE event stream composable
  layouts/
    SectionsLayout.vue                 #   flowing sections layout
    GridLayout.vue                     #   12-column CSS grid
    SingleLayout.vue                   #   full-page single widget
  pages/
    HomePage.vue                       #   consumer card list
    ConsumerPage.vue                   #   manifest-driven page renderer
  components/
    WidgetRenderer.vue                 #   dynamic widget resolver
    widgets/                           #   25 built-in widgets (1 file each)
      StatWidget.vue
      TableWidget.vue
      ListWidget.vue
      KeyValueWidget.vue
      LineChartWidget.vue
      BarChartWidget.vue
      GaugeWidget.vue
      ProgressBarWidget.vue
      MarkdownWidget.vue
      CodeBlockWidget.vue
      TabsWidget.vue
      GridColumnsWidget.vue
      AccordionWidget.vue
      ContainerWidget.vue
      BadgeWidget.vue
      KanbanBoardWidget.vue
      TimelineWidget.vue
      LogFeedWidget.vue
      TreeViewWidget.vue
      CardWidget.vue
      TagChipWidget.vue
      BreadcrumbWidget.vue
      DrawerWidget.vue
      HeaderNavWidget.vue
      SearchFilterWidget.vue
      GraphDagWidget.vue
  styles/
    tokens.css                         #   CSS custom properties (dark theme)
    reset.css                          #   minimal reset
src/demo/                              # F5: demo consumer
  manifest.yaml                        #   3 sample pages, all layout modes
  schema.json                          #   demo data schema
  data/                                #   sample YAML/JSONL files
  seed-demo.ts                         #   copy demo to ~/.aideck/consumers/aideck-demo/
```

### Modify (surgery)
```
src/server/watcher.ts              # Keep chokidar core, rewrite dispatch → consumer-generic
src/server/writers/paths.ts        # Keep utils, update classifyFile for ~/.aideck/ layout
src/server/routes/api.ts           # Keep health/projects, replace state endpoints
src/mcp/server.ts                  # Keep factory, swap built-in tool set
src/cli.ts                         # Add validate + init-consumer subcommands
package.json                       # Add ajv, better-ajv-errors, vue, vite deps
tsconfig.server.json               # Ensure paths alias
vite.config.ts                     # Frontend build config (new)
```

### Delete (moved to consumer)
```
src/schemas/validators/project-status.ts  # → atomic-skills consumer schema.json
src/schemas/validators/normalize.ts       # → atomic-skills consumer handler
src/schemas/project-status.ts             # → atomic-skills consumer types
src/server/parsers/project-status.ts      # → atomic-skills consumer handler
src/server/projections/                   # → atomic-skills consumer handlers
src/mcp/tools/read.ts                     # → replaced by generic.ts
src/mcp/tools/mutate.ts                   # → replaced by generic.ts + consumer tools
src/mcp/tools/gates.ts                    # → atomic-skills consumer handler
src/mcp/tools/feedback.ts                 # → replaced by generic write
src/mcp/tools/dependencies.ts             # → atomic-skills consumer handler
src/mcp/tools/meta.ts                     # → replaced by generic.ts
```

---

## Phase F0: Core Runtime

**Goal:** Build the foundation: ConsumerRegistry, manifest loader, schema validator (AJV), generic file watcher, data source parsing.

**Exit gates:** ConsumerRegistry scans manifests, AJV validates data, watcher dispatches generically.

### Task 1: Manifest Zod Schema

**Files:**
- Create: `src/server/manifest-schema.ts`
- Test: `tests/unit/server/manifest-schema.test.ts`

- [ ] **Step 1: Write failing test for minimal manifest**

```typescript
// tests/unit/server/manifest-schema.test.ts
import { describe, expect, it } from 'vitest'
import { parseManifest } from '../../src/server/manifest-schema.js'

describe('parseManifest', () => {
  const minimal = {
    schemaVersion: '0.1',
    id: 'test-consumer',
    mcpNamespace: 'test_consumer',
    title: 'Test Consumer',
    dataSources: [],
    pages: [],
  }

  it('accepts a minimal valid manifest', () => {
    const result = parseManifest(minimal)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe('test-consumer')
      expect(result.value.mcpNamespace).toBe('test_consumer')
    }
  })

  it('rejects missing schemaVersion', () => {
    const { schemaVersion, ...rest } = minimal
    const result = parseManifest(rest)
    expect(result.ok).toBe(false)
  })

  it('rejects invalid mcpNamespace (hyphens not allowed)', () => {
    const result = parseManifest({ ...minimal, mcpNamespace: 'test-consumer' })
    expect(result.ok).toBe(false)
  })

  it('validates mcpNamespace regex: [a-z][a-z0-9_]{0,31}', () => {
    const result = parseManifest({ ...minimal, mcpNamespace: '1starts_with_number' })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/server/manifest-schema.test.ts`
Expected: FAIL — `parseManifest` not found

- [ ] **Step 3: Implement manifest schema**

```typescript
// src/server/manifest-schema.ts
import { z } from 'zod'
import { type Result, parseOrError } from '../schemas/validators/index.js'
import type { ErrorResponse } from '../schemas/common.js'

const MCP_NAMESPACE_RE = /^[a-z][a-z0-9_]{0,31}$/

const dataSourceSchema = z.object({
  id: z.string(),
  path: z.string(),
  format: z.enum(['yaml', 'frontmatter', 'json', 'jsonl']),
  schema: z.record(z.unknown()).optional(),
})

const responsiveOverrideSchema = z.object({
  colSpan: z.number().int().min(1).max(12).optional(),
  colStart: z.number().int().min(1).max(12).optional(),
  rowSpan: z.number().int().min(1).optional(),
  visible: z.boolean().optional(),
}).strict()

const widgetBindingSchema = z.object({
  widget: z.string(),
  colSpan: z.number().int().min(1).max(12).optional(),
  colStart: z.number().int().min(1).max(12).optional(),
  rowSpan: z.number().int().min(1).optional(),
  minColSpan: z.number().int().min(1).max(12).optional(),
  maxColSpan: z.number().int().min(1).max(12).optional(),
  source: z.union([
    z.object({ ref: z.string(), filter: z.record(z.unknown()).optional(), param: z.string().optional() }),
    z.undefined(),
  ]).optional(),
  config: z.record(z.unknown()).optional(),
  responsive: z.object({
    sm: responsiveOverrideSchema.optional(),
    md: responsiveOverrideSchema.optional(),
    lg: responsiveOverrideSchema.optional(),
    xl: responsiveOverrideSchema.optional(),
  }).optional(),
})

const sectionSchema = z.object({
  title: z.string().optional(),
  collapsible: z.boolean().optional(),
  collapsed: z.boolean().optional(),
  columns: z.number().int().min(1).max(12).optional(),
  gap: z.number().optional(),
  rowGap: z.number().optional(),
  colGap: z.number().optional(),
  visible: z.string().optional(),
  widgets: z.array(widgetBindingSchema),
})

const pageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  default: z.boolean().optional(),
  route: z.string().optional(),
  layout: z.enum(['sections', 'grid', 'single']),
  // sections layout
  sections: z.array(sectionSchema).optional(),
  // grid layout
  columns: z.number().int().min(1).max(12).optional(),
  rowHeight: z.number().optional(),
  gap: z.number().optional(),
  widgets: z.array(widgetBindingSchema).optional(),
  // single layout
  widget: z.string().optional(),
  source: z.union([
    z.object({ ref: z.string(), filter: z.record(z.unknown()).optional(), param: z.string().optional() }),
    z.undefined(),
  ]).optional(),
  config: z.record(z.unknown()).optional(),
})

const handlerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('file-mutation'),
    target: z.string(),
    operation: z.enum(['set', 'append']),
    field: z.string().optional(),
    record: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal('shell-exec'),
    command: z.string(),
    timeout: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('composite'),
    steps: z.array(z.lazy(() => handlerSchema)),
  }),
  z.object({
    type: z.literal('script'),
    source: z.string(),
  }),
])

const toolDeclarationSchema = z.object({
  name: z.string(),
  description: z.string(),
  input: z.object({
    type: z.literal('object'),
    required: z.array(z.string()).optional(),
    properties: z.record(z.unknown()),
  }),
  handler: handlerSchema,
})

const customComponentSchema = z.object({
  type: z.string(),
  source: z.string(),
})

const navSchema = z.object({
  style: z.enum(['tabs', 'sidebar']).optional(),
  showIcons: z.boolean().optional(),
}).optional()

export const manifestSchema = z.object({
  schemaVersion: z.literal('0.1'),
  id: z.string().min(1).max(64),
  mcpNamespace: z.string().regex(MCP_NAMESPACE_RE, 'must match [a-z][a-z0-9_]{0,31}'),
  title: z.string(),
  icon: z.string().optional(),
  dataSources: z.array(dataSourceSchema),
  nav: navSchema,
  pages: z.array(pageSchema),
  tools: z.array(toolDeclarationSchema).optional(),
  components: z.array(customComponentSchema).optional(),
})

export type Manifest = z.infer<typeof manifestSchema>
export type DataSourceDecl = z.infer<typeof dataSourceSchema>
export type PageDecl = z.infer<typeof pageSchema>
export type WidgetBinding = z.infer<typeof widgetBindingSchema>
export type ToolDeclaration = z.infer<typeof toolDeclarationSchema>
export type HandlerDecl = z.infer<typeof handlerSchema>

export function parseManifest(raw: unknown): Result<Manifest, ErrorResponse> {
  return parseOrError(manifestSchema, raw, { entity: 'manifest' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/server/manifest-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Add tests for dataSources, pages, tools, components**

```typescript
// append to tests/unit/server/manifest-schema.test.ts

describe('dataSources', () => {
  const base = {
    schemaVersion: '0.1' as const,
    id: 'test',
    mcpNamespace: 'test',
    title: 'Test',
    pages: [],
  }

  it('accepts valid dataSources with all formats', () => {
    const result = parseManifest({
      ...base,
      dataSources: [
        { id: 'plans', path: 'data/plans/*.yaml', format: 'frontmatter' },
        { id: 'tasks', path: 'data/tasks.yaml', format: 'yaml' },
        { id: 'inbox', path: 'data/inbox/*.jsonl', format: 'jsonl' },
        { id: 'config', path: 'data/config.json', format: 'json' },
      ],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects unknown format', () => {
    const result = parseManifest({
      ...base,
      dataSources: [{ id: 'x', path: 'x', format: 'xml' }],
    })
    expect(result.ok).toBe(false)
  })
})

describe('pages', () => {
  const base = {
    schemaVersion: '0.1' as const,
    id: 'test',
    mcpNamespace: 'test',
    title: 'Test',
    dataSources: [],
  }

  it('accepts sections layout with widgets', () => {
    const result = parseManifest({
      ...base,
      pages: [{
        slug: 'overview',
        title: 'Overview',
        layout: 'sections',
        sections: [{
          title: 'Stats',
          widgets: [{ widget: 'stat', colSpan: 3 }],
        }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('accepts grid layout', () => {
    const result = parseManifest({
      ...base,
      pages: [{
        slug: 'board',
        title: 'Board',
        layout: 'grid',
        columns: 12,
        widgets: [{ widget: 'kanban-board', colSpan: 12, colStart: 1 }],
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('accepts single layout', () => {
    const result = parseManifest({
      ...base,
      pages: [{
        slug: 'detail',
        title: 'Detail',
        layout: 'single',
        widget: 'tree-view',
        source: { ref: 'plans', param: 'planSlug' },
      }],
    })
    expect(result.ok).toBe(true)
  })
})

describe('tools', () => {
  const base = {
    schemaVersion: '0.1' as const,
    id: 'test',
    mcpNamespace: 'test',
    title: 'Test',
    dataSources: [],
    pages: [],
  }

  it('accepts file-mutation handler', () => {
    const result = parseManifest({
      ...base,
      tools: [{
        name: 'update_status',
        description: 'Update task status',
        input: { type: 'object', required: ['taskId'], properties: { taskId: { type: 'string' } } },
        handler: { type: 'file-mutation', target: 'data/inbox/{{ isoDate }}.jsonl', operation: 'append', record: { kind: 'status_change' } },
      }],
    })
    expect(result.ok).toBe(true)
  })

  it('accepts script handler', () => {
    const result = parseManifest({
      ...base,
      tools: [{
        name: 'mark_done',
        description: 'Mark task done',
        input: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
        handler: { type: 'script', source: 'handlers/mark-done.js' },
      }],
    })
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 6: Run full test suite, commit**

Run: `npm test -- tests/unit/server/manifest-schema.test.ts`
Expected: ALL PASS

```bash
git add src/server/manifest-schema.ts tests/unit/server/manifest-schema.test.ts
git commit -m "feat(f0): manifest Zod schema with validation"
```

---

### Task 2: Manifest Loader (file I/O)

**Files:**
- Create: `src/server/manifest-loader.ts`
- Test: `tests/unit/server/manifest-loader.test.ts`
- Test fixture: `tests/fixtures/consumers/valid-consumer/manifest.yaml`

- [ ] **Step 1: Create test fixture**

```yaml
# tests/fixtures/consumers/valid-consumer/manifest.yaml
schemaVersion: '0.1'
id: valid-consumer
mcpNamespace: valid_consumer
title: 'Valid Test Consumer'

dataSources:
  - id: items
    path: 'data/items.yaml'
    format: yaml

pages:
  - slug: overview
    title: 'Overview'
    layout: sections
    default: true
    sections:
      - title: 'Items'
        widgets:
          - widget: table
            colSpan: 12
            source: { ref: items }
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/unit/server/manifest-loader.test.ts
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { loadManifest } from '../../src/server/manifest-loader.js'

const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'consumers')

describe('loadManifest', () => {
  it('loads and parses a valid manifest.yaml', async () => {
    const result = await loadManifest(join(FIXTURES, 'valid-consumer'))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe('valid-consumer')
      expect(result.value.dataSources).toHaveLength(1)
      expect(result.value.pages).toHaveLength(1)
    }
  })

  it('returns error for missing directory', async () => {
    const result = await loadManifest('/nonexistent/path')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('io_error')
  })

  it('returns error for missing manifest.yaml', async () => {
    const result = await loadManifest(join(FIXTURES))
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Implement loader**

```typescript
// src/server/manifest-loader.ts
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err } from '../schemas/validators/index.js'
import { type Manifest, parseManifest } from './manifest-schema.js'

export async function loadManifest(consumerDir: string): Promise<Result<Manifest, ErrorResponse>> {
  const manifestPath = join(consumerDir, 'manifest.yaml')
  let raw: string
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch (cause) {
    return err({
      code: 'io_error',
      message: `Failed to read manifest: ${manifestPath}`,
      details: { path: manifestPath, cause: String(cause) },
    })
  }

  let parsed: unknown
  try {
    parsed = parseYaml(raw)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `YAML syntax error in ${manifestPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
      suggestion: 'Fix YAML syntax in manifest.yaml',
    })
  }

  return parseManifest(parsed)
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npm test -- tests/unit/server/manifest-loader.test.ts`

```bash
git add src/server/manifest-loader.ts tests/unit/server/manifest-loader.test.ts tests/fixtures/consumers/
git commit -m "feat(f0): manifest loader reads and validates manifest.yaml"
```

---

### Task 3: ConsumerRegistry

**Files:**
- Create: `src/server/consumer-registry.ts`
- Test: `tests/unit/server/consumer-registry.test.ts`
- Fixture: `tests/fixtures/consumers/broken-consumer/manifest.yaml` (invalid YAML)

- [ ] **Step 1: Create broken fixture for error path**

```yaml
# tests/fixtures/consumers/broken-consumer/manifest.yaml
schemaVersion: '0.1'
id: broken
# missing required: mcpNamespace, title, dataSources, pages
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/consumer-registry.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createConsumerRegistry } from '../../src/server/consumer-registry.js'

describe('ConsumerRegistry', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-test-'))
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir)

    // valid consumer
    const validDir = join(consumersDir, 'alpha')
    await mkdir(join(validDir, 'data'), { recursive: true })
    await writeFile(join(validDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: alpha
mcpNamespace: alpha
title: Alpha Consumer
dataSources:
  - { id: items, path: 'data/items.yaml', format: yaml }
pages:
  - { slug: home, title: Home, layout: sections, sections: [] }
`)

    // another valid consumer
    const betaDir = join(consumersDir, 'beta')
    await mkdir(join(betaDir, 'data'), { recursive: true })
    await writeFile(join(betaDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: beta
mcpNamespace: beta
title: Beta Consumer
dataSources: []
pages: []
`)

    // broken consumer (missing fields)
    const brokenDir = join(consumersDir, 'broken')
    await mkdir(brokenDir, { recursive: true })
    await writeFile(join(brokenDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: broken
`)

    return async () => { await rm(baseDir, { recursive: true, force: true }) }
  })

  it('scans and registers all valid consumers', async () => {
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.list()).toHaveLength(2)
    expect(registry.get('alpha')).toBeDefined()
    expect(registry.get('beta')).toBeDefined()
  })

  it('skips broken consumers and records errors', async () => {
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.get('broken')).toBeUndefined()
    expect(registry.errors()).toHaveLength(1)
    expect(registry.errors()[0].consumerId).toBe('broken')
  })

  it('returns consumer manifest by id', async () => {
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    const alpha = registry.get('alpha')
    expect(alpha?.manifest.title).toBe('Alpha Consumer')
    expect(alpha?.manifest.mcpNamespace).toBe('alpha')
  })

  it('returns empty list when consumers dir is missing', async () => {
    const registry = createConsumerRegistry('/nonexistent')
    await registry.scan()

    expect(registry.list()).toHaveLength(0)
    expect(registry.errors()).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Implement ConsumerRegistry**

```typescript
// src/server/consumer-registry.ts
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Manifest } from './manifest-schema.js'
import { loadManifest } from './manifest-loader.js'

export interface RegisteredConsumer {
  id: string
  dir: string
  manifest: Manifest
}

export interface ConsumerLoadError {
  consumerId: string
  dir: string
  message: string
}

export interface ConsumerRegistry {
  scan(): Promise<void>
  get(id: string): RegisteredConsumer | undefined
  list(): RegisteredConsumer[]
  errors(): ConsumerLoadError[]
  consumersDir(): string
}

export function createConsumerRegistry(baseDir: string): ConsumerRegistry {
  const consumers = new Map<string, RegisteredConsumer>()
  const loadErrors: ConsumerLoadError[] = []
  const cDir = join(baseDir, 'consumers')

  return {
    async scan() {
      consumers.clear()
      loadErrors.length = 0

      let entries: string[]
      try {
        entries = await readdir(cDir)
      } catch {
        return
      }

      for (const entry of entries) {
        const dir = join(cDir, entry)
        const result = await loadManifest(dir)

        if (result.ok) {
          consumers.set(result.value.id, {
            id: result.value.id,
            dir,
            manifest: result.value,
          })
        } else {
          loadErrors.push({
            consumerId: entry,
            dir,
            message: result.error.message,
          })
        }
      }
    },

    get(id: string) { return consumers.get(id) },
    list() { return [...consumers.values()] },
    errors() { return [...loadErrors] },
    consumersDir() { return cDir },
  }
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npm test -- tests/unit/server/consumer-registry.test.ts`

```bash
git add src/server/consumer-registry.ts tests/unit/server/consumer-registry.test.ts tests/fixtures/consumers/broken-consumer/
git commit -m "feat(f0): ConsumerRegistry scans and registers consumers from manifest.yaml"
```

---

### Task 4: Schema Validator (AJV)

**Files:**
- Create: `src/server/schema-validator.ts`
- Test: `tests/unit/server/schema-validator.test.ts`
- Fixture: `tests/fixtures/consumers/valid-consumer/schema.json`

- [ ] **Step 1: Create test fixture schema.json**

```json
{
  "$id": "valid-consumer-schema",
  "type": "object",
  "definitions": {
    "item": {
      "type": "object",
      "required": ["id", "title", "status"],
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "status": { "type": "string", "enum": ["pending", "active", "done"] },
        "priority": { "type": "integer", "minimum": 1, "maximum": 5 }
      },
      "additionalProperties": false
    }
  },
  "items": {
    "$ref": "#/definitions/item"
  }
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/schema-validator.test.ts
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { createSchemaValidator } from '../../src/server/schema-validator.js'

const FIXTURE_DIR = join(import.meta.dirname, '..', 'fixtures', 'consumers', 'valid-consumer')

describe('SchemaValidator', () => {
  it('loads schema.json and validates correct data', async () => {
    const validator = await createSchemaValidator(join(FIXTURE_DIR, 'schema.json'))
    expect(validator.ok).toBe(true)
    if (!validator.ok) return

    const result = validator.value.validate(
      { id: 'T-001', title: 'Test', status: 'active' },
      '#/definitions/item'
    )
    expect(result.ok).toBe(true)
  })

  it('returns LLM-friendly errors for invalid data', async () => {
    const validator = await createSchemaValidator(join(FIXTURE_DIR, 'schema.json'))
    if (!validator.ok) return

    const result = validator.value.validate(
      { id: 123, title: 'Test' },
      '#/definitions/item'
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('validation_error')
      expect(result.error.message).toContain('id')
    }
  })

  it('returns error for missing schema file', async () => {
    const result = await createSchemaValidator('/nonexistent/schema.json')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Implement schema validator**

```typescript
// src/server/schema-validator.ts
import { readFile } from 'node:fs/promises'
import Ajv from 'ajv'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err, ok } from '../schemas/validators/index.js'

export interface SchemaValidator {
  validate(data: unknown, ref: string): Result<unknown, ErrorResponse>
}

export async function createSchemaValidator(
  schemaPath: string
): Promise<Result<SchemaValidator, ErrorResponse>> {
  let raw: string
  try {
    raw = await readFile(schemaPath, 'utf8')
  } catch (cause) {
    return err({
      code: 'io_error',
      message: `Failed to read schema: ${schemaPath}`,
      details: { path: schemaPath },
    })
  }

  let schema: Record<string, unknown>
  try {
    schema = JSON.parse(raw)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `Invalid JSON in schema: ${schemaPath}`,
    })
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  try {
    ajv.addSchema(schema)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `Invalid JSON Schema in ${schemaPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
    })
  }

  return ok({
    validate(data: unknown, ref: string): Result<unknown, ErrorResponse> {
      const validate = ajv.getSchema(ref)
      if (!validate) {
        return err({
          code: 'invalid_input',
          message: `Schema ref not found: ${ref}`,
          suggestion: `Available refs in schema.json: check definitions`,
        })
      }

      const valid = validate(data)
      if (valid) return ok(data)

      const errors = validate.errors ?? []
      const firstErr = errors[0]
      const path = firstErr?.instancePath || '/'
      const message = firstErr?.message || 'validation failed'

      return err({
        code: 'validation_error',
        message: `${path}: ${message}`,
        suggestion: formatSuggestion(firstErr),
        details: {
          path,
          keyword: firstErr?.keyword,
          params: firstErr?.params,
          totalErrors: errors.length,
        },
      })
    },
  })
}

function formatSuggestion(error: { keyword?: string; params?: Record<string, unknown> } | undefined): string | undefined {
  if (!error) return undefined
  switch (error.keyword) {
    case 'type':
      return `expected ${error.params?.type}`
    case 'enum':
      return `expected one of: ${(error.params?.allowedValues as string[])?.join(', ')}`
    case 'required':
      return `missing required field: ${error.params?.missingProperty}`
    case 'additionalProperties':
      return `unexpected field: ${error.params?.additionalProperty}`
    default:
      return undefined
  }
}
```

- [ ] **Step 4: Install AJV dependency**

Run: `npm install ajv`

- [ ] **Step 5: Run tests, commit**

Run: `npm test -- tests/unit/server/schema-validator.test.ts`

```bash
git add src/server/schema-validator.ts tests/unit/server/schema-validator.test.ts tests/fixtures/consumers/valid-consumer/schema.json package.json package-lock.json
git commit -m "feat(f0): AJV schema validator with LLM-friendly errors"
```

---

### Task 5: Data Source Reader

**Files:**
- Create: `src/server/data-source-reader.ts`
- Test: `tests/unit/server/data-source-reader.test.ts`
- Fixtures: YAML, JSON, JSONL, frontmatter sample data files

- [ ] **Step 1: Create test fixtures**

```yaml
# tests/fixtures/consumers/valid-consumer/data/items.yaml
- id: T-001
  title: First task
  status: active
- id: T-002
  title: Second task
  status: done
```

```json
// tests/fixtures/consumers/valid-consumer/data/config.json
{ "theme": "dark", "maxItems": 50 }
```

```
// tests/fixtures/consumers/valid-consumer/data/inbox/2026-05-26.jsonl
{"kind":"status_change","taskId":"T-001","newStatus":"done","recordedAt":"2026-05-26T12:00:00Z"}
{"kind":"annotation","target":"T-002","body":"Needs review","recordedAt":"2026-05-26T13:00:00Z"}
```

```markdown
// tests/fixtures/consumers/valid-consumer/data/plans/alpha.md
---
slug: alpha
title: Alpha Plan
status: active
---

Plan narrative here.
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/data-source-reader.test.ts
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readDataSource } from '../../src/server/data-source-reader.js'

const CONSUMER_DIR = join(import.meta.dirname, '..', 'fixtures', 'consumers', 'valid-consumer')

describe('readDataSource', () => {
  it('reads YAML array', async () => {
    const result = await readDataSource(CONSUMER_DIR, { id: 'items', path: 'data/items.yaml', format: 'yaml' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.records).toHaveLength(2)
      expect(result.value.records[0].id).toBe('T-001')
    }
  })

  it('reads JSON file', async () => {
    const result = await readDataSource(CONSUMER_DIR, { id: 'config', path: 'data/config.json', format: 'json' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.records[0].theme).toBe('dark')
  })

  it('reads JSONL with glob', async () => {
    const result = await readDataSource(CONSUMER_DIR, { id: 'inbox', path: 'data/inbox/*.jsonl', format: 'jsonl' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.records.length).toBeGreaterThanOrEqual(2)
  })

  it('reads frontmatter files with glob', async () => {
    const result = await readDataSource(CONSUMER_DIR, { id: 'plans', path: 'data/plans/*.md', format: 'frontmatter' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.records).toHaveLength(1)
      expect(result.value.records[0].slug).toBe('alpha')
      expect(result.value.records[0]._body).toContain('Plan narrative')
    }
  })

  it('returns empty for non-matching glob', async () => {
    const result = await readDataSource(CONSUMER_DIR, { id: 'none', path: 'data/nope/*.yaml', format: 'yaml' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.records).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Implement data source reader**

```typescript
// src/server/data-source-reader.ts
import { readFile, readdir } from 'node:fs/promises'
import { join, basename, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { glob } from 'node:fs/promises'
import type { ErrorResponse } from '../schemas/common.js'
import { type Result, err, ok } from '../schemas/validators/index.js'
import type { DataSourceDecl } from './manifest-schema.js'
import { splitFrontmatter } from './parsers/frontmatter.js'

export interface DataSourceResult {
  dataSourceId: string
  records: Record<string, unknown>[]
  files: string[]
}

export async function readDataSource(
  consumerDir: string,
  decl: DataSourceDecl
): Promise<Result<DataSourceResult, ErrorResponse>> {
  const pattern = join(consumerDir, decl.path)
  const records: Record<string, unknown>[] = []
  const files: string[] = []

  let matchedPaths: string[]
  try {
    matchedPaths = []
    for await (const p of glob(pattern)) {
      matchedPaths.push(p)
    }
  } catch {
    matchedPaths = []
  }

  matchedPaths.sort()

  for (const filePath of matchedPaths) {
    files.push(filePath)
    let raw: string
    try {
      raw = await readFile(filePath, 'utf8')
    } catch (cause) {
      return err({
        code: 'io_error',
        message: `Failed to read data file: ${filePath}`,
        details: { dataSourceId: decl.id, path: filePath },
      })
    }

    switch (decl.format) {
      case 'yaml': {
        const parsed = parseYaml(raw)
        if (Array.isArray(parsed)) {
          records.push(...parsed)
        } else if (parsed && typeof parsed === 'object') {
          records.push(parsed as Record<string, unknown>)
        }
        break
      }
      case 'json': {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          records.push(...parsed)
        } else if (parsed && typeof parsed === 'object') {
          records.push(parsed)
        }
        break
      }
      case 'jsonl': {
        for (const line of raw.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          records.push(JSON.parse(trimmed))
        }
        break
      }
      case 'frontmatter': {
        const split = splitFrontmatter(raw)
        if (split) {
          const fm = parseYaml(split.frontmatter)
          if (fm && typeof fm === 'object') {
            records.push({ ...(fm as Record<string, unknown>), _body: split.body, _file: basename(filePath) })
          }
        }
        break
      }
    }
  }

  return ok({ dataSourceId: decl.id, records, files })
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npm test -- tests/unit/server/data-source-reader.test.ts`

```bash
git add src/server/data-source-reader.ts tests/unit/server/data-source-reader.test.ts tests/fixtures/consumers/valid-consumer/data/
git commit -m "feat(f0): data source reader for yaml/json/jsonl/frontmatter with glob"
```

---

### Task 6: Generic File Watcher

**Files:**
- Create: `src/server/consumer-watcher.ts`
- Test: `tests/unit/server/consumer-watcher.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/consumer-watcher.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createConsumerWatcher } from '../../src/server/consumer-watcher.js'
import { createEventBus } from '../../src/server/event-bus.js'
import type { RuntimeEvent } from '../../src/schemas/common.js'

describe('ConsumerWatcher', () => {
  let baseDir: string
  let consumerDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-watcher-'))
    consumerDir = join(baseDir, 'consumers', 'test')
    await mkdir(join(consumerDir, 'data'), { recursive: true })
    await writeFile(join(consumerDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: test
mcpNamespace: test
title: Test
dataSources:
  - { id: items, path: 'data/*.yaml', format: yaml }
pages: []
`)
    return async () => { await rm(baseDir, { recursive: true, force: true }) }
  })

  it('emits event when a data file is created', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))

    const watcher = createConsumerWatcher({
      consumersDir: join(baseDir, 'consumers'),
      eventBus: bus,
    })
    await watcher.start()
    await watcher.ready()

    await writeFile(join(consumerDir, 'data', 'items.yaml'), '- id: 1\n  title: Test\n')
    await new Promise((r) => setTimeout(r, 500))

    await watcher.stop()

    const dataEvents = events.filter((e) => e.kind === 'data_changed')
    expect(dataEvents.length).toBeGreaterThanOrEqual(1)
    expect(dataEvents[0].consumer).toBe('test')
  })

  it('ignores files outside data/ directories', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))

    const watcher = createConsumerWatcher({
      consumersDir: join(baseDir, 'consumers'),
      eventBus: bus,
    })
    await watcher.start()
    await watcher.ready()

    await writeFile(join(consumerDir, 'README.md'), '# Ignored')
    await new Promise((r) => setTimeout(r, 500))

    await watcher.stop()

    expect(events.filter((e) => e.kind === 'data_changed')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Implement generic consumer watcher**

```typescript
// src/server/consumer-watcher.ts
import chokidar from 'chokidar'
import { relative, sep } from 'node:path'
import type { EventBus } from './event-bus.js'

export interface ConsumerWatcherOptions {
  consumersDir: string
  eventBus: EventBus
  awaitWriteFinishMs?: number
  ignoreInitial?: boolean
}

export interface ConsumerWatcher {
  start(): Promise<void>
  ready(): Promise<void>
  stop(): Promise<void>
}

export function createConsumerWatcher(opts: ConsumerWatcherOptions): ConsumerWatcher {
  const { consumersDir, eventBus, awaitWriteFinishMs = 200, ignoreInitial = true } = opts
  let watcher: chokidar.FSWatcher | null = null
  let readyPromise: Promise<void> | null = null

  function classifyPath(filePath: string): { consumerId: string; dataSourceHint: string } | null {
    const rel = relative(consumersDir, filePath)
    const parts = rel.split(sep)
    if (parts.length < 3) return null
    const consumerId = parts[0]
    if (parts[1] !== 'data') return null
    return { consumerId, dataSourceHint: parts.slice(2).join('/') }
  }

  function handleChange(filePath: string) {
    const classified = classifyPath(filePath)
    if (!classified) return

    eventBus.emit({
      kind: 'data_changed',
      consumer: classified.consumerId,
      payload: { file: filePath, dataSourceHint: classified.dataSourceHint },
    })
  }

  return {
    async start() {
      const watchPattern = `${consumersDir}/*/data/**`
      watcher = chokidar.watch(watchPattern, {
        ignoreInitial,
        awaitWriteFinish: { stabilityThreshold: awaitWriteFinishMs, pollInterval: 50 },
      })

      watcher.on('add', handleChange)
      watcher.on('change', handleChange)
      watcher.on('unlink', handleChange)

      readyPromise = new Promise<void>((resolve) => {
        watcher!.on('ready', resolve)
      })
    },

    async ready() {
      if (readyPromise) await readyPromise
    },

    async stop() {
      if (watcher) await watcher.close()
      watcher = null
    },
  }
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npm test -- tests/unit/server/consumer-watcher.test.ts`

```bash
git add src/server/consumer-watcher.ts tests/unit/server/consumer-watcher.test.ts
git commit -m "feat(f0): generic consumer watcher dispatches events for any consumer data/"
```

---

### Task 7: Integration test — full F0 pipeline

**Files:**
- Create: `tests/integration/consumer-pipeline.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// tests/integration/consumer-pipeline.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createConsumerRegistry } from '../../src/server/consumer-registry.js'
import { createSchemaValidator } from '../../src/server/schema-validator.js'
import { readDataSource } from '../../src/server/data-source-reader.js'

describe('Consumer pipeline integration', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-int-'))
    const cDir = join(baseDir, 'consumers', 'todo')
    await mkdir(join(cDir, 'data'), { recursive: true })

    await writeFile(join(cDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: todo
mcpNamespace: todo
title: Todo App
dataSources:
  - { id: tasks, path: 'data/tasks.yaml', format: yaml }
pages:
  - { slug: home, title: Home, layout: sections, sections: [{ title: Tasks, widgets: [{ widget: table, colSpan: 12, source: { ref: tasks } }] }] }
`)

    await writeFile(join(cDir, 'schema.json'), JSON.stringify({
      definitions: {
        task: {
          type: 'object',
          required: ['id', 'title'],
          properties: { id: { type: 'string' }, title: { type: 'string' }, done: { type: 'boolean' } },
        },
      },
    }))

    await writeFile(join(cDir, 'data', 'tasks.yaml'), `
- id: '1'
  title: Buy milk
  done: false
- id: '2'
  title: Write tests
  done: true
`)

    return async () => { await rm(baseDir, { recursive: true, force: true }) }
  })

  it('scan → load manifest → read data → validate against schema', async () => {
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    const consumer = registry.get('todo')
    expect(consumer).toBeDefined()

    const ds = consumer!.manifest.dataSources[0]
    const data = await readDataSource(consumer!.dir, ds)
    expect(data.ok).toBe(true)
    if (!data.ok) return

    expect(data.value.records).toHaveLength(2)

    const validator = await createSchemaValidator(join(consumer!.dir, 'schema.json'))
    expect(validator.ok).toBe(true)
    if (!validator.ok) return

    for (const record of data.value.records) {
      const result = validator.value.validate(record, '#/definitions/task')
      expect(result.ok).toBe(true)
    }
  })

  it('reports validation error for bad data', async () => {
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()
    const consumer = registry.get('todo')!

    const validator = await createSchemaValidator(join(consumer.dir, 'schema.json'))
    if (!validator.ok) return

    const result = validator.value.validate({ id: 123 }, '#/definitions/task')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('validation_error')
    }
  })
})
```

- [ ] **Step 2: Run integration test, commit**

Run: `npm test -- tests/integration/consumer-pipeline.test.ts`

```bash
git add tests/integration/consumer-pipeline.test.ts
git commit -m "test(f0): integration test — consumer scan → data read → schema validate"
```

---

## Phase F1: MCP + REST

**Goal:** 6 generic MCP tools, 4 handler types, consumer-declared tool registration, generic REST API.

### Task 8: Handler — Template Engine

**Files:**
- Create: `src/server/handlers/template.ts`
- Test: `tests/unit/server/handlers/template.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/handlers/template.test.ts
import { describe, expect, it } from 'vitest'
import { renderTemplate } from '../../../src/server/handlers/template.js'

describe('renderTemplate', () => {
  it('substitutes simple variables', () => {
    expect(renderTemplate('Hello {{ name }}', { name: 'World' })).toBe('Hello World')
  })

  it('substitutes isoDate and now built-ins', () => {
    const result = renderTemplate('{{ isoDate }}/{{ now }}', {})
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}\//)
  })

  it('leaves unknown variables as-is', () => {
    expect(renderTemplate('{{ unknown }}', {})).toBe('{{ unknown }}')
  })

  it('handles nested object values via JSON', () => {
    expect(renderTemplate('{{ data }}', { data: { a: 1 } })).toBe('{"a":1}')
  })
})
```

- [ ] **Step 2: Implement template engine**

```typescript
// src/server/handlers/template.ts
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  const builtins: Record<string, () => string> = {
    isoDate: () => new Date().toISOString().slice(0, 10),
    now: () => new Date().toISOString(),
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (key in vars) {
      const val = vars[key]
      return typeof val === 'string' ? val : JSON.stringify(val)
    }
    if (key in builtins) return builtins[key]()
    return match
  })
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npm test -- tests/unit/server/handlers/template.test.ts`

```bash
git add src/server/handlers/template.ts tests/unit/server/handlers/template.test.ts
git commit -m "feat(f1): template engine for handler variable substitution"
```

---

### Task 9: Handler — file-mutation

**Files:**
- Create: `src/server/handlers/file-mutation.ts`
- Test: `tests/unit/server/handlers/file-mutation.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/handlers/file-mutation.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { executeFileMutation } from '../../../src/server/handlers/file-mutation.js'

describe('file-mutation handler', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aideck-fm-'))
    await mkdir(join(dir, 'data', 'inbox'), { recursive: true })
    return async () => { await rm(dir, { recursive: true, force: true }) }
  })

  it('appends JSONL record to target', async () => {
    const result = await executeFileMutation(dir, {
      type: 'file-mutation',
      target: 'data/inbox/{{ isoDate }}.jsonl',
      operation: 'append',
      record: { kind: 'test', taskId: '{{ taskId }}' },
    }, { taskId: 'T-001' })

    expect(result.ok).toBe(true)

    const files = await readFile(join(dir, 'data', 'inbox', new Date().toISOString().slice(0, 10) + '.jsonl'), 'utf8')
    const parsed = JSON.parse(files.trim())
    expect(parsed.kind).toBe('test')
    expect(parsed.taskId).toBe('T-001')
  })
})
```

- [ ] **Step 2: Implement file-mutation handler**

```typescript
// src/server/handlers/file-mutation.ts
import { join } from 'node:path'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'
import { renderTemplate } from './template.js'

interface FileMutationDecl {
  type: 'file-mutation'
  target: string
  operation: 'set' | 'append'
  field?: string
  record?: Record<string, unknown>
}

export async function executeFileMutation(
  consumerDir: string,
  decl: FileMutationDecl,
  args: Record<string, unknown>
): Promise<Result<{ path: string }, ErrorResponse>> {
  const targetPath = join(consumerDir, renderTemplate(decl.target, args))

  if (decl.operation === 'append') {
    const record: Record<string, unknown> = {}
    if (decl.record) {
      for (const [k, v] of Object.entries(decl.record)) {
        record[k] = typeof v === 'string' ? renderTemplate(v, args) : v
      }
    }
    try {
      await appendJsonlLine(targetPath, record)
      return ok({ path: targetPath })
    } catch (cause) {
      return err({
        code: 'io_error',
        message: `Failed to append to ${targetPath}: ${cause instanceof Error ? cause.message : String(cause)}`,
      })
    }
  }

  return err({
    code: 'not_implemented',
    message: `file-mutation operation "${decl.operation}" with field="${decl.field}" not yet implemented`,
  })
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npm test -- tests/unit/server/handlers/file-mutation.test.ts`

```bash
git add src/server/handlers/file-mutation.ts tests/unit/server/handlers/file-mutation.test.ts
git commit -m "feat(f1): file-mutation handler with JSONL append"
```

---

### Task 10: Handler — shell-exec

**Files:**
- Create: `src/server/handlers/shell-exec.ts`
- Test: `tests/unit/server/handlers/shell-exec.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/server/handlers/shell-exec.test.ts
import { describe, expect, it } from 'vitest'
import { executeShellExec } from '../../../src/server/handlers/shell-exec.js'

describe('shell-exec handler', () => {
  it('runs a command and returns stdout', async () => {
    const result = await executeShellExec('/tmp', {
      type: 'shell-exec',
      command: 'echo "hello world"',
    }, {})
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.stdout.trim()).toBe('hello world')
  })

  it('returns error on non-zero exit', async () => {
    const result = await executeShellExec('/tmp', {
      type: 'shell-exec',
      command: 'exit 42',
    }, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.details?.exitCode).toBe(42)
  })

  it('times out long commands', async () => {
    const result = await executeShellExec('/tmp', {
      type: 'shell-exec',
      command: 'sleep 60',
      timeout: 500,
    }, {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('timeout')
  }, 5000)

  it('substitutes args in command template', async () => {
    const result = await executeShellExec('/tmp', {
      type: 'shell-exec',
      command: 'echo "{{ greeting }}"',
    }, { greeting: 'hi' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.stdout.trim()).toBe('hi')
  })
})
```

- [ ] **Step 2: Implement shell-exec handler**

```typescript
// src/server/handlers/shell-exec.ts
import { execFile } from 'node:child_process'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { renderTemplate } from './template.js'

interface ShellExecDecl {
  type: 'shell-exec'
  command: string
  timeout?: number
}

const DEFAULT_TIMEOUT = 30_000

export async function executeShellExec(
  consumerDir: string,
  decl: ShellExecDecl,
  args: Record<string, unknown>
): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, ErrorResponse>> {
  const command = renderTemplate(decl.command, args)
  const timeout = decl.timeout ?? DEFAULT_TIMEOUT

  return new Promise((resolve) => {
    const child = execFile('bash', ['-c', command], {
      cwd: consumerDir,
      timeout,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error && 'killed' in error && error.killed) {
        resolve(err({
          code: 'timeout',
          message: `Command timed out after ${timeout}ms: ${command}`,
          details: { command, timeout },
        }))
        return
      }

      const exitCode = error?.code != null ? (typeof error.code === 'number' ? error.code : 1) : 0
      if (exitCode !== 0) {
        resolve(err({
          code: 'shell_error',
          message: `Command exited with code ${exitCode}: ${command}`,
          details: { command, exitCode, stderr: stderr.slice(-500) },
        }))
        return
      }

      resolve(ok({ stdout, stderr, exitCode: 0 }))
    })
  })
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npm test -- tests/unit/server/handlers/shell-exec.test.ts`

```bash
git add src/server/handlers/shell-exec.ts tests/unit/server/handlers/shell-exec.test.ts
git commit -m "feat(f1): shell-exec handler with timeout and template substitution"
```

---

### Task 11: Handler — script

**Files:**
- Create: `src/server/handlers/script.ts`
- Test: `tests/unit/server/handlers/script.test.ts`

- [ ] **Step 1: Write test fixture handler**

```javascript
// tests/fixtures/consumers/valid-consumer/handlers/count-items.js
export default async function({ args, data, files, log }) {
  const items = data.get('items') ?? []
  const filtered = args.status
    ? items.filter(i => i.status === args.status)
    : items
  return { count: filtered.length, status: args.status ?? 'all' }
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// tests/unit/server/handlers/script.test.ts
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { executeScript } from '../../../src/server/handlers/script.js'

const CONSUMER_DIR = join(import.meta.dirname, '..', '..', 'fixtures', 'consumers', 'valid-consumer')

describe('script handler', () => {
  it('executes a JS module and returns result', async () => {
    const dataMap = new Map<string, unknown[]>()
    dataMap.set('items', [
      { id: '1', status: 'active' },
      { id: '2', status: 'done' },
      { id: '3', status: 'active' },
    ])

    const result = await executeScript(CONSUMER_DIR, {
      type: 'script',
      source: 'handlers/count-items.js',
    }, { status: 'active' }, dataMap)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.count).toBe(2)
      expect(result.value.status).toBe('active')
    }
  })
})
```

- [ ] **Step 3: Implement script handler**

```typescript
// src/server/handlers/script.ts
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'

interface ScriptDecl {
  type: 'script'
  source: string
}

interface ScriptContext {
  args: Record<string, unknown>
  data: Map<string, unknown[]>
  files: { append(target: string, record: object): Promise<void> }
  log: { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
}

export async function executeScript(
  consumerDir: string,
  decl: ScriptDecl,
  args: Record<string, unknown>,
  dataMap: Map<string, unknown[]>
): Promise<Result<Record<string, unknown>, ErrorResponse>> {
  const scriptPath = join(consumerDir, decl.source)
  const scriptUrl = pathToFileURL(scriptPath).href

  let mod: { default: (ctx: ScriptContext) => Promise<unknown> }
  try {
    mod = await import(scriptUrl)
  } catch (cause) {
    return err({
      code: 'script_error',
      message: `Failed to load script: ${decl.source}: ${cause instanceof Error ? cause.message : String(cause)}`,
      details: { source: decl.source },
    })
  }

  if (typeof mod.default !== 'function') {
    return err({
      code: 'script_error',
      message: `Script ${decl.source} must export a default async function`,
    })
  }

  const ctx: ScriptContext = {
    args,
    data: dataMap,
    files: {
      async append(target: string, record: object) {
            const targetPath = join(consumerDir, target)
            await appendJsonlLine(targetPath, record)
          },
    },
    log: {
      info(msg: string) { console.log(`[script:${decl.source}] ${msg}`) },
      warn(msg: string) { console.warn(`[script:${decl.source}] ${msg}`) },
      error(msg: string) { console.error(`[script:${decl.source}] ${msg}`) },
    },
  }

  const SCRIPT_TIMEOUT = 30_000
  try {
    const result = await Promise.race([
      mod.default(ctx),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Script timed out after ${SCRIPT_TIMEOUT}ms`)), SCRIPT_TIMEOUT)
      ),
    ])
    return ok((result ?? {}) as Record<string, unknown>)
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    return err({
      code: msg.includes('timed out') ? 'timeout' : 'script_error',
      message: `Script ${decl.source}: ${msg}`,
    })
  }
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npm test -- tests/unit/server/handlers/script.test.ts`

```bash
git add src/server/handlers/ tests/unit/server/handlers/ tests/fixtures/consumers/valid-consumer/handlers/
git commit -m "feat(f1): script handler executes JS modules with sandboxed context"
```

---

### Task 12: Handler — composite

**Files:**
- Create: `src/server/handlers/composite.ts`
- Test: `tests/unit/server/handlers/composite.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/server/handlers/composite.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { executeComposite } from '../../../src/server/handlers/composite.js'

describe('composite handler', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'aideck-comp-'))
    await mkdir(join(dir, 'data', 'inbox'), { recursive: true })
    return async () => { await rm(dir, { recursive: true, force: true }) }
  })

  it('chains two file-mutation steps', async () => {
    const result = await executeComposite(dir, {
      type: 'composite',
      steps: [
        { type: 'file-mutation', target: 'data/inbox/{{ isoDate }}.jsonl', operation: 'append', record: { step: 'first', id: '{{ id }}' } },
        { type: 'file-mutation', target: 'data/inbox/{{ isoDate }}.jsonl', operation: 'append', record: { step: 'second', id: '{{ id }}' } },
      ],
    }, { id: 'T-001' }, new Map())

    expect(result.ok).toBe(true)

    const content = await readFile(join(dir, 'data', 'inbox', new Date().toISOString().slice(0, 10) + '.jsonl'), 'utf8')
    const lines = content.trim().split('\n').map((l) => JSON.parse(l))
    expect(lines).toHaveLength(2)
    expect(lines[0].step).toBe('first')
    expect(lines[1].step).toBe('second')
  })
})
```

- [ ] **Step 2: Implement composite handler**

```typescript
// src/server/handlers/composite.ts
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import type { HandlerDecl } from '../manifest-schema.js'
import { executeFileMutation } from './file-mutation.js'
import { executeShellExec } from './shell-exec.js'
import { executeScript } from './script.js'

interface CompositeDecl {
  type: 'composite'
  steps: HandlerDecl[]
}

export async function executeComposite(
  consumerDir: string,
  decl: CompositeDecl,
  args: Record<string, unknown>,
  dataMap: Map<string, unknown[]>
): Promise<Result<{ stepsCompleted: number }, ErrorResponse>> {
  for (let i = 0; i < decl.steps.length; i++) {
    const step = decl.steps[i]
    let result: Result<unknown, ErrorResponse>

    switch (step.type) {
      case 'file-mutation':
        result = await executeFileMutation(consumerDir, step, args)
        break
      case 'shell-exec':
        result = await executeShellExec(consumerDir, step, args)
        break
      case 'script':
        result = await executeScript(consumerDir, step, args, dataMap)
        break
      case 'composite':
        result = await executeComposite(consumerDir, step, args, dataMap)
        break
      default:
        result = err({ code: 'invalid_input', message: `Unknown handler type in composite step ${i}` })
    }

    if (!result.ok) {
      return err({
        ...result.error,
        message: `Composite step ${i} failed: ${result.error.message}`,
      })
    }
  }

  return ok({ stepsCompleted: decl.steps.length })
}
```

- [ ] **Step 3: Run tests, commit**

Run: `npm test -- tests/unit/server/handlers/composite.test.ts`

```bash
git add src/server/handlers/composite.ts tests/unit/server/handlers/composite.test.ts
git commit -m "feat(f1): composite handler chains multiple handler steps"
```

---

### Task 13: Tier 1 MCP Tools (6 generic tools)

**Files:**
- Create: `src/mcp/tools/generic.ts`
- Test: `tests/unit/mcp/generic-tools.test.ts`

- [ ] **Step 1: Write failing tests for all 6 tools**

```typescript
// tests/unit/mcp/generic-tools.test.ts
import { describe, expect, it, beforeEach } from 'vitest'
import { ToolRegistry } from '../../src/mcp/registry.js'
import { registerGenericTools } from '../../src/mcp/tools/generic.js'
import { createConsumerRegistry, type ConsumerRegistry } from '../../src/server/consumer-registry.js'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('generic MCP tools', () => {
  let registry: ToolRegistry
  let consumers: ConsumerRegistry
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-mcp-'))
    const cDir = join(baseDir, 'consumers', 'demo')
    await mkdir(join(cDir, 'data'), { recursive: true })
    await writeFile(join(cDir, 'manifest.yaml'), `
schemaVersion: '0.1'
id: demo
mcpNamespace: demo
title: Demo
dataSources:
  - { id: items, path: 'data/items.yaml', format: yaml }
pages: []
`)
    await writeFile(join(cDir, 'data', 'items.yaml'), `
- { id: '1', title: First }
- { id: '2', title: Second }
`)

    consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    registry = new ToolRegistry()
    registerGenericTools(registry, consumers, '0.0.1')

    return async () => { await rm(baseDir, { recursive: true, force: true }) }
  })

  it('registers all 6 tools', () => {
    const names = registry.list().map((t) => t.name)
    expect(names).toContain('aideck_list_consumers')
    expect(names).toContain('aideck_read')
    expect(names).toContain('aideck_list')
    expect(names).toContain('aideck_write')
    expect(names).toContain('aideck_health')
    expect(names).toContain('aideck_schema_version')
  })

  it('aideck_list_consumers returns registered consumers', async () => {
    const result = await registry.invoke('aideck_list_consumers', {}, { rootDir: baseDir, version: '0.0.1' })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text)
    expect(data.consumers).toHaveLength(1)
    expect(data.consumers[0].id).toBe('demo')
  })

  it('aideck_list returns data from a consumer data source', async () => {
    const result = await registry.invoke('aideck_list', { consumer: 'demo', dataSource: 'items' }, { rootDir: baseDir, version: '0.0.1' })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text)
    expect(data.records).toHaveLength(2)
  })

  it('aideck_health returns runtime status', async () => {
    const result = await registry.invoke('aideck_health', {}, { rootDir: baseDir, version: '0.0.1' })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text)
    expect(data.status).toBe('ok')
    expect(data.consumerCount).toBe(1)
  })

  it('aideck_schema_version returns version info', async () => {
    const result = await registry.invoke('aideck_schema_version', {}, { rootDir: baseDir, version: '0.0.1' })
    expect(result.isError).toBeFalsy()
    const data = JSON.parse(result.content[0].text)
    expect(data.schemaVersion).toBe('0.1')
  })
})
```

- [ ] **Step 2: Implement generic tools**

The implementation registers 6 tools on the ToolRegistry. Each tool uses `ConsumerRegistry` to look up consumers and `readDataSource` to fetch data. `aideck_write` delegates to `appendJsonlLine`. Full code in step — each tool is a Zod-validated handler.

- [ ] **Step 3: Run tests, commit**

---

### Task 14: Consumer-declared MCP Tools (Tier 2)

**Files:**
- Create: `src/mcp/tools/consumer-tools.ts`
- Test: `tests/unit/mcp/consumer-tools.test.ts`

Registers tools from `manifest.tools[]` with auto-namespacing: `aideck.<mcpNamespace>.<name>`. Dispatches to the appropriate handler type.

---

### Task 15: Generic REST API

**Files:**
- Create: `src/server/routes/api-v2.ts`
- Test: `tests/unit/server/routes/api-v2.test.ts`

7 endpoints per the spec:
- `GET /api/health` — reuse existing, add consumer count from ConsumerRegistry
- `GET /api/consumers` — list from ConsumerRegistry
- `GET /api/consumers/:id` — manifest for one consumer
- `GET /api/consumers/:id/data/:dataSourceId` — readDataSource + validate
- `GET /api/consumers/:id/data/:dataSourceId/:slug` — single entity
- `POST /api/consumers/:id/write/:target` — writable path append
- `GET /sse` — keep existing, filter by consumer query param

---

### Task 16: Integration test — MCP + REST end-to-end

Tests the full pipeline: register consumer → call MCP tools → verify REST endpoints return same data.

---

## Phase F2: CLI

### Task 17: `aideck validate <file>`

**Files:**
- Create: `src/cli/validate.ts`
- Test: `tests/unit/cli/validate.test.ts`

Validates a data file against its consumer's schema.json. Outputs LLM-friendly errors (path + expected + got). Exit 0 = valid, exit 1 = errors. The validator finds the consumer by walking up from the file path to find `manifest.yaml`, reads `schema.json`, matches the file to a `dataSources[]` entry, and validates.

---

### Task 18: `aideck init-consumer`

**Files:**
- Create: `src/cli/init-consumer.ts`
- Test: `tests/unit/cli/init-consumer.test.ts`

Interactive scaffolding: asks for consumer id, title, mcpNamespace. Generates:
- `~/.aideck/consumers/<id>/manifest.yaml` (minimal, 1 page, 1 dataSource)
- `~/.aideck/consumers/<id>/schema.json` (empty definitions)
- `~/.aideck/consumers/<id>/data/` (empty directory)

---

### Task 19: Wire CLI subcommands

**Files:**
- Modify: `src/cli.ts`

Add `validate` and `init-consumer` to the dispatch table. Update `--help` output.

---

## Phase F3: Frontend Foundation

### Task 20: Vue + Vite scaffold

**Files:**
- Create: `vite.config.ts`, `src/client/main.ts`, `src/client/App.vue`, `src/client/router.ts`
- Modify: `package.json` (add vue, vue-router, vite, @vitejs/plugin-vue)

Scaffold Vue 3 SPA with Vite. CSS custom properties for dark theme (tokens.css). Router with dynamic consumer routes.

---

### Task 21: API client + SSE composable

**Files:**
- Create: `src/client/api.ts`, `src/client/composables/useConsumers.ts`, `src/client/composables/useDataSource.ts`, `src/client/composables/useSse.ts`

`api.ts`: typed fetch wrapper for all REST endpoints. `useSse.ts`: EventSource composable with reconnect. `useConsumers.ts`: reactive consumer list. `useDataSource.ts`: fetch + cache per consumer + dataSource.

---

### Task 22: Home page

**Files:**
- Create: `src/client/pages/HomePage.vue`
- Test: `tests/unit/client/home-page.test.ts`

Renders consumer cards from `GET /api/consumers`. Each card shows title, icon, data source count, page count. Click navigates to `/<consumer-id>/`.

---

### Task 23: Layout engine — SectionsLayout

**Files:**
- Create: `src/client/layouts/SectionsLayout.vue`
- Test: `tests/unit/client/sections-layout.test.ts`

Renders flowing sections with collapsible headers. Each section renders a CSS grid with `columns` and `gap` from the section config.

---

### Task 24: Layout engine — GridLayout

**Files:**
- Create: `src/client/layouts/GridLayout.vue`
- Test: `tests/unit/client/grid-layout.test.ts`

12-column CSS grid with `grid-template-columns: repeat(12, 1fr)`. Widgets placed by `colStart`, `colSpan`, `rowSpan`. Responsive breakpoints via CSS container queries.

---

### Task 25: Layout engine — SingleLayout

**Files:**
- Create: `src/client/layouts/SingleLayout.vue`

Full-page single widget. Passes source + config to WidgetRenderer.

---

### Task 26: WidgetRenderer + ConsumerPage

**Files:**
- Create: `src/client/components/WidgetRenderer.vue`, `src/client/pages/ConsumerPage.vue`

`WidgetRenderer.vue`: dynamic component resolution. Maps `widget: 'table'` → `TableWidget`, etc. Falls back to `<div>Unknown widget: X</div>`.

`ConsumerPage.vue`: fetches consumer manifest, renders the matching page using the correct layout component.

---

### Task 27: Frontend integration test

Start Vite dev server + aiDeck API. Verify home page renders with consumers, click through to consumer page, verify widgets render.

---

## Phase F4: Component Library

### Task 28: Widget interface + 5 core widgets

**Files:**
- Create: `src/client/components/widgets/StatWidget.vue`
- Create: `src/client/components/widgets/TableWidget.vue`
- Create: `src/client/components/widgets/ListWidget.vue`
- Create: `src/client/components/widgets/BadgeWidget.vue`
- Create: `src/client/components/widgets/MarkdownWidget.vue`

Each widget receives `{ source: Record<string, unknown>[], config: Record<string, unknown> }` as props. Renders based on config. All widgets share a common interface.

---

### Task 29-33: Data display widgets

`KeyValueWidget`, `ProgressBarWidget`, `CodeBlockWidget`, `CardWidget`, `TagChipWidget`

---

### Task 34-37: Chart widgets

`LineChartWidget`, `BarChartWidget`, `GaugeWidget` — use SVG, no external chart library. `GraphDagWidget` — renders Mermaid via `mermaid` npm package.

---

### Task 38-41: Navigation/Layout widgets

`TabsWidget`, `AccordionWidget`, `ContainerWidget`, `GridColumnsWidget`, `BreadcrumbWidget`, `HeaderNavWidget`, `DrawerWidget`, `SearchFilterWidget`

---

### Task 42-44: AI-specific widgets

`KanbanBoardWidget` — drag-and-drop columns (pending/active/done). `TimelineWidget` — vertical timeline with timestamps. `LogFeedWidget` — scrolling log with auto-tail. `TreeViewWidget` — expandable tree with badges.

---

### Task 45: Component demo page + visual test

Create a demo page that renders all 25 widgets with sample data. Manual visual inspection + screenshot test.

---

## Phase F5: Integration + Demo

### Task 46: Demo consumer

**Files:**
- Create: `src/demo/manifest.yaml`, `src/demo/schema.json`, `src/demo/data/`
- Modify: `src/demo/seed-demo.ts`

3 sample pages (overview with sections, board with grid, detail with single). Exercises all layout modes and at least 15 of the 25 widgets. Realistic data (not lorem ipsum).

---

### Task 47: `aideck demo` command update

Copies demo consumer to `~/.aideck/consumers/aideck-demo/`, starts server, opens browser with demo banner. Cleans up on exit.

---

### Task 48: End-to-end tests

**Files:**
- Create: `tests/e2e/demo-consumer.test.ts`

Start server with demo consumer. Verify:
- Home page shows demo consumer card
- Each page renders without errors
- SSE events flow when data changes
- MCP tools work against demo data

---

### Task 49: Handoff document

**Files:**
- Create: `docs/handoff-atomic-skills-migration.md`

Covers: manifest.yaml schema reference, schema.json contract, script handler API, custom component contract, 7 MCP tools needing script handlers (with v0.1 code as reference), 3,624 LOC extraction list, breaking changes (renamed tools, new data directory, manifest requirement).

---

### Task 50: Final verification

- [ ] `npm run typecheck` passes
- [ ] `npm test` — all tests pass
- [ ] Coverage ≥ 70% on core modules
- [ ] `aideck demo` works end-to-end
- [ ] `aideck validate` outputs correct errors
- [ ] `aideck init-consumer` scaffolds a working consumer
- [ ] Dark theme with proper contrast
- [ ] README updated for v2

---

## Execution Notes

- F0 and F1 can be executed sequentially (F1 depends on F0 consumer registry + data source reader)
- F1 and F2 share no files and can be parallelized after F0
- F3 depends on F1 (needs REST API running)
- F4 depends on F3 (needs layout engine)
- F5 depends on F4 (needs component library)
- Each task produces a working, testable increment with its own commit
- Run `npm run validate-state` after any `.atomic-skills/` file changes
- **Instance lockfile** (spec §10): add to server startup in Task 15 — write `~/.aideck/lock` with PID + port, refuse start if another instance is alive, clean up on shutdown
- **Per-consumer file count cap** (spec §10): add to ConsumerWatcher in Task 6 — configurable cap (default 5,000), skip watchers for consumers exceeding the limit, log warning
- **Script handler timeout**: 30s default with Promise.race (implemented in Task 11)
