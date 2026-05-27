import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerWatcher } from '../../../src/server/consumer-watcher.js'
import { createEventBus } from '../../../src/server/event-bus.js'
import type {
  ConsumerManifestChangedEvent,
  DataChangedEvent,
  RuntimeEvent
} from '../../../src/server/events/types.js'

const DELAY_MS = 600

let tmp: string
let consumersDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-cw-manifest-'))
  consumersDir = join(tmp, 'consumers')
  await mkdir(consumersDir, { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function collectEvents(bus: ReturnType<typeof createEventBus>): RuntimeEvent[] {
  const events: RuntimeEvent[] = []
  bus.subscribe((e) => events.push(e))
  return events
}

describe('consumer watcher — manifest.yaml changes', () => {
  it('emits consumer_manifest_changed when manifest.yaml is created', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const consumerDir = join(consumersDir, 'new-consumer')
    await mkdir(consumerDir, { recursive: true })
    await writeFile(join(consumerDir, 'manifest.yaml'), 'id: new-consumer\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const manifestEvents = events.filter(
      (e): e is ConsumerManifestChangedEvent => e.kind === 'consumer_manifest_changed'
    )
    expect(manifestEvents.length).toBeGreaterThanOrEqual(1)

    const evt = manifestEvents.find((e) => e.consumer === 'new-consumer')
    expect(evt).toBeDefined()
    expect(evt!.changeType).toBe('add')
  }, 10_000)

  it('emits consumer_manifest_changed when manifest.yaml is modified', async () => {
    const consumerDir = join(consumersDir, 'existing-consumer')
    await mkdir(consumerDir, { recursive: true })
    await writeFile(join(consumerDir, 'manifest.yaml'), 'id: existing\n')

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true
    })

    await watcher.start()

    await writeFile(join(consumerDir, 'manifest.yaml'), 'id: existing-updated\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const manifestEvents = events.filter(
      (e): e is ConsumerManifestChangedEvent => e.kind === 'consumer_manifest_changed'
    )
    expect(manifestEvents.length).toBeGreaterThanOrEqual(1)

    const evt = manifestEvents.find((e) => e.consumer === 'existing-consumer')
    expect(evt).toBeDefined()
    expect(evt!.changeType).toBe('change')
  }, 10_000)

  it('emits consumer_manifest_changed with unlink when manifest.yaml is deleted', async () => {
    const consumerDir = join(consumersDir, 'remove-consumer')
    await mkdir(consumerDir, { recursive: true })
    const manifestPath = join(consumerDir, 'manifest.yaml')
    await writeFile(manifestPath, 'id: remove\n')

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true
    })

    await watcher.start()

    await unlink(manifestPath)

    await delay(DELAY_MS)
    await watcher.stop()

    const manifestEvents = events.filter(
      (e): e is ConsumerManifestChangedEvent => e.kind === 'consumer_manifest_changed'
    )
    expect(manifestEvents.length).toBeGreaterThanOrEqual(1)

    const evt = manifestEvents.find((e) => e.consumer === 'remove-consumer')
    expect(evt).toBeDefined()
    expect(evt!.changeType).toBe('unlink')
  }, 10_000)

  it('does not emit consumer_manifest_changed for non-manifest files', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const consumerDir = join(consumersDir, 'other-consumer')
    await mkdir(consumerDir, { recursive: true })
    await writeFile(join(consumerDir, 'README.md'), '# readme\n')
    await writeFile(join(consumerDir, 'config.yaml'), 'key: val\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const manifestEvents = events.filter(
      (e): e is ConsumerManifestChangedEvent => e.kind === 'consumer_manifest_changed'
    )
    expect(manifestEvents).toHaveLength(0)
  }, 10_000)

  it('manifest.yaml changes do not produce data_changed events', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const consumerDir = join(consumersDir, 'manifest-only')
    await mkdir(consumerDir, { recursive: true })
    await writeFile(join(consumerDir, 'manifest.yaml'), 'id: manifest-only\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataEvents).toHaveLength(0)
  }, 10_000)
})
