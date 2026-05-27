// @vitest-environment node
/**
 * Real-stdio smoke for `aideck mcp`.
 *
 * Spawns the CLI subcommand the way Claude Code/Cursor actually launch it
 * (child process over stdio, no in-memory transport), and verifies a full
 * JSON-RPC handshake: initialize → tools/list → a couple of tool calls.
 *
 * This catches regressions the InMemoryTransport-based suites can miss:
 * - tsx loader / ESM import path resolution under subprocess
 * - stdout pollution (any unexpected log breaks NDJSON framing)
 * - CLI arg parsing for `aideck mcp`
 * - process startup/teardown
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const REPO_ROOT = resolve(process.cwd())
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const CLI_ENTRY = join(REPO_ROOT, 'src', 'cli.ts')

const PLAN = `---
schemaVersion: '0.1'
slug: stdio-plan
title: 'stdio plan'
version: '1.0'
status: active
started: '2026-01-01T00:00:00Z'
lastUpdated: '2026-01-01T00:00:00Z'
currentPhase: F0
parallelismAllowed: false
phases: []
---
# body
`

let tmp: string
let client: Client
let transport: StdioClientTransport

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-stdio-'))
  const consumerDir = join(tmp, '.atomic-skills', 'project-status')
  await mkdir(join(consumerDir, 'plans'), { recursive: true })
  await writeFile(join(consumerDir, 'plans/stdio-plan.md'), PLAN)

  transport = new StdioClientTransport({
    command: TSX,
    args: [CLI_ENTRY, 'mcp'],
    // Run subprocess from the tmpdir so `aideck mcp` uses it as rootDir.
    cwd: tmp,
    // Suppress noise from tsx's deprecation warnings on stderr.
    stderr: 'ignore'
  })
  client = new Client({ name: 'stdio-smoke', version: '0' }, { capabilities: {} })
  await client.connect(transport)
})

afterEach(async () => {
  try { await client?.close() } catch { /* swallow */ }
  await rm(tmp, { recursive: true, force: true })
})

describe('aideck mcp — real stdio subprocess', () => {
  it('completes initialize + tools/list with at least 24 aideck_ tools', async () => {
    const list = await client.listTools()
    // 24 v0.1 tools + v2 generic tools (aideck_list, aideck_read, aideck_write)
    // when ~/.aideck/consumers/ has entries; exact count depends on environment
    expect(list.tools.length).toBeGreaterThanOrEqual(24)
    for (const t of list.tools) {
      expect(t.name).toMatch(/^aideck_/)
      expect(typeof t.description).toBe('string')
      expect((t.inputSchema as { type?: string }).type).toBe('object')
    }
  }, 15_000)

  it('aideck_schema_version answers via stdio', async () => {
    const res = await client.callTool({ name: 'aideck_schema_version', arguments: {} })
    const body = JSON.parse((res.content as Array<{ text: string }>)[0].text) as {
      schemaVersion: string
      toolCount: number
    }
    expect(body.schemaVersion).toBe('0.1')
    expect(body.toolCount).toBe(24)
  }, 15_000)

  it('aideck_get_plan reads the seeded plan over stdio', async () => {
    const res = await client.callTool({
      name: 'aideck_get_plan',
      arguments: { consumer: 'project-status', slug: 'stdio-plan' }
    })
    const body = JSON.parse((res.content as Array<{ text: string }>)[0].text) as { slug: string }
    expect(body.slug).toBe('stdio-plan')
  }, 15_000)
})
