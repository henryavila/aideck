/**
 * Pre-validation normalization for plan and initiative YAML.
 *
 * Coerces known legacy field names and enum synonyms so that files
 * written before the strict schema still parse without manual migration.
 * Runs BEFORE zod validation — the schema stays strict, this layer
 * is the only place that tolerates drift.
 */

type Obj = Record<string, unknown>

const GATE_STATUS_COERCE: Record<string, string> = {
  passed: 'met',
  pass: 'met',
  done: 'met',
  skipped: 'deferred',
  skip: 'deferred',
  na: 'deferred',
  'n/a': 'deferred',
}

const INITIATIVE_FIELD_MAP: Record<string, string> = {
  initiative_id: 'slug',
  last_updated: 'lastUpdated',
  next_action: 'nextAction',
  parent_plan: 'parentPlan',
  phase_id: 'phaseId',
  exit_gates: 'exitGates',
  external_imports: 'externalImports',
  cross_task_refs: 'crossTaskRefs',
  plan_link: '_planLink',
}

const TASK_FIELD_MAP: Record<string, string> = {
  last_updated: 'lastUpdated',
  closed_at: 'closedAt',
  blocked_by: 'blockedBy',
  resource_counts: 'resourceCounts',
}

const STACK_FIELD_MAP: Record<string, string> = {
  opened_at: 'openedAt',
}

const STACK_TYPE_COERCE: Record<string, string> = {
  initiative: 'task',
  bug: 'task',
  feature: 'task',
  fix: 'task',
  refactor: 'task',
  review: 'validation',
  investigation: 'research',
  explore: 'research',
  meeting: 'discussion',
}

function isObj(v: unknown): v is Obj {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Coerce date-only strings to ISO timestamps and null to epoch. */
function coerceTimestamp(v: unknown): unknown {
  if (v === null || v === undefined) return '1970-01-01T00:00:00Z'
  if (typeof v === 'string' && DATE_ONLY_RE.test(v)) return `${v}T00:00:00Z`
  return v
}

function normalizeRef(ref: unknown): unknown {
  // String reference: "path — description" or just "path"
  if (typeof ref === 'string') {
    const dashIdx = ref.indexOf(' — ')
    if (dashIdx >= 0) {
      const path = ref.slice(0, dashIdx).trim()
      const label = ref.slice(dashIdx + 3).trim()
      const kind = path.startsWith('http') ? 'url' : 'file'
      return { kind, path, label }
    }
    return { kind: ref.startsWith('http') ? 'url' : 'file', path: ref }
  }
  if (!isObj(ref)) return ref
  const out = { ...ref }
  if (!out.kind && out.path) {
    const path = String(out.path)
    out.kind = path.startsWith('http://') || path.startsWith('https://') ? 'url' : 'file'
  }
  if (out.title && !out.label) {
    out.label = out.title
    delete out.title
  }
  return out
}

function renameKeys(obj: Obj, map: Record<string, string>): Obj {
  const out: Obj = {}
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] ?? k] = v
  }
  return out
}

function coerceGateStatus(criterion: unknown): unknown {
  if (!isObj(criterion)) return criterion
  const status = criterion.status
  if (typeof status === 'string') {
    const lower = status.toLowerCase()
    if (GATE_STATUS_COERCE[lower]) {
      return { ...criterion, status: GATE_STATUS_COERCE[lower] }
    }
  }
  return criterion
}

function normalizeCriteria(gate: unknown): unknown {
  if (!isObj(gate)) return gate
  const criteria = gate.criteria
  if (!Array.isArray(criteria)) return gate
  return { ...gate, criteria: criteria.map(coerceGateStatus) }
}

const PHASE_STRIP_KEYS = new Set([
  'initiativeSlug', 'tag', 'taskCount', 'planDoc', 'completed', 'started',
  'initiative_slug', 'task_count', 'plan_doc',
])

