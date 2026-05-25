// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

let projA: string
let projB: string

const PLAN_MD = (slug: string) => `---
schemaVersion: '0.1'
slug: ${slug}
title: '${slug}'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: null
parallelismAllowed: false
phases: []
---
# ${slug}
`

beforeEach(async () => {
  projA = await mkdtemp(join(tmpdir(), 'aideck-scoped-a-'))
  await mkdir(join(projA, '.atomic-skills', 'project-status', 'plans'), { recursive: true })
  await writeFile(join(projA, '.atomic-skills', 'project-status', 'plans', 'plan-a.md'), PLAN_MD('plan-a'))

  projB = await mkdtemp(join(tmpdir(), 'aideck-scoped-b-'))
  await mkdir(join(projB, '.atomic-skills', 'project-status', 'plans'), { recursive: true })
  await writeFile(join(projB, '.atomic-skills', 'project-status', 'plans', 'plan-b.md'), PLAN_MD('plan-b'))
})

afterEach(async () => {
  await rm(projA, { recursive: true, force: true })
  await rm(projB, { recursive: true, force: true })
})

function build() {
  return buildApp({ rootDir: projA, skipWatcher: true, demo: false, version: 'test' })
}

function post(app: ReturnType<typeof build>['app'], path: string, body: unknown) {
  return app.fetch(new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))
}

// ─── F2-G1: project-scoped state returns correct project ────────────────

describe('project-scoped state', () => {
  it('GET /api/projects/:id/state/project-status returns state for the correct project', async () => {
    const { app, registry } = build()
    registry.register(projA, 'alpha')
    registry.register(projB, 'beta')

    const resA = await app.fetch(new Request('http://127.0.0.1/api/projects/alpha/state/project-status'))
    expect(resA.status).toBe(200)
    const bodyA = await resA.json() as { state: { plans: Array<{ slug: string }> } }
    expect(bodyA.state.plans).toHaveLength(1)
    expect(bodyA.state.plans[0].slug).toBe('plan-a')

    const resB = await app.fetch(new Request('http://127.0.0.1/api/projects/beta/state/project-status'))
    expect(resB.status).toBe(200)
    const bodyB = await resB.json() as { state: { plans: Array<{ slug: string }> } }
    expect(bodyB.state.plans).toHaveLength(1)
    expect(bodyB.state.plans[0].slug).toBe('plan-b')
  })

  it('returns 404 for unregistered projectId', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/projects/nope/state/project-status'))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })

  it('returns scoped slug via /api/projects/:id/state/:consumer/:slug', async () => {
    const { app, registry } = build()
    registry.register(projB, 'beta')

    const res = await app.fetch(new Request('http://127.0.0.1/api/projects/beta/state/project-status/plan-b'))
    expect(res.status).toBe(200)
    const body = await res.json() as { entity: { slug: string } }
    expect(body.entity.slug).toBe('plan-b')
  })
})

// ─── F2-G2: backward-compat: legacy routes still work ───────────────────

describe('backward-compat', () => {
  it('GET /api/state/project-status returns state from the default rootDir', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/state/project-status'))
    expect(res.status).toBe(200)
    const body = await res.json() as { state: { plans: Array<{ slug: string }> } }
    expect(body.state.plans).toHaveLength(1)
    expect(body.state.plans[0].slug).toBe('plan-a')
  })

  it('GET /api/state/project-status/:slug returns slug from the default rootDir', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/state/project-status/plan-a'))
    expect(res.status).toBe(200)
    const body = await res.json() as { entity: { slug: string } }
    expect(body.entity.slug).toBe('plan-a')
  })

  it('legacy routes are not affected by project registration', async () => {
    const { app, registry } = build()
    registry.register(projB, 'beta')

    // Legacy still returns projA state (the rootDir)
    const res = await app.fetch(new Request('http://127.0.0.1/api/state/project-status'))
    expect(res.status).toBe(200)
    const body = await res.json() as { state: { plans: Array<{ slug: string }> } }
    expect(body.state.plans[0].slug).toBe('plan-a')
  })
})
