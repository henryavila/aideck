/**
 * Reconcile an intended port against any pre-existing aiDeck instance BEFORE
 * binding. This is what makes `serve` resilient and idempotent (the lifecycle
 * gap behind the split-port incident — see docs/decisions.md):
 *
 *   - reuse:   a healthy aiDeck already serves the port → don't start a second
 *              process and don't move to another port; the caller reuses it.
 *   - reclaim: a stale lock/env claims the port but nothing healthy answers
 *              (a SIGTERM'd-but-undead instance, or a crashed one) → force-kill
 *              the orphan if still alive, clear the stale lock+env, take the port.
 *   - free:    nothing aiDeck-related claims the port → proceed normally (a real
 *              foreign occupant is then surfaced by the bind, not silently killed).
 */
import { promises as fs } from 'node:fs'
import { lockfilePath, releaseLock, type LockfileContent } from './lockfile.js'
import { envFilePath, readEnvFile, removeEnvFile } from './env-file.js'

export type Disposition =
  | { action: 'free' }
  | { action: 'reuse'; url: string }
  | { action: 'reclaim'; killedPid?: number; reason: string }

export interface ReconcileDeps {
  port: number
  /** Probe whether a healthy aiDeck answers at this URL. Defaults to a real HTTP probe. */
  probeHealth?: (url: string) => Promise<boolean>
  isPidAlive?: (pid: number) => boolean
  kill?: (pid: number, signal: NodeJS.Signals) => void
  /** Override the lock/env directory (tests). Defaults to ~/.aideck. */
  lockDir?: string
  envDir?: string
}

function defaultIsPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function defaultKill(pid: number, signal: NodeJS.Signals): void {
  process.kill(pid, signal)
}

export async function probeAideckHealth(url: string, timeoutMs = 2_000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const resp = await fetch(`${url}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    if (!resp.ok) return false
    const body = (await resp.json()) as { service?: string }
    return body?.service === 'aideck'
  } catch {
    return false
  }
}

interface PortClaim {
  pid?: number
  hadLock: boolean
  hadEnv: boolean
}

async function readClaim(port: number, lockDir?: string, envDir?: string): Promise<PortClaim> {
  let pid: number | undefined
  let hadLock = false
  let hadEnv = false

  try {
    const raw = await fs.readFile(lockfilePath({ dir: lockDir }), 'utf8')
    const lock = JSON.parse(raw) as LockfileContent
    if (lock.port === port) {
      hadLock = true
      pid = lock.pid
    }
  } catch {
    // no/invalid lock → no claim from the lock
  }

  const envContent = await readEnvFile({ dir: envDir })
  if (envContent) {
    const portMatch = envContent.match(/AIDECK_PORT=(\d+)/)
    if (portMatch && Number(portMatch[1]) === port) {
      hadEnv = true
      if (pid === undefined) {
        const pidMatch = envContent.match(/AIDECK_PID=(\d+)/)
        if (pidMatch) pid = Number(pidMatch[1])
      }
    }
  }

  return { pid, hadLock, hadEnv }
}

export async function reconcileInstance(deps: ReconcileDeps): Promise<Disposition> {
  const probeHealth = deps.probeHealth ?? probeAideckHealth
  const isPidAlive = deps.isPidAlive ?? defaultIsPidAlive
  const kill = deps.kill ?? defaultKill
  const url = `http://127.0.0.1:${deps.port}`

  if (await probeHealth(url)) {
    return { action: 'reuse', url }
  }

  const claim = await readClaim(deps.port, deps.lockDir, deps.envDir)
  if (claim.pid === undefined && !claim.hadLock && !claim.hadEnv) {
    return { action: 'free' }
  }

  let killedPid: number | undefined
  if (claim.pid !== undefined && isPidAlive(claim.pid)) {
    // Claims the port but isn't serving → undead. Force it down so we can take over.
    try {
      kill(claim.pid, 'SIGKILL')
      killedPid = claim.pid
    } catch {
      // race: it exited between the liveness check and the signal
    }
  }
  if (claim.hadLock) await releaseLock({ dir: deps.lockDir })
  if (claim.hadEnv) await removeEnvFile({ dir: deps.envDir })

  return {
    action: 'reclaim',
    killedPid,
    reason: killedPid !== undefined ? `killed undead pid ${killedPid}` : 'cleared stale lock/env',
  }
}
