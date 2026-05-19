import { join } from 'node:path'
import { z } from 'zod'
import type { ErrorResponse, IntentRecord } from '@schemas/common.js'
import { type Result, err, ok } from '@schemas/validators/index.js'
import { parseInitiativeFile } from '../../server/parsers/project-status.js'
import { appendIntent, type IntentReceipt } from '../../server/writers/intents.js'
import { consumerRoot } from '../../server/writers/paths.js'
import type { McpToolContext, RegisteredTool } from '../types.js'

interface MutateReceipt extends IntentReceipt {
  accepted: true
  note: string
  phaseCompleteHint?: { initiativeSlug: string; remaining: number; lastTaskId: string }
  warning?: string
  suggestion?: Record<string, unknown>
}

function defineTool<TIn, TOut>(t: RegisteredTool<TIn, TOut>): RegisteredTool {
  return t as unknown as RegisteredTool
}

async function record(
  ctx: McpToolContext,
  consumer: string,
  operation: IntentRecord['operation'],
  target: IntentRecord['target'],
  args: IntentRecord['args'],
  by: 'human' | 'ai',
  extra: Partial<MutateReceipt> = {}
): Promise<Result<MutateReceipt, ErrorResponse>> {
  const receipt = await appendIntent({
    consumerRoot: consumerRoot(ctx.rootDir, consumer),
    consumerId: consumer,
    operation,
    target,
    args,
    by
  })
  return ok({
    ...receipt,
    accepted: true,
    note: 'Intent recorded; consumer skill applies.',
    ...extra
  })
}

const baseTarget = z.object({
  consumer: z.string(),
  initiativeSlug: z.string()
})

const planTarget = z.object({
  consumer: z.string(),
  planSlug: z.string()
})

const byField = z.enum(['human', 'ai']).default('ai')

