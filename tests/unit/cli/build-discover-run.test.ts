import { describe, it, expect } from 'vitest'
import { normalizeDiscoverRun } from '../../../src/cli/build-discover-run.js'
import { parseDiscoverRun } from '../../../src/schemas/validators/index.js'

function buildAndValidate(loose: Record<string, unknown>) {
  const normalized = normalizeDiscoverRun(loose)
  const result = parseDiscoverRun(normalized, { entity: 'discoverRun' })
  return { normalized, result }
}

const MINIMAL_CANDIDATE = {
  slug: 'test',
  title: 'Test',
  goal: 'Do test',
  kind: 'initiative',
  bucket: 'strong',
  confidence: 0.5,
  started: '2026-01-01',
  lastUpdated: '2026-03-01',
  rationale: 'Found it.',
  draftPath: '.atomic-skills/bootstrap-drafts/test.draft.md',
}

const MINIMAL_INPUT = {
  repoPath: '/tmp/test',
  scope: ['git'],
  sources: { 'git-branch': 1 },
  candidates: [MINIMAL_CANDIDATE],
  alreadyTracked: [],
}

describe('normalizeDiscoverRun', () => {
  it('produces valid output from minimal input', () => {
    const { result } = buildAndValidate(MINIMAL_INPUT)
    expect(result.ok).toBe(true)
  })

  it('generates runId when missing', () => {
    const { normalized } = buildAndValidate(MINIMAL_INPUT)
    expect(normalized.runId).toMatch(/^discover-\d{4}-\d{2}-\d{2}/)
  })

  it('generates generatedAt when missing', () => {
    const { normalized } = buildAndValidate(MINIMAL_INPUT)
    expect(typeof normalized.generatedAt).toBe('string')
    expect((normalized.generatedAt as string).length).toBeGreaterThan(0)
  })

  it('preserves runId when present', () => {
    const { normalized } = buildAndValidate({ ...MINIMAL_INPUT, runId: 'my-run-id' })
    expect(normalized.runId).toBe('my-run-id')
  })

  it('strips schemaVersion (strict mode rejects it)', () => {
    const { normalized, result } = buildAndValidate({ ...MINIMAL_INPUT, schemaVersion: '0.1' })
    expect(normalized).not.toHaveProperty('schemaVersion')
    expect(result.ok).toBe(true)
  })

  it('adds repoPath from input when missing in scanConfig', () => {
    const { normalized } = buildAndValidate(MINIMAL_INPUT)
    expect((normalized.scanConfig as Record<string, unknown>).repoPath).toBe('/tmp/test')
  })

  it('converts sourcesSummary from object to array', () => {
    const { normalized } = buildAndValidate(MINIMAL_INPUT)
    const ss = normalized.sourcesSummary as Array<Record<string, unknown>>
    expect(Array.isArray(ss)).toBe(true)
    expect(ss[0]).toHaveProperty('layer')
    expect(ss[0]).toHaveProperty('label')
    expect(ss[0]).toHaveProperty('signalCount')
  })

  it('passes through sourcesSummary already in array format', () => {
    const input = {
      ...MINIMAL_INPUT,
      sources: undefined,
      sourcesSummary: [{ layer: 'git', label: '3 branches', signalCount: 3 }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    expect((normalized.sourcesSummary as unknown[])[0]).toEqual({ layer: 'git', label: '3 branches', signalCount: 3 })
  })

  it('recalculates counts from candidates', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [
        { ...MINIMAL_CANDIDATE, slug: 'a', bucket: 'strong' },
        { ...MINIMAL_CANDIDATE, slug: 'b', bucket: 'worth-reviewing' },
        { ...MINIMAL_CANDIDATE, slug: 'c', bucket: 'historical', historicalReason: 'done' },
      ],
      alreadyTracked: ['x'],
    }
    const { normalized } = buildAndValidate(input)
    expect(normalized.counts).toEqual({ strong: 1, worthReviewing: 1, historical: 1, alreadyTracked: 1 })
  })

  it('normalizes worthReviewing → worth-reviewing', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [{ ...MINIMAL_CANDIDATE, bucket: 'worthReviewing' }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    expect((normalized.candidates as Array<Record<string, unknown>>)[0].bucket).toBe('worth-reviewing')
  })

  it('moves alreadyTracked bucket candidates to alreadyTracked array', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [
        MINIMAL_CANDIDATE,
        { ...MINIMAL_CANDIDATE, slug: 'tracked', bucket: 'alreadyTracked' },
      ],
      alreadyTracked: ['existing'],
    }
    const { normalized } = buildAndValidate(input)
    expect((normalized.candidates as unknown[]).length).toBe(1)
    expect(normalized.alreadyTracked).toContain('existing')
    expect((normalized.alreadyTracked as string[]).some(s => s.includes('tracked'))).toBe(true)
  })

  it('converts activityTimeline strings to objects', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [{
        ...MINIMAL_CANDIDATE,
        activityTimeline: ['2026-01-01 started work', '2026-02-15 halfway'],
      }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    const timeline = (normalized.candidates as Array<Record<string, unknown>>)[0].activityTimeline as Array<Record<string, unknown>>
    expect(timeline[0].date).toBe('2026-01-01')
    expect(timeline[0].count).toBe(1)
    expect(timeline[1].date).toBe('2026-02-15')
  })

  it('maps evidence.quote → evidenceQuote and strips strength', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [{
        ...MINIMAL_CANDIDATE,
        evidence: [{ sourceType: 'git', sourceId: 'main', quote: 'hello', strength: 0.9 }],
      }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    const ev = ((normalized.candidates as Array<Record<string, unknown>>)[0].evidence as Array<Record<string, unknown>>)[0]
    expect(ev.evidenceQuote).toBe('hello')
    expect(ev).not.toHaveProperty('strength')
    expect(ev).not.toHaveProperty('quote')
  })

  it('defaults missing candidate arrays/strings', () => {
    const { normalized, result } = buildAndValidate(MINIMAL_INPUT)
    expect(result.ok).toBe(true)
    const c = (normalized.candidates as Array<Record<string, unknown>>)[0]
    expect(c.slugAlternatives).toEqual([])
    expect(c.scopePaths).toEqual([])
    expect(c.signalIds).toEqual([])
    expect(c.evidence).toEqual([])
    expect(c.contextMarkdown).toBe('')
    expect(c.evidenceExcerpts).toBe('')
    expect(c.previewYaml).toBe('')
    expect(c.approved).toBe(false)
  })

  it('normalizes branch "" to null', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [{ ...MINIMAL_CANDIDATE, branch: '' }],
    }
    const { normalized } = buildAndValidate(input)
    expect((normalized.candidates as Array<Record<string, unknown>>)[0].branch).toBeNull()
  })

  it('defaults started: null to lastUpdated for non-historical', () => {
    const input = {
      ...MINIMAL_INPUT,
      candidates: [{ ...MINIMAL_CANDIDATE, started: null }],
    }
    const { normalized } = buildAndValidate(input)
    expect((normalized.candidates as Array<Record<string, unknown>>)[0].started).toBe('2026-03-01')
  })

  it('maps relationship from/to → fromSlug/toSlug and type → kind', () => {
    const input = {
      ...MINIMAL_INPUT,
      relationships: [{ from: 'a', to: 'b', type: 'subsumed-by' }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    const rel = (normalized.relationships as Array<Record<string, unknown>>)[0]
    expect(rel.fromSlug).toBe('a')
    expect(rel.toSlug).toBe('b')
    expect(rel.kind).toBe('subtopic')
    expect(rel.strength).toBe(0.5)
    expect(rel.sharedIdentifiers).toEqual([])
  })

  it('strips extra fields from relationships', () => {
    const input = {
      ...MINIMAL_INPUT,
      relationships: [{ fromSlug: 'a', toSlug: 'b', kind: 'subtopic', extra: true }],
    }
    const { normalized, result } = buildAndValidate(input)
    expect(result.ok).toBe(true)
    expect((normalized.relationships as Array<Record<string, unknown>>)[0]).not.toHaveProperty('extra')
  })
})
