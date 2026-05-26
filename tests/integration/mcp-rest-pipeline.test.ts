import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ToolRegistry } from '../../src/mcp/registry.js'
import { createConsumerRegistry } from '../../src/server/consumer-registry.js'
import { registerGenericTools } from '../../src/mcp/tools/generic.js'
import { registerConsumerTools } from '../../src/mcp/tools/consumer-tools.js'
import { createApiV2Router } from '../../src/server/routes/api-v2.js'
import type { McpToolContext } from '../../src/mcp/types.js'

// ─── fixtures ─────────────────────────────────────────────────────────────────

const INT_MANIFEST = `\
schemaVersion: '0.1'
id: test-int
mcpNamespace: test_int
title: Integration Test Consumer
dataSources:
  - id: tasks
    path: 'data/tasks.yaml'
    format: yaml
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
tools:
  - name: add_task
    description: Add a new task
    input:
      type: object
      required: [title]
      properties:
        title:
          type: string
    handler:
      type: file-mutation
      target: "data/inbox/{{ isoDate }}.jsonl"
      operation: append
      record:
        kind: new_task
        title: "{{ title }}"
`

const INT_TASKS_YAML = `\
- id: T-001
  title: First task
  done: false
- id: T-002
  title: Second task
  done: true
`

const ALPHA_MANIFEST = `\
schemaVersion: '0.1'
id: alpha
mcpNamespace: alpha
title: Alpha Consumer
dataSources:
  - id: widgets
    path: 'data/widgets.yaml'
    format: yaml
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
`

const ALPHA_WIDGETS_YAML = `\
- id: W-001
  name: Gizmo
  active: true
- id: W-002
  name: Gadget
  active: false
`

const BETA_MANIFEST = `\
schemaVersion: '0.1'
id: beta
mcpNamespace: beta
title: Beta Consumer
dataSources:
  - id: events
    path: 'data/events.yaml'
    format: yaml
pages:
  - slug: home
    title: Home
    layout: sections
    sections: []
`

const BETA_EVENTS_YAML = `\
- id: E-001
  type: signup
  user: alice
- id: E-002
  type: purchase
  user: bob
`

// ─── helpers ──────────────────────────────────────────────────────────────────

async function writeConsumer(
  baseDir: string,
  slug: string,
  manifest: string,
  dataFiles: Record<string, string>
): Promise<void> {
  const dir = join(baseDir, 'consumers', slug)
  await mkdir(join(dir, 'data'), { recursive: true })
  await writeFile(join(dir, 'manifest.yaml'), manifest, 'utf8')
  for (const [relPath, content] of Object.entries(dataFiles)) {
    const fullPath = join(dir, relPath)
    await mkdir(join(fullPath, '..'), { recursive: true })
    await writeFile(fullPath, content, 'utf8')
  }
}

const ctx: McpToolContext = { rootDir: '', version: '0.0.1' }

// ─── tests ────────────────────────────────────────────────────────────────────

