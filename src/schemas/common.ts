/**
 * Common schema primitives shared across all consumers.
 *
 * Versioning: schemas are versioned via `schemaVersion` on every payload.
 * Consumers must check version compatibility before parsing.
 */

export const SCHEMA_VERSION = '0.1' as const
export type SchemaVersion = typeof SCHEMA_VERSION

export type IsoTimestamp = string

export type ConsumerId = string

export interface SchemaVersioned {
  schemaVersion: SchemaVersion
}

/**
 * Reference to an external artifact (file path, URL, repo path).
 * Cross-document references are first-class in the data model because real
 * plans heavily reference PRDs, runbooks, ADRs, external repos.
 */
export interface ArtifactRef {
  kind: 'file' | 'url' | 'repo-path' | 'section'
  path: string
  label?: string
  section?: string
  inside_repo?: boolean
  gitignored?: boolean
}

export interface Annotation {
  id: string
  target: AnnotationTarget
  author: 'human' | 'ai'
  body: string
  createdAt: IsoTimestamp
  resolved?: boolean
  resolvedAt?: IsoTimestamp
}

/**
 * AnnotationTarget uses dotted-path syntax to address entities.
 * Examples:
 *   { consumer: 'project-status', slug: 'v3-redesign', path: 'phases.F2' }
 *   { consumer: 'project-status', slug: 'v3-f0-foundation-repair', path: 'tasks.T-005' }
 *   { consumer: 'project-status', slug: 'v3-redesign', path: 'principles.2' }
 */
export interface AnnotationTarget {
  consumer: ConsumerId
  slug?: string
  path: string
}

export interface Highlight {
  id: string
  target: AnnotationTarget
  reason: string
  source: 'human' | 'ai'
  severity: 'info' | 'warn' | 'critical'
  createdAt: IsoTimestamp
  acknowledged?: boolean
  acknowledgedAt?: IsoTimestamp
}

export interface Decision {
  id: string
  target: AnnotationTarget
  decision: 'approve' | 'reject' | 'block' | 'defer'
  reason?: string
  by: 'human' | 'ai'
  createdAt: IsoTimestamp
}

export interface InboxItem {
  id: string
  consumer: ConsumerId
  kind: 'annotation' | 'highlight' | 'decision'
  payload: Annotation | Highlight | Decision
  createdAt: IsoTimestamp
  consumed?: IsoTimestamp
}

export interface ErrorResponse {
  code:
    | 'consumer_unknown'
    | 'slug_not_found'
    | 'path_not_found'
    | 'schema_version_mismatch'
    | 'invalid_input'
    | 'precondition_failed'
    | 'io_error'
    | 'internal_error'
  message: string
  suggestion?: string
  details?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEND-ONLY JSONL RECORDS
// Every mutation of state is a new JSONL line. aiDeck never edits a line that
// was previously written; consumers (or the demo fake-consumer) read the
// append-only stream and apply the projection into the canonical files.
// ─────────────────────────────────────────────────────────────────────────────

/** Closes an annotation by reference. Original annotation line is NEVER edited. */
export interface Resolution extends SchemaVersioned {
  kind: 'resolution'
  refId: string
  by: 'human' | 'ai'
  resolvedAt: IsoTimestamp
  note?: string
}

/** Closes a highlight by reference. Original highlight line is NEVER edited. */
export interface Acknowledgement extends SchemaVersioned {
  kind: 'acknowledgement'
  refId: string
  by: 'human' | 'ai'
  acknowledgedAt: IsoTimestamp
}

/**
 * MCP mutation tool intent. aiDeck writes this to `inbox/`; the consumer skill
 * tails the inbox and applies the operation to the canonical entity file.
 */
export interface IntentRecord extends SchemaVersioned {
  kind: 'intent'
  intentId: string
  operation:
    | 'mark_task_done'
    | 'update_initiative_status'
    | 'update_next_action'
    | 'push_frame'
    | 'pop_frame'
    | 'park_item'
    | 'emerge_item'
    | 'promote_parked'
    | 'add_task'
  target: {
    initiativeSlug?: string
    taskId?: string
    planSlug?: string
    phaseId?: string
  }
  args: Record<string, unknown>
  by: 'human' | 'ai'
  requestedAt: IsoTimestamp
}

/** Consumer skill ack of an applied (or rejected) intent. */
export interface IntentApplication extends SchemaVersioned {
  kind: 'intent_application'
  refId: string
  appliedAt: IsoTimestamp
  by: string
  result: 'applied' | 'rejected' | 'partial'
  note?: string
}

/** Exit-gate verifier execution result. */
export interface VerifierResult extends SchemaVersioned {
  kind: 'verifier_result'
  verifierResultId: string
  criterionRef: {
    target: 'plan' | 'phase' | 'initiative' | 'task'
    planSlug?: string
    initiativeSlug?: string
    phaseId?: string
    taskId?: string
    criterionId: string
  }
  result: 'met' | 'pending' | 'deferred'
  evidence?: string
  verifierOutput?: string
  ranAt: IsoTimestamp
  by: 'human' | 'ai'
}
