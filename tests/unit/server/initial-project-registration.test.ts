import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createProjectRegistry } from '../../../src/server/project-registry.js'
import { registerInitialProject } from '../../../src/server/index.js'

describe('registerInitialProject', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-initial-project-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('registers the startup root when it is an atomic-skills project', async () => {
    const rootDir = join(baseDir, 'atomic-skills')
    await mkdir(join(rootDir, '.atomic-skills'), { recursive: true })
    const registry = createProjectRegistry()

    await registerInitialProject(registry, rootDir)

    expect(registry.list()).toHaveLength(1)
    expect(registry.list()[0]).toMatchObject({
      projectId: 'atomic-skills',
      rootDir: resolve(rootDir),
    })
  })

  it('does not register a startup root without .atomic-skills', async () => {
    const rootDir = join(baseDir, 'plain-repo')
    await mkdir(rootDir, { recursive: true })
    const registry = createProjectRegistry()

    await registerInitialProject(registry, rootDir)

    expect(registry.list()).toHaveLength(0)
  })
})
