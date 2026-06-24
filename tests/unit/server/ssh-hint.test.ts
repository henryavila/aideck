// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SSH_PORT,
  buildSshTunnelHint,
  detectSshPort,
  formatSshTunnelHint,
  portFromSshConnection,
  portFromSshdConfig
} from '../../../src/server/expose/ssh-hint.js'

describe('portFromSshConnection', () => {
  it('reads the server port (4th field)', () => {
    expect(portFromSshConnection({ SSH_CONNECTION: '100.64.27.119 51000 100.125.243.80 2222' })).toBe(2222)
  })

  it('returns null when unset or malformed', () => {
    expect(portFromSshConnection({})).toBeNull()
    expect(portFromSshConnection({ SSH_CONNECTION: '1.2.3.4 5' })).toBeNull()
    expect(portFromSshConnection({ SSH_CONNECTION: 'a b c notaport' })).toBeNull()
  })

  it('rejects out-of-range ports', () => {
    expect(portFromSshConnection({ SSH_CONNECTION: 'c p s 99999' })).toBeNull()
    expect(portFromSshConnection({ SSH_CONNECTION: 'c p s 0' })).toBeNull()
  })
})

describe('portFromSshdConfig', () => {
  it('finds the first uncommented Port directive', () => {
    expect(portFromSshdConfig(['# managed file\nPort 2222\n'])).toBe(2222)
  })

  it('ignores commented defaults', () => {
    expect(portFromSshdConfig(['#Port 22\nPasswordAuthentication no\n'])).toBeNull()
  })

  it('is case-insensitive on the keyword', () => {
    expect(portFromSshdConfig(['port 2200\n'])).toBe(2200)
  })

  it('scans drop-in fragments in order', () => {
    expect(portFromSshdConfig(['# main, no port\n', 'Port 2020\n'])).toBe(2020)
  })

  it('does not match Port inside other tokens', () => {
    expect(portFromSshdConfig(['GatewayPorts no\nPermitRootLogin no\n'])).toBeNull()
  })
})

describe('detectSshPort — precedence', () => {
  it('prefers SSH_CONNECTION over sshd_config', () => {
    const r = detectSshPort({
      env: { SSH_CONNECTION: 'c p s 2222' },
      configTexts: ['Port 9999\n']
    })
    expect(r).toEqual({ port: 2222, source: 'ssh-connection', warnings: [] })
  })

  it('falls back to sshd_config when no SSH session', () => {
    const r = detectSshPort({ env: {}, configTexts: ['Port 2222\n'] })
    expect(r).toEqual({ port: 2222, source: 'sshd-config', warnings: [] })
  })

  it('defaults to 22 with a warning when nothing is detectable', () => {
    const r = detectSshPort({ env: {}, configTexts: ['#Port 22\n'] })
    expect(r.port).toBe(DEFAULT_SSH_PORT)
    expect(r.source).toBe('default')
    expect(r.warnings).toHaveLength(1)
  })
})

describe('formatSshTunnelHint', () => {
  it('includes -p for a non-default port', () => {
    const { command, openUrl } = formatSshTunnelHint({ localPort: 7777, sshPort: 2222, host: 'box', user: 'henry' })
    expect(command).toBe('ssh -L 7777:127.0.0.1:7777 -p 2222 henry@box')
    expect(openUrl).toBe('http://localhost:7777')
  })

  it('omits -p for the default port', () => {
    const { command } = formatSshTunnelHint({ localPort: 7420, sshPort: 22, host: 'box', user: 'henry' })
    expect(command).toBe('ssh -L 7420:127.0.0.1:7420 henry@box')
  })
})

describe('buildSshTunnelHint', () => {
  it('produces a ready-to-run command from injected sources', async () => {
    const hint = await buildSshTunnelHint({
      localPort: 7777,
      env: {},
      host: 'crcmg005078',
      user: 'henry',
      loadConfigTexts: async () => ['Port 2222\n']
    })
    expect(hint.port).toBe(2222)
    expect(hint.source).toBe('sshd-config')
    expect(hint.command).toBe('ssh -L 7777:127.0.0.1:7777 -p 2222 henry@crcmg005078')
    expect(hint.openUrl).toBe('http://localhost:7777')
    expect(hint.host).toBe('crcmg005078')
  })

  it('surfaces the default-guess warning when config has no Port', async () => {
    const hint = await buildSshTunnelHint({
      localPort: 7777,
      env: {},
      host: 'box',
      user: 'henry',
      loadConfigTexts: async () => []
    })
    expect(hint.port).toBe(DEFAULT_SSH_PORT)
    expect(hint.warnings).toHaveLength(1)
  })
})
