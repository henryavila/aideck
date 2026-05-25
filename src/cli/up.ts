import { spawn } from 'node:child_process'
import { readEnvFile, removeEnvFile } from '../server/env-file.js'
import type { ParsedArgs } from './args.js'

const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000
const PROBE_TIMEOUT_MS = 3_000

export function parseUrlFromEnvContent(content: string): string | null {
  const match = content.match(/AIDECK_URL='([^']+)'/)
  return match?.[1] ?? null
}

interface HealthResponse {
  service?: string
  rootDir?: string
  [key: string]: unknown
}

async function probeHealth(url: string): Promise<HealthResponse | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const resp = await fetch(`${url}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    if (!resp.ok) return null
    const body = await resp.json() as HealthResponse
    return body?.service === 'aideck' ? body : null
  } catch {
    return null
  }
}

async function requestShutdown(url: string): Promise<void> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    await fetch(`${url}/api/shutdown`, { method: 'POST', signal: controller.signal })
    clearTimeout(timer)
  } catch { /* best effort — process may already be gone */ }
  // Wait for port to be released
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (await probeHealth(url) === null) return
    await new Promise(r => setTimeout(r, 300))
  }
}

async function pollUntilHealthy(timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const content = await readEnvFile()
    if (content) {
      const url = parseUrlFromEnvContent(content)
      if (url && await probeHealth(url) !== null) return url
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  return null
}

export async function runUp(
  parsed: ParsedArgs,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const cwd = process.cwd()
  const content = await readEnvFile()
  if (content) {
    const url = parseUrlFromEnvContent(content)
    if (url) {
      const health = await probeHealth(url)
      if (health) {
        if (!health.rootDir || health.rootDir === cwd) {
          stdout.write(`${url}\n`)
          return 0
        }
        // rootDir mismatch — shut down old instance and start fresh
        stderr.write(
          `aideck up: rootDir mismatch (running: ${health.rootDir}, need: ${cwd}). Restarting.\n`
        )
        await requestShutdown(url)
      }
      await removeEnvFile()
    }
  }

  const args = ['serve']
  if (parsed.portExplicit && parsed.flags.port !== undefined) {
    args.push(`--port=${parsed.flags.port}`)
  }
  if (parsed.flags.staticDir) {
    args.push(`--static-dir=${parsed.flags.staticDir}`)
  }

  const child = spawn(process.execPath, [process.argv[1], ...args], {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: process.env
  })
  child.unref()

  const url = await pollUntilHealthy(POLL_TIMEOUT_MS)
  if (url) {
    stdout.write(`${url}\n`)
    return 0
  }

  stderr.write('aideck up: timed out waiting for server to become healthy\n')
  return 1
}
