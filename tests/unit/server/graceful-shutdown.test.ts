// @vitest-environment node
import http from 'node:http'
import net from 'node:net'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { closeServerGracefully } from '../../../src/server/graceful-shutdown.js'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port))
  )
}

function connect(port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, '127.0.0.1')
    cleanups.push(() => client.destroy())
    client.once('connect', () => resolve(client))
    client.once('error', reject)
  })
}

describe('closeServerGracefully', () => {
  it('resolves promptly when there are no open connections', async () => {
    const server = http.createServer(() => {})
    await listen(server)
    const start = Date.now()
    await closeServerGracefully(server, 1000)
    expect(Date.now() - start).toBeLessThan(500)
  })

  it('resolves within the grace window when an active request is held open (naive close would hang)', async () => {
    // Handler never responds → the connection stays active; plain server.close()
    // never invokes its callback. This is the zombie-instance root cause.
    const server = http.createServer(() => {
      /* hold the connection open, never respond */
    })
    const port = await listen(server)
    const client = await connect(port)
    client.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
    await new Promise((r) => setTimeout(r, 50)) // let the server accept + route

    const start = Date.now()
    await closeServerGracefully(server, 200)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(150) // waited ~the grace window for the in-flight request
    expect(elapsed).toBeLessThan(2000) // but did NOT hang
  })

  it('force-destroys a lingering connection (client sees the socket close, not abandoned)', async () => {
    // Distinct from the timing test: proves the grace path actively TERMINATES the
    // connection. If the impl only resolved its promise without closeAllConnections,
    // the client socket would stay open and 'close' would never fire.
    const server = http.createServer(() => {
      /* never respond */
    })
    const port = await listen(server)
    const client = await connect(port)
    client.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
    await new Promise((r) => setTimeout(r, 50))

    const clientClosed = new Promise<void>((resolve) => client.once('close', () => resolve()))
    await closeServerGracefully(server, 150)
    const closedInTime = Promise.race([
      clientClosed.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
    ])
    expect(await closedInTime).toBe(true)
  })
})
