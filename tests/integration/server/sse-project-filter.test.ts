// @vitest-environment node
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-sse-proj-'))
  await mkdir(join(tmp, '.atomic-skills', 'project-status', 'plans'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function build() {
  return buildApp({ rootDir: tmp, skipWatcher: true, demo: false, version: 'test' })
}

// ─── F1-G3: SSE default project filtering ──────────────────────────────

describe('sse default project filtering', () => {
  it('legacy /sse emits only default project events', async () => {
    const { app, eventBus, registry } = build()

    registry.register(tmp, 'default-proj')

    // Emit events for different projects
    eventBus.emit({ kind: 'state-change', consumer: 'project-status', slug: 'p1', entityKind: 'plan', changeType: 'add', projectId: 'default-proj' })
    eventBus.emit({ kind: 'state-change', consumer: 'project-status', slug: 'p2', entityKind: 'plan', changeType: 'add', projectId: 'other-proj' })
    eventBus.emit({ kind: 'health-tick', uptimeMs: 1000 })

    const res = await app.fetch(new Request('http://127.0.0.1/sse', {
      headers: { 'Last-Event-ID': '0' }
    }))
    expect(res.status).toBe(200)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    const startTime = Date.now()

    while (Date.now() - startTime < 500) {
      const { value, done } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (text.includes('health-tick')) break
    }
    reader.cancel()

    // Should contain default project event and health-tick, NOT other-proj
    expect(text).toContain('"projectId":"default-proj"')
    expect(text).not.toContain('"projectId":"other-proj"')
    expect(text).toContain('health-tick')
  })

  it('/sse?project=X filters to project X only', async () => {
    const { app, eventBus, registry } = build()

    registry.register(tmp, 'alpha')

    eventBus.emit({ kind: 'state-change', consumer: 'project-status', slug: 'p1', entityKind: 'plan', changeType: 'add', projectId: 'alpha' })
    eventBus.emit({ kind: 'state-change', consumer: 'project-status', slug: 'p2', entityKind: 'plan', changeType: 'add', projectId: 'beta' })
    eventBus.emit({ kind: 'health-tick', uptimeMs: 1000 })

    const res = await app.fetch(new Request('http://127.0.0.1/sse?project=beta', {
      headers: { 'Last-Event-ID': '0' }
    }))
    expect(res.status).toBe(200)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    const startTime = Date.now()

    while (Date.now() - startTime < 500) {
      const { value, done } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (text.includes('health-tick')) break
    }
    reader.cancel()

    // Should contain beta event and health-tick, NOT alpha
    expect(text).toContain('"projectId":"beta"')
    expect(text).not.toContain('"projectId":"alpha"')
  })
})
