import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry } from './registry.js'
import { readTools } from './tools/read.js'
import type { McpToolContext } from './types.js'

export interface McpServerOptions {
  rootDir: string
  version?: string
  extraRegistrar?: (registry: ToolRegistry) => void
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
  for (const tool of readTools) registry.register(tool)
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
