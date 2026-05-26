import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerRegistry } from '../../../src/server/consumer-registry.js'

const VALID_MANIFEST = `
schemaVersion: '0.1'
id: alpha
mcpNamespace: alpha
title: Alpha Consumer
dataSources:
  - id: items
    path: data/items.yaml
    format: yaml
pages:
  - slug: overview
    title: Overview
    layout: sections
    sections: []
`.trimStart()

const VALID_MANIFEST_BETA = `
schemaVersion: '0.1'
id: beta
mcpNamespace: beta
title: Beta Consumer
dataSources:
  - id: tasks
    path: data/tasks.yaml
    format: yaml
pages:
  - slug: main
    title: Main
    layout: sections
    sections: []
`.trimStart()

const BROKEN_MANIFEST = `
schemaVersion: '0.1'
id: broken
`.trimStart()

async function makeConsumerDir(
  consumersDir: string,
  name: string,
  content: string
): Promise<void> {
  const dir = join(consumersDir, name)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'manifest.yaml'), content, 'utf8')
}

describe('createConsumerRegistry', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'consumer-reg-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('scans and registers all valid consumers', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await makeConsumerDir(consumersDir, 'alpha', VALID_MANIFEST)
    await makeConsumerDir(consumersDir, 'beta', VALID_MANIFEST_BETA)

    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    const list = registry.list()
    expect(list).toHaveLength(2)
    const ids = list.map((c) => c.id).sort()
    expect(ids).toEqual(['alpha', 'beta'])
    expect(registry.errors()).toHaveLength(0)
  })

  it('skips broken consumers and records errors', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await makeConsumerDir(consumersDir, 'alpha', VALID_MANIFEST)
    await makeConsumerDir(consumersDir, 'broken', BROKEN_MANIFEST)

    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.list()).toHaveLength(1)
    expect(registry.list()[0].id).toBe('alpha')

    const errors = registry.errors()
    expect(errors).toHaveLength(1)
    expect(errors[0].consumerId).toBe('broken')
    expect(errors[0].dir).toContain('broken')
    expect(errors[0].message).toBeTruthy()
  })

  it('returns consumer manifest by id', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await makeConsumerDir(consumersDir, 'alpha', VALID_MANIFEST)

    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    const consumer = registry.get('alpha')
    expect(consumer).toBeDefined()
    expect(consumer?.id).toBe('alpha')
    expect(consumer?.manifest.title).toBe('Alpha Consumer')
    expect(consumer?.manifest.mcpNamespace).toBe('alpha')
    expect(consumer?.manifest.dataSources).toHaveLength(1)
    expect(consumer?.manifest.dataSources[0].id).toBe('items')
  })

  it('returns empty list when consumers dir is missing', async () => {
    // baseDir exists but has no consumers/ subdirectory
    const registry = createConsumerRegistry(baseDir)
    await registry.scan()

    expect(registry.list()).toHaveLength(0)
    expect(registry.errors()).toHaveLength(0)
  })

  it('re-scan clears previous state', async () => {
    const consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
    await makeConsumerDir(consumersDir, 'alpha', VALID_MANIFEST)

    const registry = createConsumerRegistry(baseDir)
    await registry.scan()
    expect(registry.list()).toHaveLength(1)

    // Add beta and re-scan
    await makeConsumerDir(consumersDir, 'beta', VALID_MANIFEST_BETA)
    await registry.scan()

    expect(registry.list()).toHaveLength(2)
    const ids = registry.list().map((c) => c.id).sort()
    expect(ids).toEqual(['alpha', 'beta'])
    // Errors should also be cleared from previous scan
    expect(registry.errors()).toHaveLength(0)
  })
})
