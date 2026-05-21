// @vitest-environment node
/**
 * End-to-end smoke for the full v0.1 MCP surface (24 tools).
 *
 * Boots `createMcpServer` over `InMemoryTransport` (the same protocol layer
 * Claude Code uses, minus the stdio framing) and walks a realistic workflow
 * that exercises every registered tool. Acts as a regression net so any
 * future change that breaks a tool's contract fails here, not in production.
 *
 * Tool coverage (24 = 7 read + 9 mutate + 1 gate + 4 feedback + 3 meta):
 *   Read     : get_state, get_plan, get_phase, get_initiative, get_task,
 *              get_next_action, get_dependencies (phase + task scopes)
 *   Mutate   : push_frame, update_next_action, add_task, park_item,
 *              emerge_item, promote_parked, update_initiative_status,
 *              pop_frame, mark_task_done
 *   Gate     : verify_exit_gate (shell + manual paths)
 *   Feedback : annotate, highlight, record_decision, inbox
 *   Meta     : list_consumers, schema_version, health
 *
 * Iron-Law invariant asserted at the end: every mutation tool appended to
 * inbox/ JSONL; no entity file (plans/*.md, initiatives/*.md) was modified.
 */
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '../../../src/mcp/server.js'

const ID_REGEX = /^[a-z]+-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/

const PLAN = `---
schemaVersion: '0.1'
slug: smoke-plan
title: 'Smoke plan'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: F0
parallelismAllowed: false
phases:
  - id: F0
    slug: foundation
    title: 'F0 — foundation'
    goal: 'baseline'
    dependsOn: []
    subPhaseCount: 1
    status: done
    exitGate:
      summary: 'F0 ready'
      criteria:
        - id: 'F0.G1'
          description: 'tests green'
          status: met
  - id: F1
    slug: build
    title: 'F1 — build'
    goal: 'wire pipeline'
    dependsOn:
      - F0
    subPhaseCount: 1
    status: active
    exitGate:
      summary: 'F1 ready'
      criteria:
        - id: 'F1.G1'
          description: 'pipeline green'
          status: pending
          verifier:
            kind: shell
            command: 'true'
        - id: 'F1.G2'
          description: 'manual sign-off'
          status: pending
          verifier:
            kind: manual
            description: 'human ack'
---
# smoke plan body
`

const INITIATIVE = `---
schemaVersion: '0.1'
slug: smoke-init
title: 'Smoke initiative'
goal: 'exercise every tool'
status: active
branch: feat/smoke
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: 'T-001'
parentPlan: smoke-plan
phaseId: F1
exitGates:
  - id: 'I-G1'
    description: 'initiative-level gate'
    status: pending
stack:
  - id: 1
    title: 'initial frame for smoke pop'
    type: task
    openedAt: '2026-01-01T00:00:00Z'
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
parked:
  - title: 'parked-one'
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
# smoke initiative body
`

let tmp: string
let consumerDir: string
let planPath: string
let initPath: string
let client: Client
let cleanup: (() => Promise<void>) | null = null

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-smoke-'))
  consumerDir = join(tmp, '.atomic-skills/project-status')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  planPath = join(consumerDir, 'plans/smoke-plan.md')
  initPath = join(consumerDir, 'initiatives/smoke-init.md')
  await writeFile(planPath, PLAN)
  await writeFile(initPath, INITIATIVE)

  const { server } = createMcpServer({ rootDir: tmp })
  const [a, b] = InMemoryTransport.createLinkedPair()
  client = new Client({ name: 'smoke', version: '0' }, { capabilities: {} })
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

function payload(res: unknown): Record<string, unknown> {
  const r = res as { content: Array<{ text: string }>; isError?: boolean }
  if (r.isError) {
    throw new Error(`tool returned isError; body: ${r.content[0]?.text}`)
  }
  return JSON.parse(r.content[0].text) as Record<string, unknown>
}

async function inboxLines(): Promise<string[]> {
  const day = new Date().toISOString().slice(0, 10)
  try {
    const raw = await readFile(join(consumerDir, 'inbox', `${day}.jsonl`), 'utf8')
    return raw.split('\n').filter((l) => l !== '')
  } catch {
    return []
  }
}

