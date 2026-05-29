import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { readEnvFile, removeEnvFile } from '../server/env-file.js'
import type { ParsedArgs } from './args.js'

const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 10_000
const PROBE_TIMEOUT_MS = 3_000

function findProjectRoot(from: string): string {
  let dir = resolve(from)
  while (true) {
    if (existsSync(join(dir, '.atomic-skills'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return resolve(from)
    dir = parent
  }
}

function deriveProjectId(rootDir: string): string {
  let id = basename(rootDir)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, 64)
  return id || 'project'
}

async function tryRegister(url: string, rootDir: string): Promise<boolean> {
  try {
    const projectId = deriveProjectId(rootDir)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const resp = await fetch(`${url}/api/projects/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootDir, projectId }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    return resp.ok
  } catch {
    return false
  }
}

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
  const rootDir = findProjectRoot(process.cwd())
  const content = await readEnvFile()
  if (content) {
    const url = parseUrlFromEnvContent(content)
    if (url) {
      const health = await probeHealth(url)
      if (health) {
        // v2 is multi-project: register THIS project with the already-running
        // instance (idempotent) instead of restarting it. The v2 /api/health no
        // longer carries `rootDir`, so the previous rootDir-mismatch branch was
        // dead code that silently skipped registering the current project.
        if (await tryRegister(url, rootDir)) {
          stderr.write(
            `aideck up: registered "${deriveProjectId(rootDir)}" with running instance at ${url}\n`
          )
          stdout.write(`${url}\n`)
          return 0
        }
        // Registration unavailable (e.g. an older binary without
        // /api/projects/register): the server is healthy, so reuse it rather
        // than fighting over the port.
        stderr.write(
          `aideck up: running instance did not accept registration; reusing it at ${url}\n`
        )
        stdout.write(`${url}\n`)
        return 0
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
    cwd: rootDir,
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
