import { join } from 'node:path'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { parseInitiativeFile, parsePlanFile } from '../../server/parsers/project-status.js'
import { consumerRoot } from '../../server/writers/paths.js'

export interface DependencyReport {
  scope: 'phase' | 'task'
  id: string
  resolved: string[]
  blocking: string[]
  blockedBy: string[]
}

export interface DependenciesInput {
  consumer: string
  planSlug: string
  phaseId?: string
  taskId?: string
  initiativeSlug?: string
}

export async function resolveDependencies(
  rootDir: string,
  input: DependenciesInput
): Promise<Result<DependencyReport, ErrorResponse>> {
  if (!input.phaseId && !input.taskId) {
    return err({
      code: 'invalid_input',
      message: 'either phaseId or taskId is required',
      suggestion: 'pass `phaseId: "F0"` or `taskId: "T-001"` (taskId requires initiativeSlug)'
    })
  }

  const planRes = await parsePlanFile(
    join(consumerRoot(rootDir, input.consumer), 'plans', `${input.planSlug}.md`)
  )
  if (!planRes.ok) return planRes
  const plan = planRes.value

  if (input.phaseId) {
    const phase = plan.phases.find((p) => p.id === input.phaseId)
    if (!phase) {
      return err({
        code: 'path_not_found',
        message: `phase ${input.phaseId} not found in plan ${input.planSlug}`
      })
    }
    const doneIds = new Set(plan.phases.filter((p) => p.status === 'done').map((p) => p.id))
    const resolved = phase.dependsOn.filter((id) => doneIds.has(id))
    const blocking = phase.dependsOn.filter((id) => !doneIds.has(id))
    return ok({
      scope: 'phase',
      id: phase.id,
      resolved,
      blocking,
      blockedBy: blocking
    })
  }

  if (!input.initiativeSlug) {
    return err({
      code: 'invalid_input',
      message: 'taskId requires initiativeSlug',
      suggestion: 'pass `initiativeSlug` so the initiative file can be parsed'
    })
  }

  const initRes = await parseInitiativeFile(
    join(consumerRoot(rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
  )
  if (!initRes.ok) return initRes
  const initiative = initRes.value
  const task = initiative.tasks.find((t) => t.id === input.taskId)
  if (!task) {
    return err({
      code: 'path_not_found',
      message: `task ${input.taskId} not found in initiative ${input.initiativeSlug}`
    })
  }

  const blockedBy = task.blockedBy ?? []
  const doneIds = new Set(initiative.tasks.filter((t) => t.status === 'done').map((t) => t.id))
  const resolved = blockedBy.filter((id) => doneIds.has(id))
  const blocking = blockedBy.filter((id) => !doneIds.has(id))
  return ok({
    scope: 'task',
    id: task.id,
    resolved,
    blocking,
    blockedBy
  })
}
