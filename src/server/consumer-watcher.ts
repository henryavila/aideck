import chokidar, { type FSWatcher } from 'chokidar'
import { relative, sep } from 'node:path'
import type { EventBus } from './event-bus.js'

export interface ConsumerWatcherOptions {
  consumersDir: string
  eventBus: EventBus
  awaitWriteFinishMs?: number
  ignoreInitial?: boolean
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

export function createConsumerWatcher(opts: ConsumerWatcherOptions): ConsumerWatcher {
  const awaitMs = opts.awaitWriteFinishMs ?? 200
  const ignoreInitial = opts.ignoreInitial ?? true

  let fsw: FSWatcher | null = null

  let readyResolver: (() => void) | null = null
  const readyPromise = new Promise<void>((resolve) => {
    readyResolver = resolve
  })

  function handleChange(filePath: string): void {
    const classified = classifyPath(filePath, opts.consumersDir)
    if (!classified) return
    opts.eventBus.emit({
      kind: 'data_changed',
      consumer: classified.consumer,
      payload: {
        file: filePath,
        dataSourceHint: classified.dataSourceHint
      }
    })
  }

  return {
    async start() {
      // Watch the consumersDir itself so chokidar picks up new consumer subdirectories
      // created after startup. Filtering to data/ paths is done in the handler.
      fsw = chokidar.watch(opts.consumersDir, {
        ignoreInitial,
        awaitWriteFinish: {
          stabilityThreshold: awaitMs,
          pollInterval: Math.max(5, Math.floor(awaitMs / 4))
        }
      })
      fsw.on('add', handleChange)
      fsw.on('change', handleChange)
      fsw.on('unlink', handleChange)
      fsw.on('ready', () => {
        readyResolver?.()
      })
      await readyPromise
    },
    async stop() {
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
