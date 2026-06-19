// @vitest-environment node
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { corsMiddleware } from '../../../src/server/cors.js'

function appWith(remoteHost?: string): Hono {
  const app = new Hono()
  app.use('*', corsMiddleware(remoteHost))
  app.get('/x', (c) => c.text('ok'))
  return app
}

describe('corsMiddleware', () => {
  it('allows localhost origins by default', async () => {
    const res = await appWith().request('/x', { headers: { origin: 'http://localhost:5173' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('rejects a foreign origin when no remote host is configured', async () => {
    const res = await appWith().request('/x', { headers: { origin: 'https://box.ts.net' } })
    expect(res.status).toBe(403)
  })

  it('allows the configured remote host origin', async () => {
    const res = await appWith('box.ts.net').request('/x', { headers: { origin: 'https://box.ts.net' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://box.ts.net')
  })

  it('still rejects other origins even when a remote host is configured', async () => {
    const res = await appWith('box.ts.net').request('/x', { headers: { origin: 'https://evil.example.com' } })
    expect(res.status).toBe(403)
  })

  it('allows requests with no Origin header', async () => {
    const res = await appWith('box.ts.net').request('/x')
    expect(res.status).toBe(200)
  })
})
