import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'
import { createMcpServer } from '../../../src/mcp/server.js'
import { setupToolListWatcher } from '../../../src/mcp/tool-list-watcher.js'
import { createConsumerRegistry } from '../../../src/server/consumer-registry.js'
import { createEventBus } from '../../../src/server/event-bus.js'

const MANIFEST_ALPHA = `
schemaVersion: '0.1'
id: alpha
mcpNamespace: alpha
title: Alpha Consumer
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
  - name: get_items
    description: Get all items.
    input:
      type: object
      properties: {}
    handler:
      type: script
      source: handlers/get-items.js
`.trimStart()

const MANIFEST_BETA = `
schemaVersion: '0.1'
id: beta
mcpNamespace: beta
title: Beta Consumer
dataSources: []
pages:
  - slug: main
    title: Main
    layout: sections
    sections: []
tools:
  - name: do_thing
    description: Do a thing.
    input:
      type: object
      properties: {}
    handler:
      type: script
      source: handlers/do-thing.js
`.trimStart()

describe('setupToolListWatcher', () => {
  let baseDir: string
  let consumersDir: string

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'tool-list-watcher-'))
    consumersDir = join(baseDir, 'consumers')
    await mkdir(consumersDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true })
  })

  async function makeConsumer(id: string, manifest: string): Promise<void> {
    const dir = join(consumersDir, id)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'manifest.yaml'), manifest, 'utf8')
  }

  it('sends tools/list_changed notification when consumer is added', async () => {
    // Start with alpha only
    await makeConsumer('alpha', MANIFEST_ALPHA)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const bundle = createMcpServer({ rootDir: baseDir, consumers })
    const eventBus = createEventBus()

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0' }, { capabilities: {} })
    await Promise.all([bundle.server.connect(serverTransport), client.connect(clientTransport)])

    const notifications: string[] = []
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      notifications.push('tools_list_changed')
    })

    const unsubscribe = setupToolListWatcher({
      server: bundle.server,
      registry: bundle.registry,
      consumers,
      eventBus
    })

    // Initially only alpha's tools
    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(true)
    expect(bundle.registry.has('aideck_beta_do_thing')).toBe(false)

    // Add beta consumer on disk
    await makeConsumer('beta', MANIFEST_BETA)

    // Emit the event that the watcher would emit
    eventBus.emit({
      kind: 'consumer_manifest_changed',
      consumer: 'beta',
      changeType: 'add'
    })

    // Wait for async rescan to complete
    await vi.waitFor(() => {
      expect(bundle.registry.has('aideck_beta_do_thing')).toBe(true)
    }, { timeout: 2000 })

    // Alpha tools should still be present
    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(true)

    // Client should have received the notification
    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1)
    }, { timeout: 2000 })

    unsubscribe()
    await client.close()
    await bundle.server.close()
  })

  it('removes tools when consumer is unlinked and notifies', async () => {
    await makeConsumer('alpha', MANIFEST_ALPHA)
    await makeConsumer('beta', MANIFEST_BETA)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const bundle = createMcpServer({ rootDir: baseDir, consumers })
    const eventBus = createEventBus()

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0' }, { capabilities: {} })
    await Promise.all([bundle.server.connect(serverTransport), client.connect(clientTransport)])

    const notifications: string[] = []
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      notifications.push('tools_list_changed')
    })

    const unsubscribe = setupToolListWatcher({
      server: bundle.server,
      registry: bundle.registry,
      consumers,
      eventBus
    })

    // Both present initially
    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(true)
    expect(bundle.registry.has('aideck_beta_do_thing')).toBe(true)

    // Remove beta from disk
    await rm(join(consumersDir, 'beta'), { recursive: true, force: true })

    // Emit unlink event
    eventBus.emit({
      kind: 'consumer_manifest_changed',
      consumer: 'beta',
      changeType: 'unlink'
    })

    // Wait for async rescan
    await vi.waitFor(() => {
      expect(bundle.registry.has('aideck_beta_do_thing')).toBe(false)
    }, { timeout: 2000 })

    // Alpha tools should still be present
    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(true)

    // Client should have received the notification
    await vi.waitFor(() => {
      expect(notifications).toHaveLength(1)
    }, { timeout: 2000 })

    unsubscribe()
    await client.close()
    await bundle.server.close()
  })

  it('updated consumer tools reflect in list after change event', async () => {
    await makeConsumer('alpha', MANIFEST_ALPHA)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const bundle = createMcpServer({ rootDir: baseDir, consumers })
    const eventBus = createEventBus()

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0' }, { capabilities: {} })
    await Promise.all([bundle.server.connect(serverTransport), client.connect(clientTransport)])

    const unsubscribe = setupToolListWatcher({
      server: bundle.server,
      registry: bundle.registry,
      consumers,
      eventBus
    })

    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(true)

    // Update alpha's manifest with different tools
    const UPDATED_MANIFEST = `
schemaVersion: '0.1'
id: alpha
mcpNamespace: alpha
title: Alpha Consumer Updated
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
  - name: get_updated_items
    description: Get updated items.
    input:
      type: object
      properties: {}
    handler:
      type: script
      source: handlers/get-items.js
`.trimStart()
    await writeFile(join(consumersDir, 'alpha', 'manifest.yaml'), UPDATED_MANIFEST, 'utf8')

    eventBus.emit({
      kind: 'consumer_manifest_changed',
      consumer: 'alpha',
      changeType: 'change'
    })

    await vi.waitFor(() => {
      expect(bundle.registry.has('aideck_alpha_get_updated_items')).toBe(true)
    }, { timeout: 2000 })

    // Old tool name should be gone
    expect(bundle.registry.has('aideck_alpha_get_items')).toBe(false)

    unsubscribe()
    await client.close()
    await bundle.server.close()
  })

  it('unsubscribe stops reacting to events', async () => {
    await makeConsumer('alpha', MANIFEST_ALPHA)

    const consumers = createConsumerRegistry(baseDir)
    await consumers.scan()

    const bundle = createMcpServer({ rootDir: baseDir, consumers })
    const eventBus = createEventBus()

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'test', version: '0' }, { capabilities: {} })
    await Promise.all([bundle.server.connect(serverTransport), client.connect(clientTransport)])

    const notifications: string[] = []
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      notifications.push('tools_list_changed')
    })

    const unsubscribe = setupToolListWatcher({
      server: bundle.server,
      registry: bundle.registry,
      consumers,
      eventBus
    })

    // Unsubscribe immediately
    unsubscribe()

    // Add beta and emit event
    await makeConsumer('beta', MANIFEST_BETA)
    eventBus.emit({
      kind: 'consumer_manifest_changed',
      consumer: 'beta',
      changeType: 'add'
    })

    // Give some time for any async work
    await new Promise((r) => setTimeout(r, 200))

    // Beta should NOT have been registered since we unsubscribed
    expect(bundle.registry.has('aideck_beta_do_thing')).toBe(false)
    expect(notifications).toHaveLength(0)

    await client.close()
    await bundle.server.close()
  })
})
