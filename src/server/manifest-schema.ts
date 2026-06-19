import { z } from 'zod'
import { type Result, parseOrError } from '../schemas/validators/index.js'
import type { ErrorResponse } from '../schemas/common.js'

export type { Result }

const mcpNamespaceSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,31}$/, 'mcpNamespace must match [a-z][a-z0-9_]{0,31}')

const dataSourceSchema = z
  .object({
    id: z.string().min(1),
    // Optional because a *derived* source (`derivesFrom`) has no file path.
    path: z.string().min(1).optional(),
    // Optional for the same reason; a file source must still declare it (refined below).
    format: z.enum(['yaml', 'frontmatter', 'json', 'jsonl']).optional(),
    schema: z.record(z.unknown()).optional(),
    /**
     * Resolution root for `path`:
     *   - 'consumer' (default): relative to the consumer dir (~/.aideck/consumers/<id>/).
     *   - 'project': relative to a registered project's rootDir. The path then
     *     typically begins with `.atomic-skills/...` and is served by the
     *     project-scoped endpoint `/api/consumers/:id/projects/:projectId/data/:ds`.
     *     Lets a consumer read a repo's git-tracked tree in place — no copy into
     *     the consumer dir.
     */
    root: z.enum(['consumer', 'project']).optional(),
    /**
     * Names for the glob wildcards in `path`, left-to-right. Each `*` / `**`
     * segment captures the matched path segment(s); the captured value is
     * injected onto every record read from that file under the corresponding
     * name. Example: path `.atomic-skills/projects/<star>/<star>/plan.md` with
     * captures `[projectId, planSlug]` tags each plan record with its projectId
     * and planSlug — the "flatten + projectId" grouping.
     */
    captures: z.array(z.string().min(1)).optional(),
    /**
     * Array-explode projection (§2a). A *derived* dataSource flattens a nested
     * array field of a parent source into one record per element. The parent's
     * scalars listed in `carry` (plus any glob captures already injected on the
     * parent, e.g. projectId/planSlug) are copied onto each child record, which
     * also gets `_parentId` and `_index` (stable order).
     *   - `derivesFrom`: the parent dataSource `id`.
     *   - `explode`: the nested array field on each parent record to flatten.
     *   - `carry`: parent scalar field names copied onto each child record.
     *   - `parentKey`: which parent field identifies it on `_parentId`. When
     *     omitted, falls back to the parent's `id`/`slug` (a convenience, not an
     *     assumption — name your own identity field for non-conventional data).
     */
    derivesFrom: z.string().min(1).optional(),
    explode: z.string().min(1).optional(),
    carry: z.array(z.string().min(1)).optional(),
    parentKey: z.string().min(1).optional()
  })
  // Exactly one of `path` (file source) or `derivesFrom` (derived source).
  .refine((d) => (d.path !== undefined) !== (d.derivesFrom !== undefined), {
    message:
      'dataSource must declare exactly one of `path` (file source) or `derivesFrom` (derived/exploded source)'
  })
  // A file source must declare a format; a derived source must declare what to explode.
  .refine((d) => d.path === undefined || d.format !== undefined, {
    message: 'a file dataSource (`path`) must declare `format`'
  })
  .refine((d) => d.derivesFrom === undefined || d.explode !== undefined, {
    message: 'a derived dataSource (`derivesFrom`) must also declare `explode`'
  })

export type DataSourceDecl = z.infer<typeof dataSourceSchema>

const colSpanSchema = z.number().int().min(1).max(12)
const colStartSchema = z.number().int().min(1).max(13)

const responsiveOverrideSchema = z.object({
  colSpan: colSpanSchema.optional(),
  colStart: colStartSchema.optional(),
  rowSpan: z.number().int().min(1).optional(),
  visible: z.boolean().optional()
})

// A `where` clause value: a literal (equality / `"*"` = exists) or an operator
// object. Multiple fields in a `where` map are ANDed. Used to scope aggregates.
const whereClauseSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({
    in: z.array(z.unknown()).optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    ne: z.unknown().optional(),
    exists: z.boolean().optional()
  })
])

