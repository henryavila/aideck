// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

let tmp: string
let staticDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-static-'))
  await mkdir(join(tmp, '.atomic-skills', 'project-status', 'plans'), { recursive: true })

  staticDir = join(tmp, 'fake-dist')
  await mkdir(join(staticDir, 'assets'), { recursive: true })
  await writeFile(join(staticDir, 'index.html'), '<!doctype html><html><body><h1>hello</h1></body></html>')
  await writeFile(join(staticDir, 'asset.js'), 'console.log("x")')
  await writeFile(join(staticDir, 'assets', 'main.css'), 'body { color: red; }')
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function build() {
  return buildApp({ rootDir: tmp, skipWatcher: true, demo: false, version: 'test', staticDir })
}

describe('serve --static-dir', () => {
  it('serves index.html at /', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/'))
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('hello')
    expect(res.headers.get('content-type')).toContain('text/html')
  })

  it('serves a top-level asset (asset.js) with JS mime', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/asset.js'))
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('console.log')
    expect(res.headers.get('content-type')).toContain('application/javascript')
  })

  it('serves a nested asset (assets/main.css) with CSS mime', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/assets/main.css'))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('color: red')
    expect(res.headers.get('content-type')).toContain('text/css')
  })

  it('falls back to index.html for an unknown SPA route', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/some/spa/route'))
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('hello')
  })

  it('still serves /api/health when --static-dir is set', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/health'))
    expect(res.status).toBe(200)
    const body = await res.json() as { service: string }
    expect(body.service).toBe('aideck')
  })

  it('returns 404 JSON for unknown /api/ routes even with --static-dir set', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/api/does-not-exist'))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })

  it('refuses path traversal attempts (../../etc/passwd) without serving sensitive files', async () => {
    const { app } = build()
    const res = await app.fetch(new Request('http://127.0.0.1/../../etc/passwd'))
    // Either 404 or SPA fallback to index.html — never the actual /etc/passwd
    expect([200, 404]).toContain(res.status)
    const body = await res.text()
    expect(body).not.toContain('root:')
  })
})

describe('serve without --static-dir', () => {
  function buildNoStatic() {
    return buildApp({ rootDir: tmp, skipWatcher: true, demo: false, version: 'test' })
  }

  it('returns 404 JSON for unknown /api/ routes', async () => {
    const { app } = buildNoStatic()
    const res = await app.fetch(new Request('http://127.0.0.1/api/unknown'))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })

  it('does not serve SPA bundle at / when --static-dir is not set', async () => {
    const { app } = buildNoStatic()
    const res = await app.fetch(new Request('http://127.0.0.1/'))
    expect(res.status).toBe(404)
  })
})
