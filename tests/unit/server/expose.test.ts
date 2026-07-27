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

describe('startExpose — ngrok', () => {
  const PUBLIC = 'https://abc123.ngrok-free.app'
  const CONFIG_PATH = '/tmp/fake-ngrok.yml'

  function tunnelsPayload(addr = 'http://127.0.0.1:7420') {
    return {
      tunnels: [
        {
          name: 'command_line',
          public_url: PUBLIC,
          proto: 'https',
          config: { addr }
        },
        {
          name: 'command_line_http',
          public_url: 'http://abc123.ngrok-free.app',
          proto: 'http',
          config: { addr }
        }
      ]
    }
  }

  /** Ready agent: version ok + config check points at a file with authtoken. */
  function readyExecFile(): ExecFileFn {
    return async (cmd, args) => {
      if (cmd === 'ngrok' && args[0] === 'version') return { stdout: 'ngrok version 3.0.0', stderr: '' }
      if (cmd === 'ngrok' && args[0] === 'config' && args[1] === 'check') {
        return { stdout: `Valid configuration file at ${CONFIG_PATH}`, stderr: '' }
      }
      throw new Error(`unexpected exec ${cmd} ${args.join(' ')}`)
    }
  }

  function readyReadFile(): (path: string) => Promise<string> {
    return async (path) => {
      if (path === CONFIG_PATH) {
        return 'version: "3"\nagent:\n  authtoken: fake-token-value-not-logged\n'
      }
      throw new Error(`ENOENT ${path}`)
    }
  }

  function readyBase() {
    return {
      provider: 'ngrok' as const,
      localPort: 7420,
      execFile: readyExecFile(),
      readFile: readyReadFile(),
      homedir: () => '/home/test',
      platform: 'darwin' as const,
      env: {} as NodeJS.ProcessEnv,
      sleep: async () => {}
    }
  }

  it('spawns ngrok, polls the agent API, and tears down on stop', async () => {
    const killed: Array<string | number | undefined> = []
    let polls = 0
    const child = {
      pid: 4242,
      kill: (sig?: NodeJS.Signals | number) => {
        killed.push(sig)
        return true
      },
      unref: () => {}
    }
    const spawnCalls: string[][] = []
    const e = await startExpose({
      ...readyBase(),
      spawn: (cmd, args) => {
        spawnCalls.push([cmd, ...args])
        return child
      },
      fetchJson: async () => {
        polls++
        // first poll empty (agent still booting), then ready
        if (polls === 1) return { tunnels: [] }
        return tunnelsPayload()
      }
    })
    expect(e.provider).toBe('ngrok')
    expect(e.remoteUrl).toBe(PUBLIC)
    expect(e.remoteHost).toBe('abc123.ngrok-free.app')
    expect(e.warnings).toEqual([])
    expect(spawnCalls).toEqual([['ngrok', 'http', '127.0.0.1:7420']])
    await e.stop()
    // Group kill via process.kill(-pid) fails (no such group) → child.kill('SIGTERM').
    expect(killed).toContain('SIGTERM')
  })

  it('reuses an existing agent tunnel without spawning (skips readiness probe)', async () => {
    let spawned = false
    let execCalls = 0
    const e = await startExpose({
      provider: 'ngrok',
      localPort: 7420,
      execFile: async () => {
        execCalls++
        return { stdout: 'ngrok version 3.0.0', stderr: '' }
      },
      spawn: () => {
        spawned = true
        return { pid: 1, kill: () => true, unref: () => {} }
      },
      fetchJson: async () => tunnelsPayload(),
      sleep: async () => {}
    })
    expect(spawned).toBe(false)
    expect(execCalls).toBe(0) // reuse short-circuits before version/config probe
    expect(e.remoteUrl).toBe(PUBLIC)
    expect(e.warnings.join(' ')).toMatch(/reusing existing/i)
    await expect(e.stop()).resolves.toBeUndefined()
  })

  it('falls back local-only with install commands when ngrok CLI is missing', async () => {
    const e = await startExpose({
      provider: 'ngrok',
      localPort: 7420,
      platform: 'darwin',
      env: {},
      homedir: () => '/home/test',
      readFile: async () => {
        throw new Error('ENOENT')
      },
      fetchJson: async () => {
        throw new Error('ECONNREFUSED')
      },
      execFile: async () => {
        throw new Error('spawn ngrok ENOENT')
      }
    })
    expect(e.remoteUrl).toBeNull()
    const text = e.warnings.join('\n')
    expect(text).toMatch(/not installed or not on PATH/i)
    expect(text).toMatch(/brew install ngrok\/ngrok\/ngrok/)
    expect(text).toMatch(/ngrok config add-authtoken/)
    expect(text).toMatch(/dashboard\.ngrok\.com\/get-started\/your-authtoken/)
    expect(text).toMatch(/continuing local-only/)
  })

  it('falls back local-only with auth commands when authtoken is missing', async () => {
    const e = await startExpose({
      provider: 'ngrok',
      localPort: 7420,
      platform: 'darwin',
      env: {},
      homedir: () => '/home/test',
      fetchJson: async () => {
        throw new Error('ECONNREFUSED')
      },
      execFile: async (cmd, args) => {
        if (args[0] === 'version') return { stdout: 'ngrok version 3.0.0', stderr: '' }
        if (args[0] === 'config' && args[1] === 'check') {
          return { stdout: `Valid configuration file at ${CONFIG_PATH}`, stderr: '' }
        }
        throw new Error(`unexpected ${cmd} ${args.join(' ')}`)
      },
      readFile: async (path) => {
        if (path === CONFIG_PATH) return 'version: "3"\nagent:\n  # no token\n'
        throw new Error(`ENOENT ${path}`)
      }
    })
    expect(e.remoteUrl).toBeNull()
    const text = e.warnings.join('\n')
    expect(text).toMatch(/no authtoken is configured/i)
    expect(text).toMatch(/ngrok config add-authtoken <YOUR_TOKEN>/)
    expect(text).toMatch(/dashboard\.ngrok\.com\/get-started\/your-authtoken/)
    expect(text).toMatch(/ngrok config check && ngrok diagnose/)
    // Must not leak any secret-looking value
    expect(text).not.toMatch(/fake-token|authtoken:\s+\S{8,}/)
  })

  it('treats NGROK_AUTHTOKEN env as configured', async () => {
    let spawned = false
    let polls = 0
    const e = await startExpose({
      ...readyBase(),
      env: { NGROK_AUTHTOKEN: 'env-token-value' },
      // config has no token — env alone must be enough
      readFile: async () => 'version: "3"\n',
      execFile: async (cmd, args) => {
        if (args[0] === 'version') return { stdout: 'ngrok version 3.0.0', stderr: '' }
        if (args[0] === 'config') return { stdout: 'no config', stderr: '' }
        throw new Error(`unexpected ${cmd}`)
      },
      spawn: () => {
        spawned = true
        return { pid: 7, kill: () => true, unref: () => {} }
      },
      fetchJson: async () => {
        polls++
        // first call = reuse probe (empty); later = agent ready
        if (polls === 1) return { tunnels: [] }
        return tunnelsPayload()
      }
    })
    expect(spawned).toBe(true)
    expect(e.remoteUrl).toBe(PUBLIC)
  })

  it('falls back local-only with fix-up commands when the agent never publishes', async () => {
    let killed = false
    const e = await startExpose({
      ...readyBase(),
      spawn: () => ({
        pid: 99,
        kill: () => {
          killed = true
          return true
        },
        unref: () => {}
      }),
      fetchJson: async () => {
        throw new Error('ECONNREFUSED')
      }
    })
    expect(e.remoteUrl).toBeNull()
    const text = e.warnings.join('\n')
    expect(text).toMatch(/did not publish/i)
    expect(text).toMatch(/ngrok config add-authtoken/)
    expect(text).toMatch(/pkill -f/)
    expect(text).toMatch(/ngrok diagnose/)
    expect(killed).toBe(true)
  })

  it('prefers the tunnel whose config.addr matches the local port', async () => {
    const e = await startExpose({
      provider: 'ngrok',
      localPort: 7420,
      execFile: async () => ({ stdout: 'ngrok version 3.0.0', stderr: '' }),
      spawn: () => ({ pid: 1, kill: () => true, unref: () => {} }),
      fetchJson: async () => ({
        tunnels: [
          {
            public_url: 'https://wrong.ngrok-free.app',
            proto: 'https',
            config: { addr: 'http://127.0.0.1:9999' }
          },
          {
            public_url: PUBLIC,
            proto: 'https',
            config: { addr: 'http://127.0.0.1:7420' }
          }
        ]
      }),
      sleep: async () => {}
    })
    // existing tunnel match short-circuits spawn path
    expect(e.remoteUrl).toBe(PUBLIC)
  })
})

describe('ngrok setup helpers', () => {
  it('macOS install hints include brew; win32 includes winget', async () => {
    const { ngrokInstallHints, configYamlHasAuthtoken } = await import(
      '../../../src/server/expose/index.js'
    )
    expect(ngrokInstallHints('darwin').join('\n')).toMatch(/brew install/)
    expect(ngrokInstallHints('win32').join('\n')).toMatch(/winget install/)
    expect(configYamlHasAuthtoken('agent:\n  authtoken: abc\n')).toBe(true)
    expect(configYamlHasAuthtoken('agent:\n  # empty\n')).toBe(false)
    expect(configYamlHasAuthtoken('authtoken: \n')).toBe(false)
  })
})

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
