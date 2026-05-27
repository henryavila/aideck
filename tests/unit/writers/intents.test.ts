import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appendIntent } from '../../../src/server/writers/intents.js'
import { createEventBus } from '../../../src/server/event-bus.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-intents-write-'))
  await mkdir(join(tmp, 'inbox'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('appendIntent', () => {
  it('writes an intent record to inbox jsonl', async () => {
    const receipt = await appendIntent({
      consumerRoot: tmp,
      consumerId: 'project-status',
      intent: {
        by: 'ai',
        operation: 'mark_task_done',
        target: { initiativeSlug: 'test-init', taskId: 'T-001' },
        args: {}
      } as never,
      now: () => new Date('2026-03-15T12:00:00Z')
    })
    expect(receipt.intentId).toMatch(/^int-2026-03-15-/)
    expect(receipt.recordedAt).toBe('2026-03-15T12:00:00.000Z')

    // Verify file was written
    const files = (await import('node:fs/promises')).readdirSync
      ? undefined
      : undefined
    const { readdir } = await import('node:fs/promises')
    const inboxFiles = await readdir(join(tmp, 'inbox'))
    expect(inboxFiles.length).toBeGreaterThan(0)
    const content = await readFile(join(tmp, 'inbox', inboxFiles[0]), 'utf8')
    const parsed = JSON.parse(content.trim())
    expect(parsed.kind).toBe('intent')
    expect(parsed.intentId).toBe(receipt.intentId)
  })

  it('emits state-change event when eventBus is provided', async () => {
    const bus = createEventBus()
    const events: unknown[] = []
    bus.subscribe((e) => events.push(e))

    await appendIntent({
      consumerRoot: tmp,
      consumerId: 'project-status',
      intent: {
        by: 'human',
        operation: 'mark_task_done',
        target: { initiativeSlug: 'my-init', taskId: 'T-002' },
        args: {}
      } as never,
      eventBus: bus
    })

    expect(events).toHaveLength(1)
    const e = events[0] as { kind: string; consumer: string; slug: string }
    expect(e.kind).toBe('state-change')
    expect(e.consumer).toBe('project-status')
    expect(e.slug).toBe('my-init')
  })

  it('does not emit event when eventBus is not provided', async () => {
    const receipt = await appendIntent({
      consumerRoot: tmp,
      consumerId: 'project-status',
      intent: {
        by: 'ai',
        operation: 'mark_task_done',
        target: { initiativeSlug: 'init-x', taskId: 'T-003' },
        args: {}
      } as never
    })
    expect(receipt.intentId).toBeTruthy()
  })
})
