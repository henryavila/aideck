import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasDiscoverRun, buildDiscoverState } from '../../../../src/server/projections/discover.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-discover-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('hasDiscoverRun', () => {
  it('returns false when no discover-run.json exists', () => {
    expect(hasDiscoverRun(tmp, 'project-status')).toBe(false)
  })

  it('returns true when discover-run.json exists in consumer root', async () => {
    const dir = join(tmp, '.atomic-skills', 'project-status')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'discover-run.json'), '{}')
    expect(hasDiscoverRun(tmp, 'project-status')).toBe(true)
  })

  it('returns false for a different consumer without the file', async () => {
    const dir = join(tmp, '.atomic-skills', 'project-status')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'discover-run.json'), '{}')
    expect(hasDiscoverRun(tmp, 'other-consumer')).toBe(false)
  })
})

describe('buildDiscoverState', () => {
  it('returns consumer_unknown when no discover-run.json exists', async () => {
    const result = await buildDiscoverState(tmp, 'project-status')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('consumer_unknown')
      expect(result.error.suggestion).toContain('project-plan discover')
    }
  })

  it('parses a valid discover-run.json', async () => {
    const dir = join(tmp, '.atomic-skills', 'my-consumer')
    await mkdir(dir, { recursive: true })
    const discoverRun = {
      runId: 'run-001',
      generatedAt: '2026-01-01T00:00:00Z',
      scanConfig: { scope: ['.'], repoPath: '/tmp/repo' },
      sourcesSummary: [],
      counts: { strong: 0, worthReviewing: 0, historical: 0, alreadyTracked: 0 },
      candidates: [],
      alreadyTracked: [],
      orphanSignals: [],
      relationships: []
    }
    await writeFile(join(dir, 'discover-run.json'), JSON.stringify(discoverRun))
    const result = await buildDiscoverState(tmp, 'my-consumer')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.runId).toBe('run-001')
    }
  })
})