function normalizePhase(phase: unknown): unknown {
  if (!isObj(phase)) return phase
  const out: Obj = {}
  for (const [k, v] of Object.entries(phase)) {
    if (!PHASE_STRIP_KEYS.has(k)) out[k] = v
  }

  // Derive slug from id + title if missing
  if (!out.slug && out.id && out.title) {
    const id = String(out.id).toLowerCase()
    const title = String(out.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
    out.slug = `${id}-${title}`
  }

  if (out.dependsOn === undefined) out.dependsOn = []
  if (out.subPhaseCount === undefined) out.subPhaseCount = 0

  if (!isObj(out.exitGate)) {
    out.exitGate = { summary: '', criteria: [] }
  } else {
    out.exitGate = normalizeCriteria(out.exitGate)
  }

  return out
}

const TASK_STATUS_COERCE: Record<string, string> = {
  deferred: 'blocked',
  skipped: 'done',
  cancelled: 'done',
}

function normalizeTask(task: unknown): unknown {
  if (!isObj(task)) return task
  const out = renameKeys(task as Obj, TASK_FIELD_MAP)
  out.lastUpdated = coerceTimestamp(out.lastUpdated)
  if (out.closedAt !== undefined) out.closedAt = coerceTimestamp(out.closedAt)
  if (typeof out.status === 'string' && TASK_STATUS_COERCE[out.status]) {
    out.status = TASK_STATUS_COERCE[out.status]
  }
  return out
}

const PARKED_FIELD_MAP: Record<string, string> = {
  surfaced_at: 'surfacedAt',
  from_frame: 'fromFrame',
}

const LEGACY_CONTEXT = {
  solves: '(legacy — migrated from pre-schema format)',
  trigger: '(legacy — migrated from pre-schema format)',
  assumesStillValid: [],
  ratifiedAt: '1970-01-01T00:00:00Z',
  ratifiedBy: 'human' as const,
}

function normalizeParkedItem(item: unknown): unknown {
  if (!isObj(item)) return item
  const out = renameKeys(item as Obj, PARKED_FIELD_MAP)
  out.surfacedAt = coerceTimestamp(out.surfacedAt)
  if (out.fromFrame === undefined) out.fromFrame = null
  if (!isObj(out.context)) out.context = { ...LEGACY_CONTEXT }
  return out
}

function normalizeEmergedItem(item: unknown): unknown {
  if (!isObj(item)) return item
  const out = renameKeys(item as Obj, PARKED_FIELD_MAP)
  out.surfacedAt = coerceTimestamp(out.surfacedAt)
  if (out.promoted === undefined) out.promoted = false
  if (!isObj(out.context)) out.context = { ...LEGACY_CONTEXT }
  return out
}

function normalizeStackFrame(frame: unknown): unknown {
  if (!isObj(frame)) return frame
  const out = renameKeys(frame as Obj, STACK_FIELD_MAP)
  if (typeof out.type === 'string') {
    const coerced = STACK_TYPE_COERCE[out.type.toLowerCase()]
    if (coerced) out.type = coerced
  }
  out.openedAt = coerceTimestamp(out.openedAt)
  return out
}

export function normalizePlan(raw: unknown): unknown {
  if (!isObj(raw)) return raw
  const obj = { ...(raw as Obj) }

  if (Array.isArray(obj.phases)) {
    obj.phases = obj.phases.map(normalizePhase)
  }
  if (Array.isArray(obj.references)) {
    obj.references = (obj.references as unknown[]).map(normalizeRef)
  }

  return obj
}

export function normalizeInitiative(raw: unknown): unknown {
  if (!isObj(raw)) return raw
  let obj = renameKeys(raw as Obj, INITIATIVE_FIELD_MAP)

  if (!obj.schemaVersion && (obj.slug || obj.title)) {
    obj.schemaVersion = '0.1'
  }

  // Legacy files often lack required scalar fields
  if (obj.title === undefined) obj.title = obj.slug ?? ''
  if (obj.goal === undefined) obj.goal = obj.title ?? ''
  if (obj.nextAction === undefined) obj.nextAction = null
  if (obj.branch === undefined) obj.branch = null

  // Coerce date-only and null timestamps
  obj.started = coerceTimestamp(obj.started)
  obj.lastUpdated = coerceTimestamp(obj.lastUpdated)

  // Legacy files often lack arrays that the schema requires
  if (obj.exitGates === undefined) obj.exitGates = []
  if (obj.stack === undefined) obj.stack = []
  if (obj.tasks === undefined) obj.tasks = []
  if (isObj(obj.tasks)) {
    obj.tasks = Object.entries(obj.tasks as Obj).map(([id, v]) =>
      isObj(v) ? { id, ...v } : { id, title: String(v), status: 'pending', lastUpdated: '1970-01-01T00:00:00Z' }
    )
  }
  if (obj.parked === undefined) obj.parked = []
  if (obj.emerged === undefined) obj.emerged = []

  if (Array.isArray(obj.exitGates)) {
    obj.exitGates = (obj.exitGates as unknown[]).map(coerceGateStatus)
  }
  if (Array.isArray(obj.tasks)) {
    obj.tasks = (obj.tasks as unknown[]).map(normalizeTask)
  }
  if (Array.isArray(obj.stack)) {
    obj.stack = (obj.stack as unknown[]).map(normalizeStackFrame)
  }
  if (Array.isArray(obj.parked)) {
    obj.parked = (obj.parked as unknown[]).map(normalizeParkedItem)
  }
  if (Array.isArray(obj.emerged)) {
    obj.emerged = (obj.emerged as unknown[]).map(normalizeEmergedItem)
  }

  if (Array.isArray(obj.references)) {
    obj.references = (obj.references as unknown[]).map(normalizeRef)
  }

  // Convert legacy scope_paths to scope.paths
  if (Array.isArray(obj.scope_paths) && !obj.scope) {
    obj.scope = { paths: obj.scope_paths }
  }

  // Strip legacy-only keys that strict mode rejects
  const INIT_STRIP = [
    '_planLink', 'archived', 'plan_link',
    'worktree', 'wip_limit', 'scope_paths',
    'max_stack_depth_warning',
  ]
  for (const k of INIT_STRIP) delete obj[k]

  return obj
}