export const mutateTools: ReadonlyArray<RegisteredTool> = [
  defineTool({
    name: 'aideck_mark_task_done',
    description: 'Record an intent to mark a task done. aiDeck never edits the file; a consumer skill applies.',
    inputSchema: baseTarget.extend({
      taskId: z.string(),
      verifierResultId: z.string().optional(),
      by: byField
    }),
    async handler(input, ctx) {
      // Optionally compute a phaseCompleteHint by reading current state.
      let phaseCompleteHint: MutateReceipt['phaseCompleteHint'] | undefined
      const initPath = join(consumerRoot(ctx.rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
      const r = await parseInitiativeFile(initPath)
      if (r.ok) {
        const remaining = r.value.tasks.filter((t) => t.status !== 'done' && t.id !== input.taskId).length
        if (remaining === 0) {
          phaseCompleteHint = {
            initiativeSlug: input.initiativeSlug,
            remaining,
            lastTaskId: input.taskId
          }
        }
      }
      return record(
        ctx,
        input.consumer,
        'mark_task_done',
        { initiativeSlug: input.initiativeSlug, taskId: input.taskId },
        input.verifierResultId ? { verifierResultId: input.verifierResultId } : {},
        input.by ?? "ai",
        phaseCompleteHint ? { phaseCompleteHint } : {}
      )
    }
  }),

  defineTool({
    name: 'aideck_update_initiative_status',
    description: 'Record an intent to change an Initiative status (pending|active|paused|done|archived).',
    inputSchema: baseTarget.extend({
      status: z.enum(['pending', 'active', 'paused', 'done', 'archived']),
      reason: z.string().optional(),
      by: byField
    }),
    async handler(input, ctx) {
      return record(
        ctx,
        input.consumer,
        'update_initiative_status',
        { initiativeSlug: input.initiativeSlug },
        { status: input.status, ...(input.reason ? { reason: input.reason } : {}) },
        input.by ?? "ai"
      )
    }
  }),

  defineTool({
    name: 'aideck_update_next_action',
    description: 'Record an intent to update Initiative.nextAction.',
    inputSchema: baseTarget.extend({
      nextAction: z.string().nullable(),
      by: byField
    }),
    async handler(input, ctx) {
      return record(
        ctx,
        input.consumer,
        'update_next_action',
        { initiativeSlug: input.initiativeSlug },
        { nextAction: input.nextAction },
        input.by ?? "ai"
      )
    }
  }),

  defineTool({
    name: 'aideck_push_frame',
    description: 'Record an intent to push a new stack frame (task|research|validation|discussion).',
    inputSchema: baseTarget.extend({
      title: z.string(),
      type: z.enum(['task', 'research', 'validation', 'discussion']),
      by: byField
    }),
    async handler(input, ctx) {
      let warning: string | undefined
      const initPath = join(consumerRoot(ctx.rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
      const r = await parseInitiativeFile(initPath)
      if (r.ok && r.value.stack.length >= 5) {
        warning = `stack depth is ${r.value.stack.length}; consider popping a frame before pushing another`
      }
      return record(
        ctx,
        input.consumer,
        'push_frame',
        { initiativeSlug: input.initiativeSlug },
        { title: input.title, type: input.type },
        input.by ?? "ai",
        warning ? { warning } : {}
      )
    }
  }),

  defineTool({
    name: 'aideck_pop_frame',
    description: 'Record an intent to pop the top stack frame. Precondition: stack non-empty.',
    inputSchema: baseTarget.extend({
      destination: z.string().optional(),
      by: byField
    }),
    async handler(input, ctx): Promise<Result<MutateReceipt, ErrorResponse>> {
      const initPath = join(consumerRoot(ctx.rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
      const r = await parseInitiativeFile(initPath)
      if (r.ok && r.value.stack.length === 0) {
        return err({
          code: 'precondition_failed',
          message: 'cannot pop from an empty stack',
          suggestion: 'push a frame first or check current state via aideck_get_initiative'
        })
      }
      return record(
        ctx,
        input.consumer,
        'pop_frame',
        { initiativeSlug: input.initiativeSlug },
        input.destination ? { destination: input.destination } : {},
        input.by ?? "ai"
      )
    }
  }),

  defineTool({
    name: 'aideck_park_item',
    description: 'Record an intent to park a lateral item (out-of-scope but worth remembering).',
    inputSchema: baseTarget.extend({
      title: z.string(),
      by: byField
    }),
    async handler(input, ctx) {
      return record(
        ctx,
        input.consumer,
        'park_item',
        { initiativeSlug: input.initiativeSlug },
        { title: input.title },
        input.by ?? "ai"
      )
    }
  }),

  defineTool({
    name: 'aideck_emerge_item',
    description: 'Record an intent to log an emerged item (work that surfaced during execution).',
    inputSchema: baseTarget.extend({
      title: z.string(),
      by: byField
    }),
    async handler(input, ctx) {
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      return record(
        ctx,
        input.consumer,
        'emerge_item',
        { initiativeSlug: input.initiativeSlug },
        { title: input.title },
        input.by ?? "ai",
        { suggestion: { newInitiativeSlug: slug } }
      )
    }
  }),

  defineTool({
    name: 'aideck_promote_parked',
    description: 'Record an intent to promote a parked item to a real task or initiative.',
    inputSchema: baseTarget.extend({
      parkedTitleOrIndex: z.union([z.string(), z.number().int().nonnegative()]),
      by: byField
    }),
    async handler(input, ctx): Promise<Result<MutateReceipt, ErrorResponse>> {
      const initPath = join(consumerRoot(ctx.rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
      const r = await parseInitiativeFile(initPath)
      if (r.ok) {
        const found = typeof input.parkedTitleOrIndex === 'number'
          ? input.parkedTitleOrIndex < r.value.parked.length
          : r.value.parked.some((p) => p.title === input.parkedTitleOrIndex)
        if (!found) {
          return err({
            code: 'precondition_failed',
            message: `parked item not found: ${JSON.stringify(input.parkedTitleOrIndex)}`,
            suggestion: `current parked count: ${r.value.parked.length}`
          })
        }
      }
      return record(
        ctx,
        input.consumer,
        'promote_parked',
        { initiativeSlug: input.initiativeSlug },
        { parked: input.parkedTitleOrIndex },
        input.by ?? "ai"
      )
    }
  }),

  defineTool({
    name: 'aideck_add_task',
    description: 'Record an intent to add a new task to an Initiative. Consumer assigns the final task id.',
    inputSchema: baseTarget.extend({
      title: z.string(),
      description: z.string().optional(),
      verifier: z.unknown().optional(),
      by: byField
    }),
    async handler(input, ctx) {
      const args: Record<string, unknown> = { title: input.title }
      if (input.description) args.description = input.description
      if (input.verifier) args.verifier = input.verifier
      return record(
        ctx,
        input.consumer,
        'add_task',
        { initiativeSlug: input.initiativeSlug },
        args,
        input.by ?? "ai"
      )
    }
  })
]

// planTarget is declared above for future cross-plan mutation tools (none in v0.1).
void planTarget
