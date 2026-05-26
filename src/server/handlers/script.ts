import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'

const TIMEOUT_MS = 30_000

export async function executeScript(
  consumerDir: string,
  decl: { type: 'script'; source: string },
  args: Record<string, unknown>,
  dataMap: Map<string, unknown[]>
): Promise<Result<Record<string, unknown>, ErrorResponse>> {
  const modulePath = join(consumerDir, decl.source)
  const moduleUrl = pathToFileURL(modulePath).href

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
      append: (target: string, record: Record<string, unknown>) =>
        appendJsonlLine(join(consumerDir, target), record),
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
