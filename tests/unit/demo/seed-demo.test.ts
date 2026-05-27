// @vitest-environment node
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { readFile } from 'node:fs/promises'
import { cleanDemoConsumer, seedDemoConsumer } from '../../../src/demo/seed-demo.js'
import { parseManifest } from '../../../src/server/manifest-schema.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-seed-demo-test-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('seedDemoConsumer', () => {
  it('seeds demo consumer to target directory and returns the path', async () => {
    const target = await seedDemoConsumer(tmp)
    expect(target).toBe(join(tmp, 'consumers', 'aideck-demo'))
    await expect(access(target)).resolves.toBeUndefined()
  })

  it('creates manifest.yaml in the target', async () => {
    const target = await seedDemoConsumer(tmp)
    await expect(access(join(target, 'manifest.yaml'))).resolves.toBeUndefined()
  })

  it('creates data files in the target', async () => {
    const target = await seedDemoConsumer(tmp)
    await expect(access(join(target, 'data', 'projects.yaml'))).resolves.toBeUndefined()
    await expect(access(join(target, 'data', 'tasks.yaml'))).resolves.toBeUndefined()
    await expect(access(join(target, 'data', 'events.jsonl'))).resolves.toBeUndefined()
  })

  it('creates schema.json in the target', async () => {
    const target = await seedDemoConsumer(tmp)
    await expect(access(join(target, 'schema.json'))).resolves.toBeUndefined()
  })

  it('manifest.yaml parses and validates via parseManifest', async () => {
    const target = await seedDemoConsumer(tmp)
    const raw = await readFile(join(target, 'manifest.yaml'), 'utf8')
    const parsed = parseYaml(raw)
    const result = parseManifest(parsed)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe('aideck-demo')
      expect(result.value.mcpNamespace).toBe('aideck_demo')
      expect(result.value.pages).toHaveLength(6)
    }
  })

  it('manifest has 6 pages exercising all layout modes and 25 widgets', async () => {
    const target = await seedDemoConsumer(tmp)
    const raw = await readFile(join(target, 'manifest.yaml'), 'utf8')
    const parsed = parseYaml(raw)
    const result = parseManifest(parsed)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const layouts = result.value.pages.map((p) => p.layout)
      expect(layouts).toContain('sections')
      expect(layouts).toContain('grid')
    }
  })

  it('replaces existing directory on re-seed (idempotent)', async () => {
    await seedDemoConsumer(tmp)
    // Second seed should not throw
    const target = await seedDemoConsumer(tmp)
    await expect(access(join(target, 'manifest.yaml'))).resolves.toBeUndefined()
  })
})

describe('cleanDemoConsumer', () => {
  it('removes the demo consumer directory', async () => {
    const target = await seedDemoConsumer(tmp)
    await expect(access(target)).resolves.toBeUndefined()
    await cleanDemoConsumer(tmp)
    await expect(access(target)).rejects.toThrow()
  })

  it('is a no-op when directory does not exist', async () => {
    await expect(cleanDemoConsumer(tmp)).resolves.toBeUndefined()
  })
})
