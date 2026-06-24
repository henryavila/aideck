// Runtime source aggregation (§8). aiDeck computes counts/ratios/sums on read so
// a consumer no longer has to precompute them in its emitter. This is a pure,
// regenerable read over records already fetched from canonical files — it never
// becomes authoritative state (canonical-data-pattern).

export type AggKind = 'count' | 'ratio' | 'sum'
export type RatioFormat = 'percent' | 'fraction' | 'raw'

type Op = {
  in?: unknown[]
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  ne?: unknown
  exists?: boolean
}
export type WhereClause = string | number | boolean | Op
export type Where = Record<string, WhereClause>

type Rec = Record<string, unknown>

function isOp(v: WhereClause): v is Op {
  return typeof v === 'object' && v !== null
}

function present(v: unknown): boolean {
  return v !== undefined && v !== null && v !== ''
}

/** Does a record satisfy one field clause? */
function matchesClause(value: unknown, clause: WhereClause): boolean {
  // `"*"` is the exists shorthand (e.g. `blockedBy: "*"`).
  if (clause === '*') return present(value)
  if (!isOp(clause)) {
    if (typeof clause === 'boolean') return value === clause
    return String(value) === String(clause)
  }
  if (clause.exists !== undefined && present(value) !== clause.exists) return false
  if (clause.in !== undefined && !clause.in.some((c) => String(c) === String(value))) return false
  if (clause.ne !== undefined && String(value) === String(clause.ne)) return false
  const n = typeof value === 'number' ? value : Number(value)
  if (clause.gt !== undefined && !(n > clause.gt)) return false
  if (clause.gte !== undefined && !(n >= clause.gte)) return false
  if (clause.lt !== undefined && !(n < clause.lt)) return false
  if (clause.lte !== undefined && !(n <= clause.lte)) return false
  return true
}

/** All field clauses must hold (AND). An empty/absent where matches everything. */
export function matchesWhere(record: Rec, where?: Where): boolean {
  if (!where) return true
  return Object.entries(where).every(([field, clause]) => matchesClause(record[field], clause))
}

// A ratio/sum `of` predicate: `"field==value"`, `"field!=value"`, or `"field"`
// (truthy). For `sum`, `of` is a bare numeric field name (handled in aggregate).
function matchesPredicate(record: Rec, predicate: string): boolean {
  const eq = predicate.match(/^(.+?)==(.*)$/)
  if (eq) return String(record[eq[1].trim()]) === eq[2].trim()
  const ne = predicate.match(/^(.+?)!=(.*)$/)
  if (ne) return String(record[ne[1].trim()]) !== ne[2].trim()
  return present(record[predicate.trim()]) && record[predicate.trim()] !== false
}

export interface AggResult {
  /** Display string for `config.value` (count/sum number, or formatted ratio). */
  value: string
  count: number
  total: number
  ratio: number
}

export interface AggSpec {
  agg: AggKind
  where?: Where
  of?: string
  ratioFormat?: RatioFormat
}

export function aggregate(records: Rec[], spec: AggSpec): AggResult {
  const matched = records.filter((r) => matchesWhere(r, spec.where))
  const total = matched.length

  if (spec.agg === 'count') {
    return { value: String(total), count: total, total, ratio: 0 }
  }

  if (spec.agg === 'sum') {
    const sum = spec.of
      ? matched.reduce((acc, r) => acc + (Number(r[spec.of as string]) || 0), 0)
      : total
    return { value: String(sum), count: sum, total, ratio: 0 }
  }

  // ratio: numerator = matched records ALSO satisfying `of`; denominator = matched.
  const num = spec.of ? matched.filter((r) => matchesPredicate(r, spec.of as string)).length : 0
  const ratio = total === 0 ? 0 : num / total
  const fmt = spec.ratioFormat ?? 'percent'
  const value =
    fmt === 'fraction'
      ? `${num}/${total}`
      : fmt === 'raw'
        ? String(Math.round(ratio * 1000) / 1000)
        : `${Math.round(ratio * 100)}%`
  return { value, count: num, total, ratio }
}

/**
 * Expand `fieldMap: { role: field }` into the flat `config.<role>Field` keys that
 * widgets already read. An author-set `<role>Field` wins. Returns a new config;
 * the input is not mutated. Returns the input unchanged when there is no fieldMap.
 */
export function applyFieldMap(
  config: Record<string, unknown>,
  fieldMap?: Record<string, string>
): Record<string, unknown> {
  if (!fieldMap || Object.keys(fieldMap).length === 0) return config
  const out: Record<string, unknown> = { ...config }
  for (const [role, field] of Object.entries(fieldMap)) {
    const key = `${role}Field`
    if (out[key] === undefined) out[key] = field
  }
  return out
}
