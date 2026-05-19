// @vitest-environment node
import { createServer, type Server } from 'node:net'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  PortInUseError,
  isPortFree,
  resolvePort
} from '../../../src/server/port-resolver.js'

const HOST = '127.0.0.1'

async function bind(port: number): Promise<Server> {
  return new Promise<Server>((resolve, reject) => {
    const s = createServer()
    s.once('error', reject)
    s.once('listening', () => resolve(s))
    s.listen(port, HOST)
  })
}

async function pickFreePort(): Promise<number> {
  const s = await bind(0)
  const port = (s.address() as { port: number }).port
  await new Promise<void>((resolve) => s.close(() => resolve()))
  return port
}

let busy: Server | null = null
afterEach(async () => {
  if (busy) {
    await new Promise<void>((r) => busy?.close(() => r()))
    busy = null
  }
})

describe('isPortFree', () => {
  it('returns true for a free port and false for a bound port', async () => {
    const free = await pickFreePort()
    expect(await isPortFree(free)).toBe(true)
    busy = await bind(free)
    expect(await isPortFree(free)).toBe(false)
  })
})

describe('resolvePort', () => {
  it('returns the explicit port when free', async () => {
    const free = await pickFreePort()
    expect(await resolvePort({ requested: free, isExplicit: true })).toBe(free)
  })

  it('throws PortInUseError when explicit port is busy', async () => {
    const free = await pickFreePort()
    busy = await bind(free)
    await expect(resolvePort({ requested: free, isExplicit: true })).rejects.toBeInstanceOf(PortInUseError)
  })

  it('walks the default range and returns the first free port', async () => {
    const first = await pickFreePort()
    busy = await bind(first)
    const otherFree = await pickFreePort()
    const got = await resolvePort({ range: [first, otherFree], isExplicit: false })
    expect(got).toBe(otherFree)
  })

  it('throws when every port in the range is busy', async () => {
    const free = await pickFreePort()
    const range = [free]
    busy = await bind(free)
    await expect(resolvePort({ range, isExplicit: false })).rejects.toBeInstanceOf(PortInUseError)
  })
})
