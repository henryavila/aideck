import chokidar, { type FSWatcher } from 'chokidar'
import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { EventBus } from './event-bus.js'

export interface ConsumerWatcherOptions {
  consumersDir: string
  eventBus: EventBus
  awaitWriteFinishMs?: number
  ignoreInitial?: boolean
  /** Per-consumer debounce window in ms. Rapid changes within this window are
   *  coalesced into a single `data_changed` event carrying the last file path.
   *  Set to 0 to disable. Default: 100 */
  debounceMs?: number
  /** Maximum number of files allowed in a consumer's data/ directory.
   *  Consumers exceeding this cap are skipped (not watched) and a warning is
   *  logged to stderr. Default: 5000 */
  fileCountCap?: number
}

export interface ConsumerWatcher {
  start(): Promise<void>
  ready(): Promise<void>
  stop(): Promise<void>
}

/**
 * Extracts the consumer ID and data-relative hint from an absolute file path.
 * Returns null if the file is not inside a `data/` subdirectory.
 *
 * Example:
 *   consumersDir = /home/user/.aideck/consumers
 *   filePath     = /home/user/.aideck/consumers/my-consumer/data/plans/alpha.md
 *   → { consumer: 'my-consumer', dataSourceHint: 'plans/alpha.md' }
 */
function classifyPath(
  filePath: string,
  consumersDir: string
): { consumer: string; dataSourceHint: string } | null {
  const rel = relative(consumersDir, filePath)
  // rel should be: <consumer>/data/<...rest>
  const parts = rel.split(sep)
  if (parts.length < 3) return null
  const [consumer, dataSegment, ...rest] = parts
  if (dataSegment !== 'data') return null
  if (rest.length === 0) return null
  const dataSourceHint = rest.join('/')
  return { consumer, dataSourceHint }
}

/**
 * Detects whether an absolute file path is a consumer's manifest.yaml.
 * Returns the consumer directory name if so, null otherwise.
 *
 * Example:
 *   consumersDir = /home/user/.aideck/consumers
 *   filePath     = /home/user/.aideck/consumers/my-consumer/manifest.yaml
 *   → 'my-consumer'
 */
function classifyManifestPath(
  filePath: string,
  consumersDir: string
): string | null {
  const rel = relative(consumersDir, filePath)
  const parts = rel.split(sep)
  if (parts.length !== 2) return null
  if (parts[1] !== 'manifest.yaml') return null
  return parts[0]
}

/**
 * Counts files in a consumer's `data/` directory using a single recursive
 * readdir. Returns 0 if the directory doesn't exist.
 */
export async function countDataFiles(consumerDir: string): Promise<number> {
  try {
    const entries = await readdir(join(consumerDir, 'data'), { recursive: true })
    return entries.length
  } catch {
    return 0
  }
}

/**
 * Scans the consumers directory and returns a Set of consumer IDs whose
 * `data/` directory exceeds `cap` files.
 */
async function scanCappedConsumers(
  consumersDir: string,
  cap: number
): Promise<Set<string>> {
  const capped = new Set<string>()
  let entries: string[]
  try {
    entries = await readdir(consumersDir)
  } catch {
    return capped
  }

  await Promise.all(
    entries.map(async (entry) => {
      const count = await countDataFiles(join(consumersDir, entry))
      if (count > cap) {
        process.stderr.write(
          `[aideck] consumer "${entry}" exceeds file count cap (${count} > ${cap}), skipping\n`
        )
        capped.add(entry)
      }
    })
  )

  return capped
}

export function createConsumerWatcher(opts: ConsumerWatcherOptions): ConsumerWatcher {
  const awaitMs = opts.awaitWriteFinishMs ?? 200
  const ignoreInitial = opts.ignoreInitial ?? true
  const debounceMs = opts.debounceMs ?? 100
  const fileCountCap = opts.fileCountCap ?? 5000

  let fsw: FSWatcher | null = null
  let cappedConsumers = new Set<string>()

  let readyResolver: (() => void) | null = null
  const readyPromise = new Promise<void>((resolve) => {
    readyResolver = resolve
  })

  // Per-consumer debounce state: pending timer + latest classified change
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const pendingEvents = new Map<
    string,
    { consumer: string; file: string; dataSourceHint: string }
  >()

  function flushConsumer(consumer: string): void {
    const pending = pendingEvents.get(consumer)
    if (!pending) return
    pendingEvents.delete(consumer)
    pendingTimers.delete(consumer)
    opts.eventBus.emit({
      kind: 'data_changed',
      consumer: pending.consumer,
      payload: {
        file: pending.file,
        dataSourceHint: pending.dataSourceHint
      }
    })
  }

  function handleManifestChange(filePath: string, changeType: 'add' | 'change' | 'unlink'): boolean {
    const consumer = classifyManifestPath(filePath, opts.consumersDir)
    if (!consumer) return false
    opts.eventBus.emit({
      kind: 'consumer_manifest_changed',
      consumer,
      changeType
    })
    return true
  }

  function handleChange(filePath: string, changeType: 'add' | 'change' | 'unlink'): void {
    if (handleManifestChange(filePath, changeType)) return

    const classified = classifyPath(filePath, opts.consumersDir)
    if (!classified) return

    if (cappedConsumers.has(classified.consumer)) return

    if (debounceMs <= 0) {
      opts.eventBus.emit({
        kind: 'data_changed',
        consumer: classified.consumer,
        payload: {
          file: filePath,
          dataSourceHint: classified.dataSourceHint
        }
      })
      return
    }

    // Buffer the latest change for this consumer
    pendingEvents.set(classified.consumer, {
      consumer: classified.consumer,
      file: filePath,
      dataSourceHint: classified.dataSourceHint
    })

    // Reset the timer for this consumer
    const existing = pendingTimers.get(classified.consumer)
    if (existing) clearTimeout(existing)
    pendingTimers.set(
      classified.consumer,
      setTimeout(() => flushConsumer(classified.consumer), debounceMs)
    )
  }

  function clearAllTimers(): void {
    for (const timer of pendingTimers.values()) {
      clearTimeout(timer)
    }
    pendingTimers.clear()
    pendingEvents.clear()
  }

  return {
    async start() {
      cappedConsumers = await scanCappedConsumers(opts.consumersDir, fileCountCap)

      // Watch the consumersDir itself so chokidar picks up new consumer subdirectories
      // created after startup. Filtering to data/ paths is done in the handler.
      fsw = chokidar.watch(opts.consumersDir, {
        ignoreInitial,
        awaitWriteFinish: {
          stabilityThreshold: awaitMs,
          pollInterval: Math.max(5, Math.floor(awaitMs / 4))
        }
      })
      fsw.on('add', (p) => handleChange(p, 'add'))
      fsw.on('change', (p) => handleChange(p, 'change'))
      fsw.on('unlink', (p) => handleChange(p, 'unlink'))
      fsw.on('ready', () => {
        readyResolver?.()
      })
      await readyPromise
    },
    async stop() {
      clearAllTimers()
      if (fsw) {
        await fsw.close()
        fsw = null
      }
    },
    ready() {
      return readyPromise
    }
  }
}
