import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname, basename } from 'node:path'
import type { ParsedArgs } from './args.js'
import { parseDiscoverRun, type Result } from '../schemas/validators/index.js'
import type { DiscoverRun } from '../schemas/discover-run.js'
import type { ErrorResponse } from '../schemas/common.js'

const VALID_BUCKETS = new Set(['strong', 'worth-reviewing', 'historical'])
const BUCKET_MAP: Record<string, string> = {
  worthReviewing: 'worth-reviewing',
  'worth_reviewing': 'worth-reviewing',
  worthreviewing: 'worth-reviewing',
}

const VALID_REL_KINDS = new Set(['plan-phase', 'shared-paths', 'shared-branch', 'subtopic'])
const REL_KIND_MAP: Record<string, string> = {
  'subsumed-by': 'subtopic',
  'superseded-by': 'subtopic',
  'likely-subsumes': 'subtopic',
  'depends-on': 'shared-paths',
  'blocked-by': 'shared-paths',
  dependsOn: 'shared-paths',
  blockedBy: 'shared-paths',
  planPhase: 'plan-phase',
  'plan_phase': 'plan-phase',
  sharedPaths: 'shared-paths',
  'shared_paths': 'shared-paths',
  sharedBranch: 'shared-branch',
  'shared_branch': 'shared-branch',
}

