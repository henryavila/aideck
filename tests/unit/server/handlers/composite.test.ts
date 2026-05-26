import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeComposite } from '../../../../src/server/handlers/composite.js'

let consumerDir: string

beforeEach(async () => {
  consumerDir = await mkdtemp(join(tmpdir(), 'aideck-composite-'))
})

afterEach(async () => {
  await rm(consumerDir, { recursive: true, force: true })
})

describe('executeComposite', () => {
  it('chains two file-mutation steps and writes both JSONL lines', async () => {
    const decl = {
      type: 'composite' as const,
      steps: [
        {
          type: 'file-mutation' as const,
          target: 'log.jsonl',
          operation: 'append' as const,
          record: { step: 'first', value: '{{ v }}' },
        },
        {
          type: 'file-mutation' as const,
          target: 'log.jsonl',
          operation: 'append' as const,
          record: { step: 'second', value: '{{ v }}' },
        },
      ],
    }

    const result = await executeComposite(consumerDir, decl, { v: 'x' }, new Map())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stepsCompleted).toBe(2)

    const content = await readFile(join(consumerDir, 'log.jsonl'), 'utf8')
    const lines = content.trim().split('\n').map((l) => JSON.parse(l))
    expect(lines).toEqual([
      { step: 'first', value: 'x' },
      { step: 'second', value: 'x' },
    ])
  })

  it('aborts on first failure and returns prefixed error', async () => {
    const decl = {
      type: 'composite' as const,
      steps: [
        {
          type: 'file-mutation' as const,
          target: 'log.jsonl',
          operation: 'append' as const,
          record: { step: 'first' },
        },
        {
          type: 'shell-exec' as const,
          command: 'exit 1',
        },
      ],
    }

    const result = await executeComposite(consumerDir, decl, {}, new Map())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatch(/Composite step 1 failed:/)

    // First step should have written
    const content = await readFile(join(consumerDir, 'log.jsonl'), 'utf8')
    const lines = content.trim().split('\n').map((l) => JSON.parse(l))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toEqual({ step: 'first' })
  })

  it('returns stepsCompleted 0 for empty steps', async () => {
    const decl = { type: 'composite' as const, steps: [] }

    const result = await executeComposite(consumerDir, decl, {}, new Map())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stepsCompleted).toBe(0)
  })
})
