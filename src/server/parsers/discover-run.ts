import { readFile } from 'node:fs/promises'
import type { ErrorResponse } from '../../schemas/common.js'
import type { DiscoverRun } from '../../schemas/discover-run.js'
import { type Result, err, parseDiscoverRun } from '../../schemas/validators/index.js'

export async function parseDiscoverRunFile(
  path: string
): Promise<Result<DiscoverRun, ErrorResponse>> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (cause) {
    return err({
      code: 'io_error',
      message: `failed to read file: ${path}`,
      details: { cause: String(cause) }
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    return err({
      code: 'invalid_input',
      message: `JSON syntax error in ${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
      suggestion: 'Fix JSON syntax in discover-run file'
    })
  }

  return parseDiscoverRun(parsed, { entity: 'discoverRun' })
}
