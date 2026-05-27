import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { EventBus } from '../server/event-bus.js'
import type { ConsumerRegistry } from '../server/consumer-registry.js'
import type { ToolRegistry } from './registry.js'
import { registerConsumerTools } from './tools/consumer-tools.js'

export interface ToolListWatcherOptions {
  server: Server
  registry: ToolRegistry
  consumers: ConsumerRegistry
  eventBus: EventBus
}

/**
 * Subscribes to `consumer_manifest_changed` events on the EventBus and:
 *   1. Re-scans the ConsumerRegistry
 *   2. Unregisters old consumer-declared tools
 *   3. Re-registers consumer-declared tools from the fresh scan
 *   4. Sends `tools/list_changed` notification via the MCP server
 *
 * Returns an unsubscribe function.
 */
export function setupToolListWatcher(opts: ToolListWatcherOptions): () => void {
  const { server, registry, consumers, eventBus } = opts

  const unsubscribe = eventBus.subscribe((event) => {
    if (event.kind !== 'consumer_manifest_changed') return

    // Fire-and-forget: rescan + re-register is async but the EventBus
    // listener is synchronous. Errors are logged to stderr.
    void handleManifestChange().catch((cause) => {
      process.stderr.write(
        `[aideck] tool-list-watcher: ${cause instanceof Error ? cause.message : String(cause)}\n`
      )
    })
  })

  async function handleManifestChange(): Promise<void> {
    // Snapshot old consumer namespaces so we can remove their tools
    const oldNamespaces = new Set(
      consumers.list().map((c) => `aideck_${c.manifest.mcpNamespace}_`)
    )

    await consumers.scan()

    // Remove tools from consumers that were previously registered
    for (const prefix of oldNamespaces) {
      registry.unregisterByPrefix(prefix)
    }

    // Re-register tools from the fresh consumer list
    registerConsumerTools(registry, consumers)

    // Notify connected MCP clients that the tool list has changed
    await server.sendToolListChanged()
  }

  return unsubscribe
}
