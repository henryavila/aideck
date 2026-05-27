import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ToolRegistry } from '../../../src/mcp/registry.js'
import type { McpToolContext } from '../../../src/mcp/types.js'
import { ok } from '../../../src/schemas/validators/index.js'

const ctx: McpToolContext = { rootDir: '', version: '0.0.0-test' }

function dummyTool(name: string) {
  return {
    name,
    description: `dummy tool ${name}`,
    inputSchema: z.object({}),
    handler(_input: unknown, _ctx: McpToolContext) {
      return ok({ result: name })
    }
  }
}

describe('ToolRegistry.unregisterByPrefix', () => {
  it('removes all tools matching the prefix', () => {
    const registry = new ToolRegistry()
    registry.register(dummyTool('aideck_ns1_tool_a'))
    registry.register(dummyTool('aideck_ns1_tool_b'))
    registry.register(dummyTool('aideck_ns2_tool_c'))

    expect(registry.count()).toBe(3)

    const removed = registry.unregisterByPrefix('aideck_ns1_')
    expect(removed).toBe(2)
    expect(registry.count()).toBe(1)
    expect(registry.has('aideck_ns1_tool_a')).toBe(false)
    expect(registry.has('aideck_ns1_tool_b')).toBe(false)
    expect(registry.has('aideck_ns2_tool_c')).toBe(true)
  })

  it('returns 0 when no tools match the prefix', () => {
    const registry = new ToolRegistry()
    registry.register(dummyTool('aideck_ns1_tool_a'))

    const removed = registry.unregisterByPrefix('aideck_ns_nonexistent_')
    expect(removed).toBe(0)
    expect(registry.count()).toBe(1)
  })

  it('handles empty registry without error', () => {
    const registry = new ToolRegistry()
    const removed = registry.unregisterByPrefix('aideck_ns1_')
    expect(removed).toBe(0)
  })

  it('allows re-registration of tools after unregister', () => {
    const registry = new ToolRegistry()
    registry.register(dummyTool('aideck_ns1_tool_a'))
    expect(registry.has('aideck_ns1_tool_a')).toBe(true)

    registry.unregisterByPrefix('aideck_ns1_')
    expect(registry.has('aideck_ns1_tool_a')).toBe(false)

    registry.register(dummyTool('aideck_ns1_tool_a'))
    expect(registry.has('aideck_ns1_tool_a')).toBe(true)
    expect(registry.count()).toBe(1)
  })

  it('list() reflects removals after unregisterByPrefix', () => {
    const registry = new ToolRegistry()
    registry.register(dummyTool('aideck_ns1_tool_a'))
    registry.register(dummyTool('aideck_ns2_tool_b'))

    expect(registry.list()).toHaveLength(2)

    registry.unregisterByPrefix('aideck_ns1_')
    const list = registry.list()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('aideck_ns2_tool_b')
  })

  it('invoke() returns error for unregistered tool', async () => {
    const registry = new ToolRegistry()
    registry.register(dummyTool('aideck_ns1_tool_a'))

    registry.unregisterByPrefix('aideck_ns1_')

    const result = await registry.invoke('aideck_ns1_tool_a', {}, ctx)
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text) as { error: { code: string } }
    expect(parsed.error.code).toBe('path_not_found')
  })
})
