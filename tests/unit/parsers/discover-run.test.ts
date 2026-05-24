import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseDiscoverRunFile } from '../../../src/server/parsers/discover-run.js'

const FIXTURE_PATH = join(process.cwd(), 'tests/fixtures/discover-run.fixture.json')

let tmpRoot: string
beforeAll(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'aideck-discover-'))
})
afterAll(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe('parseDiscoverRunFile', () => {
  it('parses the fixture into a valid DiscoverRun', async () => {
    const res = await parseDiscoverRunFile(FIXTURE_PATH)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.value.runId).toBe('disc-20260524-103000')
    expect(res.value.candidates).toHaveLength(2)
    expect(res.value.candidates[0].slug).toBe('test-feature')
    expect(res.value.candidates[0].kind).toBe('initiative')
    expect(res.value.candidates[0].bucket).toBe('strong')
    expect(res.value.orphanSignals).toHaveLength(1)
    expect(res.value.relationships).toHaveLength(1)
    expect(res.value.alreadyTracked).toContain('auth-session-tokens')
  })

  it('returns io_error for missing file', async () => {
    const res = await parseDiscoverRunFile(join(tmpRoot, 'nope.json'))
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error.code).toBe('io_error')
  })

  it('returns invalid_input for malformed JSON', async () => {
    const path = join(tmpRoot, 'bad.json')
    await writeFile(path, '{ not valid json')
    const res = await parseDiscoverRunFile(path)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error.code).toBe('invalid_input')
  })

  it('returns invalid_input for missing required fields', async () => {
    const path = join(tmpRoot, 'incomplete.json')
    await writeFile(path, JSON.stringify({ runId: 'x' }))
    const res = await parseDiscoverRunFile(path)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error.code).toBe('invalid_input')
  })

  it('rejects extra fields due to strict mode', async () => {
    const path = join(tmpRoot, 'extra.json')
    const fixture = await import(FIXTURE_PATH, { with: { type: 'json' } })
    const data = { ...fixture.default, bogusField: 'should fail' }
    await writeFile(path, JSON.stringify(data))
    const res = await parseDiscoverRunFile(path)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error.code).toBe('invalid_input')
    expect(res.error.message).toContain('bogusField')
  })
})
