import { z } from 'zod'
import { type Result, parseOrError } from '../schemas/validators/index.js'
import type { ErrorResponse } from '../schemas/common.js'

export type { Result }

const mcpNamespaceSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,31}$/, 'mcpNamespace must match [a-z][a-z0-9_]{0,31}')

const dataSourceSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  format: z.enum(['yaml', 'frontmatter', 'json', 'jsonl']),
  schema: z.record(z.unknown()).optional()
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
  param: z.string().optional()
})

const widgetBindingSchema = z.object({
  widget: z.string().min(1),
  colSpan: colSpanSchema.optional(),
  colStart: colStartSchema.optional(),
  rowSpan: z.number().int().min(1).optional(),
  minColSpan: colSpanSchema.optional(),
  maxColSpan: colSpanSchema.optional(),
  source: sourceBindingSchema.optional(),
  config: z.record(z.unknown()).optional(),
  responsive: z
    .object({
      sm: responsiveOverrideSchema.optional(),
      md: responsiveOverrideSchema.optional(),
      lg: responsiveOverrideSchema.optional(),
      xl: responsiveOverrideSchema.optional()
    })
    .optional()
})

export type WidgetBinding = z.infer<typeof widgetBindingSchema>

const sectionSchema = z.object({
  title: z.string().optional(),
  collapsible: z.boolean().optional(),
  columns: z.number().int().min(1).optional(),
  gap: z.number().optional(),
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
