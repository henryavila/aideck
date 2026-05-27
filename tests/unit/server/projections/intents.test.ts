import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listIntents, listPendingIntents } from '../../../../src/server/projections/intents.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-intents-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function makeIntent(intentId: string): string {
  return JSON.stringify({
    schemaVersion: '0.1',
    kind: 'intent',
    intentId,
    by: 'ai',
    requestedAt: '2026-01-01T00:00:00Z',
    operation: 'mark_task_done',
    target: { initiativeSlug: 'test-init', taskId: 'T-001' },
    args: {}
  })
}

function makeApplication(refId: string): string {
  return JSON.stringify({
    schemaVersion: '0.1',
    kind: 'intent_application',
    refId,
    appliedAt: '2026-01-01T01:00:00Z',
    by: 'human',
    result: 'applied'
  })
}

describe('listIntents', () => {
  it('returns empty array when no inbox directory exists', async () => {
    const result = await listIntents(tmp)
    expect(result).toEqual([])
  })

  it('returns empty array when inbox is empty', async () => {
    await mkdir(join(tmp, 'inbox'), { recursive: true })
    const result = await listIntents(tmp)
    expect(result).toEqual([])
  })

  it('parses intent records from jsonl files', async () => {
    const inboxDir = join(tmp, 'inbox')
    await mkdir(inboxDir, { recursive: true })
    await writeFile(join(inboxDir, '2026-01-01.jsonl'), makeIntent('int-001') + '\n')
    const result = await listIntents(tmp)
    expect(result).toHaveLength(1)
    expect(result[0].intent.intentId).toBe('int-001')
    expect(result[0].appliedBy).toBeUndefined()
  })

  it('pairs intents with their applications', async () => {
    const inboxDir = join(tmp, 'inbox')
    await mkdir(inboxDir, { recursive: true })
    const lines = [makeIntent('int-002'), makeApplication('int-002')].join('\n') + '\n'
    await writeFile(join(inboxDir, '2026-01-01.jsonl'), lines)
    const result = await listIntents(tmp)
    expect(result).toHaveLength(1)
    expect(result[0].intent.intentId).toBe('int-002')
    expect(result[0].appliedBy).toBeDefined()
    expect(result[0].appliedBy?.result).toBe('applied')
  })

  it('reads intents from multiple jsonl files', async () => {
    const inboxDir = join(tmp, 'inbox')
    await mkdir(inboxDir, { recursive: true })
    await writeFile(join(inboxDir, '2026-01-01.jsonl'), makeIntent('int-a') + '\n')
    await writeFile(join(inboxDir, '2026-01-02.jsonl'), makeIntent('int-b') + '\n')
    const result = await listIntents(tmp)
    expect(result).toHaveLength(2)
  })
})

describe('listPendingIntents', () => {
  it('returns only intents without applications', async () => {
    const inboxDir = join(tmp, 'inbox')
    await mkdir(inboxDir, { recursive: true })
    const lines = [
      makeIntent('int-x'),
      makeIntent('int-y'),
      makeApplication('int-x')
    ].join('\n') + '\n'
    await writeFile(join(inboxDir, '2026-01-01.jsonl'), lines)
    const result = await listPendingIntents(tmp)
    expect(result).toHaveLength(1)
    expect(result[0].intentId).toBe('int-y')
  })

  it('returns empty when all intents are applied', async () => {
    const inboxDir = join(tmp, 'inbox')
    await mkdir(inboxDir, { recursive: true })
    const lines = [makeIntent('int-z'), makeApplication('int-z')].join('\n') + '\n'
    await writeFile(join(inboxDir, '2026-01-01.jsonl'), lines)
    const result = await listPendingIntents(tmp)
    expect(result).toHaveLength(0)
  })
})
