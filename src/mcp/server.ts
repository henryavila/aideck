import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry } from './registry.js'
import { readTools } from './tools/read.js'
import { mutateTools } from './tools/mutate.js'
import { gateTools } from './tools/gates.js'
import { feedbackTools } from './tools/feedback.js'
import { metaTools } from './tools/meta.js'
import { registerGenericTools } from './tools/generic.js'
import { registerConsumerTools } from './tools/consumer-tools.js'
import type { McpToolContext } from './types.js'
import type { ConsumerRegistry } from '../server/consumer-registry.js'

export interface McpServerOptions {
  rootDir: string
  version?: string
  extraRegistrar?: (registry: ToolRegistry) => void
  /** When provided, v2 generic + consumer-declared tools are registered alongside v0.1 tools. */
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
  for (const tool of readTools) registry.register(tool)
  for (const tool of mutateTools) registry.register(tool)
  for (const tool of gateTools) registry.register(tool)
  for (const tool of feedbackTools) registry.register(tool)
  for (const tool of metaTools) registry.register(tool)
  opts.extraRegistrar?.(registry)

  // v2 tools: generic (aideck_list_consumers, aideck_list, aideck_read, etc.)
  // and consumer-declared tools from manifest.yaml
  if (opts.consumers) {
    registerGenericTools(registry, opts.consumers, ctx.version)
    registerConsumerTools(registry, opts.consumers)
  }

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
