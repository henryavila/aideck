// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ArgError, parseCliArgs } from '../../../src/cli/args.js'

describe('parseCliArgs — expose flags', () => {
  it('defaults expose-related flags to undefined', () => {
    const parsed = parseCliArgs(['serve'])
    expect(parsed.flags.expose).toBeUndefined()
    expect(parsed.flags.exposePort).toBeUndefined()
    expect(parsed.flags.remoteBaseUrl).toBeUndefined()
  })

  it('parses --expose / --expose-port / --remote-base-url', () => {
    const parsed = parseCliArgs([
      'serve',
      '--expose=external',
      '--expose-port=9000',
      '--remote-base-url=https://box.ts.net'
    ])
    expect(parsed.flags.expose).toBe('external')
    expect(parsed.flags.exposePort).toBe('9000')
    expect(parsed.flags.remoteBaseUrl).toBe('https://box.ts.net')
  })

  it('rejects an unsupported expose provider', () => {
    expect(() => parseCliArgs(['serve', '--expose=funnel'])).toThrow(ArgError)
  })

  it('accepts --expose=ngrok', () => {
    const parsed = parseCliArgs(['serve', '--expose=ngrok'])
    expect(parsed.flags.expose).toBe('ngrok')
  })
})
