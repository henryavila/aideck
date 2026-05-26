import { describe, expect, it } from 'vitest'
import {
  parseAcknowledgement,
  parseAnnotation,
  parseArtifactRef,
  parseDecision,
  parseDriftReport,
  parseErrorResponse,
  parseHealthReport,
  parseHighlight,
  parseInboxItem,
  parseInitiative,
  parseIntentApplication,
  parseIntentRecord,
  parseNextActionProjection,
  parseOrError,
  parsePlan,
  parseProjectStatusState,
  parseResolution,
  parseVerifierResult
} from '@schemas/validators/index.js'
import {
  contextSchema,
  emergedItemSchema,
  exitCriterionSchema,
  parkedItemSchema,
  phaseDescriptorSchema,
  taskSchema
} from '@schemas/validators/project-status.js'

const TS = '2026-05-19T12:00:00-03:00'

const minimalPlan = () => ({
  schemaVersion: '0.1',
  slug: 'v3-redesign',
  title: 'v3 Redesign',
  version: '3.0',
  narrative: '',
  status: 'active',
  started: TS,
  lastUpdated: TS,
  currentPhase: null,
  parallelismAllowed: false,
  phases: []
})

const samplePhase = () => ({
  id: 'F0',
  slug: 'foundation',
  title: 'Foundation',
  goal: 'establish baseline',
  dependsOn: [],
  subPhaseCount: 3,
  status: 'pending',
  exitGate: {
    summary: 'F0 ready',
    criteria: [
      {
        id: 'F0.G1',
        description: 'tests green',
        status: 'pending',
        verifier: { kind: 'shell', command: 'npm test' }
      }
    ]
  }
})

const baseInitiative = () => ({
  schemaVersion: '0.1',
  slug: 'v3-f0',
  title: 'F0 — Foundation',
  goal: 'land baseline',
  status: 'active',
  branch: 'feat/f0',
  started: TS,
  lastUpdated: TS,
  nextAction: null,
  exitGates: [],
  stack: [],
  tasks: [],
  parked: [],
  emerged: []
})

const baseAnnotation = () => ({
  schemaVersion: '0.1',
  id: 'ann-001',
  target: { consumer: 'project-status', slug: 'v3-f0', path: 'tasks.T-001' },
  author: 'human',
  body: 'looks risky',
  createdAt: TS
})

const baseHighlight = () => ({
  schemaVersion: '0.1',
  id: 'hl-001',
  target: { consumer: 'project-status', slug: 'v3-f0', path: 'tasks.T-001' },
  reason: 'race condition possible',
  source: 'ai',
  severity: 'critical',
  createdAt: TS
})

describe('parsePlan — happy', () => {
  it('accepts a full Plan with phases, principles, glossary, tracks', () => {
    const raw = {
      ...minimalPlan(),
      principles: [{ id: 'P1', title: 'Files canonical', body: 'never own state' }],
      glossary: [{ term: 'phase', definition: 'unit of work in a plan' }],
      tracks: [{ id: 'DATA', title: 'Data plane' }],
      currentPhase: 'F0',
      parallelismAllowed: true,
      phases: [samplePhase()],
      references: [{ kind: 'file', path: 'README.md' }],
      whatStaysValid: ['legacy auth flow']
    }
    const res = parsePlan(raw)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.slug).toBe('v3-redesign')
      expect(res.value.phases).toHaveLength(1)
    }
  })

  it('accepts a minimal Plan with only required fields', () => {
    const res = parsePlan(minimalPlan())
    expect(res.ok).toBe(true)
  })
})

describe('parseInitiative — happy', () => {
  it('accepts an Initiative with parentPlan', () => {
    const raw = {
      ...baseInitiative(),
      parentPlan: 'v3-redesign',
      phaseId: 'F0',
      tasks: [
        {
          id: 'T-001',
          title: 'wire repo',
          status: 'pending',
          lastUpdated: TS
        }
      ]
    }
    const res = parseInitiative(raw)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value.parentPlan).toBe('v3-redesign')
      expect(res.value.tasks).toHaveLength(1)
    }
  })

  it('accepts a standalone Initiative with no parentPlan', () => {
    const res = parseInitiative(baseInitiative())
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.value.parentPlan).toBeUndefined()
  })
})

