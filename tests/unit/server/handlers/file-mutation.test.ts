import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeFileMutation } from '../../../../src/server/handlers/file-mutation.js'

let consumerDir: string

beforeEach(async () => {
  consumerDir = await mkdtemp(join(tmpdir(), 'aideck-mutation-'))
})

afterEach(async () => {
  await rm(consumerDir, { recursive: true, force: true })
})

describe('executeFileMutation', () => {
  it('appends a JSONL record to target path with template substitution', async () => {
    const decl = {
      type: 'file-mutation' as const,
      target: 'data/events/{{ date }}.jsonl',
      operation: 'append' as const,
      record: {
        kind: 'status_update',
        initiativeSlug: '{{ slug }}',
        newStatus: 'active',
      },
    }
    const args = { date: '2026-05-26', slug: 'my-project' }

    const result = await executeFileMutation(consumerDir, decl, args)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.path).toBe(join(consumerDir, 'data/events/2026-05-26.jsonl'))

    const content = await readFile(result.value.path, 'utf8')
    const parsed = JSON.parse(content.trim())
    expect(parsed).toEqual({
      kind: 'status_update',
      initiativeSlug: 'my-project',
      newStatus: 'active',
    })
  })

  it('returns not_implemented error for "set" operation', async () => {
    const decl = {
      type: 'file-mutation' as const,
      target: 'data/config.json',
      operation: 'set' as const,
    }

    const result = await executeFileMutation(consumerDir, decl, {})

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('not_implemented')
  })

  it('appends multiple records sequentially to the same file', async () => {
    const decl = {
      type: 'file-mutation' as const,
      target: 'log.jsonl',
      operation: 'append' as const,
      record: { msg: '{{ msg }}' },
    }

    await executeFileMutation(consumerDir, decl, { msg: 'first' })
    await executeFileMutation(consumerDir, decl, { msg: 'second' })

    const content = await readFile(join(consumerDir, 'log.jsonl'), 'utf8')
    const lines = content.trim().split('\n').map((l) => JSON.parse(l))
    expect(lines).toEqual([{ msg: 'first' }, { msg: 'second' }])
  })

  it('rejects a target that escapes the consumer directory (path traversal via arg)', async () => {
    const decl = {
      type: 'file-mutation' as const,
      target: 'data/events/{{ evil }}.jsonl',
      operation: 'append' as const,
      record: { x: 1 },
    }
    const result = await executeFileMutation(consumerDir, decl, {
      evil: '../../../../../../tmp/aideck-pwn',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('invalid_input')
  })
})