describe('MCP smoke — all 24 tools exercised end-to-end', () => {
  it('tools/list registers exactly 24 aideck_ tools', async () => {
    const list = await client.listTools()
    expect(list.tools).toHaveLength(24)
    for (const t of list.tools) expect(t.name).toMatch(/^aideck_/)
    const names = list.tools.map((t) => t.name).sort()
    expect(names).toEqual([
      'aideck_add_task',
      'aideck_annotate',
      'aideck_emerge_item',
      'aideck_get_dependencies',
      'aideck_get_initiative',
      'aideck_get_next_action',
      'aideck_get_phase',
      'aideck_get_plan',
      'aideck_get_state',
      'aideck_get_task',
      'aideck_health',
      'aideck_highlight',
      'aideck_inbox',
      'aideck_list_consumers',
      'aideck_mark_task_done',
      'aideck_park_item',
      'aideck_pop_frame',
      'aideck_promote_parked',
      'aideck_push_frame',
      'aideck_record_decision',
      'aideck_schema_version',
      'aideck_update_initiative_status',
      'aideck_update_next_action',
      'aideck_verify_exit_gate'
    ])
  })

  it('exercises every read + meta + feedback + gate + mutate tool and preserves entity files', async () => {
    const planBefore = await stat(planPath)
    const initBefore = await stat(initPath)

    // ── Meta (3) ───────────────────────────────────────────────────────────
    const schema = payload(await call('aideck_schema_version', {}))
    expect(schema.schemaVersion).toBe('0.1')
    expect(schema.toolCount).toBe(24)

    const consumers = payload(await call('aideck_list_consumers', {})) as {
      consumers: Array<{ id: string }>
    }
    expect(consumers.consumers.find((c) => c.id === 'project-status')).toBeDefined()

    const health = payload(await call('aideck_health', { consumer: 'project-status' })) as {
      staleInitiatives: unknown[]
      unmetGates: unknown[]
    }
    expect(Array.isArray(health.staleInitiatives)).toBe(true)
    expect(Array.isArray(health.unmetGates)).toBe(true)

    // ── Read (7) ───────────────────────────────────────────────────────────
    const state = payload(await call('aideck_get_state', { consumer: 'project-status' })) as {
      plans: unknown[]
      initiatives: unknown[]
    }
    expect(state.plans).toHaveLength(1)
    expect(state.initiatives).toHaveLength(1)

    const plan = payload(await call('aideck_get_plan', {
      consumer: 'project-status',
      slug: 'smoke-plan'
    })) as { slug: string; phases: unknown[] }
    expect(plan.slug).toBe('smoke-plan')
    expect(plan.phases).toHaveLength(2)

    const phase = payload(await call('aideck_get_phase', {
      consumer: 'project-status',
      planSlug: 'smoke-plan',
      phaseId: 'F1'
    })) as { id: string; status: string }
    expect(phase.id).toBe('F1')

    const init = payload(await call('aideck_get_initiative', {
      consumer: 'project-status',
      slug: 'smoke-init'
    })) as { slug: string; tasks: unknown[] }
    expect(init.slug).toBe('smoke-init')
    expect(init.tasks).toHaveLength(2)

    const task = payload(await call('aideck_get_task', {
      consumer: 'project-status',
      initiativeSlug: 'smoke-init',
      taskId: 'T-001'
    })) as { id: string }
    expect(task.id).toBe('T-001')

    const nextAction = payload(await call('aideck_get_next_action', {
      consumer: 'project-status',
      initiativeSlug: 'smoke-init'
    })) as { taskId?: string }
    expect(nextAction.taskId).toBe('T-001')

    const depsPhase = payload(await call('aideck_get_dependencies', {
      scope: 'phase',
      consumer: 'project-status',
      planSlug: 'smoke-plan',
      phaseId: 'F1'
    })) as { resolved: string[]; blocking: string[] }
    expect(depsPhase.resolved).toEqual(['F0'])
    expect(depsPhase.blocking).toEqual([])

    const depsTask = payload(await call('aideck_get_dependencies', {
      scope: 'task',
      consumer: 'project-status',
      initiativeSlug: 'smoke-init',
      taskId: 'T-002'
    })) as { blockedBy: string[]; blocking: string[] }
    expect(depsTask.blockedBy).toEqual(['T-001'])
    expect(depsTask.blocking).toEqual(['T-001']) // T-001 still pending

    // ── Feedback (4) ───────────────────────────────────────────────────────
    const ann = payload(await call('aideck_annotate', {
      target: { consumer: 'project-status', slug: 'smoke-init', path: 'tasks.T-001' },
      body: 'looks risky'
    })) as { id: string }
    expect(ann.id).toMatch(ID_REGEX)

    const hl = payload(await call('aideck_highlight', {
      target: { consumer: 'project-status', slug: 'smoke-init', path: 'tasks.T-001' },
      reason: 'long-running',
      severity: 'warn'
    })) as { id: string }
    expect(hl.id).toMatch(ID_REGEX)

    const dec = payload(await call('aideck_record_decision', {
      target: { consumer: 'project-status', slug: 'smoke-init', path: 'exitGates.I-G1' },
      decision: 'approve',
      reason: 'looks good',
      by: 'human'
    })) as { id: string }
    expect(dec.id).toMatch(ID_REGEX)

    const inbox = payload(await call('aideck_inbox', { consumer: 'project-status' })) as {
      items: Array<{ kind: string }>
    }
    expect(inbox.items.length).toBeGreaterThan(0)
    const inboxKinds = new Set(inbox.items.map((i) => i.kind))
    expect(inboxKinds.has('annotation')).toBe(true)
    expect(inboxKinds.has('highlight')).toBe(true)

    // ── Mutate (9) ─────────────────────────────────────────────────────────
    const mutations: Array<[string, Record<string, unknown>]> = [
      ['aideck_push_frame', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        title: 'spike: investigate ordering',
        type: 'research'
      }],
      ['aideck_update_next_action', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        nextAction: 'finish T-001 then unblock T-002'
      }],
      ['aideck_add_task', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        title: 'new T-003 from smoke'
      }],
      ['aideck_park_item', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        title: 'big refactor later'
      }],
      ['aideck_emerge_item', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        title: 'unexpected coupling found'
      }],
      ['aideck_promote_parked', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        parkedTitleOrIndex: 'parked-one'
      }],
      ['aideck_update_initiative_status', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        status: 'paused',
        reason: 'awaiting verifier'
      }],
      ['aideck_pop_frame', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init'
      }],
      ['aideck_mark_task_done', {
        consumer: 'project-status',
        initiativeSlug: 'smoke-init',
        taskId: 'T-001'
      }]
    ]
    for (const [name, args] of mutations) {
      const body = payload(await call(name, args)) as { intentId?: string; accepted?: boolean }
      expect(body.accepted).toBe(true)
      expect(body.intentId).toMatch(/^int-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/)
    }

    // ── Gate (1) ───────────────────────────────────────────────────────────
    const shellVerify = payload(await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'smoke-plan',
      phaseId: 'F1',
      criterionId: 'F1.G1'
    })) as { result: string; verifierRan: boolean; verifierResultId: string }
    expect(shellVerify.result).toBe('met')
    expect(shellVerify.verifierRan).toBe(true)
    expect(shellVerify.verifierResultId).toMatch(/^vr-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/)

    const manualVerify = payload(await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'smoke-plan',
      phaseId: 'F1',
      criterionId: 'F1.G2',
      result: 'met',
      evidence: 'human signed off'
    })) as { result: string; verifierRan: boolean; allGatesMet: boolean }
    expect(manualVerify.result).toBe('met')
    expect(manualVerify.verifierRan).toBe(false)
    // Both phase criteria are now met (one via shell, one via manual) — the
    // gates-tool reads canonical + prior inbox verifier_result records, so
    // allGatesMet converges to true even though the entity file was never edited.
    expect(manualVerify.allGatesMet).toBe(true)

    // ── Iron Law 1 invariant: entity files unchanged ───────────────────────
    const planAfter = await stat(planPath)
    const initAfter = await stat(initPath)
    expect(planAfter.mtimeMs).toBe(planBefore.mtimeMs)
    expect(initAfter.mtimeMs).toBe(initBefore.mtimeMs)

    // ── All mutations + verifier results landed in inbox/ ──────────────────
    const lines = await inboxLines()
    // 9 mutations + 2 verifier results + 1 decision = 12 inbox lines minimum.
    expect(lines.length).toBeGreaterThanOrEqual(12)
    const kinds = lines.map((l) => (JSON.parse(l) as { kind: string }).kind)
    const kindCounts: Record<string, number> = {}
    for (const k of kinds) kindCounts[k] = (kindCounts[k] ?? 0) + 1
    expect(kindCounts.intent).toBe(9)
    expect(kindCounts.verifier_result).toBe(2)
    expect(kindCounts.decision).toBe(1)

    // Every inbox line carries schemaVersion '0.1'.
    for (const l of lines) {
      const obj = JSON.parse(l) as { schemaVersion?: string }
      expect(obj.schemaVersion).toBe('0.1')
    }
  })

  it('rejects path traversal on consumer at MCP boundary', async () => {
    const res = await call('aideck_get_state', { consumer: '../escape' })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('invalid_input')
    expect(body.error.message).toMatch(/unsafe consumerId/i)
  })

  it('rejects unknown keys on a strict input schema (verifies C11)', async () => {
    const res = await call('aideck_mark_task_done', {
      consumer: 'project-status',
      initiativeSlug: 'smoke-init',
      taskId: 'T-001',
      verifierResultID: 'typo'  // wrong case — should be verifierResultId
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('invalid_input')
  })

  it('rejects mutation when target initiative does not exist (precondition_failed)', async () => {
    const res = await call('aideck_pop_frame', {
      consumer: 'project-status',
      initiativeSlug: 'does-not-exist'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(['io_error', 'path_not_found', 'precondition_failed']).toContain(body.error.code)
  })

  it('rejects verifier_result with deferred + no deferredReason', async () => {
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'smoke-plan',
      phaseId: 'F1',
      criterionId: 'F1.G1',
      result: 'deferred'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('invalid_input')
    expect(body.error.message).toMatch(/deferredReason/)
  })
})
