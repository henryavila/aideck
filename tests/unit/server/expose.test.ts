// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  startExpose,
  ExposeConfigError,
  normalizeExposePort,
  normalizeRemoteBaseUrl,
  type ExecFileFn
} from '../../../src/server/expose/index.js'

const DNS = 'wsl.tailnet.ts.net'

/** Build a fake `tailscale` execFile router for the happy path, overridable per call. */
function fakeTailscale(overrides: Record<string, () => Promise<{ stdout: string; stderr: string }>> = {}): {
  execFile: ExecFileFn
  calls: string[][]
} {
  const calls: string[][] = []
  const defaults: Record<string, () => Promise<{ stdout: string; stderr: string }>> = {
    status: async () => ({ stdout: JSON.stringify({ BackendState: 'Running', Self: { DNSName: `${DNS}.` } }), stderr: '' }),
    serve: async () => ({ stdout: '', stderr: '' }),
    'serve status': async () => ({
      stdout: JSON.stringify({ Web: { [`${DNS}:8443`]: { Handlers: { '/': { Proxy: 'http://127.0.0.1:7420' } } } } }),
      stderr: ''
    }),
    'serve off': async () => ({ stdout: '', stderr: '' })
  }
  const execFile: ExecFileFn = async (cmd, args) => {
    calls.push([cmd, ...args])
    if (args[0] === 'status') return (overrides.status ?? defaults.status)()
    if (args[0] === 'serve' && args[1] === 'status') return (overrides['serve status'] ?? defaults['serve status'])()
    if (args[0] === 'serve' && args.includes('off')) return (overrides['serve off'] ?? defaults['serve off'])()
    if (args[0] === 'serve') return (overrides.serve ?? defaults.serve)()
    throw new Error(`unexpected tailscale args: ${args.join(' ')}`)
  }
  return { execFile, calls }
}

describe('startExpose — off', () => {
  it('is a no-op with no remote URL', async () => {
    const e = await startExpose({ provider: 'off', localPort: 7420 })
    expect(e.remoteUrl).toBeNull()
    expect(e.remoteHost).toBeNull()
    expect(e.warnings).toEqual([])
    await expect(e.stop()).resolves.toBeUndefined()
  })
})

describe('startExpose — external', () => {
  it('records a normalized https base and its host', async () => {
    const e = await startExpose({ provider: 'external', localPort: 7420, remoteBaseUrl: 'https://box.example.ts.net/' })
    expect(e.remoteUrl).toBe('https://box.example.ts.net')
    expect(e.remoteHost).toBe('box.example.ts.net')
  })

  it('rejects a missing remote base URL', async () => {
    await expect(startExpose({ provider: 'external', localPort: 7420 })).rejects.toBeInstanceOf(ExposeConfigError)
  })

  it('rejects a non-https base URL', async () => {
    await expect(
      startExpose({ provider: 'external', localPort: 7420, remoteBaseUrl: 'http://box.ts.net' })
    ).rejects.toBeInstanceOf(ExposeConfigError)
  })
})

describe('startExpose — tailscale', () => {
  it('resolves the tailnet URL and tears down on stop', async () => {
    const { execFile, calls } = fakeTailscale()
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBe(`https://${DNS}:8443`)
    expect(e.remoteHost).toBe(DNS)
    expect(e.warnings).toEqual([])
    // never calls funnel
    expect(calls.some((c) => c.includes('funnel'))).toBe(false)
    await e.stop()
    expect(calls.at(-1)).toEqual(['tailscale', 'serve', '--https=8443', 'off'])
  })

  it('falls back local-only when tailscale is not running', async () => {
    const { execFile } = fakeTailscale({
      status: async () => ({ stdout: JSON.stringify({ BackendState: 'Stopped' }), stderr: '' })
    })
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBeNull()
    expect(e.warnings.join(' ')).toMatch(/not running/i)
  })

  it('falls back local-only when the tailscale CLI is missing', async () => {
    const execFile: ExecFileFn = async () => { throw new Error('spawn tailscale ENOENT') }
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBeNull()
    expect(e.warnings.join(' ')).toMatch(/not available/i)
  })

  it('warns with the operator hint on access denied', async () => {
    const { execFile } = fakeTailscale({
      serve: async () => { throw new Error('Access denied: serve') }
    })
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBeNull()
    expect(e.warnings.join(' ')).toMatch(/sudo tailscale set --operator/)
  })

  it('falls back local-only when serve status shows no mapping', async () => {
    const { execFile } = fakeTailscale({
      'serve status': async () => ({ stdout: JSON.stringify({ Web: {} }), stderr: '' })
    })
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBeNull()
    expect(e.warnings.join(' ')).toMatch(/no mapping/i)
  })

  it('announces the URL but warns when serve status is unreadable', async () => {
    const { execFile } = fakeTailscale({
      'serve status': async () => { throw new Error('unknown flag --json') }
    })
    const e = await startExpose({ provider: 'tailscale', localPort: 7420, execFile })
    expect(e.remoteUrl).toBe(`https://${DNS}:8443`)
    expect(e.warnings.join(' ')).toMatch(/could not verify/i)
  })
})

