// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'
import type { RuntimeEvent, StateChangeEvent } from '../../../src/server/events/types.js'

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
  projA = await mkdtemp(join(tmpdir(), 'aideck-mw-a-'))
  await mkdir(join(projA, '.atomic-skills', 'project-status', 'plans'), { recursive: true })

  projB = await mkdtemp(join(tmpdir(), 'aideck-mw-b-'))
  await mkdir(join(projB, '.atomic-skills', 'project-status', 'plans'), { recursive: true })
})

afterEach(async () => {
  await rm(projA, { recursive: true, force: true })
  await rm(projB, { recursive: true, force: true })
})

function waitForEvent(
  bus: ReturnType<typeof buildApp>['eventBus'],
  predicate: (e: RuntimeEvent) => boolean,
  timeoutMs = 5000
): Promise<RuntimeEvent[]> {
  return new Promise((resolve, reject) => {
    const events: RuntimeEvent[] = []
    let resolved = false
    const unsub = bus.subscribe((e) => {
      if (e.kind !== 'health-tick') events.push(e)
      if (predicate(e) && !resolved) {
        resolved = true
        setTimeout(() => {
          unsub()
          resolve(events)
        }, 200)
      }
    })
    setTimeout(() => {
      unsub()
      if (!resolved) reject(new Error(`timeout after ${timeoutMs}ms; saw ${events.length} events`))
      else resolve(events)
    }, timeoutMs)
  })
}

function post(app: ReturnType<typeof buildApp>['app'], path: string, body: unknown) {
  return app.fetch(new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }))
}

// ─── F1-G1: multi-watcher: independent events per project ──────────────

describe('multi-watcher', () => {
  it('registers 2 projects with watchers; events are tagged with projectId', async () => {
    const built = buildApp({ rootDir: projA, skipWatcher: false, demo: false, version: 'test' })

    const regA = await post(built.app, '/api/projects/register', { rootDir: projA, projectId: 'alpha' })
    expect(regA.status).toBe(201)

    const regB = await post(built.app, '/api/projects/register', { rootDir: projB, projectId: 'beta' })
    expect(regB.status).toBe(201)

    // Wait for watchers to be ready
    const entryA = built.registry.get('alpha')
    const entryB = built.registry.get('beta')
    if (entryA?.watcher) await entryA.watcher.ready()
    if (entryB?.watcher) await entryB.watcher.ready()

    // Write a plan to project A only
    const eventPromise = waitForEvent(built.eventBus, (e) =>
      e.kind === 'state-change' && 'projectId' in e && e.projectId === 'alpha'
    )
    await writeFile(join(projA, '.atomic-skills', 'project-status', 'plans', 'test-a.md'), PLAN_MD('test-a'))

    const events = await eventPromise

    const stateChanges = events.filter((e): e is StateChangeEvent => e.kind === 'state-change')
    const alphaEvents = stateChanges.filter((e) => e.projectId === 'alpha')
    const betaEvents = stateChanges.filter((e) => e.projectId === 'beta')

    expect(alphaEvents.length).toBeGreaterThanOrEqual(1)
    expect(betaEvents.length).toBe(0)

    // Cleanup watchers
    await built.registry.clear()
    if (built.watcher) await built.watcher.stop()
  }, 10000)
})

// ─── F1-G2: unregister stops watcher ───────────────────────────────────

describe('unregister watcher', () => {
  it('unregistering a project stops its watcher without affecting the other', async () => {
    const built = buildApp({ rootDir: projA, skipWatcher: false, demo: false, version: 'test' })

    await post(built.app, '/api/projects/register', { rootDir: projA, projectId: 'alpha' })
    await post(built.app, '/api/projects/register', { rootDir: projB, projectId: 'beta' })

    const entryA = built.registry.get('alpha')
    const entryB = built.registry.get('beta')
    if (entryA?.watcher) await entryA.watcher.ready()
    if (entryB?.watcher) await entryB.watcher.ready()

    // Unregister alpha
    await built.registry.unregister('alpha')

    // Beta should still be registered
    expect(built.registry.get('beta')).toBeTruthy()
    expect(built.registry.get('alpha')).toBeUndefined()

    // Write to projB and verify events still come through
    const eventPromise = waitForEvent(built.eventBus, (e) =>
      e.kind === 'state-change' && 'projectId' in e && e.projectId === 'beta'
    )
    await writeFile(join(projB, '.atomic-skills', 'project-status', 'plans', 'test-b.md'), PLAN_MD('test-b'))
    const events = await eventPromise

    const betaEvents = events.filter((e) => e.kind === 'state-change' && 'projectId' in e && e.projectId === 'beta')
    expect(betaEvents.length).toBeGreaterThanOrEqual(1)

    await built.registry.clear()
    if (built.watcher) await built.watcher.stop()
  }, 10000)
})

// ─── F1-G4: watcher error isolation ────────────────────────────────────

describe('watcher isolation', () => {
  it('watcher error in one project does not block events from another', async () => {
    const built = buildApp({ rootDir: projA, skipWatcher: false, demo: false, version: 'test' })

    await post(built.app, '/api/projects/register', { rootDir: projA, projectId: 'alpha' })
    await post(built.app, '/api/projects/register', { rootDir: projB, projectId: 'beta' })

    const entryA = built.registry.get('alpha')
    const entryB = built.registry.get('beta')
    if (entryA?.watcher) await entryA.watcher.ready()
    if (entryB?.watcher) await entryB.watcher.ready()

    // Write a malformed plan to projA to trigger a parse error
    await writeFile(join(projA, '.atomic-skills', 'project-status', 'plans', 'bad.md'), '---\ninvalid: yaml: "broken\n---\n# bad')

    // Write a valid plan to projB
    const eventPromise = waitForEvent(built.eventBus, (e) =>
      e.kind === 'state-change' && 'projectId' in e && e.projectId === 'beta'
    )
    await writeFile(join(projB, '.atomic-skills', 'project-status', 'plans', 'good.md'), PLAN_MD('good'))
    const events = await eventPromise

    // Beta's valid events should still arrive regardless of alpha's error
    const betaChanges = events.filter((e) => e.kind === 'state-change' && 'projectId' in e && e.projectId === 'beta')
    expect(betaChanges.length).toBeGreaterThanOrEqual(1)

    await built.registry.clear()
    if (built.watcher) await built.watcher.stop()
  }, 10000)
})
