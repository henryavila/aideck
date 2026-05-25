import { readEnvFile, removeEnvFile } from '../server/env-file.js'
import { parseUrlFromEnvContent } from './up.js'

const GRACEFUL_WAIT_MS = 5_000
const POLL_INTERVAL_MS = 200

function parsePidFromEnvContent(content: string): number | null {
  const match = content.match(/AIDECK_PID=(\d+)/)
  return match ? Number(match[1]) : null
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  return false
}

export async function runDown(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const content = await readEnvFile()
  if (!content) {
    stderr.write('aideck down: no running instance found (env file missing)\n')
    return 1
  }

  const url = parseUrlFromEnvContent(content)
  const pid = parsePidFromEnvContent(content)

  // Strategy 1: PID-based (reliable even if HTTP is hung)
  if (pid && isProcessAlive(pid)) {
    stdout.write(`aideck down: sending SIGTERM to PID ${pid}…\n`)
    try { process.kill(pid, 'SIGTERM') } catch { /* race: already gone */ }

    if (await waitForExit(pid, GRACEFUL_WAIT_MS)) {
      await removeEnvFile()
      stdout.write('aideck down: stopped\n')
      return 0
    }

    // SIGTERM didn't work — escalate to SIGKILL
    stdout.write(`aideck down: process did not exit after ${GRACEFUL_WAIT_MS / 1000}s, sending SIGKILL…\n`)
    try { process.kill(pid, 'SIGKILL') } catch { /* race */ }
    await waitForExit(pid, 2_000)
    await removeEnvFile()
    stdout.write('aideck down: killed\n')
    return 0
  }

  // Strategy 2: API-based fallback (no PID in env file — old aideck)
  if (url) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3_000)
      await fetch(`${url}/api/shutdown`, { method: 'POST', signal: controller.signal })
      clearTimeout(timer)
      stdout.write(`aideck down: shutdown requested via ${url}\n`)
    } catch {
      // API unreachable — instance probably already dead
    }
  }

  // Clean up stale env file
  await removeEnvFile()

  if (pid && !isProcessAlive(pid)) {
    stdout.write('aideck down: process already exited — cleaned up env file\n')
  } else if (!pid) {
    stdout.write('aideck down: no PID in env file — sent API shutdown and cleaned up\n')
  }

  return 0
}
