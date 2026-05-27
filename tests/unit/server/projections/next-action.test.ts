import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { projectNextAction } from '../../../../src/server/projections/next-action.js'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-nextaction-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

async function writeInitiative(slug: string, yaml: string): Promise<void> {
  const dir = join(tmp, '.atomic-skills', 'project-status', 'initiatives')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${slug}.md`), yaml)
}

async function writePlan(slug: string, yaml: string): Promise<void> {
  const dir = join(tmp, '.atomic-skills', 'project-status', 'plans')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${slug}.md`), yaml)
}

const activeInitiativeYaml = `---
schemaVersion: '0.1'
slug: init-alpha
title: Alpha
goal: Test goal
status: active
branch: null
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: null
exitGates: []
stack: []
parked: []
emerged: []
tasks:
  - id: T-001
    title: First task
    status: done
    lastUpdated: '2026-01-01T00:00:00Z'
  - id: T-002
    title: Second task
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
  - id: T-003
    title: Third task blocked
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
    blockedBy: [T-002]
---
`

const allDoneInitiativeYaml = `---
schemaVersion: '0.1'
slug: init-beta
title: Beta
goal: All done
status: active
branch: null
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: null
exitGates: []
stack: []
parked: []
emerged: []
tasks:
  - id: T-001
    title: Only task
    status: done
    lastUpdated: '2026-01-01T00:00:00Z'
---
`

describe('projectNextAction', () => {
  it('returns sentinel when consumer has no data', async () => {
    const result = await projectNextAction(tmp, { consumer: 'project-status' })
    expect(result.consumer).toBe('project-status')
    expect(result.description).toContain('No next action')
  })

  it('returns first unblocked pending task from initiative slug', async () => {
    await writeInitiative('init-alpha', activeInitiativeYaml)
    const result = await projectNextAction(tmp, {
      consumer: 'project-status',
      initiativeSlug: 'init-alpha'
    })
    expect(result.taskId).toBe('T-002')
    expect(result.initiativeSlug).toBe('init-alpha')
    expect(result.rationale).toContain('first unblocked pending task')
  })

  it('skips tasks blocked by incomplete blockers', async () => {
    await writeInitiative('init-alpha', activeInitiativeYaml)
    const result = await projectNextAction(tmp, {
      consumer: 'project-status',
      initiativeSlug: 'init-alpha'
    })
    // T-003 is blocked by T-002 which is pending, so T-002 should be picked
    expect(result.taskId).toBe('T-002')
  })

  it('returns "no next action" when all tasks are done', async () => {
    await writeInitiative('init-beta', allDoneInitiativeYaml)
    const result = await projectNextAction(tmp, {
      consumer: 'project-status',
      initiativeSlug: 'init-beta'
    })
    expect(result.description).toContain('No next action')
    expect(result.taskId).toBeUndefined()
  })

  it('falls back to first active initiative when no slug specified', async () => {
    await writeInitiative('init-alpha', activeInitiativeYaml)
    const result = await projectNextAction(tmp, { consumer: 'project-status' })
    expect(result.taskId).toBe('T-002')
    expect(result.initiativeSlug).toBe('init-alpha')
    expect(result.rationale).toContain('first active initiative')
  })

  it('resolves plan-scoped next action via currentPhase', async () => {
    const planYaml = `---
schemaVersion: '0.1'
slug: my-plan
title: My Plan
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: P1
parallelismAllowed: false
phases:
  - id: P1
    slug: phase-one
    title: Phase One
    goal: Do stuff
    dependsOn: []
    subPhaseCount: 0
    exitGate:
      summary: done
      criteria: []
    status: active
---
`
    const phaseInitYaml = `---
schemaVersion: '0.1'
slug: phase-one-init
title: Phase One Initiative
goal: Phase one work
status: active
branch: null
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
nextAction: null
parentPlan: my-plan
phaseId: P1
exitGates: []
stack: []
parked: []
emerged: []
tasks:
  - id: T-010
    title: Plan task
    status: pending
    lastUpdated: '2026-01-01T00:00:00Z'
---
`
    await writePlan('my-plan', planYaml)
    await writeInitiative('phase-one-init', phaseInitYaml)
    const result = await projectNextAction(tmp, {
      consumer: 'project-status',
      planSlug: 'my-plan'
    })
    expect(result.taskId).toBe('T-010')
    expect(result.planSlug).toBe('my-plan')
    expect(result.rationale).toContain('currentPhase')
  })
})
