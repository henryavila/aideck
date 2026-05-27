// @vitest-environment node
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

let tmp: string
let tmp2: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-proj-'))
  await mkdir(join(tmp, '.atomic-skills', 'project-status', 'plans'), { recursive: true })

  tmp2 = await mkdtemp(join(tmpdir(), 'aideck-proj2-'))
  await mkdir(join(tmp2, '.atomic-skills', 'project-status', 'plans'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
  await rm(tmp2, { recursive: true, force: true })
})

function build() {
  return buildApp({ rootDir: tmp, skipWatcher: true, demo: false, version: 'test' })
}

function post(app: ReturnType<typeof build>['app'], path: string, body: unknown) {
  return app.fetch(new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))
}

// ─── F0-G1: register accepts rootDir, creates entry, returns 201 ────────

describe('POST /api/projects/register', () => {
  it('registers a valid rootDir and returns 201', async () => {
    const { app } = build()
    const res = await post(app, '/api/projects/register', { rootDir: tmp })
    expect(res.status).toBe(201)
    const body = await res.json() as { project: { projectId: string; rootDir: string } }
    expect(body.project.projectId).toBeTruthy()
    expect(body.project.rootDir).toBe(resolve(tmp))
  })

  it('derives projectId from basename of rootDir', async () => {
    const { app } = build()
    const res = await post(app, '/api/projects/register', { rootDir: tmp })
    const body = await res.json() as { project: { projectId: string } }
    expect(body.project.projectId).toMatch(/^[a-z][a-z0-9-]{0,63}$/)
  })

  it('accepts explicit projectId', async () => {
    const { app } = build()
    const res = await post(app, '/api/projects/register', { rootDir: tmp, projectId: 'my-project' })
    expect(res.status).toBe(201)
    const body = await res.json() as { project: { projectId: string } }
    expect(body.project.projectId).toBe('my-project')
  })
})

// ─── F0-G2: GET /api/projects lists registered projects ─────────────────

describe('GET /api/projects', () => {
  it('lists registered projects', async () => {
    const { app } = build()
    await post(app, '/api/projects/register', { rootDir: tmp })
    await post(app, '/api/projects/register', { rootDir: tmp2 })

    const res = await app.fetch(new Request('http://127.0.0.1/api/projects'))
    expect(res.status).toBe(200)
    const body = await res.json() as { projects: Array<{ projectId: string }> }
    expect(body.projects).toHaveLength(2)
  })

  it('returns empty array when no projects registered', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/projects'))
    const body = await res.json() as { projects: unknown[] }
    expect(body.projects).toHaveLength(0)
  })
})

// ─── F0-G3: /api/health returns projects[] field ────────────────────────

describe('health endpoint', () => {
  it('/api/health returns aideck service fingerprint (v2 router)', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/health'))
    expect(res.status).toBe(200)
    const body = await res.json() as { service: string; status: string; consumerCount: number }
    expect(body.service).toBe('aideck')
    expect(body.status).toBe('ok')
    // v2 health response includes consumerCount from ConsumerRegistry
    expect(typeof body.consumerCount).toBe('number')
  })
})

// ─── F0-G4: register validation (rejects invalid rootDirs) ─────────────

describe('register validation', () => {
  it('rejects nonexistent rootDir', async () => {
    const { app } = build()
    const res = await post(app, '/api/projects/register', { rootDir: '/nonexistent/path/xyz' })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('invalid_input')
    expect(body.error.message).toContain('does not exist')
  })

  it('rejects rootDir without .atomic-skills/', async () => {
    const noAs = await mkdtemp(join(tmpdir(), 'aideck-noas-'))
    try {
      const { app } = build()
      const res = await post(app, '/api/projects/register', { rootDir: noAs })
      expect(res.status).toBe(400)
      const body = await res.json() as { error: { message: string } }
      expect(body.error.message).toContain('.atomic-skills')
    } finally {
      await rm(noAs, { recursive: true, force: true })
    }
  })

  it('rejects request without rootDir field', async () => {
    const { app } = build()
    const res = await post(app, '/api/projects/register', { foo: 'bar' })
    expect(res.status).toBe(400)
  })

  it('rejects duplicate rootDir with different explicit id', async () => {
    const { app } = build()
    await post(app, '/api/projects/register', { rootDir: tmp, projectId: 'alpha' })
    const res = await post(app, '/api/projects/register', { rootDir: tmp, projectId: 'beta' })
    expect(res.status).toBe(200)
    const body = await res.json() as { project: { projectId: string } }
    expect(body.project.projectId).toBe('alpha')
  })
})

// ─── F0-G5: idempotent re-register ─────────────────────────────────────

describe('register idempotent', () => {
  it('re-registering same rootDir returns 200 with same entry', async () => {
    const { app } = build()
    const first = await post(app, '/api/projects/register', { rootDir: tmp })
    expect(first.status).toBe(201)
    const firstBody = await first.json() as { project: { projectId: string } }

    const second = await post(app, '/api/projects/register', { rootDir: tmp })
    expect(second.status).toBe(200)
    const secondBody = await second.json() as { project: { projectId: string } }

    expect(secondBody.project.projectId).toBe(firstBody.project.projectId)
  })

  it('idempotent register does not duplicate the entry in list', async () => {
    const { app } = build()
    await post(app, '/api/projects/register', { rootDir: tmp })
    await post(app, '/api/projects/register', { rootDir: tmp })

    const res = await app.fetch(new Request('http://127.0.0.1/api/projects'))
    const body = await res.json() as { projects: unknown[] }
    expect(body.projects).toHaveLength(1)
  })
})

// ─── Unregister ─────────────────────────────────────────────────────────

describe('DELETE /api/projects/:id', () => {
  it('unregisters a registered project', async () => {
    const { app } = build()
    const reg = await post(app, '/api/projects/register', { rootDir: tmp })
    const { project } = await reg.json() as { project: { projectId: string } }

    const res = await app.fetch(new Request(`http://127.0.0.1/api/projects/${project.projectId}`, { method: 'DELETE' }))
    expect(res.status).toBe(200)

    const list = await app.fetch(new Request('http://127.0.0.1/api/projects'))
    const body = await list.json() as { projects: unknown[] }
    expect(body.projects).toHaveLength(0)
  })

  it('returns 404 for unknown project', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/projects/nope', { method: 'DELETE' }))
    expect(res.status).toBe(404)
  })
})
