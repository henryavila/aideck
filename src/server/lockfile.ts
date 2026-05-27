/**
 * Instance lock: prevents multiple aiDeck servers from running simultaneously.
 *
 * Lock file lives at ~/.aideck/lock and contains JSON with PID, port, and
 * start time. Stale locks (PID no longer alive) are overwritten silently.
 */
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface LockfileContent {
  pid: number
  port: number
  startedAt: string
}

export interface LockfileOverride {
  dir?: string
}

export class InstanceAlreadyRunningError extends Error {
  constructor(public readonly existing: LockfileContent) {
    super(
      `another aiDeck instance is already running (pid ${existing.pid}, port ${existing.port}, started ${existing.startedAt})`
    )
    this.name = 'InstanceAlreadyRunningError'
  }
}

export function lockfilePath(override: LockfileOverride = {}): string {
  return join(override.dir ?? join(homedir(), '.aideck'), 'lock')
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function acquireLock(
  opts: { port: number },
  override: LockfileOverride = {}
): Promise<void> {
  const path = lockfilePath(override)
  const dir = dirname(path)

  await fs.mkdir(dir, { recursive: true, mode: 0o700 })

  // Check for an existing lock
  try {
    const raw = await fs.readFile(path, 'utf8')
    const existing: LockfileContent = JSON.parse(raw)

    if (isPidAlive(existing.pid)) {
      throw new InstanceAlreadyRunningError(existing)
    }
    // Stale lock — fall through and overwrite
  } catch (err) {
    if (err instanceof InstanceAlreadyRunningError) throw err
    // File missing, unreadable, or invalid JSON — proceed to write
  }

  const content: LockfileContent = {
    pid: process.pid,
    port: opts.port,
    startedAt: new Date().toISOString(),
  }
  await fs.writeFile(path, JSON.stringify(content, null, 2) + '\n', 'utf8')
}

export async function releaseLock(override: LockfileOverride = {}): Promise<void> {
  try {
    await fs.unlink(lockfilePath(override))
  } catch {
    // Already deleted or never created — best-effort
  }
}