const sourceBindingSchema = z.object({
  ref: z.string().min(1),
  filter: z.record(z.unknown()).optional(),
  // §8 aggregation (runtime-computed, pure read). `agg` reduces the records the
  // binding resolves to a scalar; `where` scopes WHICH records the aggregate
  // counts (defaults to the filtered set, independent of the records the widget
  // still receives for lists/lanes). `of` is the ratio numerator predicate
  // (`"field==value"` / `"field!=value"` / `"field"`) or, for `sum`, the numeric
  // field. The result is injected into the widget config as `value` (+ raw
  // `aggCount`/`aggTotal`/`aggRatio`); an author-set `config.value` wins.
  agg: z.enum(['count', 'ratio', 'sum']).optional(),
  where: z.record(whereClauseSchema).optional(),
  of: z.string().min(1).optional(),
  ratioFormat: z.enum(['percent', 'fraction', 'raw']).optional(),
  // Read scope for a project-scoped source: 'project' (default — the selected
  // project) or 'all-projects' (every registered project, merged, each record
  // tagged with `projectId`). 'all-projects' powers a cross-project Panorama.
  scope: z.enum(['project', 'all-projects']).optional(),
  // §2c drill-down. A string matches a single route param against r.id/r.slug.
  // `{ match: [...] }` matches each entry against a route param: a bare string
  // `"f"` means record[f] === route.params[f]; an object `{field, param}` maps a
  // record field to a differently-named route param (e.g. filter children by
  // `{field: planSlug, param: slug}` on a /plan/:projectId/:slug page).
  param: z
    .union([
      z.string(),
      z.object({
        match: z
          .array(
            z.union([
              z.string().min(1),
              z.object({ field: z.string().min(1), param: z.string().min(1) }),
              // Read from page interaction state instead of a route param: match
              // record[field] against pageState[state] (set by another widget's `emits`).
              z.object({ field: z.string().min(1), state: z.string().min(1) })
            ])
          )
          .min(1)
      })
    ])
    .optional()
})

/**
 * Explicit recursive type for a widget binding. `slots` (§2b widget composition)
 * makes the binding self-referential, so the schema is declared via `z.lazy()`
 * with this hand-written type — the same pattern as `handlerDeclSchema` below.
 */
/** `repeat: { ref }` — fan out one widget instance per record of `ref`. */
export interface RepeatSource {
  ref: string
  filter?: Record<string, unknown>
  param?: z.infer<typeof sourceBindingSchema>['param']
}

export interface WidgetBinding {
  widget: string
  colSpan?: number
  colStart?: number
  rowSpan?: number
  minColSpan?: number
  maxColSpan?: number
  source?: z.infer<typeof sourceBindingSchema>
  config?: Record<string, unknown>
  // §0.3 role→field sugar: `{ title: name }` expands to `config.titleField = 'name'`
  // before render (author-set `<role>Field` wins). Zero widget changes.
  fieldMap?: Record<string, string>
  // Cross-widget bus: map a widget event (e.g. `select`) to a page-state write.
  // `{ select: { set: selectedPhase } }` → selecting writes pageState.selectedPhase.
  emits?: Record<string, { set: string; value?: string }>
  // A string groups the widget's own records by that field; an object fans out
  // one instance per record of another source (each record is the instance scope).
  repeat?: string | RepeatSource
  repeatDirection?: 'horizontal' | 'vertical'
  maxRepeatColumns?: number
  /** Sibling field whose value labels each repeat group, instead of the raw grouping key. */
  repeatLabelField?: string
  /** Group-header visibility. `auto` (default) hides the header when there is a single group. */
  repeatLabel?: 'auto' | 'always' | 'never'
  responsive?: {
    sm?: z.infer<typeof responsiveOverrideSchema>
    md?: z.infer<typeof responsiveOverrideSchema>
    lg?: z.infer<typeof responsiveOverrideSchema>
    xl?: z.infer<typeof responsiveOverrideSchema>
  }
  /** Named slot -> ordered child widget bindings (rendered inside this host widget). */
  slots?: Record<string, WidgetBinding[]>
}

