// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

let tmp: string
let consumerDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-api-'))
  consumerDir = join(tmp, '.atomic-skills', 'project-status')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await mkdir(join(consumerDir, 'annotations'), { recursive: true })
  await mkdir(join(consumerDir, 'highlights'), { recursive: true })
  await writeFile(
    join(consumerDir, 'plans/p-one.md'),
    `---
schemaVersion: '0.1'
slug: p-one
title: 'P one'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: null
parallelismAllowed: false
phases: []
---
# body
`
  )
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function build() {
  return buildApp({ rootDir: tmp, skipWatcher: true, demo: false, version: 'test' })
}

describe('GET /api/health', () => {
  it('returns the aideck fingerprint', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/health'))
    expect(res.status).toBe(200)
    const body = await res.json() as { service: string; consumerCount: number; status: string }
    expect(body.service).toBe('aideck')
    expect(body.status).toBe('ok')
    // v2 router serves /api/health now; consumerCount reflects v2 ConsumerRegistry
    expect(typeof body.consumerCount).toBe('number')
  })
})

describe('GET /api/consumers', () => {
  it('returns consumers array (empty when no v2 consumers registered)', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/consumers'))
    expect(res.status).toBe(200)
    const body = await res.json() as { consumers: unknown[] }
    // v2 router serves /api/consumers now; returns manifest-based consumers
    expect(Array.isArray(body.consumers)).toBe(true)
  })
})

describe('GET /api/state/:consumer + :slug', () => {
  it('returns the aggregated state for a known consumer', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/state/project-status'))
    expect(res.status).toBe(200)
    const body = await res.json() as { state: { plans: unknown[] } }
    expect(body.state.plans).toHaveLength(1)
  })

  it('returns slug_not_found 404 for unknown slug', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/state/project-status/nope'))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('slug_not_found')
  })
})

describe('POST /api/annotate', () => {
  it('appends a new annotation and emits annotation-added', async () => {
    const { app, eventBus } = build()
    const captured: unknown[] = []
    eventBus.subscribe((e) => captured.push(e))
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/annotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
          author: 'ai',
          body: 'first note'
        })
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    expect(body.id).toMatch(/^ann-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/)
    expect(captured.find((e) => (e as { kind?: string }).kind === 'annotation-added')).toBeDefined()
  })

  it('rejects an invalid annotation body with 400', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/annotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target: {}, author: 'bot' })
      })
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/annotation/:id/resolve + /api/highlight/:id/acknowledge', () => {
  it('resolve appends a Resolution JSONL', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/annotation/ann-2026-05-19-001/resolve?consumer=project-status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ by: 'human', note: 'addressed' })
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json() as { resolution: { kind: string; refId: string } }
    expect(body.resolution.kind).toBe('resolution')
    expect(body.resolution.refId).toBe('ann-2026-05-19-001')
  })

  it('acknowledge appends an Acknowledgement JSONL', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/highlight/hl-2026-05-19-001/acknowledge?consumer=project-status', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ by: 'ai' })
      })
    )
    expect(res.status).toBe(201)
  })
})

describe('GET /api/inbox + /api/help + /api/next-action', () => {
  it('returns inbox items including the seeded annotation', async () => {
    const { app } = build()
    await app.fetch(
      new Request('http://127.0.0.1/api/annotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
          author: 'human',
          body: 'inbox test'
        })
      })
    )
    const res = await app.fetch(new Request('http://127.0.0.1/api/inbox?limit=10'))
    expect(res.status).toBe(200)
    const body = await res.json() as { items: Array<{ kind: string }> }
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.items.some((i) => i.kind === 'annotation')).toBe(true)
  })

  it('/api/help returns the static skill catalog', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/help'))
    expect(res.status).toBe(200)
    const body = await res.json() as { skills: Array<{ name: string }> }
    expect(body.skills.length).toBeGreaterThan(0)
  })

  it('/api/next-action returns a sentinel when no active initiative exists', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/next-action?consumer=project-status')
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { nextAction: { description: string } }
    expect(typeof body.nextAction.description).toBe('string')
  })
})

describe('CORS', () => {
  it('allows OPTIONS preflight from localhost', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/health', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173' }
      })
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('rejects a request from an external origin with 403', async () => {
    const { app } = build()
    const res = await app.fetch(
      new Request('http://127.0.0.1/api/health', {
        headers: { origin: 'http://evil.com' }
      })
    )
    expect(res.status).toBe(403)
  })

  it('allows requests with no Origin header (curl / native client)', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/health'))
    expect(res.status).toBe(200)
  })
})

describe('SPA fallback', () => {
  it('returns 404 JSON for unknown /api/ routes', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/unknown'))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })
})
