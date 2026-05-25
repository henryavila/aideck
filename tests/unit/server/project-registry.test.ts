import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProjectRegistry, deriveProjectId, validateRootDir } from '../../../src/server/project-registry.js'

describe('deriveProjectId', () => {
  it('lowercases the basename', () => {
    expect(deriveProjectId('/home/user/MyProject')).toBe('myproject')
  })

  it('replaces non-alphanumeric chars with hyphens', () => {
    expect(deriveProjectId('/home/user/my_project.v2')).toBe('my-project-v2')
  })

  it('strips leading digits and hyphens', () => {
    expect(deriveProjectId('/home/user/123-project')).toBe('project')
  })

  it('returns "project" for fully invalid basenames', () => {
    expect(deriveProjectId('/home/user/123')).toBe('project')
    expect(deriveProjectId('/home/user/...')).toBe('project')
  })

  it('truncates to 64 chars', () => {
    const long = 'a'.repeat(100)
    expect(deriveProjectId(`/home/${long}`).length).toBeLessThanOrEqual(64)
  })
})

describe('createProjectRegistry', () => {
  let tmp1: string
  let tmp2: string

  beforeEach(async () => {
    tmp1 = await mkdtemp(join(tmpdir(), 'reg1-'))
    tmp2 = await mkdtemp(join(tmpdir(), 'reg2-'))
  })

  afterEach(async () => {
    await rm(tmp1, { recursive: true, force: true })
    await rm(tmp2, { recursive: true, force: true })
  })

  it('registers and lists projects in insertion order', () => {
    const reg = createProjectRegistry()
    reg.register(tmp1)
    reg.register(tmp2)
    const list = reg.list()
    expect(list).toHaveLength(2)
    expect(list[0].rootDir).toBe(resolve(tmp1))
    expect(list[1].rootDir).toBe(resolve(tmp2))
  })

  it('returns existing entry for duplicate rootDir', () => {
    const reg = createProjectRegistry()
    const first = reg.register(tmp1)
    const second = reg.register(tmp1)
    expect(second.projectId).toBe(first.projectId)
    expect(reg.list()).toHaveLength(1)
  })

  it('handles projectId collision by appending suffix', () => {
    const reg = createProjectRegistry()
    const a = reg.register(tmp1, 'demo')
    const b = reg.register(tmp2, 'demo')
    expect(a.projectId).toBe('demo')
    expect(b.projectId).toBe('demo-2')
  })

  it('defaultProject returns the first registered', () => {
    const reg = createProjectRegistry()
    const first = reg.register(tmp1, 'alpha')
    reg.register(tmp2, 'beta')
    expect(reg.defaultProject()?.projectId).toBe(first.projectId)
  })

  it('promotes next project when default is unregistered', () => {
    const reg = createProjectRegistry()
    reg.register(tmp1, 'alpha')
    reg.register(tmp2, 'beta')
    reg.unregister('alpha')
    expect(reg.defaultProject()?.projectId).toBe('beta')
  })

  it('defaultProject returns undefined when all unregistered', () => {
    const reg = createProjectRegistry()
    const e = reg.register(tmp1, 'alpha')
    reg.unregister(e.projectId)
    expect(reg.defaultProject()).toBeUndefined()
  })

  it('getByRootDir finds by canonical path', () => {
    const reg = createProjectRegistry()
    reg.register(tmp1, 'alpha')
    expect(reg.getByRootDir(tmp1)?.projectId).toBe('alpha')
  })

  it('clear empties the registry', () => {
    const reg = createProjectRegistry()
    reg.register(tmp1)
    reg.clear()
    expect(reg.list()).toHaveLength(0)
  })

  it('falls back to derived id when explicit id is invalid', () => {
    const reg = createProjectRegistry()
    const entry = reg.register(tmp1, '123-bad')
    expect(entry.projectId).toMatch(/^[a-z][a-z0-9-]{0,63}$/)
  })
})

describe('validateRootDir', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'val-'))
  })

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('rejects nonexistent path', async () => {
    const r = await validateRootDir('/does/not/exist/xyz')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('does not exist')
  })

  it('rejects path without .atomic-skills/', async () => {
    const r = await validateRootDir(tmp)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('.atomic-skills')
  })

  it('accepts path with .atomic-skills/', async () => {
    await mkdir(join(tmp, '.atomic-skills'), { recursive: true })
    const r = await validateRootDir(tmp)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.canonical).toBe(resolve(tmp))
  })
})
