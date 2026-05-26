import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerRegistry } from '../../../src/server/consumer-registry.js'
import { ToolRegistry } from '../../../src/mcp/registry.js'
import { registerConsumerTools } from '../../../src/mcp/tools/consumer-tools.js'
import type { McpToolContext } from '../../../src/mcp/types.js'

// Manifest with 2 tools:
//   1. update_status — file-mutation (append)
//   2. count_items   — script (uses count-items.js fixture)
const MANIFEST_WITH_TOOLS = `
schemaVersion: '0.1'
id: tool-consumer
mcpNamespace: tool_consumer
title: Tool Consumer
dataSources:
  - id: items
    path: data/items.yaml
    format: yaml
pages:
  - slug: overview
    title: Overview
    layout: sections
    sections: []
tools:
  - name: update_status
    description: Append a status update record to the JSONL log.
    input:
      type: object
      required: [item_id, status]
      properties:
        item_id:
          type: string
        status:
          type: string
    handler:
      type: file-mutation
      target: data/status-log.jsonl
      operation: append
      record:
        item_id: '{{item_id}}'
        status: '{{status}}'
  - name: count_items
    description: Count items, optionally filtered by status.
    input:
      type: object
      properties:
        status:
          type: string
    handler:
      type: script
      source: handlers/count-items.js
`.trimStart()

// Manifest without tools — used for the "skips consumers without tools" test
const MANIFEST_NO_TOOLS = `
schemaVersion: '0.1'
id: plain-consumer
mcpNamespace: plain_consumer
title: Plain Consumer
dataSources: []
pages:
  - slug: overview
    title: Overview
    layout: sections
    sections: []
`.trimStart()

const ITEMS_YAML = `
- id: T-001
  status: active
- id: T-002
  status: done
- id: T-003
  status: active
`.trimStart()

const COUNT_ITEMS_JS = `
export default async function({ args, data }) {
  const items = data.get('items') ?? []
  const filtered = args.status
    ? items.filter(i => i.status === args.status)
    : items
  return { count: filtered.length, status: args.status ?? 'all' }
}
`

const ctx: McpToolContext = { rootDir: '', version: '0.0.0-test' }

describe('registerConsumerTools', () => {
  let baseDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'consumer-tools-'))
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  async function buildConsumerDir(id: string, manifest: string, withData = false): Promise<string> {
    const consumerDir = join(baseDir, 'consumers', id)
    const dataDir = join(consumerDir, 'data')
    const handlersDir = join(consumerDir, 'handlers')
    await mkdir(dataDir, { recursive: true })
    await mkdir(handlersDir, { recursive: true })
    await writeFile(join(consumerDir, 'manifest.yaml'), manifest, 'utf8')
    if (withData) {
      await writeFile(join(dataDir, 'items.yaml'), ITEMS_YAML, 'utf8')
      await writeFile(join(handlersDir, 'count-items.js'), COUNT_ITEMS_JS, 'utf8')
    }
    return consumerDir
  }

  it('registers tools with correct namespacing', async () => {
    await buildConsumerDir('tool-consumer', MANIFEST_WITH_TOOLS, true)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = new ToolRegistry()
    registerConsumerTools(registry, consumers)

    expect(registry.has('aideck_tool_consumer_update_status')).toBe(true)
    expect(registry.has('aideck_tool_consumer_count_items')).toBe(true)
    expect(registry.count()).toBe(2)
  })

  it('file-mutation tool works end-to-end — creates JSONL file with correct record', async () => {
    await buildConsumerDir('tool-consumer', MANIFEST_WITH_TOOLS, true)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = new ToolRegistry()
    registerConsumerTools(registry, consumers)

    const result = await registry.invoke(
      'aideck_tool_consumer_update_status',
      { item_id: 'T-001', status: 'done' },
      ctx
    )

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as { path: string }
    expect(parsed.path).toContain('status-log.jsonl')

    const contents = await readFile(parsed.path, 'utf8')
    const line = JSON.parse(contents.trim()) as Record<string, unknown>
    expect(line).toMatchObject({ item_id: 'T-001', status: 'done' })
  })

  it('script tool works end-to-end — returns correct count', async () => {
    await buildConsumerDir('tool-consumer', MANIFEST_WITH_TOOLS, true)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = new ToolRegistry()
    registerConsumerTools(registry, consumers)

    const result = await registry.invoke(
      'aideck_tool_consumer_count_items',
      { status: 'active' },
      ctx
    )

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text) as { count: number; status: string }
    expect(parsed.count).toBe(2)
    expect(parsed.status).toBe('active')
  })

  it('skips consumers without tools — no error, no tools registered', async () => {
    await buildConsumerDir('plain-consumer', MANIFEST_NO_TOOLS)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()
    const registry = new ToolRegistry()

    expect(() => registerConsumerTools(registry, consumers)).not.toThrow()
    expect(registry.count()).toBe(0)
  })
})