function generateRunId(): string {
  const now = new Date()
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `discover-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function normalizeBucket(raw: unknown): string {
  const s = String(raw)
  return BUCKET_MAP[s] ?? (VALID_BUCKETS.has(s) ? s : 'worth-reviewing')
}

function normalizeRelKind(raw: unknown): string {
  const s = String(raw)
  return REL_KIND_MAP[s] ?? (VALID_REL_KINDS.has(s) ? s : 'subtopic')
}

function normalizeSources(raw: unknown): Array<{ layer: string; label: string; signalCount: number }> {
  if (Array.isArray(raw)) {
    return raw.map((item: Record<string, unknown>) => ({
      layer: String(item.layer ?? 'unknown'),
      label: String(item.label ?? item.layer ?? 'unknown'),
      signalCount: Math.max(0, Math.floor(Number(item.signalCount ?? item.count ?? 0))),
    }))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([key, val]) => ({
      layer: key.replace(/-.*$/, ''),
      label: `${key} (${val})`,
      signalCount: Math.max(0, Math.floor(Number(val) || 0)),
    }))
  }
  return []
}

function normalizeTimeline(raw: unknown, fallbackDate: string): Array<{ date: string; count: number; types: string[] }> {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    if (typeof item === 'string') {
      const match = item.match(/^(\d{4}-\d{2}-\d{2})\s*/)
      return { date: match?.[1] ?? fallbackDate, count: 1, types: ['activity'] }
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      return {
        date: String(o.date ?? fallbackDate),
        count: Math.max(0, Math.floor(Number(o.count ?? 1))),
        types: Array.isArray(o.types) ? o.types.map(String) : ['activity'],
      }
    }
    return { date: fallbackDate, count: 1, types: ['activity'] }
  })
}

function normalizeEvidence(raw: unknown, slug: string, bucket: string, lastUpdated: string): Array<Record<string, string>> {
  if (!Array.isArray(raw)) return []
  return raw.map((item: Record<string, unknown>) => ({
    sourceType: String(item.sourceType ?? 'unknown'),
    sourceId: String(item.sourceId ?? 'unknown'),
    topicHint: String(item.topicHint ?? slug),
    evidenceQuote: String(item.evidenceQuote ?? item.quote ?? ''),
    candidateCompletion: String(item.candidateCompletion ?? (bucket === 'historical' ? 'done' : 'active')),
    lastActivity: String(item.lastActivity ?? lastUpdated),
  }))
}

function normalizeOrphans(raw: unknown): Array<Record<string, string>> {
  if (!Array.isArray(raw)) return []
  return raw.map((item: Record<string, unknown>) => ({
    id: String(item.id ?? `orphan-${Math.random().toString(36).slice(2, 10)}`),
    sourceType: String(item.sourceType ?? 'unknown'),
    sourceId: String(item.sourceId ?? 'unknown'),
    topicHint: String(item.topicHint ?? ''),
    evidenceQuote: String(item.evidenceQuote ?? item.quote ?? ''),
    lastActivity: String(item.lastActivity ?? new Date().toISOString().slice(0, 10)),
  }))
}

function normalizeRelationships(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return []
  return raw.map((item: Record<string, unknown>) => ({
    fromSlug: String(item.fromSlug ?? item.from ?? ''),
    toSlug: String(item.toSlug ?? item.to ?? ''),
    kind: normalizeRelKind(item.kind ?? item.type),
    sharedIdentifiers: Array.isArray(item.sharedIdentifiers) ? item.sharedIdentifiers.map(String) : [],
    strength: Math.min(1, Math.max(0, Number(item.strength ?? 0.5))),
  }))
}

export function normalizeDiscoverRun(loose: Record<string, unknown>): Record<string, unknown> {
  const candidates: Array<Record<string, unknown>> = []
  const alreadyTracked: string[] = Array.isArray(loose.alreadyTracked)
    ? loose.alreadyTracked.map((item: unknown) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'slug' in item) return String((item as Record<string, unknown>).slug)
        return String(item)
      })
    : []

  const rawCandidates = Array.isArray(loose.candidates) ? loose.candidates : []
  for (const raw of rawCandidates) {
    const c = raw as Record<string, unknown>
    const bucket = normalizeBucket(c.bucket)
    if (bucket === 'alreadytracked' || String(c.bucket) === 'alreadyTracked') {
      alreadyTracked.push(`${c.slug} (${c.kind ?? 'initiative'}, active)`)
      continue
    }

    const lastUpdated = String(c.lastUpdated ?? new Date().toISOString().slice(0, 10))
    const started = c.started == null || c.started === '' ? lastUpdated : String(c.started)
    const branch = c.branch === '' || c.branch === undefined ? null : (c.branch === null ? null : String(c.branch))

    candidates.push({
      slug: String(c.slug ?? ''),
      slugAlternatives: Array.isArray(c.slugAlternatives) ? c.slugAlternatives.map(String) : [],
      title: String(c.title ?? ''),
      goal: String(c.goal ?? ''),
      kind: c.kind === 'plan' ? 'plan' : 'initiative',
      bucket: normalizeBucket(bucket),
      confidence: Math.min(1, Math.max(0, Number(c.confidence ?? 0.5))),
      confidenceBreakdown: (c.confidenceBreakdown && typeof c.confidenceBreakdown === 'object' && !Array.isArray(c.confidenceBreakdown))
        ? c.confidenceBreakdown
        : {},
      started,
      lastUpdated,
      activityTimeline: normalizeTimeline(c.activityTimeline, lastUpdated),
      branch,
      nextAction: c.nextAction == null ? null : String(c.nextAction),
      rationale: String(c.rationale ?? ''),
      scopePaths: Array.isArray(c.scopePaths) ? c.scopePaths.map(String) : [],
      signalIds: Array.isArray(c.signalIds) ? c.signalIds.map(String) : [],
      evidence: normalizeEvidence(c.evidence, String(c.slug), bucket, lastUpdated),
      contextMarkdown: String(c.contextMarkdown ?? ''),
      evidenceExcerpts: String(c.evidenceExcerpts ?? ''),
      previewYaml: String(c.previewYaml ?? ''),
      draftPath: String(c.draftPath ?? ''),
      approved: c.approved === true,
      ...(c.historicalReason !== undefined ? { historicalReason: String(c.historicalReason) } : {}),
      ...(c.completionSummary !== undefined ? { completionSummary: String(c.completionSummary) } : {}),
    })
  }

  const counts = {
    strong: candidates.filter(c => c.bucket === 'strong').length,
    worthReviewing: candidates.filter(c => c.bucket === 'worth-reviewing').length,
    historical: candidates.filter(c => c.bucket === 'historical').length,
    alreadyTracked: alreadyTracked.length,
  }

  const scanConfig = loose.scanConfig && typeof loose.scanConfig === 'object'
    ? loose.scanConfig as Record<string, unknown>
    : {}

  return {
    runId: String(loose.runId ?? generateRunId()),
    generatedAt: String(loose.generatedAt ?? new Date().toISOString()),
    scanConfig: {
      scope: (() => {
        const raw = scanConfig.scope ?? loose.scope
        return Array.isArray(raw) ? raw.map((x: unknown) => String(x)) : []
      })(),
      repoPath: String(scanConfig.repoPath ?? loose.repoPath ?? process.cwd()),
    },
    sourcesSummary: normalizeSources(loose.sourcesSummary ?? loose.sources),
    counts,
    candidates,
    alreadyTracked,
    orphanSignals: normalizeOrphans(loose.orphanSignals),
    relationships: normalizeRelationships(loose.relationships),
  }
}

export async function runBuildDiscoverRun(
  parsed: ParsedArgs,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const inputPath = parsed.positionals[0]
  if (!inputPath) {
    stderr.write('aideck build-discover-run: missing input file\nUsage: aideck build-discover-run <draft.json> [--out <path>]\n')
    return 1
  }

  let raw: string
  try {
    raw = await readFile(resolve(inputPath), 'utf8')
  } catch (cause) {
    stderr.write(`aideck build-discover-run: cannot read ${inputPath}: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }

  let loose: Record<string, unknown>
  try {
    loose = JSON.parse(raw) as Record<string, unknown>
  } catch (cause) {
    stderr.write(`aideck build-discover-run: JSON syntax error in ${inputPath}: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }

  const normalized = normalizeDiscoverRun(loose)

  const result: Result<DiscoverRun, ErrorResponse> = parseDiscoverRun(normalized, { entity: 'discoverRun' })
  if (!result.ok) {
    stderr.write(`aideck build-discover-run: normalized JSON still invalid\n`)
    stderr.write(JSON.stringify(result.error, null, 2) + '\n')
    return 1
  }

  const outPath = parsed.flags.out
    ?? resolve(dirname(resolve(inputPath)), 'discover-run.json')

  await writeFile(outPath, JSON.stringify(normalized, null, 2) + '\n')
  stdout.write(`${outPath}\n`)
  return 0
}
