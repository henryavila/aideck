// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { createFakeConsumer } from '../../../src/demo/fake-consumer.js'
import { appendIntent } from '../../../src/server/writers/intents.js'
import { consumerRoot } from '../../../src/server/writers/paths.js'

let tmp: string
let consumerDir: string
let initPath: string

const INITIATIVE = `---
schemaVersion: '0.1'
slug: i-one
title: 'i one'
goal: 'goal'
status: active
branch: feat/x
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: null
exitGates: []
stack: []
tasks:
  - id: 'T-001'
    title: 'first'
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
parked: []
emerged: []
---
# body
`

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-fakecon-'))
  consumerDir = consumerRoot(tmp, 'project-status')
  await rm(consumerDir, { recursive: true, force: true })
  const { mkdir } = await import('node:fs/promises')
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await mkdir(join(consumerDir, 'inbox'), { recursive: true })
  initPath = join(consumerDir, 'initiatives/i-one.md')
  await writeFile(initPath, INITIATIVE)
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error(`waitUntil timed out after ${timeoutMs}ms`)
}

describe('fake-consumer applies intents to demo files', () => {
  it('mark_task_done flips task.status to done', async () => {
    const consumer = createFakeConsumer({ rootDir: tmp })
    await consumer.start()
    try {
      await appendIntent({
        consumerRoot: consumerDir,
        consumerId: 'project-status',
        intent: {
          operation: 'mark_task_done',
          target: { initiativeSlug: 'i-one', taskId: 'T-001' },
          args: {},
          by: 'ai'
        }
      })
      await waitUntil(async () => {
        const raw = await readFile(initPath, 'utf8')
        const fm = parseYaml(raw.split('---\n')[1] ?? '') as { tasks: Array<{ status: string }> }
        return fm.tasks.some((t) => t.status === 'done')
      })
    } finally {
      await consumer.stop()
    }
  }, 5_000)

  it('add_task appends a new task with sequential id', async () => {
    const consumer = createFakeConsumer({ rootDir: tmp })
    await consumer.start()
    try {
      await appendIntent({
        consumerRoot: consumerDir,
        consumerId: 'project-status',
        intent: {
          operation: 'add_task',
          target: { initiativeSlug: 'i-one' },
          args: { title: 'new thing' },
          by: 'ai'
        }
      })
      await waitUntil(async () => {
        const raw = await readFile(initPath, 'utf8')
        return raw.includes('new thing')
      })
    } finally {
      await consumer.stop()
    }
  }, 5_000)
})
