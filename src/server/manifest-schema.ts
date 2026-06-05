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

const sourceBindingSchema = z.object({
  ref: z.string().min(1),
  filter: z.record(z.unknown()).optional(),
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
              z.object({ field: z.string().min(1), param: z.string().min(1) })
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
export interface WidgetBinding {
  widget: string
  colSpan?: number
  colStart?: number
  rowSpan?: number
  minColSpan?: number
  maxColSpan?: number
  source?: z.infer<typeof sourceBindingSchema>
  config?: Record<string, unknown>
  repeat?: string
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
    repeat: z.string().optional(),
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
  style: z.enum(['tabs', 'sidebar']).optional(),
  showIcons: z.boolean().optional()
})

export const manifestSchema = z.object({
  schemaVersion: z.literal('0.1'),
  id: z.string().min(1).max(64),
  mcpNamespace: mcpNamespaceSchema,
  title: z.string().min(1),
  icon: z.string().optional(),
  dataSources: z.array(dataSourceSchema),
  nav: navSchema.optional(),
  pages: z.array(pageSchema),
  tools: z.array(toolDeclarationSchema).optional(),
  components: z.array(customComponentSchema).optional()
})

export type Manifest = z.infer<typeof manifestSchema>

export function parseManifest(raw: unknown): Result<Manifest, ErrorResponse> {
  return parseOrError(manifestSchema, raw, { entity: 'manifest' })
}
