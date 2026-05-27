import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry } from './registry.js'
import { registerGenericTools } from './tools/generic.js'
import { registerConsumerTools } from './tools/consumer-tools.js'
import type { McpToolContext } from './types.js'
import type { ConsumerRegistry } from '../server/consumer-registry.js'

export interface McpServerOptions {
  rootDir: string
  version?: string
  /** Escape hatch: caller can register additional tools (e.g. v0.1 tools for backwards compat). */
  extraRegistrar?: (registry: ToolRegistry) => void
  /** When provided, v2 generic + consumer-declared tools are registered. */
  consumers?: ConsumerRegistry
}

export interface McpBundle {
  server: Server
  registry: ToolRegistry
  ctx: McpToolContext
}

export function createMcpServer(opts: McpServerOptions): McpBundle {
  const ctx: McpToolContext = {
    rootDir: opts.rootDir,
    version: opts.version ?? '0.0.1'
  }
  const registry = new ToolRegistry()

  // v2 generic tools (agnostic) + consumer-declared tools from manifest.yaml
  if (opts.consumers) {
    registerGenericTools(registry, opts.consumers, ctx.version)
    registerConsumerTools(registry, opts.consumers)
  }

  // Optional: caller can still add v0.1 tools via extraRegistrar for backwards compat
  opts.extraRegistrar?.(registry)

  const server = new Server(
    { name: 'aideck', version: ctx.version },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.list()
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params
    const result = await registry.invoke(name, rawArgs ?? {}, ctx)
    return result as unknown as Parameters<typeof server.setRequestHandler>[1] extends never
      ? never
      : ReturnType<Parameters<typeof server.setRequestHandler<typeof CallToolRequestSchema>>[1]> extends Promise<infer R>
        ? R
        : never
  })

  return { server, registry, ctx }
}
