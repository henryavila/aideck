import { readEnvFile, removeEnvFile } from '../server/env-file.js'
import { parseUrlFromEnvContent } from './up.js'

const PROBE_TIMEOUT_MS = 3_000
const SHUTDOWN_WAIT_MS = 5_000

async function probeHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const resp = await fetch(`${url}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    return resp.ok
  } catch {
    return false
  }
}

async function requestShutdown(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const resp = await fetch(`${url}/api/shutdown`, { method: 'POST', signal: controller.signal })
    clearTimeout(timer)
    return resp.ok
  } catch {
    return false
  }
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
  if (!url) {
    stderr.write('aideck down: env file exists but contains no valid URL\n')
    await removeEnvFile()
    return 1
  }

  const alive = await probeHealth(url)
  if (!alive) {
    stderr.write(`aideck down: instance at ${url} is not responding — cleaning up env file\n`)
    await removeEnvFile()
    return 0
  }

  stdout.write(`aideck down: shutting down ${url}…\n`)
  await requestShutdown(url)

  const deadline = Date.now() + SHUTDOWN_WAIT_MS
  while (Date.now() < deadline) {
    if (!await probeHealth(url)) {
      await removeEnvFile()
      stdout.write('aideck down: stopped\n')
      return 0
    }
    await new Promise(r => setTimeout(r, 300))
  }

  stderr.write('aideck down: shutdown requested but process did not exit within 5s\n')
  return 1
}
