// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'
import type { RuntimeEvent } from '../../../src/server/events/types.js'

let projA: string
let projB: string
let aideckDir: string

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

// A project-status consumer manifest whose project-rooted glob matches the plan
// files written below — this is what makes the watcher emit data_changed.
const PS_MANIFEST = `schemaVersion: '0.1'
id: project-status
mcpNamespace: project_status
title: 'Project Status'
dataSources:
  - id: plans
    path: '.atomic-skills/*/plans/**/*.md'
    format: frontmatter
    root: project
pages: []
`

async function seedAideckDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'aideck-home-'))
  const consumerDir = join(dir, 'consumers', 'project-status')
  await mkdir(consumerDir, { recursive: true })
  await writeFile(join(consumerDir, 'manifest.yaml'), PS_MANIFEST)
  return dir
}

beforeEach(async () => {
  projA = await mkdtemp(join(tmpdir(), 'aideck-mw-a-'))
  await mkdir(join(projA, '.atomic-skills', 'project-status', 'plans'), { recursive: true })

  projB = await mkdtemp(join(tmpdir(), 'aideck-mw-b-'))
  await mkdir(join(projB, '.atomic-skills', 'project-status', 'plans'), { recursive: true })

  aideckDir = await seedAideckDir()
})

afterEach(async () => {
  await rm(projA, { recursive: true, force: true })
  await rm(projB, { recursive: true, force: true })
  await rm(aideckDir, { recursive: true, force: true })
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

async function buildWithConsumers(rootDir: string) {
  const built = buildApp({ rootDir, skipWatcher: false, demo: false, version: 'test', aideckBaseDir: aideckDir })
  await built.consumers.scan()
  return built
}

function isDataChangedFor(e: RuntimeEvent, projectId: string): boolean {
  return e.kind === 'data_changed' && 'projectId' in e && e.projectId === projectId
}

// ─── F1-G1: multi-watcher: independent events per project ──────────────

describe('multi-watcher', () => {
  it('registers 2 projects with watchers; events are tagged with projectId', async () => {
    const built = await buildWithConsumers(projA)

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
    const eventPromise = waitForEvent(built.eventBus, (e) => isDataChangedFor(e, 'alpha'))
    await writeFile(join(projA, '.atomic-skills', 'project-status', 'plans', 'test-a.md'), PLAN_MD('test-a'))

    const events = await eventPromise

    const alphaEvents = events.filter((e) => isDataChangedFor(e, 'alpha'))
    const betaEvents = events.filter((e) => isDataChangedFor(e, 'beta'))

    expect(alphaEvents.length).toBeGreaterThanOrEqual(1)
    expect(betaEvents.length).toBe(0)

    await built.registry.clear()
  }, 10000)
})

// ─── F1-G2: unregister stops watcher ───────────────────────────────────

describe('unregister watcher', () => {
  it('unregistering a project stops its watcher without affecting the other', async () => {
    const built = await buildWithConsumers(projA)

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
    const eventPromise = waitForEvent(built.eventBus, (e) => isDataChangedFor(e, 'beta'))
    await writeFile(join(projB, '.atomic-skills', 'project-status', 'plans', 'test-b.md'), PLAN_MD('test-b'))
    const events = await eventPromise

    const betaEvents = events.filter((e) => isDataChangedFor(e, 'beta'))
    expect(betaEvents.length).toBeGreaterThanOrEqual(1)

    await built.registry.clear()
  }, 10000)
})

// ─── F1-G4: watcher isolation ──────────────────────────────────────────

describe('watcher isolation', () => {
  it('a file change in one project does not block events from another', async () => {
    const built = await buildWithConsumers(projA)

    await post(built.app, '/api/projects/register', { rootDir: projA, projectId: 'alpha' })
    await post(built.app, '/api/projects/register', { rootDir: projB, projectId: 'beta' })

    const entryA = built.registry.get('alpha')
    const entryB = built.registry.get('beta')
    if (entryA?.watcher) await entryA.watcher.ready()
    if (entryB?.watcher) await entryB.watcher.ready()

    // A malformed plan in projA (watcher no longer parses entities — it just
    // emits data_changed) must not block projB's events.
    await writeFile(join(projA, '.atomic-skills', 'project-status', 'plans', 'bad.md'), '---\ninvalid: yaml: "broken\n---\n# bad')

    const eventPromise = waitForEvent(built.eventBus, (e) => isDataChangedFor(e, 'beta'))
    await writeFile(join(projB, '.atomic-skills', 'project-status', 'plans', 'good.md'), PLAN_MD('good'))
    const events = await eventPromise

    const betaChanges = events.filter((e) => isDataChangedFor(e, 'beta'))
    expect(betaChanges.length).toBeGreaterThanOrEqual(1)

    await built.registry.clear()
  }, 10000)
})
