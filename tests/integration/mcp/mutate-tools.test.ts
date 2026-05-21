// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '../../../src/mcp/server.js'

let tmp: string
let consumerDir: string
let client: Client
let cleanup: (() => Promise<void>) | null = null
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
    title: 'only task'
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
parked:
  - title: 'parked one'
    surfacedAt: '2026-01-01T00:00:00Z'
    fromFrame: null
    context:
      solves: 'placeholder solve for parked fixture'
      trigger: 'placeholder trigger for parked fixture'
      assumesStillValid: []
      ratifiedAt: '2026-01-01T00:00:00Z'
      ratifiedBy: human
emerged: []
---
# body
`

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-mutate-'))
  consumerDir = join(tmp, '.atomic-skills/project-status')
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await mkdir(join(consumerDir, 'inbox'), { recursive: true })
  initPath = join(consumerDir, 'initiatives/i-one.md')
  await writeFile(initPath, INITIATIVE)
  const { server } = createMcpServer({ rootDir: tmp })
  const [a, b] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'test', version: '0' }, { capabilities: {} })
  await Promise.all([server.connect(a), client.connect(b)])
  cleanup = async () => {
    await client.close()
    await server.close()
  }
})
afterEach(async () => {
  await cleanup?.()
  cleanup = null
  await rm(tmp, { recursive: true, force: true })
})

async function call(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args })
}

function parsePayload(res: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(res.content[0]?.text ?? '')
}

async function inboxLines(): Promise<string[]> {
  const day = new Date().toISOString().slice(0, 10)
  const path = join(consumerDir, 'inbox', `${day}.jsonl`)
  try {
    const raw = await readFile(path, 'utf8')
    return raw.split('\n').filter((l) => l !== '')
  } catch {
    return []
  }
}

describe('MCP mutate tools — records intents in inbox JSONL', () => {
  it('aideck_mark_task_done records an intent and computes phaseCompleteHint when last task closes', async () => {
    const before = await stat(initPath)
    const res = await call('aideck_mark_task_done', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      taskId: 'T-001'
    })
    const payload = parsePayload(res as never) as {
      intentId: string
      accepted: boolean
      phaseCompleteHint?: { remaining: number }
    }
    expect(payload.intentId).toMatch(/^int-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/)
    expect(payload.accepted).toBe(true)
    expect(payload.phaseCompleteHint?.remaining).toBe(0)

    // Iron Law 1: initiative file is NOT mutated by aiDeck.
    const after = await stat(initPath)
    expect(after.mtimeMs).toBe(before.mtimeMs)

    const lines = await inboxLines()
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]) as { kind: string; operation: string }
    expect(parsed.kind).toBe('intent')
    expect(parsed.operation).toBe('mark_task_done')
  })

  it('aideck_pop_frame returns precondition_failed when stack is empty', async () => {
    const res = await call('aideck_pop_frame', {
      consumer: 'project-status',
      initiativeSlug: 'i-one'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('precondition_failed')
  })

  it('aideck_promote_parked returns precondition_failed for an unknown parked item', async () => {
    const res = await call('aideck_promote_parked', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      parkedTitleOrIndex: 'does-not-exist'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('precondition_failed')
  })

  it('aideck_promote_parked accepts a known parked title', async () => {
    const res = await call('aideck_promote_parked', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      parkedTitleOrIndex: 'parked one'
    })
    const payload = parsePayload(res as never) as { accepted: boolean }
    expect(payload.accepted).toBe(true)
  })

  it('aideck_push_frame + update_next_action + park_item + emerge_item + add_task all append intents', async () => {
    await call('aideck_push_frame', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      title: 'thinking about edge case',
      type: 'research'
    })
    await call('aideck_update_next_action', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      nextAction: 'finish T-001'
    })
    await call('aideck_park_item', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      title: 'big refactor later'
    })
    const er = await call('aideck_emerge_item', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      title: 'Something Else Found'
    })
    const erBody = parsePayload(er as never) as { suggestion?: { newInitiativeSlug: string } }
    expect(erBody.suggestion?.newInitiativeSlug).toBe('something-else-found')

    await call('aideck_add_task', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      title: 'wire X to Y'
    })
    const lines = await inboxLines()
    expect(lines).toHaveLength(5)
    const ops = lines.map((l) => (JSON.parse(l) as { operation: string }).operation)
    expect(ops).toEqual(['push_frame', 'update_next_action', 'park_item', 'emerge_item', 'add_task'])
  })

  it('aideck_update_initiative_status records the status + reason in the intent', async () => {
    const res = await call('aideck_update_initiative_status', {
      consumer: 'project-status',
      initiativeSlug: 'i-one',
      status: 'paused',
      reason: 'blocked on infra'
    })
    expect((res as { isError?: boolean }).isError).toBeFalsy()
    const lines = await inboxLines()
    const last = JSON.parse(lines[lines.length - 1]) as { args: Record<string, unknown> }
    expect(last.args.status).toBe('paused')
    expect(last.args.reason).toBe('blocked on infra')
  })

  it('all 24 tools are surfaced via tools/list (read + mutate so far = 16; rest land in step 08)', async () => {
    const list = await client.listTools()
    expect(list.tools.length).toBeGreaterThanOrEqual(16)
  })
})