describe('parseTask — happy', () => {
  it('accepts a pending task with no optional fields', () => {
    const res = parseOrError(taskSchema, {
      id: 'T-001',
      title: 'do the thing',
      status: 'pending',
      lastUpdated: TS
    })
    expect(res.ok).toBe(true)
  })

  it('accepts a task with a per-task verifier', () => {
    const res = parseOrError(taskSchema, {
      id: 'T-002',
      title: 'run pact',
      status: 'active',
      lastUpdated: TS,
      verifier: { kind: 'test', runner: 'vitest', pattern: 'tests/contract/*' }
    })
    expect(res.ok).toBe(true)
  })
})

describe('parseAnnotation — happy', () => {
  it('accepts a human-authored annotation', () => {
    const res = parseAnnotation(baseAnnotation())
    expect(res.ok).toBe(true)
  })

  it('accepts an ai-authored annotation with resolved:true', () => {
    const res = parseAnnotation({
      ...baseAnnotation(),
      id: 'ann-002',
      author: 'ai',
      resolved: true,
      resolvedAt: TS
    })
    expect(res.ok).toBe(true)
  })
})

describe('parseHighlight + parseDecision — happy', () => {
  it('accepts a critical highlight', () => {
    const res = parseHighlight(baseHighlight())
    expect(res.ok).toBe(true)
  })

  it('accepts a decision of kind "approve"', () => {
    const res = parseDecision({
      schemaVersion: '0.1',
      id: 'dec-001',
      target: { consumer: 'project-status', slug: 'v3-f0', path: 'exitGates.0' },
      decision: 'approve',
      reason: 'all criteria met',
      by: 'human',
      createdAt: TS
    })
    expect(res.ok).toBe(true)
  })
})

describe('exitCriterionSchema — happy', () => {
  it('accepts an ExitCriterion with a shell verifier', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G1',
      description: 'compile',
      verifier: { kind: 'shell', command: 'npm run typecheck', expectExitCode: 0 },
      status: 'pending'
    })
    expect(res.ok).toBe(true)
  })

  it('accepts an ExitCriterion with a manual verifier', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G2',
      description: 'a11y audit',
      verifier: { kind: 'manual', description: 'axe DevTools, AA pass' },
      status: 'met',
      metAt: TS
    })
    expect(res.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ERROR paths
// ─────────────────────────────────────────────────────────────────────────────

describe('parsePlan — error', () => {
  it('rejects a Plan missing schemaVersion with schema_version_mismatch', () => {
    const { schemaVersion: _, ...rest } = minimalPlan()
    const res = parsePlan(rest)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('schema_version_mismatch')
      expect(res.error.message).toContain('schemaVersion')
    }
  })

  it('rejects schemaVersion "0.0.9" with schema_version_mismatch + migrate suggestion', () => {
    const res = parsePlan({ ...minimalPlan(), schemaVersion: '0.0.9' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('schema_version_mismatch')
      expect(res.error.suggestion ?? '').toContain('migrate')
      expect(res.error.suggestion ?? '').toContain('0.0.9')
    }
  })

  it('rejects PhaseDescriptor missing goal, with path "phases.0.goal"', () => {
    const phase = samplePhase() as Record<string, unknown>
    delete phase.goal
    const res = parsePlan({ ...minimalPlan(), phases: [phase] })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('invalid_input')
      expect(res.error.message).toContain('phases.0.goal')
    }
  })
})

