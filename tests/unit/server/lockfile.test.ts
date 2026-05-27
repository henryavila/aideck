// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  acquireLock,
  InstanceAlreadyRunningError,
  lockfilePath,
  releaseLock,
  type LockfileContent,
} from '../../../src/server/lockfile.js'

let tmp: string
beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-lock-'))
})
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('acquireLock', () => {
  it('creates a lock file with pid, port, and startedAt', async () => {
    await acquireLock({ port: 7777 }, { dir: tmp })
    const raw = await readFile(lockfilePath({ dir: tmp }), 'utf8')
    const content: LockfileContent = JSON.parse(raw)
    expect(content.pid).toBe(process.pid)
    expect(content.port).toBe(7777)
    expect(new Date(content.startedAt).getTime()).not.toBeNaN()
  })

  it('throws InstanceAlreadyRunningError when another live PID holds the lock', async () => {
    // Write a lock for our own PID (which is alive)
    const existing: LockfileContent = {
      pid: process.pid,
      port: 8888,
      startedAt: new Date().toISOString(),
    }
    await writeFile(lockfilePath({ dir: tmp }), JSON.stringify(existing), 'utf8')

    await expect(acquireLock({ port: 9999 }, { dir: tmp })).rejects.toBeInstanceOf(
      InstanceAlreadyRunningError
    )
  })

  it('overwrites a stale lock (dead PID)', async () => {
    // PID 2147483647 is extremely unlikely to be alive
    const stale: LockfileContent = {
      pid: 2147483647,
      port: 5555,
      startedAt: '2020-01-01T00:00:00.000Z',
    }
    await writeFile(lockfilePath({ dir: tmp }), JSON.stringify(stale), 'utf8')

    await acquireLock({ port: 7777 }, { dir: tmp })
    const raw = await readFile(lockfilePath({ dir: tmp }), 'utf8')
    const content: LockfileContent = JSON.parse(raw)
    expect(content.pid).toBe(process.pid)
    expect(content.port).toBe(7777)
  })

  it('overwrites a corrupt lock file', async () => {
    await writeFile(lockfilePath({ dir: tmp }), 'not-json!!!', 'utf8')

    await acquireLock({ port: 7777 }, { dir: tmp })
    const raw = await readFile(lockfilePath({ dir: tmp }), 'utf8')
    const content: LockfileContent = JSON.parse(raw)
    expect(content.pid).toBe(process.pid)
  })
})

describe('releaseLock', () => {
  it('removes the lock file', async () => {
    await acquireLock({ port: 7777 }, { dir: tmp })
    await releaseLock({ dir: tmp })
    // readFile should throw since file is gone
    await expect(readFile(lockfilePath({ dir: tmp }), 'utf8')).rejects.toThrow()
  })

  it('silently succeeds when lock file does not exist', async () => {
    await expect(releaseLock({ dir: tmp })).resolves.toBeUndefined()
  })
})

describe('lockfilePath', () => {
  it('defaults to ~/.aideck/lock when no override', () => {
    const path = lockfilePath()
    expect(path).toMatch(/\.aideck[/\\]lock$/)
  })

  it('respects the dir override', () => {
    expect(lockfilePath({ dir: '/custom/dir' })).toBe(join('/custom/dir', 'lock'))
  })
})