const widgetBindingSchema: z.ZodType<WidgetBinding> = z.lazy(() =>
  z.object({
    widget: z.string().min(1),
    colSpan: colSpanSchema.optional(),
    colStart: colStartSchema.optional(),
    rowSpan: z.number().int().min(1).optional(),
    minColSpan: colSpanSchema.optional(),
    maxColSpan: colSpanSchema.optional(),
    source: sourceBindingSchema.optional(),
    config: z.record(z.unknown()).optional(),
    fieldMap: z.record(z.string().min(1)).optional(),
    emits: z
      .record(z.object({ set: z.string().min(1), value: z.string().min(1).optional() }))
      .optional(),
    repeat: z
      .union([
        z.string(),
        z.object({
          ref: z.string().min(1),
          filter: z.record(z.unknown()).optional(),
          param: sourceBindingSchema.shape.param
        })
      ])
      .optional(),
    repeatDirection: z.enum(['horizontal', 'vertical']).optional(),
    maxRepeatColumns: z.number().optional(),
    repeatLabelField: z.string().optional(),
    repeatLabel: z.enum(['auto', 'always', 'never']).optional(),
    responsive: z
      .object({
        sm: responsiveOverrideSchema.optional(),
        md: responsiveOverrideSchema.optional(),
        lg: responsiveOverrideSchema.optional(),
        xl: responsiveOverrideSchema.optional()
      })
      .optional(),
    slots: z.record(z.array(widgetBindingSchema)).optional()
  })
)

const sectionSchema = z.object({
  title: z.string().optional(),
  collapsible: z.boolean().optional(),
  columns: z.number().int().min(1).optional(),
  gap: z.number().optional(),
  align: z.string().optional(),
  padding: z.string().optional(),
  visible: z.union([z.boolean(), z.string()]).optional(),
  autoGrid: z.boolean().optional(),
  maxColumns: z.number().optional(),
  minCardWidth: z.string().optional(),
  fillScreen: z.boolean().optional(),
  widgets: z.array(widgetBindingSchema)
})

const sectionsPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  layout: z.literal('sections'),
  icon: z.string().optional(),
  default: z.boolean().optional(),
  route: z.string().optional(),
  sections: z.array(sectionSchema).optional()
})

const gridPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  layout: z.literal('grid'),
  icon: z.string().optional(),
  default: z.boolean().optional(),
  route: z.string().optional(),
  columns: z.number().int().min(1).optional(),
  rowHeight: z.number().optional(),
  gap: z.number().optional(),
  align: z.string().optional(),
  padding: z.string().optional(),
  widgets: z.array(widgetBindingSchema).optional()
})

const singlePageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  layout: z.literal('single'),
  icon: z.string().optional(),
  default: z.boolean().optional(),
  route: z.string().optional(),
  widget: z.string().optional(),
  source: sourceBindingSchema.optional(),
  config: z.record(z.unknown()).optional()
})

const pageSchema = z.discriminatedUnion('layout', [
  sectionsPageSchema,
  gridPageSchema,
  singlePageSchema
])

export type PageDecl = z.infer<typeof pageSchema>

const fileMutationHandlerSchema = z.object({
  type: z.literal('file-mutation'),
  target: z.string().min(1),
  operation: z.enum(['set', 'append']),
  field: z.string().optional(),
  record: z.record(z.unknown()).optional()
})

const shellExecHandlerSchema = z.object({
  type: z.literal('shell-exec'),
  command: z.string().min(1),
  timeout: z.number().optional()
})

const scriptHandlerSchema = z.object({
  type: z.literal('script'),
  source: z.string().min(1)
})

export type HandlerDecl =
  | z.infer<typeof fileMutationHandlerSchema>
  | z.infer<typeof shellExecHandlerSchema>
  | z.infer<typeof scriptHandlerSchema>
  | { type: 'composite'; steps: HandlerDecl[] }

export const handlerDeclSchema: z.ZodType<HandlerDecl> = z.lazy(() =>
  z.union([
    fileMutationHandlerSchema,
    shellExecHandlerSchema,
    scriptHandlerSchema,
    z.object({
      type: z.literal('composite'),
      steps: z.array(handlerDeclSchema)
    })
  ])
)

const toolInputSchema = z.object({
  type: z.literal('object'),
  required: z.array(z.string()).optional(),
  properties: z.record(z.record(z.unknown()))
})

const toolDeclarationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  input: toolInputSchema,
  handler: handlerDeclSchema
})

export type ToolDeclaration = z.infer<typeof toolDeclarationSchema>

const customComponentSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1)
})

const navSchema = z.object({
  // 'projects' = a project-centric shell: a fixed cross-project landing pinned at
  // the top of the sidebar + the consumer's registered projects listed as the
  // primary nav unit. A purely generic shell capability over the project-registry;
  // any human label still comes from `projectsLabel` (never hardcoded).
  style: z.enum(['tabs', 'sidebar', 'projects']).optional(),
  showIcons: z.boolean().optional(),
  // Human label for the projects group in the sidebar (style:'projects'). The
  // consumer owns the word; the runtime defaults to a generic English label.
  projectsLabel: z.string().min(1).optional(),
  // Slug of the page used as the cross-project landing (style:'projects'). Defaults
  // to the page with `default: true`. Refined below to a declared page slug.
  landingPage: z.string().min(1).optional()
})

// One of the five design-system tones. A consumer's domain status words map onto
// these; widgets only ever know tones, never a consumer's vocabulary.
const toneSchema = z.enum(['success', 'warning', 'error', 'info', 'neutral'])

/**
 * Consumer status vocabulary -> presentation, declared once at the manifest top
 * level instead of repeated in every widget's `config.statuses`. A value may be
 * a bare tone (`active: info`) or the full triple (`active: { tone, label,
 * glyph }`). Threaded to widgets as a default that a widget's own
 * `config.statuses` still overrides. Domain words stay consumer-owned; aiDeck
 * core privileges none of them.
 */
const statusMapSchema = z.record(
  z.union([
    toneSchema,
    z.object({
      tone: toneSchema.optional(),
      label: z.string().optional(),
      glyph: z.string().optional()
    })
  ])
)
export type StatusMapDecl = z.infer<typeof statusMapSchema>

// Opt-in record indexing for the runtime command palette (⌘K). Each entry names
// a dataSource to index, the field to title each record by, and a route template
// (`:consumerId` + `:field` tokens resolved per record). Chrome, not a widget.
const commandPaletteSchema = z.object({
  records: z
    .array(
      z.object({
        ref: z.string().min(1),
        titleField: z.string().min(1).optional(),
        subtitleField: z.string().min(1).optional(),
        route: z.string().min(1)
      })
    )
    .optional()
})
export type CommandPaletteDecl = z.infer<typeof commandPaletteSchema>

export const manifestSchema = z.object({
  schemaVersion: z.literal('0.1'),
  id: z.string().min(1).max(64),
  mcpNamespace: mcpNamespaceSchema,
  title: z.string().min(1),
  icon: z.string().optional(),
  dataSources: z.array(dataSourceSchema),
  nav: navSchema.optional(),
  // Slug of the page the chrome `?` button opens (a catalog/help page reached
  // from chrome, not the normal page nav). Refined below to a real page slug.
  help: z.string().min(1).optional(),
  statusMap: statusMapSchema.optional(),
  commandPalette: commandPaletteSchema.optional(),
  pages: z.array(pageSchema),
  tools: z.array(toolDeclarationSchema).optional(),
  components: z.array(customComponentSchema).optional()
})
  // `help` must name a declared page — a dangling help slug is a silent dead
  // `?` button, exactly the kind of false-green the schema exists to prevent.
  .refine((m) => m.help === undefined || m.pages.some((p) => p.slug === m.help), {
    message: 'manifest.help must reference a declared page slug',
    path: ['help']
  })
  // Same guard for the projects-mode landing: a dangling slug would silently
  // route the consumer root to nothing.
  .refine(
    (m) => m.nav?.landingPage === undefined || m.pages.some((p) => p.slug === m.nav?.landingPage),
    {
      message: 'manifest.nav.landingPage must reference a declared page slug',
      path: ['nav', 'landingPage']
    }
  )

export type Manifest = z.infer<typeof manifestSchema>

export function parseManifest(raw: unknown): Result<Manifest, ErrorResponse> {
  return parseOrError(manifestSchema, raw, { entity: 'manifest' })
}
