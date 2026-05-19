// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

const PLAN_BODY = `---
schemaVersion: '0.1'
slug: p-one
title: 'P one'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: F0
parallelismAllowed: false
phases:
  - id: F0
    slug: foundation
    title: 'F0'
    goal: 'baseline'
    dependsOn: []
    subPhaseCount: 1
    status: done
    exitGate:
      summary: 'F0 ready'
      criteria:
        - id: 'F0.G1'
          description: 'green'
          status: met
  - id: F1
    slug: build
    title: 'F1'
    goal: 'build out'
    dependsOn:
      - F0
    subPhaseCount: 1
    status: pending
    exitGate:
      summary: 'F1 ready'
      criteria:
        - id: 'F1.G1'
          description: 'green'
          status: pending
---
# plan body
`

const INITIATIVE_BODY = `---
schemaVersion: '0.1'
slug: v3-f1-build
title: 'v3 F1'
goal: 'build'
status: active
branch: feat/f1
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: null
parentPlan: p-one
phaseId: F1
exitGates: []
stack: []
tasks:
  - id: 'T-001'
    title: 'first task'
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
  - id: 'T-002'
    title: 'blocked task'
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
    blockedBy:
      - 'T-001'
parked: []
emerged: []
---
# initiative body
`

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-mcp-'))
  consumerDir = join(tmp, '.atomic-skills/project-status')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await writeFile(join(consumerDir, 'plans/p-one.md'), PLAN_BODY)
  await writeFile(join(consumerDir, 'initiatives/v3-f1-build.md'), INITIATIVE_BODY)

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
  const text = res.content[0]?.text ?? ''
  return JSON.parse(text)
}

describe('MCP read tools — discovery + happy paths', () => {
  it('tools/list returns all 7 read tools with aideck_ prefix', async () => {
    const list = await client.listTools()
    expect(list.tools.length).toBeGreaterThanOrEqual(7)
    for (const t of list.tools) expect(t.name.startsWith('aideck_')).toBe(true)
  })

  it('aideck_get_state aggregates plans + initiatives for the consumer', async () => {
    const res = await call('aideck_get_state', { consumer: 'project-status' })
    const body = parsePayload(res as never) as { plans: unknown[]; initiatives: unknown[] }
    expect(body.plans).toHaveLength(1)
    expect(body.initiatives).toHaveLength(1)
  })

  it('aideck_get_plan returns the Plan object', async () => {
    const res = await call('aideck_get_plan', { consumer: 'project-status', slug: 'p-one' })
    const body = parsePayload(res as never) as { slug: string; phases: unknown[] }
    expect(body.slug).toBe('p-one')
    expect(body.phases).toHaveLength(2)
  })

  it('aideck_get_phase returns the phase by id', async () => {
    const res = await call('aideck_get_phase', {
      consumer: 'project-status',
      planSlug: 'p-one',
      phaseId: 'F1'
    })
    const body = parsePayload(res as never) as { id: string; goal: string }
    expect(body.id).toBe('F1')
    expect(body.goal).toBe('build out')
  })

  it('aideck_get_initiative + aideck_get_task happy paths', async () => {
    const initRes = await call('aideck_get_initiative', {
      consumer: 'project-status',
      slug: 'v3-f1-build'
    })
    const init = parsePayload(initRes as never) as { tasks: unknown[]; slug: string }
    expect(init.slug).toBe('v3-f1-build')
    expect(init.tasks).toHaveLength(2)

    const taskRes = await call('aideck_get_task', {
      consumer: 'project-status',
      initiativeSlug: 'v3-f1-build',
      taskId: 'T-001'
    })
    const task = parsePayload(taskRes as never) as { id: string; status: string }
    expect(task.id).toBe('T-001')
    expect(task.status).toBe('pending')
  })

  it('aideck_get_next_action picks the first unblocked pending task', async () => {
    const res = await call('aideck_get_next_action', {
      consumer: 'project-status',
      initiativeSlug: 'v3-f1-build'
    })
    const body = parsePayload(res as never) as { taskId?: string; description: string }
    expect(body.taskId).toBe('T-001')
  })

  it('aideck_get_dependencies resolves phase deps against done phases', async () => {
    const res = await call('aideck_get_dependencies', {
      consumer: 'project-status',
      planSlug: 'p-one',
      phaseId: 'F1'
    })
    const body = parsePayload(res as never) as { resolved: string[]; blocking: string[] }
    expect(body.resolved).toEqual(['F0'])
    expect(body.blocking).toEqual([])
  })
})

describe('MCP read tools — error paths', () => {
  it('aideck_get_plan with unknown slug returns isError + slug_not_found', async () => {
    const res = await call('aideck_get_plan', { consumer: 'project-status', slug: 'nope' })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('io_error')
  })

  it('aideck_get_phase with unknown phaseId returns isError + path_not_found', async () => {
    const res = await call('aideck_get_phase', {
      consumer: 'project-status',
      planSlug: 'p-one',
      phaseId: 'F99'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })

  it('aideck_get_dependencies without phaseId/taskId returns invalid_input', async () => {
    const res = await call('aideck_get_dependencies', {
      consumer: 'project-status',
      planSlug: 'p-one'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_input')
  })

  it('unknown tool name returns isError', async () => {
    const res = await call('aideck_does_not_exist', {})
    const r = res as { isError?: boolean }
    expect(r.isError).toBe(true)
  })
})
