import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'
import { resolveWithinDir } from '../writers/path-guard.js'
import { renderTemplate } from './template.js'

export interface FileMutationDecl {
  type: 'file-mutation'
  target: string
  operation: 'set' | 'append'
  field?: string
  record?: Record<string, unknown>
}

export async function executeFileMutation(
  consumerDir: string,
  decl: FileMutationDecl,
  args: Record<string, unknown>
): Promise<Result<{ path: string }, ErrorResponse>> {
  if (decl.operation === 'set') {
    return err({
      code: 'not_implemented',
      message: 'file-mutation operation "set" is not implemented in v0.1',
      suggestion: 'Use operation "append" for JSONL writes.',
    })
  }

  const renderedTarget = renderTemplate(decl.target, args)
  const targetPath = resolveWithinDir(consumerDir, renderedTarget)
  if (targetPath === null) {
    return err({
      code: 'invalid_input',
      message: `file-mutation target escapes the consumer directory: "${renderedTarget}"`,
    })
  }

  const rawRecord = decl.record ?? {}
  const rendered: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawRecord)) {
    rendered[key] = typeof value === 'string' ? renderTemplate(value, args) : value
  }

  try {
    await appendJsonlLine(targetPath, rendered)
    return ok({ path: targetPath })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    return err({
      code: 'io_error',
      message: `Failed to append to ${targetPath}: ${message}`,
    })
  }
}
