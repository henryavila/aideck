import { z } from 'zod'

export const schemaVersionSchema = z.literal('0.1')

export const isoTimestampSchema = z.string()

export const artifactRefSchema = z.object({
  kind: z.enum(['file', 'url', 'repo-path', 'section']),
  path: z.string(),
  label: z.string().optional(),
  section: z.string().optional(),
  inside_repo: z.boolean().optional(),
  gitignored: z.boolean().optional()
})

export const annotationTargetSchema = z.object({
  consumer: z.string(),
  slug: z.string().optional(),
  path: z.string()
})

export const annotationSchema = z.object({
  id: z.string(),
  target: annotationTargetSchema,
  author: z.enum(['human', 'ai']),
  body: z.string(),
  createdAt: isoTimestampSchema,
  resolved: z.boolean().optional(),
  resolvedAt: isoTimestampSchema.optional()
})

export const highlightSchema = z.object({
  id: z.string(),
  target: annotationTargetSchema,
  reason: z.string(),
  source: z.enum(['human', 'ai']),
  severity: z.enum(['info', 'warn', 'critical']),
  createdAt: isoTimestampSchema,
  acknowledged: z.boolean().optional(),
  acknowledgedAt: isoTimestampSchema.optional()
})

export const decisionSchema = z.object({
  id: z.string(),
  target: annotationTargetSchema,
  decision: z.enum(['approve', 'reject', 'block', 'defer']),
  reason: z.string().optional(),
  by: z.enum(['human', 'ai']),
  createdAt: isoTimestampSchema
})

export const inboxItemSchema = z.object({
  id: z.string(),
  consumer: z.string(),
  kind: z.enum(['annotation', 'highlight', 'decision']),
  payload: z.union([annotationSchema, highlightSchema, decisionSchema]),
  createdAt: isoTimestampSchema,
  consumed: isoTimestampSchema.optional()
})

export const errorResponseSchema = z.object({
  code: z.enum([
    'consumer_unknown',
    'slug_not_found',
    'path_not_found',
    'schema_version_mismatch',
    'invalid_input',
    'precondition_failed',
    'io_error',
    'internal_error'
  ]),
  message: z.string(),
  suggestion: z.string().optional(),
  details: z.record(z.unknown()).optional()
})

// ─────────────────────────────────────────────────────────────────────────────
// APPEND-ONLY JSONL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

export const resolutionSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('resolution'),
  refId: z.string(),
  by: z.enum(['human', 'ai']),
  resolvedAt: isoTimestampSchema,
  note: z.string().optional()
})

export const acknowledgementSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('acknowledgement'),
  refId: z.string(),
  by: z.enum(['human', 'ai']),
  acknowledgedAt: isoTimestampSchema
})

export const intentOperationSchema = z.enum([
  'mark_task_done',
  'update_initiative_status',
  'update_next_action',
  'push_frame',
  'pop_frame',
  'park_item',
  'emerge_item',
  'promote_parked',
  'add_task'
])

export const intentRecordSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('intent'),
  intentId: z.string(),
  operation: intentOperationSchema,
  target: z.object({
    initiativeSlug: z.string().optional(),
    taskId: z.string().optional(),
    planSlug: z.string().optional(),
    phaseId: z.string().optional()
  }),
  args: z.record(z.unknown()),
  by: z.enum(['human', 'ai']),
  requestedAt: isoTimestampSchema
})

export const intentApplicationSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('intent_application'),
  refId: z.string(),
  appliedAt: isoTimestampSchema,
  by: z.string(),
  result: z.enum(['applied', 'rejected', 'partial']),
  note: z.string().optional()
})

export const verifierResultSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('verifier_result'),
  verifierResultId: z.string(),
  criterionRef: z.object({
    target: z.enum(['plan', 'phase', 'initiative', 'task']),
    planSlug: z.string().optional(),
    initiativeSlug: z.string().optional(),
    phaseId: z.string().optional(),
    taskId: z.string().optional(),
    criterionId: z.string()
  }),
  result: z.enum(['met', 'pending', 'deferred']),
  evidence: z.string().optional(),
  verifierOutput: z.string().optional(),
  ranAt: isoTimestampSchema,
  by: z.enum(['human', 'ai'])
})
