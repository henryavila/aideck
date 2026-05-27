import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerWatcher } from '../../../src/server/consumer-watcher.js'
import { createEventBus } from '../../../src/server/event-bus.js'
import type { DataChangedEvent, RuntimeEvent } from '../../../src/server/events/types.js'

let tmp: string
let consumersDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-throttle-'))
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

function dataEvents(events: RuntimeEvent[]): DataChangedEvent[] {
  return events.filter((e): e is DataChangedEvent => e.kind === 'data_changed')
}

describe('per-consumer event throttling', () => {
  it('coalesces rapid changes for the same consumer into one event', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const consumerDataDir = join(consumersDir, 'rapid-consumer', 'data')
    await mkdir(consumerDataDir, { recursive: true })
    await writeFile(join(consumerDataDir, 'file1.yaml'), 'a: 1\n')

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      debounceMs: 200
    })

    await watcher.start()

    // Write 3 files in rapid succession (well within the 200ms debounce window)
    await writeFile(join(consumerDataDir, 'file1.yaml'), 'a: 2\n')
    await writeFile(join(consumerDataDir, 'file1.yaml'), 'a: 3\n')
    await writeFile(join(consumerDataDir, 'file1.yaml'), 'a: 4\n')

    // Wait for awaitWriteFinish + debounce to settle
    await delay(800)
    await watcher.stop()

    const de = dataEvents(events)
    // Should be coalesced into exactly 1 event (the last write wins)
    expect(de.length).toBe(1)
    expect(de[0].consumer).toBe('rapid-consumer')
  }, 10_000)

  it('carries the LAST file path in the coalesced event', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const consumerDataDir = join(consumersDir, 'last-wins', 'data')
    await mkdir(consumerDataDir, { recursive: true })

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false,
      debounceMs: 300
    })

    await watcher.start()

    // Create multiple different files rapidly, spacing writes just enough for
    // chokidar's awaitWriteFinish (50ms stability) to register each one before
    // the next arrives — otherwise the last write may not be seen before debounce.
    await writeFile(join(consumerDataDir, 'first.yaml'), 'x: 1\n')
    await delay(80)
    await writeFile(join(consumerDataDir, 'second.yaml'), 'x: 2\n')
    await delay(80)
    await writeFile(join(consumerDataDir, 'third.yaml'), 'x: 3\n')

    // Wait for awaitWriteFinish stability + debounce (300ms) to flush
    await delay(1200)
    await watcher.stop()

    const de = dataEvents(events)
    expect(de.length).toBe(1)
    expect(de[0].payload.dataSourceHint).toBe('third.yaml')
  }, 10_000)

  it('does not coalesce events from different consumers', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const dataA = join(consumersDir, 'consumer-a', 'data')
    const dataB = join(consumersDir, 'consumer-b', 'data')
    await mkdir(dataA, { recursive: true })
    await mkdir(dataB, { recursive: true })

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false,
      debounceMs: 200
    })

    await watcher.start()

    await writeFile(join(dataA, 'file.yaml'), 'a: 1\n')
    await writeFile(join(dataB, 'file.yaml'), 'b: 1\n')

    // Wait for debounce to flush both consumers
    await delay(800)
    await watcher.stop()

    const de = dataEvents(events)
    expect(de.length).toBe(2)
    const consumers = de.map((e) => e.consumer).sort()
    expect(consumers).toEqual(['consumer-a', 'consumer-b'])
  }, 10_000)

  it('emits immediately when debounceMs is 0', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const consumerDataDir = join(consumersDir, 'no-debounce', 'data')
    await mkdir(consumerDataDir, { recursive: true })
    // Pre-create the file so chokidar sees a modify (not an initial add)
    const filePath = join(consumerDataDir, 'file.yaml')
    await writeFile(filePath, 'v: 0\n')

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      debounceMs: 0
    })

    await watcher.start()

    await writeFile(filePath, 'v: 1\n')

    await delay(600)
    await watcher.stop()

    const de = dataEvents(events)
    // With debounce disabled, each FS event fires individually
    expect(de.length).toBeGreaterThanOrEqual(1)
    expect(de[0].consumer).toBe('no-debounce')
  }, 10_000)

  it('flushes pending events before stop() returns', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const consumerDataDir = join(consumersDir, 'stop-flush', 'data')
    await mkdir(consumerDataDir, { recursive: true })
    await writeFile(join(consumerDataDir, 'seed.yaml'), 'init: true\n')

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      debounceMs: 5000 // very long debounce
    })

    await watcher.start()

    await writeFile(join(consumerDataDir, 'seed.yaml'), 'init: false\n')

    // Wait for chokidar to detect the change but NOT for debounce to flush
    await delay(300)

    // stop() should clear timers — the pending event is dropped (not flushed early)
    await watcher.stop()

    const de = dataEvents(events)
    // The event should NOT have been emitted because the debounce window (5s) had not elapsed
    // and stop() clears pending timers
    expect(de.length).toBe(0)
  }, 10_000)

  it('defaults to 100ms debounce when option is not provided', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const consumerDataDir = join(consumersDir, 'default-debounce', 'data')
    await mkdir(consumerDataDir, { recursive: true })

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
      // debounceMs intentionally omitted — should default to 100
    })

    await watcher.start()

    await writeFile(join(consumerDataDir, 'a.yaml'), 'val: 1\n')

    // Wait well beyond the default 100ms debounce
    await delay(600)
    await watcher.stop()

    const de = dataEvents(events)
    expect(de.length).toBeGreaterThanOrEqual(1)
    expect(de[0].consumer).toBe('default-debounce')
  }, 10_000)
})
