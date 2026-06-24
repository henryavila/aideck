// @vitest-environment node
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { reconcileInstance } from '../../../src/server/instance-reconcile.js'
import { lockfilePath } from '../../../src/server/lockfile.js'
import { envFilePath } from '../../../src/server/env-file.js'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'aideck-reconcile-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const healthy = async () => true
const dead = async () => false

async function writeLock(port: number, pid: number): Promise<void> {
  await writeFile(lockfilePath({ dir }), JSON.stringify({ pid, port, startedAt: new Date().toISOString() }))
}
async function writeEnv(port: number, pid: number): Promise<void> {
  await writeFile(
    envFilePath({ dir }),
    `export AIDECK_URL='http://127.0.0.1:${port}'\nexport AIDECK_PORT=${port}\nexport AIDECK_PID=${pid}\n`
  )
}
function exists(p: string): Promise<boolean> {
  return access(p).then(
    () => true,
    () => false
  )
}

describe('reconcileInstance', () => {
  it('reuses a healthy instance already serving the port', async () => {
    const d = await reconcileInstance({ port: 7777, probeHealth: healthy, lockDir: dir, envDir: dir })
    expect(d).toEqual({ action: 'reuse', url: 'http://127.0.0.1:7777' })
  })

  it('reclaims a zombie: kills the live claiming pid, clears lock + env', async () => {
    await writeLock(7777, 4242)
    await writeEnv(7777, 4242)
    const killed: Array<[number, string]> = []
    const d = await reconcileInstance({
      port: 7777,
      probeHealth: dead,
      isPidAlive: (pid) => pid === 4242,
      kill: (pid, sig) => void killed.push([pid, sig]),
      lockDir: dir,
      envDir: dir,
    })
    expect(d.action).toBe('reclaim')
    expect(killed).toEqual([[4242, 'SIGKILL']])
    expect(await exists(lockfilePath({ dir }))).toBe(false)
    expect(await exists(envFilePath({ dir }))).toBe(false)
  })

  it('reclaims a dead stale claim without killing anything', async () => {
    await writeLock(7777, 9999)
    const killed: number[] = []
    const d = await reconcileInstance({
      port: 7777,
      probeHealth: dead,
      isPidAlive: () => false,
      kill: (pid) => void killed.push(pid),
      lockDir: dir,
      envDir: dir,
    })
    expect(d.action).toBe('reclaim')
    expect(killed).toEqual([])
    expect(await exists(lockfilePath({ dir }))).toBe(false)
  })

  it('returns free when nothing claims the port and it is not serving', async () => {
    const d = await reconcileInstance({ port: 7777, probeHealth: dead, lockDir: dir, envDir: dir })
    expect(d).toEqual({ action: 'free' })
  })

  it('leaves a lock that belongs to a different port untouched', async () => {
    await writeLock(8888, 4242)
    const killed: number[] = []
    const d = await reconcileInstance({
      port: 7777,
      probeHealth: dead,
      isPidAlive: () => true,
      kill: (pid) => void killed.push(pid),
      lockDir: dir,
      envDir: dir,
    })
    expect(d).toEqual({ action: 'free' })
    expect(killed).toEqual([])
    expect(await exists(lockfilePath({ dir }))).toBe(true)
  })
})
