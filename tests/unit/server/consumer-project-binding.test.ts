import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerRegistry } from '../../../src/server/consumer-registry.js'
import { createProjectRegistry } from '../../../src/server/project-registry.js'
import { registerConsumerProjects } from '../../../src/server/index.js'

// A persistent v2 consumer (provisioned on disk under ~/.aideck/consumers/<id>/)
// declares the `rootDir` it is bound to. aiDeck must auto-register that project
// from the manifest on every scan, so the binding survives a server restart
// WITHOUT the consuming tool re-registering — the in-memory project registry is
// otherwise volatile and a restart strands every consumer except the one that
// happens to spawn the server next (the "first consumer's data for everyone"
// contamination bug).

function manifestWithRoot(id: string, rootDir: string | null): string {
  const rootLine = rootDir === null ? '' : `rootDir: '${rootDir}'\n`
  return `
schemaVersion: '0.1'
id: ${id}
mcpNamespace: ${id.replace(/-/g, '_')}
title: ${id}
${rootLine}dataSources:
  - id: plans
    path: .atomic-skills/projects/*/*/plan.md
    format: frontmatter
    root: project
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
`.trimStart()
}

async function makeProjectRoot(label: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `aideck-root-${label}-`))
  await mkdir(join(dir, '.atomic-skills'), { recursive: true })
  return dir
}

async function writeConsumer(baseDir: string, id: string, rootDir: string | null): Promise<void> {
  const dir = join(baseDir, 'consumers', id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'manifest.yaml'), manifestWithRoot(id, rootDir), 'utf8')
}

describe('registerConsumerProjects — auto-register projects from persistent consumers', () => {
  let baseDir: string
  const roots: string[] = []

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-binding-base-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
    while (roots.length) await rm(roots.pop()!, { recursive: true, force: true })
  })

  it('registers one project per consumer that declares a valid rootDir', async () => {
    const lektoRoot = await makeProjectRoot('lekto'); roots.push(lektoRoot)
    const archRoot = await makeProjectRoot('arch'); roots.push(archRoot)
    await writeConsumer(baseDir, 'lekto', lektoRoot)
    await writeConsumer(baseDir, 'arch', archRoot)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = createProjectRegistry()

    await registerConsumerProjects(consumers, registry)

    expect(registry.getByRootDir(lektoRoot)?.projectId).toBe('lekto')
    expect(registry.getByRootDir(archRoot)?.projectId).toBe('arch')
    expect(registry.list()).toHaveLength(2)
  })

  it('skips a consumer whose declared rootDir no longer exists (revalidation)', async () => {
    const lektoRoot = await makeProjectRoot('lekto'); roots.push(lektoRoot)
    await writeConsumer(baseDir, 'lekto', lektoRoot)
    await writeConsumer(baseDir, 'ghost', join(tmpdir(), 'aideck-does-not-exist-xyz'))

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = createProjectRegistry()

    await registerConsumerProjects(consumers, registry)

    expect(registry.getByRootDir(lektoRoot)?.projectId).toBe('lekto')
    expect(registry.get('ghost')).toBeUndefined()
    expect(registry.list()).toHaveLength(1)
  })

  it('ignores a consumer that declares no rootDir (generic / legacy consumer)', async () => {
    await writeConsumer(baseDir, 'global-lens', null)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = createProjectRegistry()

    await registerConsumerProjects(consumers, registry)

    expect(registry.list()).toHaveLength(0)
  })

  it('is idempotent — re-running does not duplicate registrations', async () => {
    const archRoot = await makeProjectRoot('arch'); roots.push(archRoot)
    await writeConsumer(baseDir, 'arch', archRoot)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = createProjectRegistry()

    await registerConsumerProjects(consumers, registry)
    await registerConsumerProjects(consumers, registry)

    expect(registry.list()).toHaveLength(1)
    expect(registry.getByRootDir(archRoot)?.projectId).toBe('arch')
  })

  it('starts each project watcher exactly once across repeated runs', async () => {
    const archRoot = await makeProjectRoot('arch'); roots.push(archRoot)
    await writeConsumer(baseDir, 'arch', archRoot)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = createProjectRegistry()
    let starts = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registry.setWatcherFactory(() => ({ start: async () => { starts++ }, stop: async () => {} }) as any)

    await registerConsumerProjects(consumers, registry)
    await registerConsumerProjects(consumers, registry)

    expect(starts).toBe(1)
  })

  it('reproduces the binding after a simulated restart (fresh scan + fresh registry)', async () => {
    const archRoot = await makeProjectRoot('arch'); roots.push(archRoot)
    await writeConsumer(baseDir, 'arch', archRoot)

    // First boot.
    const consumers1 = createConsumerRegistry(baseDir)
    await consumers1.scan()
    const registry1 = createProjectRegistry()
    await registerConsumerProjects(consumers1, registry1)
    expect(registry1.getByRootDir(archRoot)?.projectId).toBe('arch')

    // Restart: brand-new registry (in-memory state lost), same consumers on disk.
    const consumers2 = createConsumerRegistry(baseDir)
    await consumers2.scan()
    const registry2 = createProjectRegistry()
    await registerConsumerProjects(consumers2, registry2)

    // arch is registered again WITHOUT any tool re-registering it.
    expect(registry2.getByRootDir(archRoot)?.projectId).toBe('arch')
  })
})
