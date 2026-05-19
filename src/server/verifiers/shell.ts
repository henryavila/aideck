import { spawn } from 'node:child_process'

export interface ShellVerifierOptions {
  command: string
  expectExitCode?: number
  timeoutMs?: number
  cwd?: string
  /** Output cap per stream in bytes. */
  maxBytes?: number
}

export interface ShellVerifierResult {
  passed: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

const DEFAULT_MAX_BYTES = 256 * 1024

export function runShellVerifier(opts: ShellVerifierOptions): Promise<ShellVerifierResult> {
  return new Promise((resolve) => {
    const expectExitCode = opts.expectExitCode ?? 0
    const timeoutMs = opts.timeoutMs ?? 30_000
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
    const start = Date.now()
    const child = spawn('bash', ['-c', opts.command], {
      cwd: opts.cwd,
      env: { ...process.env, CI: '1' }
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      // Escalate if it refuses to exit.
      setTimeout(() => child.kill('SIGKILL'), 250).unref()
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < maxBytes) {
        stdout += chunk.toString('utf8').slice(0, maxBytes - stdout.length)
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < maxBytes) {
        stderr += chunk.toString('utf8').slice(0, maxBytes - stderr.length)
      }
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        passed: !timedOut && code === expectExitCode,
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - start,
        timedOut
      })
    })
    child.on('error', (cause) => {
      clearTimeout(timer)
      resolve({
        passed: false,
        exitCode: null,
        stdout,
        stderr: stderr + `\n[spawn error] ${cause.message}`,
        durationMs: Date.now() - start,
        timedOut
      })
    })
  })
}
