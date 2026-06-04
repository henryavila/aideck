import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerRegistry } from '../../../../src/server/consumer-registry.js'
import { createApiV2Router } from '../../../../src/server/routes/api-v2.js'

const MANIFEST = `
schemaVersion: '0.1'
id: test-consumer
mcpNamespace: test_consumer
title: Test Consumer
icon: star
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
  slug: first-item
  title: First Item
  status: active
- id: item-2
  slug: second-item
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

describe('createApiV2Router', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'api-v2-'))
    await buildTestEnv(baseDir)
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  it('GET /api/health — returns status and consumer count', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '1.2.3', startedAt: Date.now() - 5000 })

    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body['schemaVersion']).toBe('0.1')
    expect(body['apiVersion']).toBe('0.1')
    expect(body['service']).toBe('aideck')
    expect(body['version']).toBe('1.2.3')
    expect(body['status']).toBe('ok')
    expect(typeof body['uptimeMs']).toBe('number')
    expect((body['uptimeMs'] as number)).toBeGreaterThan(0)
    expect(body['consumerCount']).toBe(1)
    const consumers_ = body['consumers'] as Array<{ id: string; title: string }>
    expect(consumers_).toHaveLength(1)
    expect(consumers_[0]).toMatchObject({ id: 'test-consumer', title: 'Test Consumer' })
  })

  it('GET /api/consumers — lists all registered consumers', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers')
    expect(res.status).toBe(200)
    const body = await res.json() as { consumers: Array<Record<string, unknown>> }
    expect(body.consumers).toHaveLength(1)
    expect(body.consumers[0]).toMatchObject({
      id: 'test-consumer',
      title: 'Test Consumer',
      icon: 'star',
      dataSourceCount: 1,
      pageCount: 1
    })
  })

  it('GET /api/consumers/:id — returns manifest for known consumer', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers/test-consumer')
    expect(res.status).toBe(200)
    const body = await res.json() as { manifest: Record<string, unknown> }
    expect(body.manifest).toBeDefined()
    expect(body.manifest['id']).toBe('test-consumer')
    expect(body.manifest['title']).toBe('Test Consumer')
    expect(body.manifest['schemaVersion']).toBe('0.1')
  })

  it('GET /api/consumers/:id — returns 404 for unknown consumer', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers/no-such-consumer')
    expect(res.status).toBe(404)
    const body = await res.json() as { schemaVersion: string; error: { code: string } }
    expect(body.schemaVersion).toBe('0.1')
    expect(body.error.code).toBe('consumer_not_found')
  })

  it('GET /api/consumers/:id/data/:dsId — returns records from data source', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers/test-consumer/data/items')
    expect(res.status).toBe(200)
    const body = await res.json() as { records: Array<Record<string, unknown>>; count: number }
    expect(body.count).toBe(2)
    expect(body.records).toHaveLength(2)
    expect(body.records[0]).toMatchObject({ id: 'item-1', status: 'active' })
    expect(body.records[1]).toMatchObject({ id: 'item-2', status: 'done' })
  })

  it('GET /api/consumers/:id/data/:dsId/:slug — returns single record by slug', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers/test-consumer/data/items/second-item')
    expect(res.status).toBe(200)
    const body = await res.json() as { record: Record<string, unknown> }
    expect(body.record).toMatchObject({ id: 'item-2', slug: 'second-item', title: 'Second Item' })
  })

  it('GET /api/consumers/:id/data/:dsId/:slug — returns 404 for unknown slug', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const res = await app.request('/api/consumers/test-consumer/data/items/no-such-item')
    expect(res.status).toBe(404)
    const body = await res.json() as { schemaVersion: string; error: { code: string } }
    expect(body.schemaVersion).toBe('0.1')
    expect(body.error.code).toBe('entity_not_found')
  })

  // A `root: 'project'` source (or one derived from it) cannot be served from
  // the consumer-dir endpoint — there is no project context to resolve its path,
  // so reading from consumer.dir would silently return 0 rows. It must error.
  const PROJECT_MANIFEST = `
schemaVersion: '0.1'
id: proj-consumer
mcpNamespace: proj_consumer
title: Project Consumer
dataSources:
  - id: plans
    path: .atomic-skills/projects/*/*/plan.md
    format: frontmatter
    root: project
    captures: [projectId, planSlug]
  - id: phases
    derivesFrom: plans
    explode: phases
    carry: [projectId, planSlug]
pages:
  - slug: overview
    title: Overview
    layout: sections
    sections: []
`.trimStart()

  async function withProjectConsumer() {
    const dir = join(baseDir, 'consumers', 'proj-consumer')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'manifest.yaml'), PROJECT_MANIFEST, 'utf8')
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    return createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })
  }

  it("GET /data/:dsId — rejects a root:'project' source with a validation error (not 0 rows)", async () => {
    const app = await withProjectConsumer()
    const res = await app.request('/api/consumers/proj-consumer/data/plans')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('validation_error')
    expect(body.error.message).toContain('project-scoped')
  })

  it("GET /data/:dsId — rejects a source derived from a root:'project' source", async () => {
    const app = await withProjectConsumer()
    const res = await app.request('/api/consumers/proj-consumer/data/phases')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('validation_error')
  })

  it("GET /data/:dsId/:slug — also rejects a root:'project' source", async () => {
    const app = await withProjectConsumer()
    const res = await app.request('/api/consumers/proj-consumer/data/plans/anything')
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('validation_error')
  })

  it('POST /api/consumers/:id/write/:target — appends JSONL and returns path', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    const record = { kind: 'event', message: 'test write', ts: '2026-05-26T00:00:00Z' }
    const res = await app.request('/api/consumers/test-consumer/write/data/events.jsonl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; path: string }
    expect(body.ok).toBe(true)
    expect(body.path).toBe('data/events.jsonl')

    const consumerDir = join(baseDir, 'consumers', 'test-consumer')
    const writtenPath = join(consumerDir, 'data', 'events.jsonl')
    const contents = await readFile(writtenPath, 'utf8')
    const parsed = JSON.parse(contents.trim()) as typeof record
    expect(parsed).toMatchObject(record)
  })

  it('POST /api/consumers/:id/write/:target — rejects path traversal escaping data/', async () => {
    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const app = createApiV2Router({ consumers, version: '0.0.0', startedAt: Date.now() })

    // Encode the slashes as %2f so the URL parser sees a single opaque segment
    // and does NOT collapse the dot-segments; Hono then decodes the param back
    // to "data/../../../../tmp/aideck-evil.jsonl" — the realistic traversal vector.
    const res = await app.request(
      '/api/consumers/test-consumer/write/data%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2ftmp%2faideck-evil.jsonl',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pwned: true })
      }
    )
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('validation_error')
  })
})
