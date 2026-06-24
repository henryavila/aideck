// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runRestart } from '../../../src/cli/restart.js'

describe('runRestart', () => {
  it('stops the old instance before starting a new one, returning serve exit code', async () => {
    const calls: string[] = []
    const code = await runRestart({
      down: async () => {
        calls.push('down')
        return 0
      },
      serve: async () => {
        calls.push('serve')
        return -1
      },
    })
    expect(calls).toEqual(['down', 'serve'])
    expect(code).toBe(-1)
  })

  it('still starts serve even when down reports non-zero (nothing was running)', async () => {
    const calls: string[] = []
    const code = await runRestart({
      down: async () => {
        calls.push('down')
        return 1
      },
      serve: async () => {
        calls.push('serve')
        return -1
      },
    })
    expect(calls).toEqual(['down', 'serve'])
    expect(code).toBe(-1)
  })
})
