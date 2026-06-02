import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'
import { resolveWithinDir } from '../writers/path-guard.js'
import type { DataSourceDecl } from '../manifest-schema.js'

const TIMEOUT_MS = 30_000

/** Default directories that are always writable per the spec (relative to consumerDir). */
const DEFAULT_WRITABLE_DIRS = ['data/inbox', 'data/annotations', 'data/highlights']

/**
 * Compute allowed writable path prefixes from the manifest's dataSources.
 * A dataSource is writable if its format is 'jsonl' (implies append).
 * Returns resolved absolute paths.
 */
export function computeWritablePaths(
  consumerDir: string,
  dataSources: DataSourceDecl[],
  writeBaseDir?: string
): string[] {
  const wb = writeBaseDir ?? consumerDir
  const paths: string[] = []

  // Always allow the default writable directories (consumer-relative, back-compat)
  for (const dir of DEFAULT_WRITABLE_DIRS) {
    paths.push(resolve(consumerDir, dir))
  }

  // Each jsonl dataSource implies an appendable directory. root:'project' sources
  // resolve against the write base (the registered repo) so intents land in the
  // repo's tree (e.g. .atomic-skills/bootstrap-drafts/inbox/), not the consumer dir.
  for (const ds of dataSources) {
    if (ds.format !== 'jsonl') continue
    const base = ds.root === 'project' ? wb : consumerDir
    const starIdx = ds.path.indexOf('*')
    if (starIdx === -1) {
      // Exact file → writable as that single file (unchanged behavior).
      paths.push(resolve(base, ds.path))
    } else {
      // Globbed file (e.g. inbox/*.jsonl) → writable directory.
      const dirPart = ds.path.slice(0, Math.max(0, ds.path.lastIndexOf('/', starIdx)))
      paths.push(resolve(base, dirPart || '.'))
    }
  }

  return paths
}

/**
 * Validate that a resolved target path is within the consumer directory
 * AND within a declared writable path (either a writable directory prefix
 * or an exact match on a writable file path).
 */
export function validateWritePath(
  resolvedTarget: string,
  containmentDir: string,
  writablePaths: string[]
): string | null {
  const resolvedContainmentDir = resolve(containmentDir)

  // Must be within the containment directory (consumer dir, or the registered
  // repo root for project-scoped consumers) — prevents path traversal.
  if (!resolvedTarget.startsWith(resolvedContainmentDir + '/') && resolvedTarget !== resolvedContainmentDir) {
    return `Script handler write rejected: target resolves outside the write base directory`
  }

  // Must be within a declared writable path
  for (const wp of writablePaths) {
    // Exact file match
    if (resolvedTarget === wp) return null
    // Target is inside a writable directory
    if (resolvedTarget.startsWith(wp + '/')) return null
  }

  return `Script handler write rejected: ${resolvedTarget} is not within declared writable paths`
}

export interface ScriptSandboxOptions {
  dataSources?: DataSourceDecl[]
  /**
   * Base directory for handler writes (files.append). Defaults to the consumer
   * dir. For project-scoped consumers (model A) this is the registered repo
   * root, so intents are appended to the repo's tree (e.g.
   * .atomic-skills/bootstrap-drafts/inbox/) where the consumer skill reads them.
   * The handler MODULE is always loaded from the consumer dir regardless.
   */
  writeBaseDir?: string
}

export async function executeScript(
  consumerDir: string,
  decl: { type: 'script'; source: string },
  args: Record<string, unknown>,
  dataMap: Map<string, unknown[]>,
  sandbox?: ScriptSandboxOptions
): Promise<Result<Record<string, unknown>, ErrorResponse>> {
  const modulePath = resolveWithinDir(consumerDir, decl.source)
  if (modulePath === null) {
    return err({
      code: 'invalid_input',
      message: `script source escapes the consumer directory: ${decl.source}`,
      details: { code: 'script_error', source: decl.source },
    })
  }
  const moduleUrl = pathToFileURL(modulePath).href

  const writeBase = sandbox?.writeBaseDir ?? consumerDir
  const writablePaths = computeWritablePaths(consumerDir, sandbox?.dataSources ?? [], writeBase)

  let mod: unknown
  try {
    mod = await import(moduleUrl)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return err({
      code: 'internal_error',
      message: `script_error: failed to import ${decl.source}: ${message}`,
      details: { code: 'script_error', source: decl.source },
    })
  }

  const defaultExport = (mod as Record<string, unknown>)['default']
  if (typeof defaultExport !== 'function') {
    return err({
      code: 'internal_error',
      message: `script_error: module ${decl.source} does not export a default function`,
      details: { code: 'script_error', source: decl.source },
    })
  }

  const context = {
    args,
    data: dataMap,
    files: {
      append: (target: string, record: Record<string, unknown>) => {
        const resolvedTarget = resolve(writeBase, target)
        const rejection = validateWritePath(resolvedTarget, writeBase, writablePaths)
        if (rejection) {
          throw new Error(rejection)
        }
        return appendJsonlLine(resolvedTarget, record)
      },
    },
    log: {
      info: (...parts: unknown[]) => console.log(`[script:${decl.source}]`, ...parts),
      warn: (...parts: unknown[]) => console.warn(`[script:${decl.source}]`, ...parts),
      error: (...parts: unknown[]) => console.error(`[script:${decl.source}]`, ...parts),
    },
  }

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  )

  try {
    const result = await Promise.race([defaultExport(context), timeout])
    return ok(result as Record<string, unknown>)
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'timeout') {
      return err({
        code: 'internal_error',
        message: `script_error: ${decl.source} timed out after ${TIMEOUT_MS}ms`,
        details: { code: 'timeout', source: decl.source },
      })
    }
    const message = cause instanceof Error ? cause.message : String(cause)
    return err({
      code: 'internal_error',
      message: `script_error: ${decl.source} threw: ${message}`,
      details: { code: 'script_error', source: decl.source },
    })
  }
}