describe('MCP + REST pipeline (F1 integration)', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'aideck-f1-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('MCP read/list flow — aideck_list_consumers and aideck_list return correct data', async () => {
    await writeConsumer(baseDir, 'test-int', INT_MANIFEST, {
      'data/tasks.yaml': INT_TASKS_YAML
    })

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const registry = new ToolRegistry()
    registerGenericTools(registry, consumers, '0.0.1')

    // aideck_list_consumers returns the consumer
    const listConsumersResult = await registry.invoke('aideck_list_consumers', {}, ctx)
    expect(listConsumersResult.isError).toBeFalsy()
    const listConsumersBody = JSON.parse(listConsumersResult.content[0].text) as {
      consumers: Array<{ id: string; title: string; dataSourceCount: number; pageCount: number }>
    }
    expect(listConsumersBody.consumers).toHaveLength(1)
    expect(listConsumersBody.consumers[0]).toMatchObject({
      id: 'test-int',
      title: 'Integration Test Consumer',
      dataSourceCount: 1,
      pageCount: 1
    })

    // aideck_list returns the data records
    const listResult = await registry.invoke(
      'aideck_list',
      { consumer: 'test-int', dataSource: 'tasks' },
      ctx
    )
    expect(listResult.isError).toBeFalsy()
    const listBody = JSON.parse(listResult.content[0].text) as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(listBody.count).toBe(2)
    expect(listBody.records).toHaveLength(2)
    expect(listBody.records[0]).toMatchObject({ id: 'T-001', title: 'First task', done: false })
    expect(listBody.records[1]).toMatchObject({ id: 'T-002', title: 'Second task', done: true })
  })

  it('MCP consumer tool flow — file-mutation tool creates JSONL inbox file', async () => {
    await writeConsumer(baseDir, 'test-int', INT_MANIFEST, {
      'data/tasks.yaml': INT_TASKS_YAML
    })

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const registry = new ToolRegistry()
    registerConsumerTools(registry, consumers)

    // The tool should be registered as aideck_test_int_add_task
    expect(registry.has('aideck_test_int_add_task')).toBe(true)

    const result = await registry.invoke(
      'aideck_test_int_add_task',
      { title: 'Write integration tests' },
      ctx
    )
    expect(result.isError).toBeFalsy()

    const body = JSON.parse(result.content[0].text) as { path: string }
    expect(body.path).toMatch(/\.jsonl$/)

    // Verify the JSONL file was created with the correct record
    const contents = await readFile(body.path, 'utf8')
    const line = JSON.parse(contents.trim()) as Record<string, unknown>
    expect(line).toMatchObject({ kind: 'new_task', title: 'Write integration tests' })
  })

  it('REST data flow — GET /api/consumers and GET /api/consumers/:id/data/:dsId return records', async () => {
    await writeConsumer(baseDir, 'test-int', INT_MANIFEST, {
      'data/tasks.yaml': INT_TASKS_YAML
    })

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const app = createApiV2Router({ consumers, version: '0.0.1', startedAt: Date.now() })

    // GET /api/consumers lists the consumer
    const consumerListRes = await app.request('/api/consumers')
    expect(consumerListRes.status).toBe(200)
    const consumerListBody = await consumerListRes.json() as {
      consumers: Array<{ id: string; title: string }>
    }
    expect(consumerListBody.consumers).toHaveLength(1)
    expect(consumerListBody.consumers[0]).toMatchObject({
      id: 'test-int',
      title: 'Integration Test Consumer'
    })

    // GET /api/consumers/:id/data/:dsId returns the same records as MCP
    const dataRes = await app.request('/api/consumers/test-int/data/tasks')
    expect(dataRes.status).toBe(200)
    const dataBody = await dataRes.json() as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(dataBody.count).toBe(2)
    expect(dataBody.records).toHaveLength(2)
    expect(dataBody.records[0]).toMatchObject({ id: 'T-001', title: 'First task', done: false })
    expect(dataBody.records[1]).toMatchObject({ id: 'T-002', title: 'Second task', done: true })

    // Cross-verify: same records as MCP aideck_list
    const registry = new ToolRegistry()
    registerGenericTools(registry, consumers, '0.0.1')
    const mcpResult = await registry.invoke(
      'aideck_list',
      { consumer: 'test-int', dataSource: 'tasks' },
      ctx
    )
    const mcpBody = JSON.parse(mcpResult.content[0].text) as {
      records: Array<Record<string, unknown>>
    }
    expect(dataBody.records).toEqual(mcpBody.records)
  })

  it('Multi-consumer isolation — MCP and REST return only each consumer\'s own data', async () => {
    await writeConsumer(baseDir, 'alpha', ALPHA_MANIFEST, {
      'data/widgets.yaml': ALPHA_WIDGETS_YAML
    })
    await writeConsumer(baseDir, 'beta', BETA_MANIFEST, {
      'data/events.yaml': BETA_EVENTS_YAML
    })

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    expect(consumers.list()).toHaveLength(2)

    const registry = new ToolRegistry()
    registerGenericTools(registry, consumers, '0.0.1')

    // MCP: aideck_list for alpha returns only alpha's widgets
    const alphaResult = await registry.invoke(
      'aideck_list',
      { consumer: 'alpha', dataSource: 'widgets' },
      ctx
    )
    expect(alphaResult.isError).toBeFalsy()
    const alphaBody = JSON.parse(alphaResult.content[0].text) as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(alphaBody.count).toBe(2)
    expect(alphaBody.records.every((r) => 'name' in r)).toBe(true)
    expect(alphaBody.records.every((r) => !('type' in r))).toBe(true)

    // MCP: aideck_list for beta returns only beta's events
    const betaResult = await registry.invoke(
      'aideck_list',
      { consumer: 'beta', dataSource: 'events' },
      ctx
    )
    expect(betaResult.isError).toBeFalsy()
    const betaBody = JSON.parse(betaResult.content[0].text) as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(betaBody.count).toBe(2)
    expect(betaBody.records.every((r) => 'type' in r)).toBe(true)
    expect(betaBody.records.every((r) => !('name' in r))).toBe(true)

    // REST: consumer B returns only beta's events
    const app = createApiV2Router({ consumers, version: '0.0.1', startedAt: Date.now() })

    const betaRestRes = await app.request('/api/consumers/beta/data/events')
    expect(betaRestRes.status).toBe(200)
    const betaRestBody = await betaRestRes.json() as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(betaRestBody.count).toBe(2)
    expect(betaRestBody.records.every((r) => 'type' in r)).toBe(true)
    expect(betaRestBody.records.every((r) => !('name' in r))).toBe(true)

    // REST: consumer A returns only alpha's widgets
    const alphaRestRes = await app.request('/api/consumers/alpha/data/widgets')
    expect(alphaRestRes.status).toBe(200)
    const alphaRestBody = await alphaRestRes.json() as {
      records: Array<Record<string, unknown>>
      count: number
    }
    expect(alphaRestBody.count).toBe(2)
    expect(alphaRestBody.records.every((r) => 'name' in r)).toBe(true)
    expect(alphaRestBody.records.every((r) => !('type' in r))).toBe(true)

    // Cross-check: alpha MCP data matches alpha REST data
    expect(alphaRestBody.records).toEqual(alphaBody.records)

    // Cross-check: beta MCP data matches beta REST data
    expect(betaRestBody.records).toEqual(betaBody.records)

    // Ensure alpha data is absent from beta results and vice versa
    const alphaIds = alphaBody.records.map((r) => r['id'])
    const betaIds = betaBody.records.map((r) => r['id'])
    expect(alphaIds.some((id) => betaIds.includes(id))).toBe(false)
  })
})
