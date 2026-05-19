// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../../src/server/index.js'

describe('GET /sse', () => {
  it('streams an emitted event as a text/event-stream chunk', async () => {
    const { app, eventBus } = buildApp({
      rootDir: '/tmp',
      skipWatcher: true,
      version: 'test'
    })
    const res = await app.fetch(new Request('http://127.0.0.1/sse'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const reader = res.body!.getReader()

    // Emit an event after subscribing
    setTimeout(() => {
      eventBus.emit({ kind: 'health-tick', uptimeMs: 1 })
    }, 50)

    const decoder = new TextDecoder()
    let chunk = ''
    const start = Date.now()
    while (Date.now() - start < 2000) {
      const { value, done } = await reader.read()
      if (done) break
      chunk += decoder.decode(value, { stream: true })
      if (chunk.includes('event: health-tick')) break
    }
    await reader.cancel()
    expect(chunk).toContain('event: health-tick')
    expect(chunk).toContain('"kind":"health-tick"')
  }, 5_000)

  it('replays buffered events when Last-Event-ID is supplied', async () => {
    const { app, eventBus } = buildApp({
      rootDir: '/tmp',
      skipWatcher: true,
      version: 'test'
    })
    eventBus.emit({ kind: 'health-tick', uptimeMs: 1 })
    eventBus.emit({ kind: 'health-tick', uptimeMs: 2 })

    const res = await app.fetch(
      new Request('http://127.0.0.1/sse', { headers: { 'last-event-id': '0' } })
    )
    expect(res.status).toBe(200)
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let chunk = ''
    const start = Date.now()
    while (Date.now() - start < 1500) {
      const { value, done } = await reader.read()
      if (done) break
      chunk += decoder.decode(value, { stream: true })
      const count = chunk.match(/event: health-tick/g)?.length ?? 0
      if (count >= 2) break
    }
    await reader.cancel()
    const matches = chunk.match(/event: health-tick/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  }, 5_000)
})
