import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProjectRegistry } from '../../../src/server/project-registry.js'

describe('createProjectRegistry — collision resolution terminates', () => {
  let a: string
  let b: string

  beforeEach(async () => {
    a = await mkdtemp(join(tmpdir(), 'col-a-'))
    b = await mkdtemp(join(tmpdir(), 'col-b-'))
  })

  afterEach(async () => {
    await rm(a, { recursive: true, force: true })
    await rm(b, { recursive: true, force: true })
  })

  it('resolves a 64-char id collision without hanging', () => {
    const reg = createProjectRegistry()
    const id64 = 'a'.repeat(64) // matches /^[a-z][a-z0-9-]{0,63}$/

    const first = reg.register(a, id64)
    expect(first.projectId).toBe(id64)

    // Before the fix, resolveCollision looped forever on a 64-char colliding id
    // because `${baseId}-${i}`.slice(0, 64) stripped the suffix back to baseId.
    // This call must return a distinct, in-bounds id (and not time out).
    const second = reg.register(b, id64)
    expect(second.projectId).not.toBe(id64)
    expect(second.projectId.length).toBeLessThanOrEqual(64)
    expect(reg.get(second.projectId)).toBeDefined()
  })
})
