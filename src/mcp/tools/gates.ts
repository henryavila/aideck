import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { ErrorResponse, VerifierResult as VerifierResultRecord } from '@schemas/common.js'
import { type Result, err, ok } from '@schemas/validators/index.js'
import type {
  ExitCriterion,
  ExitCriterionVerifier
} from '@schemas/project-status.js'
import { parseInitiativeFile, parsePlanFile } from '../../server/parsers/project-status.js'
import { runVerifier } from '../../server/verifiers/index.js'
import { appendJsonlLine } from '../../server/writers/jsonl-append.js'
import { consumerRoot, inboxPathFor } from '../../server/writers/paths.js'
import type { RegisteredTool } from '../types.js'

function defineTool<TIn, TOut>(t: RegisteredTool<TIn, TOut>): RegisteredTool {
  return t as unknown as RegisteredTool
}

const verifyInput = z.object({
  consumer: z.string(),
  target: z.enum(['plan', 'phase', 'initiative', 'task']),
  planSlug: z.string().optional(),
  phaseId: z.string().optional(),
  initiativeSlug: z.string().optional(),
  taskId: z.string().optional(),
  criterionId: z.string(),
  result: z.enum(['met', 'pending', 'deferred']).optional(),
  deferredReason: z.string().optional(),
  evidence: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  by: z.enum(['human', 'ai']).default('ai')
})

interface VerifyOutput {
  result: 'met' | 'pending' | 'deferred'
  verifierRan: boolean
  verifierOutput?: string
  evidence?: string
  allGatesMet: boolean
  verifierResultId: string
}

type VerifyInputResolved = z.input<typeof verifyInput> & { by: 'human' | 'ai' }

async function findCriterion(
  rootDir: string,
  input: VerifyInputResolved
): Promise<Result<{ criterion: ExitCriterion; verifier?: ExitCriterionVerifier; siblings: ExitCriterion[] }, ErrorResponse>> {
  if (input.target === 'phase') {
    if (!input.planSlug || !input.phaseId) {
      return err({ code: 'invalid_input', message: 'phase target requires planSlug + phaseId' })
    }
    const path = join(consumerRoot(rootDir, input.consumer), 'plans', `${input.planSlug}.md`)
    const r = await parsePlanFile(path)
    if (!r.ok) return r
    const phase = r.value.phases.find((p) => p.id === input.phaseId)
    if (!phase) {
      return err({ code: 'path_not_found', message: `phase ${input.phaseId} not found` })
    }
    const criterion = phase.exitGate.criteria.find((c) => c.id === input.criterionId)
    if (!criterion) {
      return err({ code: 'path_not_found', message: `criterion ${input.criterionId} not found in phase ${phase.id}` })
    }
    return ok({ criterion, verifier: criterion.verifier, siblings: phase.exitGate.criteria })
  }
  if (input.target === 'initiative' || input.target === 'task') {
    if (!input.initiativeSlug) {
      return err({ code: 'invalid_input', message: 'initiative/task target requires initiativeSlug' })
    }
    const path = join(consumerRoot(rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
    const r = await parseInitiativeFile(path)
    if (!r.ok) return r
    if (input.target === 'initiative') {
      const criterion = r.value.exitGates.find((c) => c.id === input.criterionId)
      if (!criterion) {
        return err({ code: 'path_not_found', message: `criterion ${input.criterionId} not found in initiative ${input.initiativeSlug}` })
      }
      return ok({ criterion, verifier: criterion.verifier, siblings: r.value.exitGates })
    }
    if (!input.taskId) {
      return err({ code: 'invalid_input', message: 'task target requires taskId' })
    }
    const task = r.value.tasks.find((t) => t.id === input.taskId)
    if (!task) {
      return err({ code: 'path_not_found', message: `task ${input.taskId} not found` })
    }
    if (input.criterionId !== 'task') {
      return err({
        code: 'invalid_input',
        message: 'task verifier must be invoked with criterionId="task"',
        suggestion: 'tasks have a single verifier; pass criterionId="task"'
      })
    }
    return ok({
      criterion: { id: 'task', description: task.title, status: task.status === 'done' ? 'met' : 'pending' },
      verifier: task.verifier,
      siblings: []
    })
  }
  return err({ code: 'invalid_input', message: `target ${input.target} not supported` })
}

async function nextDailyVerifierResultId(path: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10)
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file
  }
  return `vr-${day}-${String(count + 1).padStart(3, '0')}`
}

