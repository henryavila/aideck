// @vitest-environment node
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALLOWED_HOSTS,
  hostGuard,
  hostnameFromHeader,
  isAllowedHost
} from '../../../src/server/host-guard.js'

describe('hostnameFromHeader', () => {
  it('drops the port', () => {
    expect(hostnameFromHeader('crcmg005078.bream-goldeye.ts.net:7777')).toBe('crcmg005078.bream-goldeye.ts.net')
  })
  it('handles a bare host', () => {
    expect(hostnameFromHeader('localhost')).toBe('localhost')
  })
  it('handles IPv6 literals with a port', () => {
    expect(hostnameFromHeader('[::1]:7777')).toBe('::1')
  })
  it('lowercases', () => {
    expect(hostnameFromHeader('CRCMG005078.TS.NET:80')).toBe('crcmg005078.ts.net')
  })
})

describe('isAllowedHost', () => {
  const allowed = new Set(['localhost', '100.125.243.80', 'box.bream-goldeye.ts.net'])
  it('accepts an allowed host regardless of port', () => {
    expect(isAllowedHost('box.bream-goldeye.ts.net:7777', allowed)).toBe(true)
    expect(isAllowedHost('100.125.243.80:7777', allowed)).toBe(true)
  })
  it('rejects a foreign host', () => {
    expect(isAllowedHost('evil.com', allowed)).toBe(false)
  })
})

function appWith(allowedHosts: string[]): Hono {
  const app = new Hono()
  app.use('*', hostGuard(allowedHosts))
  app.get('/x', (c) => c.text('ok'))
  return app
}

describe('hostGuard middleware', () => {
  const app = appWith(['box.bream-goldeye.ts.net', '100.125.243.80'])

  it('allows loopback hosts by default', async () => {
    for (const h of ['localhost:7777', '127.0.0.1:7777', '[::1]:7777']) {
      const res = await app.request('/x', { headers: { host: h } })
      expect(res.status, h).toBe(200)
    }
  })

  it('allows the configured tailnet name and IP', async () => {
    expect((await app.request('/x', { headers: { host: 'box.bream-goldeye.ts.net:7777' } })).status).toBe(200)
    expect((await app.request('/x', { headers: { host: '100.125.243.80:7777' } })).status).toBe(200)
  })

  it('rejects a foreign Host (DNS-rebinding vector)', async () => {
    const res = await app.request('/x', { headers: { host: 'evil.example.com' } })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('invalid_input')
  })

  it('allows a request with no Host header (non-browser client)', async () => {
    const res = await app.request('/x')
    expect(res.status).toBe(200)
  })

  it('exposes the loopback defaults', () => {
    expect(DEFAULT_ALLOWED_HOSTS).toContain('localhost')
    expect(DEFAULT_ALLOWED_HOSTS).toContain('127.0.0.1')
  })
})
