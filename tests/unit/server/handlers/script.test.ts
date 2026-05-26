import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { describe, expect, it } from 'vitest'
import { executeScript } from '../../../../src/server/handlers/script.js'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/consumers/valid-consumer'
)

describe('executeScript', () => {
  it('executes JS module and returns result', async () => {
    const decl = { type: 'script' as const, source: 'handlers/count-items.js' }
    const items = [
      { status: 'done', title: 'Task A' },
      { status: 'active', title: 'Task B' },
      { status: 'done', title: 'Task C' },
    ]
    const dataMap = new Map<string, unknown[]>([['items', items]])

    const result = await executeScript(fixturesDir, decl, { status: 'done' }, dataMap)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ count: 2, status: 'done' })
  })

  it('returns all items when no status arg given', async () => {
    const decl = { type: 'script' as const, source: 'handlers/count-items.js' }
    const items = [
      { status: 'done', title: 'Task A' },
      { status: 'active', title: 'Task B' },
    ]
    const dataMap = new Map<string, unknown[]>([['items', items]])

    const result = await executeScript(fixturesDir, decl, {}, dataMap)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ count: 2, status: 'all' })
  })

  it('returns script_error for missing script file', async () => {
    const decl = { type: 'script' as const, source: 'handlers/does-not-exist.js' }

    const result = await executeScript(fixturesDir, decl, {}, new Map())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('internal_error')
    expect(result.error.details?.code).toBe('script_error')
  })

  it('returns script_error for module without default export', async () => {
    const decl = { type: 'script' as const, source: 'handlers/no-default.js' }

    const result = await executeScript(fixturesDir, decl, {}, new Map())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('internal_error')
    expect(result.error.details?.code).toBe('script_error')
    expect(result.error.message).toMatch(/does not export a default function/)
  })
})