export const gateTools: ReadonlyArray<RegisteredTool> = [
  defineTool({
    name: 'aideck_verify_exit_gate',
    description: 'Run (or accept manual) verifier for an exit-gate criterion and append a VerifierResult to inbox/. Never edits entity files.',
    inputSchema: verifyInput,
    async handler(rawInput, ctx): Promise<Result<VerifyOutput, ErrorResponse>> {
      const input: VerifyInputResolved = { ...rawInput, by: rawInput.by ?? 'ai' }
      const located = await findCriterion(ctx.rootDir, input)
      if (!located.ok) return located

      let result: 'met' | 'pending' | 'deferred'
      let verifierRan = false
      let evidence: string | undefined = input.evidence
      let verifierOutput: string | undefined

      if (input.result !== undefined) {
        result = input.result
      } else if (located.value.verifier?.kind === 'shell') {
        const outcome = await runVerifier(located.value.verifier, {
          cwd: ctx.rootDir,
          timeoutMs: input.timeoutMs
        })
        if (!outcome.ok) return outcome
        verifierRan = true
        result = outcome.value.passed ? 'met' : 'pending'
        evidence = outcome.value.evidence ?? evidence
        verifierOutput = outcome.value.verifierOutput
      } else if (located.value.verifier?.kind === 'manual') {
        return err({
          code: 'precondition_failed',
          message: 'manual verifier requires explicit `result` argument',
          suggestion: `verifier description: ${located.value.verifier.description}`
        })
      } else if (located.value.verifier?.kind === 'query' || located.value.verifier?.kind === 'test') {
        return err({
          code: 'precondition_failed',
          message: `verifier kind "${located.value.verifier.kind}" not yet implemented (v0.2)`,
          suggestion: 'Use shell/manual verifier or pass explicit `result`'
        })
      } else {
        // No verifier and no explicit result.
        return err({
          code: 'precondition_failed',
          message: 'criterion has no verifier — supply explicit `result` to record an outcome'
        })
      }

      const inboxPath = inboxPathFor(consumerRoot(ctx.rootDir, input.consumer))
      const verifierResultId = await nextDailyVerifierResultId(inboxPath)
      const record: VerifierResultRecord = {
        schemaVersion: '0.1',
        kind: 'verifier_result',
        verifierResultId,
        criterionRef: {
          target: input.target,
          ...(input.planSlug ? { planSlug: input.planSlug } : {}),
          ...(input.initiativeSlug ? { initiativeSlug: input.initiativeSlug } : {}),
          ...(input.phaseId ? { phaseId: input.phaseId } : {}),
          ...(input.taskId ? { taskId: input.taskId } : {}),
          criterionId: input.criterionId
        },
        result,
        ...(evidence ? { evidence } : {}),
        ...(verifierOutput ? { verifierOutput } : {}),
        ranAt: new Date().toISOString(),
        by: input.by ?? 'ai'
      }
      await appendJsonlLine(inboxPath, record)

      const allGatesMet = located.value.siblings.length > 0
        ? located.value.siblings.every((c) =>
            c.id === input.criterionId ? result === 'met' : c.status === 'met'
          )
        : result === 'met'

      return ok({
        result,
        verifierRan,
        ...(verifierOutput ? { verifierOutput } : {}),
        ...(evidence ? { evidence } : {}),
        allGatesMet,
        verifierResultId
      })
    }
  })
]
