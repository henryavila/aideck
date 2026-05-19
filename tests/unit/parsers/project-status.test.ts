import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  parseInitiativeFile,
  parsePlanFile
} from '../../../src/server/parsers/project-status.js'
import { serializeFrontmatter } from '../../../src/server/parsers/serialize.js'
import { splitFrontmatter } from '../../../src/server/parsers/frontmatter.js'
import { parse as parseYaml } from 'yaml'

const REPO_ROOT = process.cwd()
const PLAN_FIXTURE = join(REPO_ROOT, 'fixtures/plans/v3-redesign.demo.md')
const INITIATIVE_FIXTURE = join(REPO_ROOT, 'fixtures/initiatives/v3-f0-foundation-repair.demo.md')

let tmpRoot: string
beforeAll(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'aideck-parsers-'))
})
afterAll(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe('parsePlanFile', () => {
  it('parses the v3-redesign demo plan into a valid Plan', async () => {
    const res = await parsePlanFile(PLAN_FIXTURE)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.slug).toBe('v3-redesign')
    expect(res.value.phases.length).toBeGreaterThan(0)
    expect(res.value.principles?.length).toBeGreaterThan(0)
    expect(res.value.narrative).toContain('# SDA v2')
  })

  it('returns schema_version_mismatch when frontmatter declares an old version', async () => {
    const raw = await readFile(PLAN_FIXTURE, 'utf8')
    const split = splitFrontmatter(raw)!
    const fm = parseYaml(split.frontmatter) as Record<string, unknown>
    fm.schemaVersion = '0.0.9'
    const tmp = join(tmpRoot, 'plan-old.md')
    await writeFile(tmp, serializeFrontmatter(fm, split.body))
    const res = await parsePlanFile(tmp)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('schema_version_mismatch')
      expect(res.error.suggestion ?? '').toContain('migrate')
    }
  })

  it('returns io_error for a non-existent path', async () => {
    const res = await parsePlanFile(join(tmpRoot, 'nope.md'))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('io_error')
  })

  it('parses a 1000-line synthetic plan in under 50ms (averaged over 10 runs)', async () => {
    const phases = Array.from({ length: 50 }, (_, i) => ({
      id: `F${i}`,
      slug: `phase-${i}`,
      title: `Phase ${i}`,
      goal: `goal ${i}`,
      dependsOn: i > 0 ? [`F${i - 1}`] : [],
      subPhaseCount: 3,
      status: 'pending',
      exitGate: {
        summary: `F${i} ready`,
        criteria: [{ id: `F${i}.G1`, description: 'tests green', status: 'pending' }]
      }
    }))
    const fm = {
      schemaVersion: '0.1',
      slug: 'perf-plan',
      title: 'Perf Plan',
      version: '1.0',
      status: 'active',
      started: '2026-01-01T00:00:00Z',
      lastUpdated: '2026-01-01T00:00:00Z',
      currentPhase: null,
      parallelismAllowed: false,
      phases
    }
    const body = `# perf body\n${Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n')}\n`
    const tmp = join(tmpRoot, 'perf.md')
    await writeFile(tmp, serializeFrontmatter(fm, body))

    const runs: number[] = []
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now()
      const res = await parsePlanFile(tmp)
      const t1 = performance.now()
      expect(res.ok).toBe(true)
      runs.push(t1 - t0)
    }
    const avg = runs.reduce((a, b) => a + b, 0) / runs.length
    expect(avg).toBeLessThan(50)
  })
})

describe('parseInitiativeFile', () => {
  it('parses the v3-f0 demo initiative into a valid Initiative', async () => {
    const res = await parseInitiativeFile(INITIATIVE_FIXTURE)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.slug).toBe('v3-f0-foundation-repair')
    expect(Array.isArray(res.value.tasks)).toBe(true)
    expect(res.value.body).toContain('#')
  })

  it('rejects a file with no frontmatter', async () => {
    const tmp = join(tmpRoot, 'no-fm.md')
    await writeFile(tmp, '# just markdown\n')
    const res = await parseInitiativeFile(tmp)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })

  it('returns invalid_input when YAML syntax is malformed', async () => {
    const tmp = join(tmpRoot, 'bad-yaml.md')
    await writeFile(tmp, '---\nfoo: [unclosed\n---\n# body\n')
    const res = await parseInitiativeFile(tmp)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('invalid_input')
      expect(res.error.message).toContain('YAML syntax error')
    }
  })

  it('returns invalid_input when frontmatter is not a YAML mapping', async () => {
    const tmp = join(tmpRoot, 'list-fm.md')
    await writeFile(tmp, '---\n- one\n- two\n---\n# body\n')
    const res = await parseInitiativeFile(tmp)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })

  it('plan version of "non-mapping frontmatter" also rejects', async () => {
    const tmp = join(tmpRoot, 'plan-scalar.md')
    await writeFile(tmp, '---\njust-a-scalar\n---\n# body\n')
    const res = await parsePlanFile(tmp)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })
})

describe('serializeFrontmatter — round-trip', () => {
  it('round-trips a parsed plan into YAML that re-parses to the same object', async () => {
    const raw = await readFile(PLAN_FIXTURE, 'utf8')
    const split = splitFrontmatter(raw)!
    const parsed1 = parseYaml(split.frontmatter)
    const serialized = serializeFrontmatter(parsed1, split.body)
    const split2 = splitFrontmatter(serialized)!
    const parsed2 = parseYaml(split2.frontmatter)
    expect(parsed2).toEqual(parsed1)
    expect(split2.body).toBe(split.body)
  })
})
