/**
 * Registers v0.1 domain-specific tools onto an MCP ToolRegistry.
 *
 * After the v0.1→v2 decoupling (Task 42), createMcpServer() no longer
 * registers v0.1 tools by default. Tests that exercise v0.1 tool behavior
 * use this helper via the `extraRegistrar` escape hatch.
 */
import type { ToolRegistry } from '../../../src/mcp/registry.js'
import { readTools } from '../../../src/mcp/tools/read.js'
import { mutateTools } from '../../../src/mcp/tools/mutate.js'
import { gateTools } from '../../../src/mcp/tools/gates.js'
import { feedbackTools } from '../../../src/mcp/tools/feedback.js'
import { metaTools } from '../../../src/mcp/tools/meta.js'

export function registerV01Tools(registry: ToolRegistry): void {
  for (const tool of readTools) registry.register(tool)
  for (const tool of mutateTools) registry.register(tool)
  for (const tool of gateTools) registry.register(tool)
  for (const tool of feedbackTools) registry.register(tool)
  for (const tool of metaTools) registry.register(tool)
}
