import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeShellExec } from '../../../../src/server/handlers/shell-exec.js'

let consumerDir: string

beforeEach(async () => {
  consumerDir = await mkdtemp(join(tmpdir(), 'aideck-shell-'))
})

afterEach(async () => {
  await rm(consumerDir, { recursive: true, force: true })
})

describe('executeShellExec', () => {
  it('runs a command and returns stdout', async () => {
    const decl = { type: 'shell-exec' as const, command: 'echo hello' }
    const result = await executeShellExec(consumerDir, decl, {})

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stdout.trim()).toBe('hello')
    expect(result.value.exitCode).toBe(0)
  })

  it('returns error on non-zero exit with exit code in details', async () => {
    const decl = { type: 'shell-exec' as const, command: 'exit 42' }
    const result = await executeShellExec(consumerDir, decl, {})

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('internal_error')
    expect(result.error.details?.code).toBe('shell_error')
    expect(result.error.details?.exitCode).toBe(42)
  })

  it('times out long commands', async () => {
    const decl = { type: 'shell-exec' as const, command: 'sleep 60', timeout: 500 }
    const result = await executeShellExec(consumerDir, decl, {})

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.details?.code).toBe('timeout')
  }, 5000)

  it('substitutes template vars in command', async () => {
    const decl = { type: 'shell-exec' as const, command: 'echo {{ greeting }} {{ name }}' }
    const result = await executeShellExec(consumerDir, decl, {
      greeting: 'hello',
      name: 'world',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.stdout.trim()).toBe('hello world')
  })

  it('neutralizes command injection through templated args', async () => {
    const decl = { type: 'shell-exec' as const, command: 'echo {{ name }}' }
    const result = await executeShellExec(consumerDir, decl, { name: '$(id)' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Shell-quoted: the arg is echoed literally, never command-substituted.
    expect(result.value.stdout.trim()).toBe('$(id)')
  })
})
