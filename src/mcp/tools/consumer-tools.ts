import { z } from 'zod'
import { ok } from '../../schemas/validators/index.js'
import { readDataSource } from '../../server/data-source-reader.js'
import { executeFileMutation } from '../../server/handlers/file-mutation.js'
import { executeShellExec } from '../../server/handlers/shell-exec.js'
import { executeScript, type ScriptSandboxOptions } from '../../server/handlers/script.js'
import { executeComposite } from '../../server/handlers/composite.js'
import type { ToolRegistry } from '../registry.js'
import type { ConsumerRegistry, RegisteredConsumer } from '../../server/consumer-registry.js'
import type { HandlerDecl, ToolDeclaration } from '../../server/manifest-schema.js'
import type { McpToolContext, McpResult } from '../types.js'

function jsonSchemaToZod(input: {
  required?: string[]
  properties: Record<string, unknown>
}): z.ZodType {
  const shape: Record<string, z.ZodType> = {}
  for (const key of Object.keys(input.properties)) {
    shape[key] = input.required?.includes(key) ? z.unknown() : z.unknown().optional()
  }
  return z.object(shape).passthrough()
}

/** A dataSource's read base: the registered repo for root:'project', else the consumer dir. */
function baseDirFor(consumer: RegisteredConsumer, ds: { root?: string }, rootDir: string): string {
  return ds.root === 'project' ? rootDir : consumer.dir
}

async function loadConsumerData(
  consumer: RegisteredConsumer,
  rootDir: string
): Promise<Map<string, unknown[]>> {
  const dataMap = new Map<string, unknown[]>()
  for (const ds of consumer.manifest.dataSources) {
    const result = await readDataSource(baseDirFor(consumer, ds, rootDir), ds)
    if (result.ok) dataMap.set(ds.id, result.value.records)
  }
  return dataMap
}

async function dispatchHandler(
  consumer: RegisteredConsumer,
  handler: HandlerDecl,
  args: Record<string, unknown>,
  rootDir: string
): Promise<McpResult<unknown>> {
  // Model A (per-launch-repo): when the consumer reads a registered repo in
  // place, handler data and intent writes target that repo (rootDir), while the
  // handler module is still loaded from the consumer dir.
  const projectScoped = consumer.manifest.dataSources.some((ds) => ds.root === 'project')
  const writeBaseDir = projectScoped ? rootDir : consumer.dir
  const sandbox: ScriptSandboxOptions = {
    dataSources: consumer.manifest.dataSources,
    writeBaseDir,
  }

  if (handler.type === 'file-mutation') {
    return executeFileMutation(writeBaseDir, handler, args)
  }
  if (handler.type === 'shell-exec') {
    return executeShellExec(writeBaseDir, handler, args)
  }
  if (handler.type === 'script') {
    const dataMap = await loadConsumerData(consumer, rootDir)
    return executeScript(consumer.dir, handler, args, dataMap, sandbox)
  }
  if (handler.type === 'composite') {
    const dataMap = await loadConsumerData(consumer, rootDir)
    return executeComposite(consumer.dir, handler, args, dataMap, sandbox)
  }
  // TypeScript exhaustiveness — handler.type is never at this point
  const exhaustive: never = handler
  return ok({ warning: `unknown handler type: ${(exhaustive as HandlerDecl).type}` })
}

function registerTool(
  registry: ToolRegistry,
  consumer: RegisteredConsumer,
  tool: ToolDeclaration
): void {
  const name = `aideck_${consumer.manifest.mcpNamespace}_${tool.name}`
  registry.register({
    name,
    description: tool.description,
    inputSchema: jsonSchemaToZod(tool.input),
    async handler(input: unknown, ctx: McpToolContext): Promise<McpResult<unknown>> {
      return dispatchHandler(consumer, tool.handler, input as Record<string, unknown>, ctx.rootDir)
    }
  })
}

export function registerConsumerTools(
  registry: ToolRegistry,
  consumers: ConsumerRegistry
): void {
  for (const consumer of consumers.list()) {
    const tools = consumer.manifest.tools ?? []
    for (const tool of tools) {
      registerTool(registry, consumer, tool)
    }
  }
}
