import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerRegistry } from '../../../src/server/consumer-registry.js'
import { ToolRegistry } from '../../../src/mcp/registry.js'
import { registerGenericTools } from '../../../src/mcp/tools/generic.js'
import type { McpToolContext } from '../../../src/mcp/types.js'

const MANIFEST = `
schemaVersion: '0.1'
id: test-consumer
mcpNamespace: test_consumer
title: Test Consumer
icon: rocket
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

const ITEMS_YAML = `
- id: item-1
  title: First Item
  status: active
- id: item-2
  title: Second Item
  status: done
`.trimStart()

async function buildTestEnv(baseDir: string) {
  const consumersDir = join(baseDir, 'consumers')
  const consumerDir = join(consumersDir, 'test-consumer')
  const dataDir = join(consumerDir, 'data')
  await mkdir(dataDir, { recursive: true })
  await writeFile(join(consumerDir, 'manifest.yaml'), MANIFEST, 'utf8')
  await writeFile(join(dataDir, 'items.yaml'), ITEMS_YAML, 'utf8')
}

function buildRegistries(baseDir: string) {
  const consumers = createConsumerRegistry(baseDir)
  const registry = new ToolRegistry()
  const version = '0.0.0-test'
  const startedAt = Date.now() - 1000
  registerGenericTools(registry, consumers, version, startedAt)
  return { consumers, registry, version, startedAt }
}

const ctx: McpToolContext = { rootDir: '', version: '0.0.0-test' }

describe('registerGenericTools', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'generic-tools-'))
    await buildTestEnv(baseDir)
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('aideck_list_consumers — returns registered consumer with correct metadata', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke('aideck_list_consumers', {}, ctx)
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as {
      consumers: Array<{ id: string; title: string; icon?: string; dataSourceCount: number; pageCount: number }>
    }
    expect(parsed.consumers).toHaveLength(1)
    expect(parsed.consumers[0]).toMatchObject({
      id: 'test-consumer',
      title: 'Test Consumer',
      icon: 'rocket',
      dataSourceCount: 1,
      pageCount: 1
    })
  })

  it('aideck_list — returns all records from a data source', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke(
      'aideck_list',
      { consumer: 'test-consumer', dataSource: 'items' },
      ctx
    )
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(parsed.count).toBe(2)
    expect(parsed.records).toHaveLength(2)
    expect(parsed.records[0]).toMatchObject({ id: 'item-1', status: 'active' })
    expect(parsed.records[1]).toMatchObject({ id: 'item-2', status: 'done' })
  })

  it('aideck_list with filter — returns only matching records', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke(
      'aideck_list',
      { consumer: 'test-consumer', dataSource: 'items', filter: { status: 'active' } },
      ctx
    )
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(parsed.count).toBe(1)
    expect(parsed.records[0]).toMatchObject({ id: 'item-1', status: 'active' })
  })

  it('aideck_read with slug — returns single matching record', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke(
      'aideck_read',
      { consumer: 'test-consumer', dataSource: 'items', slug: 'item-2' },
      ctx
    )
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as { record: Record<string, unknown> }
    expect(parsed.record).toMatchObject({ id: 'item-2', title: 'Second Item', status: 'done' })
  })

  it('aideck_read — error for unknown consumer', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke(
      'aideck_read',
      { consumer: 'no-such-consumer', dataSource: 'items' },
      ctx
    )
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text) as { error: { code: string } }
    expect(parsed.error.code).toBe('consumer_unknown')
  })

  it('aideck_write — appends JSONL to target, verify file contents', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const record = { kind: 'note', text: 'hello world', ts: '2026-05-26T00:00:00Z' }
    const result = await registry.invoke(
      'aideck_write',
      { consumer: 'test-consumer', target: 'data/notes.jsonl', record },
      ctx
    )
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as { path: string }
    expect(parsed.path).toContain('notes.jsonl')

    const contents = await readFile(parsed.path, 'utf8')
    const line = JSON.parse(contents.trim()) as typeof record
    expect(line).toMatchObject(record)
  })

  it('aideck_health — returns ok status with consumer count', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke('aideck_health', {}, ctx)
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as {
      status: string
      version: string
      consumerCount: number
      uptimeMs: number
    }
    expect(parsed.status).toBe('ok')
    expect(parsed.version).toBe('0.0.0-test')
    expect(parsed.consumerCount).toBe(1)
    expect(parsed.uptimeMs).toBeGreaterThan(0)
  })

  it('aideck_schema_version — returns version strings', async () => {
    const { consumers, registry } = buildRegistries(baseDir)
    await consumers.scan()

    const result = await registry.invoke('aideck_schema_version', {}, ctx)
    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as {
      schemaVersion: string
      apiVersion: string
      version: string
    }
    expect(parsed.schemaVersion).toBe('0.1')
    expect(parsed.apiVersion).toBe('0.1')
    expect(parsed.version).toBe('0.0.0-test')
  })
})
