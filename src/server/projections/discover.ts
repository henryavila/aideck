import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ErrorResponse } from '../../schemas/common.js'
import type { DiscoverRun } from '../../schemas/discover-run.js'
import { type Result, err } from '../../schemas/validators/index.js'
import { parseDiscoverRunFile } from '../parsers/discover-run.js'
import { consumerRoot } from '../writers/paths.js'

const DISCOVER_RUN_FILENAME = 'discover-run.json'

export function hasDiscoverRun(rootDir: string, consumerId: string): boolean {
  try {
    return existsSync(join(consumerRoot(rootDir, consumerId), DISCOVER_RUN_FILENAME))
  } catch {
    return false
  }
}

export async function buildDiscoverState(
  rootDir: string,
  consumerId: string
): Promise<Result<DiscoverRun, ErrorResponse>> {
  const path = join(consumerRoot(rootDir, consumerId), DISCOVER_RUN_FILENAME)
  const result = await parseDiscoverRunFile(path)
  if (!result.ok && result.error.code === 'io_error') {
    return err({
      code: 'consumer_unknown',
      message: `No discover-run.json found for consumer "${consumerId}"`,
      suggestion: `Run "project-plan discover" to generate ${path}`
    })
  }
  return result
}
