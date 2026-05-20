import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ErrorResponse } from '../../schemas/common.js'
import type { Initiative, Plan, ProjectStatusState } from '../../schemas/project-status.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { parseInitiativeFile, parsePlanFile } from '../parsers/project-status.js'
import { consumerRoot } from '../writers/paths.js'

async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir)
    return files.filter((f) => f.endsWith('.md')).sort()
  } catch {
    return []
  }
}

export async function buildAllForConsumer(
  rootDir: string,
  consumerId: string
): Promise<Result<ProjectStatusState, ErrorResponse>> {
  const dir = consumerRoot(rootDir, consumerId)
  const planFiles = await listMarkdownFiles(join(dir, 'plans'))
  const initiativeFiles = await listMarkdownFiles(join(dir, 'initiatives'))

  const plans: Plan[] = []
  const initiatives: Initiative[] = []
  const parseErrors: Array<{ path: string; error: ErrorResponse }> = []

  for (const f of planFiles) {
    const path = join(dir, 'plans', f)
    const r = await parsePlanFile(path)
    if (r.ok) {
      plans.push(r.value)
    } else if (r.error.code === 'schema_version_mismatch' || r.error.code === 'invalid_input') {
      parseErrors.push({ path, error: r.error })
    }
  }
  for (const f of initiativeFiles) {
    const path = join(dir, 'initiatives', f)
    const r = await parseInitiativeFile(path)
    if (r.ok) {
      initiatives.push(r.value)
    } else if (r.error.code === 'schema_version_mismatch' || r.error.code === 'invalid_input') {
      parseErrors.push({ path, error: r.error })
    }
  }

  // Surface the first parse error rather than silently returning a partial state.
  // schema_version_mismatch is a hard contract violation and must not hide.
  if (parseErrors.length > 0) {
    const first = parseErrors[0]
    return err({
      ...first.error,
      details: { ...(first.error.details ?? {}), path: first.path, totalErrors: parseErrors.length }
    })
  }

  if (consumerId !== 'project-status' && plans.length === 0 && initiatives.length === 0) {
    return err({
      code: 'consumer_unknown',
      message: `consumer "${consumerId}" has no plans or initiatives`,
      suggestion: `Create files under .atomic-skills/${consumerId}/plans/ or initiatives/`
    })
  }

  return ok({
    schemaVersion: '0.1',
    consumer: 'project-status' as const,
    generatedAt: new Date().toISOString(),
    plans,
    initiatives,
    adHocSessions: []
  })
}

export async function buildForSlug(
  rootDir: string,
  consumerId: string,
  slug: string
): Promise<Result<Plan | Initiative, ErrorResponse>> {
  const dir = consumerRoot(rootDir, consumerId)
  const planPath = join(dir, 'plans', `${slug}.md`)
  const initiativePath = join(dir, 'initiatives', `${slug}.md`)

  const planRes = await parsePlanFile(planPath)
  if (planRes.ok) return planRes
  // Only fall through to initiative if the plan file genuinely didn't exist or
  // belongs to a different entity; surface parse errors immediately.
  if (planRes.error.code !== 'io_error') return planRes

  const initRes = await parseInitiativeFile(initiativePath)
  if (initRes.ok) return initRes
  if (initRes.error.code === 'io_error') {
    return err({
      code: 'slug_not_found',
      message: `slug "${slug}" not found for consumer "${consumerId}"`,
      suggestion: `Looked in plans/${slug}.md and initiatives/${slug}.md`
    })
  }
  return initRes
}
