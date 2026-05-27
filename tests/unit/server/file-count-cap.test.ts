import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  countDataFiles,
  createConsumerWatcher
} from '../../../src/server/consumer-watcher.js'
import { createEventBus } from '../../../src/server/event-bus.js'
import type { DataChangedEvent, RuntimeEvent } from '../../../src/server/events/types.js'

const DELAY_MS = 600

let tmp: string
let consumersDir: string

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'aideck-file-cap-'))
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

async function createDataFiles(
  consumerDir: string,
  count: number
): Promise<void> {
  const dataDir = join(consumerDir, 'data')
  await mkdir(dataDir, { recursive: true })
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      writeFile(join(dataDir, `file-${i}.yaml`), `key: value-${i}\n`)
    )
  )
}

describe('countDataFiles', () => {
  it('returns 0 for a consumer with no data/ directory', async () => {
    const consumerDir = join(consumersDir, 'no-data')
    await mkdir(consumerDir, { recursive: true })
    expect(await countDataFiles(consumerDir)).toBe(0)
  })

  it('returns 0 for an empty data/ directory', async () => {
    const consumerDir = join(consumersDir, 'empty-data')
    await mkdir(join(consumerDir, 'data'), { recursive: true })
    expect(await countDataFiles(consumerDir)).toBe(0)
  })

  it('counts flat files in data/', async () => {
    const consumerDir = join(consumersDir, 'flat')
    await createDataFiles(consumerDir, 5)
    expect(await countDataFiles(consumerDir)).toBe(5)
  })

  it('counts files recursively including subdirectories', async () => {
    const consumerDir = join(consumersDir, 'nested')
    const dataDir = join(consumerDir, 'data')
    const subDir = join(dataDir, 'plans')
    await mkdir(subDir, { recursive: true })
    await writeFile(join(dataDir, 'root.yaml'), 'key: val\n')
    await writeFile(join(subDir, 'alpha.md'), '# alpha\n')
    await writeFile(join(subDir, 'beta.md'), '# beta\n')
    // recursive readdir returns files + subdirectory names
    const count = await countDataFiles(consumerDir)
    expect(count).toBeGreaterThanOrEqual(3)
  })
})

describe('file count cap', () => {
  it('skips consumer that exceeds fileCountCap and logs warning', async () => {
    const consumerDir = join(consumersDir, 'huge-consumer')
    // Create more files than the cap
    await createDataFiles(consumerDir, 6)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: false,
      fileCountCap: 5
    })

    await watcher.start()

    // Write a new file — should be ignored because the consumer is capped
    await writeFile(
      join(consumerDir, 'data', 'new-file.yaml'),
      'key: new\n'
    )

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents).toHaveLength(0)

    // Check that a warning was logged to stderr
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('huge-consumer')
    )
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds file count cap')
    )

    stderrSpy.mockRestore()
  }, 10_000)

  it('allows consumer under the cap to emit events normally', async () => {
    const consumerDir = join(consumersDir, 'small-consumer')
    await createDataFiles(consumerDir, 3)

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      fileCountCap: 5
    })

    await watcher.start()

    await writeFile(
      join(consumerDir, 'data', 'new-file.yaml'),
      'key: new\n'
    )

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)
    expect(dataChangedEvents[0].consumer).toBe('small-consumer')
  }, 10_000)

  it('caps one consumer but allows another in the same consumers dir', async () => {
    const bigDir = join(consumersDir, 'big-consumer')
    const smallDir = join(consumersDir, 'small-consumer')
    await createDataFiles(bigDir, 6)
    await createDataFiles(smallDir, 2)

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      fileCountCap: 5
    })

    await watcher.start()

    // Write to both consumers
    await writeFile(join(bigDir, 'data', 'extra.yaml'), 'key: extra\n')
    await writeFile(join(smallDir, 'data', 'extra.yaml'), 'key: extra\n')

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )

    // Only the small consumer should have emitted events
    const consumers = dataChangedEvents.map((e) => e.consumer)
    expect(consumers).toContain('small-consumer')
    expect(consumers).not.toContain('big-consumer')

    stderrSpy.mockRestore()
  }, 10_000)

  it('uses default cap of 5000 when not specified', async () => {
    // Just ensure a consumer with a few files is not capped under default
    const consumerDir = join(consumersDir, 'normal-consumer')
    await createDataFiles(consumerDir, 10)

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true
      // no fileCountCap — should default to 5000
    })

    await watcher.start()

    await writeFile(
      join(consumerDir, 'data', 'new-file.yaml'),
      'key: new\n'
    )

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)
  }, 10_000)

  it('consumer exactly at cap is not skipped', async () => {
    const consumerDir = join(consumersDir, 'exact-cap-consumer')
    await createDataFiles(consumerDir, 5)

    const bus = createEventBus()
    const events = collectEvents(bus)

    const watcher = createConsumerWatcher({
      consumersDir,
      eventBus: bus,
      awaitWriteFinishMs: 50,
      ignoreInitial: true,
      fileCountCap: 5
    })

    await watcher.start()

    await writeFile(
      join(consumerDir, 'data', 'new-file.yaml'),
      'key: new\n'
    )

    await delay(DELAY_MS)
    await watcher.stop()

    const dataChangedEvents = events.filter(
      (e): e is DataChangedEvent => e.kind === 'data_changed'
    )
    // Exactly at cap (5 === 5), not exceeding → should still emit
    expect(dataChangedEvents.length).toBeGreaterThanOrEqual(1)
  }, 10_000)
})
