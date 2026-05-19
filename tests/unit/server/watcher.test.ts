import { mkdir, mkdtemp, rm, writeFile, appendFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWatcher } from '../../../src/server/watcher.js'
import { createEventBus } from '../../../src/server/event-bus.js'
import type { RuntimeEvent } from '../../../src/server/events/types.js'

let tmp: string
let consumerDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-watcher-'))
  consumerDir = join(tmp, '.atomic-skills', 'test')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await mkdir(join(consumerDir, 'annotations'), { recursive: true })
  await mkdir(join(consumerDir, 'highlights'), { recursive: true })
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

const VALID_PLAN_FRONTMATTER = `---
schemaVersion: '0.1'
slug: w-plan
title: 'Watcher test plan'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: null
parallelismAllowed: false
phases: []
---
# w-plan body
`

const VALID_ANN = JSON.stringify({
  id: 'ann-w-1',
  target: { consumer: 'test', slug: 'w-plan', path: 'phases.F0' },
  author: 'ai',
  body: 'note',
  createdAt: '2026-05-19T12:00:00Z'
})

function waitFor<T extends RuntimeEvent>(
  events: RuntimeEvent[],
  match: (e: RuntimeEvent) => e is T,
  timeoutMs = 2000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const hit = events.find(match)
      if (hit) return resolve(hit)
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`timeout waiting for event after ${timeoutMs}ms; saw ${events.length} events: ${events.map((e) => e.kind).join(',')}`))
      }
      setTimeout(check, 25)
    }
    check()
  })
}

describe('createWatcher', () => {
  it('emits state-change for a valid plan add within 1s', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      await writeFile(join(consumerDir, 'plans/w-plan.md'), VALID_PLAN_FRONTMATTER)
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'state-change' }> =>
        x.kind === 'state-change' && x.changeType === 'add' && x.slug === 'w-plan'
      )
      expect(e.entityKind).toBe('plan')
      expect(e.consumer).toBe('test')
      expect(e.entity).toBeDefined()
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('emits error event when a plan has malformed YAML', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      await writeFile(join(consumerDir, 'plans/broken.md'), '---\nfoo: [unclosed\n---\n# body\n')
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'error' }> =>
        x.kind === 'error'
      )
      expect(e.code).toBe('invalid_input')
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('emits unlink state-change without entity payload', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const planPath = join(consumerDir, 'plans/w-plan.md')
    await writeFile(planPath, VALID_PLAN_FRONTMATTER)
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'state-change' }> =>
        x.kind === 'state-change' && x.changeType === 'add'
      )
      await unlink(planPath)
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'state-change' }> =>
        x.kind === 'state-change' && x.changeType === 'unlink'
      )
      expect(e.entity).toBeUndefined()
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('emits highlight-added when a line is appended to highlights JSONL', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const hlPath = join(consumerDir, 'highlights/2026-05-19.jsonl')
    await writeFile(hlPath, '')
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      const line = JSON.stringify({
        id: 'hl-w-1',
        target: { consumer: 'test', slug: 'w-plan', path: 'phases.F0' },
        reason: 'warn',
        source: 'ai',
        severity: 'warn',
        createdAt: '2026-05-19T12:00:00Z'
      })
      await appendFile(hlPath, `${line}\n`)
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'highlight-added' }> =>
        x.kind === 'highlight-added'
      )
      expect(e.highlight.id).toBe('hl-w-1')
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('emits error event for a malformed annotation JSONL line', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const annPath = join(consumerDir, 'annotations/2026-05-19.jsonl')
    await writeFile(annPath, '')
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      await appendFile(annPath, '{"id":"a","target":{"consumer":"x","path":"p"},"author":"bot","body":"x","createdAt":"2026-01-01"}\n')
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'error' }> =>
        x.kind === 'error'
      )
      expect(e.code).toBe('invalid_input')
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('emits annotation-added when a line is appended to annotations JSONL', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const annPath = join(consumerDir, 'annotations/2026-05-19.jsonl')
    await writeFile(annPath, '')
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    try {
      await appendFile(annPath, `${VALID_ANN}\n`)
      const e = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'annotation-added' }> =>
        x.kind === 'annotation-added'
      )
      expect(e.consumer).toBe('test')
      expect(e.annotation.id).toBe('ann-w-1')
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('unlink of a JSONL file clears the cursor and re-emits from byte 0 on next write', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const annPath = join(consumerDir, 'annotations/2026-05-19.jsonl')
    await writeFile(annPath, `${VALID_ANN}\n`)
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    await w.ready()
    try {
      await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'annotation-added' }> =>
        x.kind === 'annotation-added'
      )
      events.length = 0
      await unlink(annPath)
      await new Promise((r) => setTimeout(r, 150))
      await writeFile(annPath, `${VALID_ANN}\n`)
      const re = await waitFor(events, (x): x is Extract<RuntimeEvent, { kind: 'annotation-added' }> =>
        x.kind === 'annotation-added'
      )
      expect(re.annotation.id).toBe('ann-w-1')
    } finally {
      await w.stop()
    }
  }, 5_000)

  it('stop() releases watchers (no events after stop)', async () => {
    const bus = createEventBus()
    const events: RuntimeEvent[] = []
    bus.subscribe((e) => events.push(e))
    const w = createWatcher({ rootDir: tmp, eventBus: bus, awaitWriteFinishMs: 30 })
    await w.start()
    await w.stop()
    await writeFile(join(consumerDir, 'plans/after-stop.md'), VALID_PLAN_FRONTMATTER)
    await new Promise((r) => setTimeout(r, 250))
    const afterStop = events.filter((e) => e.kind === 'state-change' && e.slug === 'after-stop')
    expect(afterStop).toHaveLength(0)
  }, 5_000)
})

