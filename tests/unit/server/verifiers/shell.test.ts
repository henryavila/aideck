import { describe, expect, it } from 'vitest'
import { runShellVerifier } from '../../../../src/server/verifiers/shell.js'

describe('runShellVerifier', () => {
  it('passes when command exits with expected code (default 0)', async () => {
    const result = await runShellVerifier({ command: 'echo hello' })
    expect(result.passed).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('hello')
    expect(result.timedOut).toBe(false)
  })

  it('fails when command exits with non-zero code', async () => {
    const result = await runShellVerifier({ command: 'exit 1' })
    expect(result.passed).toBe(false)
    expect(result.exitCode).toBe(1)
  })

  it('passes when command exits with custom expected code', async () => {
    const result = await runShellVerifier({ command: 'exit 42', expectExitCode: 42 })
    expect(result.passed).toBe(true)
    expect(result.exitCode).toBe(42)
  })

  it('captures stderr', async () => {
    const result = await runShellVerifier({ command: 'echo oops >&2; exit 0' })
    expect(result.passed).toBe(true)
    expect(result.stderr).toContain('oops')
  })

  it('times out long-running commands', async () => {
    const result = await runShellVerifier({ command: 'sleep 30', timeoutMs: 200 })
    expect(result.passed).toBe(false)
    expect(result.timedOut).toBe(true)
    expect(result.durationMs).toBeGreaterThanOrEqual(150)
  }, 10_000)

  it('records duration', async () => {
    const result = await runShellVerifier({ command: 'echo fast' })
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(typeof result.durationMs).toBe('number')
  })

  it('handles spawn error for nonexistent working directory', async () => {
    const result = await runShellVerifier({
      command: 'echo test',
      cwd: '/nonexistent/path/that/does/not/exist'
    })
    // spawn error results in passed=false and exitCode=null
    expect(result.passed).toBe(false)
    expect(result.exitCode).toBeNull()
    expect(result.stderr).toContain('spawn error')
  })

  it('truncates stdout at maxBytes cap', async () => {
    const result = await runShellVerifier({
      command: 'python3 -c "print(\'x\' * 2000)"',
      maxBytes: 100
    })
    expect(result.stdout.length).toBeLessThanOrEqual(100)
  })
})
