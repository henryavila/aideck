import { execFile as execFileCb } from 'node:child_process'
import { promisify } from 'node:util'
import type { ErrorResponse } from '../../schemas/common.js'
import { type Result, err, ok } from '../../schemas/validators/index.js'
import { renderTemplate } from './template.js'

const execFile = promisify(execFileCb)

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * POSIX single-quote escaping. Wraps a value so the shell treats it as one
 * literal argument; embedded single quotes are closed, escaped, and reopened
 * (`'` -> `'\''`). Neutralizes command injection through templated args.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export interface ShellExecDecl {
  type: 'shell-exec'
  command: string
  timeout?: number
}

export async function executeShellExec(
  consumerDir: string,
  decl: ShellExecDecl,
  args: Record<string, unknown>
): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, ErrorResponse>> {
  const command = renderTemplate(decl.command, args, shellQuote)
  const timeout = decl.timeout ?? DEFAULT_TIMEOUT_MS

  try {
    const { stdout, stderr } = await execFile('bash', ['-c', command], {
      cwd: consumerDir,
      timeout,
    })
    return ok({ stdout, stderr, exitCode: 0 })
  } catch (cause) {
    if (isExecError(cause)) {
      if (cause.killed || cause.signal === 'SIGTERM') {
        return err({
          code: 'internal_error',
          message: `Command timed out after ${timeout}ms: ${command}`,
          details: { code: 'timeout', command, timeoutMs: timeout },
        })
      }
      return err({
        code: 'internal_error',
        message: `Command exited with code ${cause.code ?? 'unknown'}: ${command}`,
        details: {
          code: 'shell_error',
          exitCode: cause.code,
          stderr: cause.stderr ?? '',
          command,
        },
      })
    }
    const message = cause instanceof Error ? cause.message : String(cause)
    return err({ code: 'internal_error', message: `Unexpected error executing command: ${message}` })
  }
}

interface ExecError extends Error {
  code?: number | null
  killed?: boolean
  signal?: string | null
  stdout?: string
  stderr?: string
}

function isExecError(value: unknown): value is ExecError {
  return value instanceof Error && ('code' in value || 'killed' in value)
}
