// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { runShutdownSequence } from '../../../src/cli/shutdown-sequence.js'

describe('runShutdownSequence', () => {
  it('removes the env file only AFTER the server has stopped', async () => {
    const calls: string[] = []
    await runShutdownSequence({
      stopExposure: async () => void calls.push('exposure'),
      stopServer: async () => void calls.push('server'),
      removeEnvFile: async () => void calls.push('env'),
    })
    expect(calls).toEqual(['exposure', 'server', 'env'])
    // The invariant the zombie violated: env-file removal must come after the
    // server is actually down — never before, or `down` loses track of an orphan.
    expect(calls.indexOf('env')).toBeGreaterThan(calls.indexOf('server'))
  })

  it('still stops the server and removes the env file if proxy teardown throws', async () => {
    const calls: string[] = []
    await runShutdownSequence({
      stopExposure: async () => {
        throw new Error('tailscale serve off failed')
      },
      stopServer: async () => void calls.push('server'),
      removeEnvFile: async () => void calls.push('env'),
    })
    expect(calls).toEqual(['server', 'env'])
  })
})
