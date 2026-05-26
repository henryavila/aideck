import { join } from 'node:path'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { describe, it, expect, afterEach } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { runInitConsumer } from '../../../src/cli/init-consumer.js'
import { parseManifest } from '../../../src/server/manifest-schema.js'

describe('runInitConsumer', () => {
  const tmpDirs: string[] = []

  afterEach(async () => {
    for (const dir of tmpDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('creates all files in correct locations', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'aideck-init-consumer-'))
    tmpDirs.push(baseDir)

    const code = await runInitConsumer({
      id: 'my-consumer',
      title: 'My Consumer',
      mcpNamespace: 'my_consumer',
      baseDir,
    })

    expect(code).toBe(0)

    const consumerDir = join(baseDir, 'consumers', 'my-consumer')

    // Check all files exist
    await expect(access(join(consumerDir, 'manifest.yaml'))).resolves.toBeUndefined()
    await expect(access(join(consumerDir, 'schema.json'))).resolves.toBeUndefined()
    await expect(access(join(consumerDir, 'data', 'items.yaml'))).resolves.toBeUndefined()
    await expect(access(join(consumerDir, 'data'))).resolves.toBeUndefined()
    await expect(access(join(consumerDir, 'handlers'))).resolves.toBeUndefined()
    await expect(access(join(consumerDir, 'components'))).resolves.toBeUndefined()
  })

  it('manifest validates via parseManifest', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'aideck-init-consumer-'))
    tmpDirs.push(baseDir)

    await runInitConsumer({
      id: 'test-app',
      title: 'Test App',
      mcpNamespace: 'test_app',
      baseDir,
    })

    const consumerDir = join(baseDir, 'consumers', 'test-app')
    const raw = await readFile(join(consumerDir, 'manifest.yaml'), 'utf8')
    const parsed = parseYaml(raw)
    const result = parseManifest(parsed)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.id).toBe('test-app')
    expect(result.value.title).toBe('Test App')
    expect(result.value.mcpNamespace).toBe('test_app')
    expect(result.value.schemaVersion).toBe('0.1')
    expect(result.value.dataSources).toHaveLength(1)
    expect(result.value.dataSources[0].id).toBe('items')
    expect(result.value.pages).toHaveLength(1)
    expect(result.value.pages[0].slug).toBe('home')
  })

  it('returns 1 if consumer directory already exists', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'aideck-init-consumer-'))
    tmpDirs.push(baseDir)

    // Create it once successfully
    const firstCode = await runInitConsumer({
      id: 'duplicate',
      title: 'Duplicate',
      mcpNamespace: 'duplicate',
      baseDir,
    })
    expect(firstCode).toBe(0)

    // Try to create the same consumer again
    const secondCode = await runInitConsumer({
      id: 'duplicate',
      title: 'Duplicate Again',
      mcpNamespace: 'duplicate',
      baseDir,
    })
    expect(secondCode).toBe(1)
  })
})