describe('exitCriterionSchema — evidence', () => {
  it('accepts a shell evidence block with full fields', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G1',
      description: 'tests green',
      status: 'met',
      metAt: TS,
      verifier: { kind: 'shell', command: 'npm test', expectExitCode: 0 },
      evidence: {
        verifierKind: 'shell',
        verifiedAt: TS,
        passed: true,
        exitCode: 0,
        outputSummary: '152 passed, 1 flaky'
      }
    })
    expect(res.ok).toBe(true)
  })

  it('accepts a manual evidence block with only required fields', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G2',
      description: 'a11y AA',
      status: 'met',
      metAt: TS,
      evidence: { verifierKind: 'manual', verifiedAt: TS }
    })
    expect(res.ok).toBe(true)
  })

  it('accepts a query evidence block with rowCount', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G3',
      description: 'no orphan rows',
      status: 'met',
      metAt: TS,
      evidence: {
        verifierKind: 'query',
        verifiedAt: TS,
        passed: true,
        rowCount: 0,
        outputSummary: 'select count(*) where orphan returned 0'
      }
    })
    expect(res.ok).toBe(true)
  })

  it('rejects an evidence block missing verifiedAt', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G4',
      description: 'broken',
      status: 'pending',
      evidence: { verifierKind: 'manual' } as unknown as Record<string, unknown>
    })
    expect(res.ok).toBe(false)
  })

  it('rejects an evidence block with verifierKind "invalid"', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G5',
      description: 'broken kind',
      status: 'pending',
      evidence: {
        verifierKind: 'invalid',
        verifiedAt: TS
      } as unknown as Record<string, unknown>
    })
    expect(res.ok).toBe(false)
  })

  it('rejects an evidence block with negative rowCount', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G6',
      description: 'bad row count',
      status: 'pending',
      evidence: {
        verifierKind: 'query',
        verifiedAt: TS,
        rowCount: -1
      }
    })
    expect(res.ok).toBe(false)
  })

  it('still accepts an ExitCriterion without evidence (backward-compat)', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G7',
      description: 'legacy',
      status: 'pending'
    })
    expect(res.ok).toBe(true)
  })

  it('rejects an evidence block with unknown extra fields (strict)', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G8',
      description: 'extras',
      status: 'pending',
      evidence: {
        verifierKind: 'shell',
        verifiedAt: TS,
        whoRan: 'henry'
      } as unknown as Record<string, unknown>
    })
    expect(res.ok).toBe(false)
  })
})

