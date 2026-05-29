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
  dataSources: DataSourceDecl[]
): string[] {
  const paths: string[] = []

  // Always allow the default writable directories
  for (const dir of DEFAULT_WRITABLE_DIRS) {
    paths.push(resolve(consumerDir, dir))
  }

  // Add paths from dataSources with jsonl format (implies append)
  for (const ds of dataSources) {
    if (ds.format === 'jsonl') {
      paths.push(resolve(consumerDir, ds.path))
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
  consumerDir: string,
  writablePaths: string[]
): string | null {
  const resolvedConsumerDir = resolve(consumerDir)

  // Must be within the consumer directory (prevents path traversal)
  if (!resolvedTarget.startsWith(resolvedConsumerDir + '/') && resolvedTarget !== resolvedConsumerDir) {
    return `Script handler write rejected: target resolves outside consumer directory`
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

  const writablePaths = computeWritablePaths(consumerDir, sandbox?.dataSources ?? [])

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
        const resolvedTarget = resolve(consumerDir, target)
        const rejection = validateWritePath(resolvedTarget, consumerDir, writablePaths)
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
