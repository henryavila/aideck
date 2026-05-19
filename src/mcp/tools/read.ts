import { z } from 'zod'
import type { ErrorResponse } from '@schemas/common.js'
import {
  type Result,
  err,
  ok
} from '@schemas/validators/index.js'
import type {
  Initiative,
  Plan,
  PhaseDescriptor,
  ProjectStatusState,
  Task
} from '@schemas/project-status.js'
import { join } from 'node:path'
import { parseInitiativeFile, parsePlanFile } from '../../server/parsers/project-status.js'
import { consumerRoot } from '../../server/writers/paths.js'
import { buildAllForConsumer, buildForSlug } from '../../server/projections/state.js'
import { projectNextAction } from '../../server/projections/next-action.js'
import type { RegisteredTool } from '../types.js'
import { resolveDependencies } from './dependencies.js'

function defineTool<TIn, TOut>(t: RegisteredTool<TIn, TOut>): RegisteredTool {
  return t as unknown as RegisteredTool
}

const consumerInput = z.object({ consumer: z.string() })
const slugInput = consumerInput.extend({ slug: z.string() })
const planSlugInput = consumerInput.extend({ planSlug: z.string() })
const phaseInput = planSlugInput.extend({ phaseId: z.string() })
const initiativeSlugInput = consumerInput.extend({ initiativeSlug: z.string() })
const taskInput = initiativeSlugInput.extend({ taskId: z.string() })
const nextActionInput = consumerInput.extend({
  planSlug: z.string().optional(),
  initiativeSlug: z.string().optional()
})
const dependenciesInput = planSlugInput.extend({
  phaseId: z.string().optional(),
  taskId: z.string().optional(),
  initiativeSlug: z.string().optional()
})

async function loadPlan(rootDir: string, consumer: string, slug: string): Promise<Result<Plan, ErrorResponse>> {
  const path = join(consumerRoot(rootDir, consumer), 'plans', `${slug}.md`)
  return parsePlanFile(path)
}

async function loadInitiative(rootDir: string, consumer: string, slug: string): Promise<Result<Initiative, ErrorResponse>> {
  const path = join(consumerRoot(rootDir, consumer), 'initiatives', `${slug}.md`)
  return parseInitiativeFile(path)
}

export const readTools: ReadonlyArray<RegisteredTool> = [
  defineTool<{ consumer: string; slug?: string }, ProjectStatusState | Plan | Initiative>({
    name: 'aideck_get_state',
    description: 'Aggregate ProjectStatusState for a consumer (plans + initiatives) or one entity if `slug` is supplied.',
    inputSchema: consumerInput.extend({ slug: z.string().optional() }),
    async handler(input, ctx) {
      if (input.slug) return buildForSlug(ctx.rootDir, input.consumer, input.slug)
      return buildAllForConsumer(ctx.rootDir, input.consumer)
    }
  }),

  defineTool({
    name: 'aideck_get_plan',
    description: 'Return the parsed Plan record for `<consumer>/plans/<slug>.md`.',
    inputSchema: slugInput,
    async handler(input, ctx) {
      return loadPlan(ctx.rootDir, input.consumer, input.slug)
    }
  }),

  defineTool({
    name: 'aideck_get_phase',
    description: 'Return one PhaseDescriptor from a Plan by id.',
    inputSchema: phaseInput,
    async handler(input, ctx): Promise<Result<PhaseDescriptor, ErrorResponse>> {
      const planRes = await loadPlan(ctx.rootDir, input.consumer, input.planSlug)
      if (!planRes.ok) return planRes
      const phase = planRes.value.phases.find((p) => p.id === input.phaseId)
      if (!phase) {
        return err({
          code: 'path_not_found',
          message: `phase ${input.phaseId} not found in plan ${input.planSlug}`,
          suggestion: `available: ${planRes.value.phases.map((p) => p.id).join(', ')}`
        })
      }
      return ok(phase)
    }
  }),

  defineTool({
    name: 'aideck_get_initiative',
    description: 'Return the parsed Initiative record for `<consumer>/initiatives/<slug>.md`.',
    inputSchema: slugInput,
    async handler(input, ctx) {
      return loadInitiative(ctx.rootDir, input.consumer, input.slug)
    }
  }),

  defineTool({
    name: 'aideck_get_task',
    description: 'Return one Task from an Initiative by id.',
    inputSchema: taskInput,
    async handler(input, ctx): Promise<Result<Task, ErrorResponse>> {
      const initRes = await loadInitiative(ctx.rootDir, input.consumer, input.initiativeSlug)
      if (!initRes.ok) return initRes
      const task = initRes.value.tasks.find((t) => t.id === input.taskId)
      if (!task) {
        return err({
          code: 'path_not_found',
          message: `task ${input.taskId} not found in initiative ${input.initiativeSlug}`,
          suggestion: `available: ${initRes.value.tasks.map((t) => t.id).join(', ')}`
        })
      }
      return ok(task)
    }
  }),

  defineTool({
    name: 'aideck_get_next_action',
    description: 'Compute the next recommended action for the given consumer/plan/initiative.',
    inputSchema: nextActionInput,
    async handler(input, ctx) {
      const proj = await projectNextAction(ctx.rootDir, input)
      return ok(proj)
    }
  }),

  defineTool({
    name: 'aideck_get_dependencies',
    description: 'Resolve dependencies for a phase or a task (returns `{ resolved, blocking, blockedBy }`).',
    inputSchema: dependenciesInput,
    async handler(input, ctx) {
      return resolveDependencies(ctx.rootDir, input)
    }
  })
]