describe('exit-gate verifier — error', () => {
  it('rejects an ExitCriterion with verifier.kind "unknown" as invalid_input', () => {
    const res = parseOrError(exitCriterionSchema, {
      id: 'G3',
      description: 'broken',
      verifier: { kind: 'unknown', description: 'nope' },
      status: 'pending'
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })
})

describe('Initiative / Annotation / Highlight — error enums', () => {
  it('rejects Initiative with invalid status', () => {
    const res = parseInitiative({ ...baseInitiative(), status: 'unstarted' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })

  it('rejects Annotation with author "bot"', () => {
    const res = parseAnnotation({ ...baseAnnotation(), author: 'bot' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('invalid_input')
      expect(res.error.message.toLowerCase()).toContain('author')
    }
  })

  it('rejects Highlight with severity "extreme"', () => {
    const res = parseHighlight({ ...baseHighlight(), severity: 'extreme' })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.code).toBe('invalid_input')
      expect(res.error.message.toLowerCase()).toContain('severity')
    }
  })
})

describe('parseOrError — payload null', () => {
  it('rejects a null payload as invalid_input', () => {
    const res = parsePlan(null)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.code).toBe('invalid_input')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smoke for append-only JSONL record schemas (used by writers in step 04+)
// ─────────────────────────────────────────────────────────────────────────────

describe('parseResolution + parseProjectStatusState smoke', () => {
  it('accepts a Resolution record', () => {
    const res = parseResolution({
      schemaVersion: '0.1',
      kind: 'resolution',
      refId: 'ann-001',
      by: 'human',
      resolvedAt: TS,
      note: 'addressed inline'
    })
    expect(res.ok).toBe(true)
  })

  it('accepts an empty ProjectStatusState aggregate', () => {
    const res = parseProjectStatusState({
      schemaVersion: '0.1',
      consumer: 'project-status',
      generatedAt: TS,
      plans: [],
      initiatives: [],
      adHocSessions: []
    })
    expect(res.ok).toBe(true)
  })
})

describe('append-only + projection helpers — smoke', () => {
  it('parseAcknowledgement accepts a valid record', () => {
    expect(
      parseAcknowledgement({
        schemaVersion: '0.1',
        kind: 'acknowledgement',
        refId: 'hl-001',
        by: 'ai',
        acknowledgedAt: TS
      }).ok
    ).toBe(true)
  })

  it('parseIntentRecord accepts a mark_task_done intent', () => {
    expect(
      parseIntentRecord({
        schemaVersion: '0.1',
        kind: 'intent',
        intentId: 'int-001',
        operation: 'mark_task_done',
        target: { initiativeSlug: 'v3-f0', taskId: 'T-001' },
        args: {},
        by: 'ai',
        requestedAt: TS
      }).ok
    ).toBe(true)
  })

  it('parseIntentApplication accepts a consumer ack', () => {
    expect(
      parseIntentApplication({
        schemaVersion: '0.1',
        kind: 'intent_application',
        refId: 'int-001',
        appliedAt: TS,
        by: 'atomic-skills:project-status',
        result: 'applied'
      }).ok
    ).toBe(true)
  })

  it('parseVerifierResult accepts a met result', () => {
    expect(
      parseVerifierResult({
        schemaVersion: '0.1',
        kind: 'verifier_result',
        verifierResultId: 'vr-001',
        criterionRef: {
          target: 'phase',
          planSlug: 'v3-redesign',
          phaseId: 'F0',
          criterionId: 'F0.G1'
        },
        result: 'met',
        evidence: 'tests green',
        ranAt: TS,
        by: 'ai'
      }).ok
    ).toBe(true)
  })

  it('parseInboxItem wraps a highlight payload', () => {
    expect(
      parseInboxItem({
        schemaVersion: '0.1',
        id: 'inb-001',
        consumer: 'project-status',
        kind: 'highlight',
        payload: {
          schemaVersion: '0.1',
          id: 'hl-001',
          target: { consumer: 'project-status', slug: 'v3-f0', path: 'tasks.T-001' },
          reason: 'r',
          source: 'human',
          severity: 'warn',
          createdAt: TS
        },
        createdAt: TS
      }).ok
    ).toBe(true)
  })

  it('parseArtifactRef accepts a file ref', () => {
    expect(parseArtifactRef({ kind: 'file', path: 'README.md' }).ok).toBe(true)
  })

  it('parseErrorResponse accepts a well-formed error', () => {
    expect(
      parseErrorResponse({ code: 'slug_not_found', message: 'no such plan' }).ok
    ).toBe(true)
  })

  it('parseNextActionProjection accepts a minimal projection', () => {
    expect(
      parseNextActionProjection({
        consumer: 'project-status',
        description: 'do X',
        rationale: 'because Y'
      }).ok
    ).toBe(true)
  })

  it('parseDriftReport accepts an empty drift report', () => {
    expect(
      parseDriftReport({
        consumer: 'project-status',
        expectedScope: [],
        actualWrites: [],
        driftingPaths: []
      }).ok
    ).toBe(true)
  })

  it('parseHealthReport accepts an empty health report', () => {
    expect(
      parseHealthReport({
        schemaVersion: '0.1',
        generatedAt: TS,
        staleInitiatives: [],
        unmetGates: [],
        openHighlights: [],
        inboxUnconsumed: 0
      }).ok
    ).toBe(true)
  })
})

describe('context field — schema parity with atomic-skills pre-write gate', () => {
  const validContext = {
    solves: 'Real problem statement here',
    trigger: 'Concrete trigger that surfaced this',
    assumesStillValid: [],
    ratifiedAt: '2026-05-20T18:15:00Z',
    ratifiedBy: 'human' as const
  }

  it('rejects parked item without context (mirrors pre-write T20)', () => {
    expect(() =>
      parkedItemSchema.parse({
        title: 'silent parked stub',
        surfacedAt: '2026-05-20T18:00:00Z',
        fromFrame: null
      })
    ).toThrow()
  })

  it('accepts parked item with complete context (mirrors pre-write T21)', () => {
    expect(() =>
      parkedItemSchema.parse({
        title: 'legit parked',
        surfacedAt: '2026-05-20T18:00:00Z',
        fromFrame: null,
        context: validContext
      })
    ).not.toThrow()
  })

  it('rejects emerged item without context (mirrors pre-write T22)', () => {
    expect(() =>
      emergedItemSchema.parse({
        title: 'silent emerged',
        surfacedAt: '2026-05-20T19:00:00Z',
        promoted: false
      })
    ).toThrow()
  })

  it('rejects task with provenance but no context', () => {
    expect(() =>
      taskSchema.parse({
        id: 'T-001',
        title: 'has prov',
        status: 'pending',
        lastUpdated: '2026-05-20T18:00:00Z',
        provenance: { surfacedAt: '2026-05-20T18:00:00Z' }
      })
    ).toThrow(/context is required when provenance is present/)
  })

  it('accepts task without provenance/context (original materialization)', () => {
    expect(() =>
      taskSchema.parse({
        id: 'T-001',
        title: 'plain task',
        status: 'pending',
        lastUpdated: '2026-05-20T18:00:00Z'
      })
    ).not.toThrow()
  })

  it('rejects context with solves < 8 chars', () => {
    expect(() =>
      contextSchema.parse({
        ...validContext,
        solves: 'short'
      })
    ).toThrow()
  })

  it('rejects context with unknown property (mirrors additionalProperties:false)', () => {
    expect(() =>
      contextSchema.parse({
        ...validContext,
        extraneousField: 'should be rejected by .strict()'
      })
    ).toThrow()
  })

  it('rejects phase descriptor with provenance but no context', () => {
    expect(() =>
      phaseDescriptorSchema.parse({
        id: 'F0',
        slug: 'foundation',
        title: 'Foundation',
        goal: 'Lay the groundwork',
        dependsOn: [],
        subPhaseCount: 0,
        exitGate: { summary: 'all done', criteria: [] },
        status: 'pending',
        provenance: { surfacedAt: '2026-05-20T18:00:00Z' }
      })
    ).toThrow(/context is required when provenance is present/)
  })

  it('accepts phase descriptor with provenance + context', () => {
    expect(() =>
      phaseDescriptorSchema.parse({
        id: 'F0',
        slug: 'foundation',
        title: 'Foundation',
        goal: 'Lay the groundwork',
        dependsOn: [],
        subPhaseCount: 0,
        exitGate: { summary: 'all done', criteria: [] },
        status: 'pending',
        provenance: { surfacedAt: '2026-05-20T18:00:00Z' },
        context: validContext
      })
    ).not.toThrow()
  })

  it('accepts phase descriptor without provenance/context (original materialization)', () => {
    expect(() =>
      phaseDescriptorSchema.parse({
        id: 'F0',
        slug: 'foundation',
        title: 'Foundation',
        goal: 'Lay the groundwork',
        dependsOn: [],
        subPhaseCount: 0,
        exitGate: { summary: 'all done', criteria: [] },
        status: 'pending'
      })
    ).not.toThrow()
  })
})

// ─── normalization: coerce legacy values before validation ──────────────

describe('normalization — gate status coercion', () => {
  it('coerces "passed" to "met" in plan exitGate criteria', () => {
    const plan = {
      ...minimalPlan(),
      phases: [{
        ...samplePhase(),
        exitGate: {
          summary: 'done',
          criteria: [{ id: 'G-1', description: 'check', status: 'passed' }]
        }
      }]
    }
    const r = parsePlan(plan)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.phases[0].exitGate.criteria[0].status).toBe('met')
    }
  })

  it('coerces "passed" to "met" in initiative exitGates', () => {
    const init = {
      ...baseInitiative(),
      exitGates: [{ id: 'G-1', description: 'check', status: 'passed' }]
    }
    const r = parseInitiative(init)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.exitGates[0].status).toBe('met')
    }
  })
})

describe('normalization — legacy initiative field names', () => {
  it('maps initiative_id to slug and adds defaults for missing arrays', () => {
    const legacy = {
      initiative_id: 'my-init',
      title: 'Legacy Initiative',
      goal: 'test coercion',
      status: 'active',
      branch: 'main',
      started: TS,
      last_updated: TS,
      next_action: null,
    }
    const r = parseInitiative(legacy)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.slug).toBe('my-init')
      expect(r.value.lastUpdated).toBe(TS)
      expect(r.value.schemaVersion).toBe('0.1')
      expect(r.value.exitGates).toEqual([])
      expect(r.value.stack).toEqual([])
      expect(r.value.tasks).toEqual([])
    }
  })
})