describe('normalizers', () => {
  it('defaults the expose port to 8443', () => {
    expect(normalizeExposePort(undefined)).toBe(8443)
  })

  it('rejects an out-of-range expose port', () => {
    expect(() => normalizeExposePort('80')).toThrow(ExposeConfigError)
    expect(() => normalizeExposePort(70000)).toThrow(ExposeConfigError)
  })

  it('strips path/trailing slash from a remote base URL', () => {
    expect(normalizeRemoteBaseUrl('https://h.ts.net')).toBe('https://h.ts.net')
  })

  it('rejects a remote base URL with a path', () => {
    expect(() => normalizeRemoteBaseUrl('https://h.ts.net/dash')).toThrow(ExposeConfigError)
  })
})

type Stub = () => Promise<{ stdout: string; stderr: string }>

describe('startExpose — tailnet (direct bind)', () => {
  function fakeTs(overrides: { status?: Stub; ip?: Stub } = {}): ExecFileFn {
    const defaults: { status: Stub; ip: Stub } = {
      status: async () => ({ stdout: JSON.stringify({ BackendState: 'Running', Self: { DNSName: `${DNS}.` } }), stderr: '' }),
      ip: async () => ({ stdout: '100.64.0.5\nfd7a:115c::5\n', stderr: '' })
    }
    return async (_cmd, args) => {
      if (args[0] === 'status') return (overrides.status ?? defaults.status)()
      if (args[0] === 'ip') return (overrides.ip ?? defaults.ip)()
      throw new Error(`unexpected tailscale args: ${args.join(' ')}`)
    }
  }

  it('resolves name + IPv4 and returns a tailnetBind (no TLS, app port)', async () => {
    const e = await startExpose({ provider: 'tailnet', localPort: 7777, execFile: fakeTs() })
    expect(e.provider).toBe('tailnet')
    expect(e.remoteHost).toBe(DNS)
    expect(e.remoteUrl).toBe(`http://${DNS}:7777`)
    expect(e.tailnetBind).toEqual({ ip: '100.64.0.5', name: DNS })
    expect(e.warnings).toEqual([])
    await expect(e.stop()).resolves.toBeUndefined()
  })

  it('degrades to local-only when tailscale is not running', async () => {
    const e = await startExpose({
      provider: 'tailnet',
      localPort: 7777,
      execFile: fakeTs({ status: async () => ({ stdout: JSON.stringify({ BackendState: 'Stopped' }), stderr: '' }) })
    })
    expect(e.remoteUrl).toBeNull()
    expect(e.tailnetBind ?? null).toBeNull()
    expect(e.warnings.length).toBeGreaterThan(0)
  })

  it('degrades to local-only when no IPv4 is returned', async () => {
    const e = await startExpose({
      provider: 'tailnet',
      localPort: 7777,
      execFile: fakeTs({ ip: async () => ({ stdout: '\n', stderr: '' }) })
    })
    expect(e.remoteUrl).toBeNull()
    expect(e.warnings.some((w) => /ip -4/.test(w))).toBe(true)
  })
})
