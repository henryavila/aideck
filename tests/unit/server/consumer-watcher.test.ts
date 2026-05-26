import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createConsumerWatcher } from '../../../src/server/consumer-watcher.js'
import { createEventBus } from '../../../src/server/event-bus.js'
import type { DataChangedEvent, RuntimeEvent } from '../../../src/server/events/types.js'

const DELAY_MS = 600

let tmp: string
let consumersDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-consumer-watcher-'))
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

describe('createConsumerWatcher', () => {
  it('emits data_changed when a data file is created', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const consumerDataDir = join(consumersDir, 'my-consumer', 'data')
    await mkdir(consumerDataDir, { recursive: true })
    await writeFile(join(consumerDataDir, 'items.yaml'), 'key: value\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)

    const evt = dataChangedEvents.find((e) => e.consumer === 'my-consumer')
    expect(evt).toBeDefined()
    expect(evt!.payload.dataSourceHint).toBe('items.yaml')
  }, 10_000)

  it('ignores files outside data/ directories', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const consumerDir = join(consumersDir, 'my-consumer')
    await mkdir(consumerDir, { recursive: true })
    await writeFile(join(consumerDir, 'README.md'), '# readme\n')
    await writeFile(join(consumerDir, 'manifest.yaml'), 'id: my-consumer\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter((e) => e.kind === 'data_changed')
    expect(dataChangedEvents).toHaveLength(0)
  }, 10_000)

  it('emits data_changed when an existing data file is modified', async () => {
    const consumerDataDir = join(consumersDir, 'edit-consumer', 'data')
    await mkdir(consumerDataDir, { recursive: true })
    const filePath = join(consumerDataDir, 'tasks.md')
    await writeFile(filePath, '# initial\n')

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true
    })

    await watcher.start()

    await writeFile(filePath, '# modified\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)
    expect(dataChangedEvents[0].consumer).toBe('edit-consumer')
    expect(dataChangedEvents[0].payload.dataSourceHint).toBe('tasks.md')
  }, 10_000)

  it('extracts correct consumer ID and dataSourceHint for nested paths', async () => {
    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false
    })

    await watcher.start()

    const nestedDir = join(consumersDir, 'deep-consumer', 'data', 'plans')
    await mkdir(nestedDir, { recursive: true })
    await writeFile(join(nestedDir, 'alpha.md'), '# alpha plan\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)

    const evt = dataChangedEvents.find((e) => e.consumer === 'deep-consumer')
    expect(evt).toBeDefined()
    expect(evt!.payload.dataSourceHint).toBe('plans/alpha.md')
    expect(evt!.payload.file).toContain('deep-consumer')
  }, 10_000)
})