describe('classifyFile + path helpers', () => {
  it('extracts consumer + kind for typical paths', async () => {
    const { classifyFile } = await import('../../../src/server/writers/paths.js')
    expect(classifyFile(join(tmp, '.atomic-skills/x/plans/foo.md'), tmp)).toEqual({
      consumer: 'x',
      kind: 'plan',
      slug: 'foo'
    })
    expect(classifyFile(join(tmp, '.atomic-skills/x/inbox/2026.jsonl'), tmp)).toEqual({
      consumer: 'x',
      kind: 'inbox-jsonl'
    })
    expect(classifyFile(join(tmp, 'unrelated/foo.md'), tmp)).toBeNull()
  })

  it('classifies highlights and other subdirs', async () => {
    const { classifyFile } = await import('../../../src/server/writers/paths.js')
    expect(classifyFile(join(tmp, '.atomic-skills/x/highlights/y.jsonl'), tmp)?.kind).toBe('highlights-jsonl')
    expect(classifyFile(join(tmp, '.atomic-skills/x/initiatives/i.md'), tmp)?.kind).toBe('initiative')
    expect(classifyFile(join(tmp, '.atomic-skills/x/misc/whatever.md'), tmp)?.kind).toBe('other')
  })

  it('annotations/highlights/inbox path helpers return ISO-day jsonl', async () => {
    const { annotationsPathFor, highlightsPathFor, inboxPathFor } = await import('../../../src/server/writers/paths.js')
    const consumer = join(tmp, '.atomic-skills/x')
    const d = new Date('2026-05-19T12:00:00Z')
    expect(annotationsPathFor(consumer, d).endsWith('annotations/2026-05-19.jsonl')).toBe(true)
    expect(highlightsPathFor(consumer, d).endsWith('highlights/2026-05-19.jsonl')).toBe(true)
    expect(inboxPathFor(consumer, d).endsWith('inbox/2026-05-19.jsonl')).toBe(true)
  })

  it('extractConsumerId rejects paths outside .atomic-skills', async () => {
    const { extractConsumerId } = await import('../../../src/server/writers/paths.js')
    expect(extractConsumerId(join(tmp, 'unrelated/foo.md'), tmp)).toBeNull()
    expect(extractConsumerId(join(tmp, '.atomic-skills'), tmp)).toBeNull()
  })
})
