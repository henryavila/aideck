import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ErrorResponse } from '../../schemas/common.js'
import type { Initiative, Plan, ProjectStatusState } from '../../schemas/project-status.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { parseInitiativeFile, parsePlanFile } from '../parsers/project-status.js'
import { atomicSkillsRoot, consumerRoot, DEFAULT_CONSUMER } from '../writers/paths.js'

async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir)
    return files.filter((f) => f.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/**
 * Returns the directories to scan for a given consumer. The default
 * `project-status` consumer accepts BOTH the explicit layout
 * `<rootDir>/.atomic-skills/project-status/{plans,initiatives}/` and the
 * flat layout `<rootDir>/.atomic-skills/{plans,initiatives}/` because the
 * atomic-skills writer ships flat by default. Other consumers always use
 * the explicit layout. See classifyFile() in writers/paths.ts which
 * mirrors this convention for the watcher path.
 */
function consumerEntityDirs(rootDir: string, consumerId: string): string[] {
  const dirs = [consumerRoot(rootDir, consumerId)]
  if (consumerId === DEFAULT_CONSUMER) dirs.push(atomicSkillsRoot(rootDir))
  return dirs
}

export async function buildAllForConsumer(
  rootDir: string,
  consumerId: string
): Promise<Result<ProjectStatusState, ErrorResponse>> {
  const entityDirs = consumerEntityDirs(rootDir, consumerId)

  const plans: Plan[] = []
  const initiatives: Initiative[] = []
  const parseErrors: Array<{ path: string; error: ErrorResponse }> = []
  const seenPlanFiles = new Set<string>()
  const seenInitFiles = new Set<string>()

  for (const dir of entityDirs) {
    const planFiles = await listMarkdownFiles(join(dir, 'plans'))
    const initiativeFiles = await listMarkdownFiles(join(dir, 'initiatives'))
    for (const f of planFiles) {
      const path = join(dir, 'plans', f)
      if (seenPlanFiles.has(f)) continue // explicit-layout file shadows flat-layout duplicate
      seenPlanFiles.add(f)
      const r = await parsePlanFile(path)
      if (r.ok) {
        plans.push(r.value)
      } else if (r.error.code === 'schema_version_mismatch' || r.error.code === 'invalid_input') {
        parseErrors.push({ path, error: r.error })
      }
    }
    for (const f of initiativeFiles) {
      const path = join(dir, 'initiatives', f)
      if (seenInitFiles.has(f)) continue
      seenInitFiles.add(f)
      const r = await parseInitiativeFile(path)
      if (r.ok) {
        initiatives.push(r.value)
      } else if (r.error.code === 'schema_version_mismatch' || r.error.code === 'invalid_input') {
        parseErrors.push({ path, error: r.error })
      }
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
  const entityDirs = consumerEntityDirs(rootDir, consumerId)

  // Try plan in each candidate dir; explicit layout wins over flat.
  for (const dir of entityDirs) {
    const planPath = join(dir, 'plans', `${slug}.md`)
    const planRes = await parsePlanFile(planPath)
    if (planRes.ok) return planRes
    if (planRes.error.code !== 'io_error') return planRes
  }
  for (const dir of entityDirs) {
    const initiativePath = join(dir, 'initiatives', `${slug}.md`)
    const initRes = await parseInitiativeFile(initiativePath)
    if (initRes.ok) return initRes
    if (initRes.error.code !== 'io_error') return initRes
  }
  return err({
    code: 'slug_not_found',
    message: `slug "${slug}" not found for consumer "${consumerId}"`,
    suggestion: `Looked in plans/${slug}.md and initiatives/${slug}.md across ${entityDirs.length} layout(s)`
  })
}
