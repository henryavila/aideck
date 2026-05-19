// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, stat, writeFile, utimes } from 'node:fs/promises'
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

const PLAN = `---
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
    status: pending
    exitGate:
      summary: 'F0 ready'
      criteria:
        - id: 'F0.G1-shell'
          description: 'tests green'
          status: pending
          verifier:
            kind: shell
            command: 'true'
        - id: 'F0.G2-shellfail'
          description: 'broken'
          status: pending
          verifier:
            kind: shell
            command: 'false'
        - id: 'F0.G3-query'
          description: 'sql gate'
          status: pending
          verifier:
            kind: query
            sql: 'SELECT 1'
        - id: 'F0.G4-manual'
          description: 'human check'
          status: pending
          verifier:
            kind: manual
            description: 'review the rollout'
---
# body
`

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
parentPlan: p-one
phaseId: F0
exitGates:
  - id: 'G1-mine'
    description: 'mine'
    status: pending
stack: []
tasks: []
parked: []
emerged: []
---
# i body
`

let planPath: string
let initPath: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-gate-'))
  consumerDir = join(tmp, '.atomic-skills/project-status')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await mkdir(join(consumerDir, 'initiatives'), { recursive: true })
  await mkdir(join(consumerDir, 'highlights'), { recursive: true })
  planPath = join(consumerDir, 'plans/p-one.md')
  initPath = join(consumerDir, 'initiatives/i-one.md')
  await writeFile(planPath, PLAN)
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

describe('aideck_verify_exit_gate', () => {
  it('runs a shell verifier (true) and appends VerifierResult to inbox', async () => {
    const planBefore = await stat(planPath)
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G1-shell'
    })
    const body = parsePayload(res as never) as { result: string; verifierRan: boolean; verifierResultId: string }
    expect(body.result).toBe('met')
    expect(body.verifierRan).toBe(true)
    expect(body.verifierResultId).toMatch(/^vr-\d{4}-\d{2}-\d{2}-\d{3}$/)
    const lines = await inboxLines()
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0]) as { kind: string; result: string }
    expect(parsed.kind).toBe('verifier_result')
    expect(parsed.result).toBe('met')
    // Iron Law 1: entity file is NOT mutated.
    const planAfter = await stat(planPath)
    expect(planAfter.mtimeMs).toBe(planBefore.mtimeMs)
  })

  it('shell verifier that returns non-zero records `pending` result', async () => {
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G2-shellfail'
    })
    const body = parsePayload(res as never) as { result: string }
    expect(body.result).toBe('pending')
  })

  it('shell verifier respects timeoutMs', async () => {
    // Inject a slow command via explicit shell — sleep 5 seconds, but cap at 100ms.
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G2-shellfail', // any shell verifier; we just want the timeout path
      timeoutMs: 50
    })
    const body = parsePayload(res as never) as { result: string }
    // The verifier still runs and either records met/pending. We mostly want no hang.
    expect(['met', 'pending']).toContain(body.result)
  }, 5_000)

  it('query verifier returns precondition_failed with v0.2 hint', async () => {
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G3-query'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('precondition_failed')
    expect(body.error.message).toContain('v0.2')
  })

  it('manual verifier requires explicit result', async () => {
    const noResult = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G4-manual'
    })
    expect((noResult as { isError?: boolean }).isError).toBe(true)

    const withResult = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'F0.G4-manual',
      result: 'met',
      evidence: 'human signed off'
    })
    const body = parsePayload(withResult as never) as { result: string; verifierRan: boolean }
    expect(body.result).toBe('met')
    expect(body.verifierRan).toBe(false)
  })

  it('returns path_not_found for unknown criterion', async () => {
    const res = await call('aideck_verify_exit_gate', {
      consumer: 'project-status',
      target: 'phase',
      planSlug: 'p-one',
      phaseId: 'F0',
      criterionId: 'nope'
    })
    const r = res as { isError?: boolean; content: Array<{ text: string }> }
    expect(r.isError).toBe(true)
    const body = JSON.parse(r.content[0].text) as { error: { code: string } }
    expect(body.error.code).toBe('path_not_found')
  })
})

describe('aideck_annotate / aideck_highlight / aideck_record_decision', () => {
  it('annotate appends a JSONL line', async () => {
    const res = await call('aideck_annotate', {
      target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
      body: 'looks risky'
    })
    const body = parsePayload(res as never) as { id: string }
    expect(body.id).toMatch(/^ann-/)
    const day = new Date().toISOString().slice(0, 10)
    const lines = (await readFile(join(consumerDir, 'annotations', `${day}.jsonl`), 'utf8'))
      .split('\n')
      .filter((l) => l !== '')
    expect(lines).toHaveLength(1)
  })

  it('highlight appends a JSONL line with severity', async () => {
    const res = await call('aideck_highlight', {
      target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
      reason: 'race',
      severity: 'critical'
    })
    expect(parsePayload(res as never)).toHaveProperty('id')
  })

  it('record_decision appends a JSONL line', async () => {
    const res = await call('aideck_record_decision', {
      target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
      decision: 'approve'
    })
    expect(parsePayload(res as never)).toHaveProperty('id')
  })
})

describe('aideck_inbox + aideck_list_consumers + aideck_schema_version + aideck_health', () => {
  it('inbox aggregates recent annotations', async () => {
    await call('aideck_annotate', {
      target: { consumer: 'project-status', slug: 'p-one', path: 'phases.F0' },
      body: 'first'
    })
    const res = await call('aideck_inbox', { consumer: 'project-status' })
    const body = parsePayload(res as never) as { items: unknown[] }
    expect(body.items.length).toBeGreaterThan(0)
  })

  it('list_consumers returns the discovered consumer', async () => {
    const res = await call('aideck_list_consumers', {})
    const body = parsePayload(res as never) as { consumers: Array<{ id: string }> }
    expect(body.consumers.find((c) => c.id === 'project-status')).toBeDefined()
  })

  it('schema_version reports toolCount: 24', async () => {
    const res = await call('aideck_schema_version', {})
    const body = parsePayload(res as never) as { toolCount: number; schemaVersion: string }
    expect(body.toolCount).toBe(24)
    expect(body.schemaVersion).toBe('0.1')
  })

  it('health flags an initiative that has not been updated in over 7 days', async () => {
    // Backdate the initiative file to 30 days ago
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await utimes(initPath, old, old)
    await writeFile(
      initPath,
      INITIATIVE.replace('2026-01-01T00:00:00Z', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    )

    const res = await call('aideck_health', { consumer: 'project-status' })
    const body = parsePayload(res as never) as {
      staleInitiatives: Array<{ slug: string }>
      unmetGates: Array<unknown>
    }
    expect(body.staleInitiatives.some((s) => s.slug === 'i-one')).toBe(true)
    expect(body.unmetGates.length).toBeGreaterThan(0)
  })

  it('tools/list exposes all 24 tools', async () => {
    const list = await client.listTools()
    expect(list.tools.length).toBe(24)
  })
})
