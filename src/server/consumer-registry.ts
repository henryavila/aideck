import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadManifest } from './manifest-loader.js'
import type { Manifest } from './manifest-schema.js'

export interface RegisteredConsumer {
  id: string
  dir: string
  manifest: Manifest
}

export interface ConsumerLoadError {
  consumerId: string
  dir: string
  message: string
}

export interface ConsumerRegistry {
  scan(): Promise<void>
  get(id: string): RegisteredConsumer | undefined
  list(): RegisteredConsumer[]
  errors(): ConsumerLoadError[]
  consumersDir(): string
}

export function createConsumerRegistry(baseDir: string): ConsumerRegistry {
  const consumersPath = join(baseDir, 'consumers')
  const registered = new Map<string, RegisteredConsumer>()
  const loadErrors: ConsumerLoadError[] = []

  return {
    consumersDir(): string {
      return consumersPath
    },

    async scan(): Promise<void> {
      registered.clear()
      loadErrors.length = 0

      let entries: string[]
      try {
        entries = await readdir(consumersPath)
      } catch {
        // consumers/ directory doesn't exist — return empty, not an error
        return
      }

      await Promise.all(
        entries.map(async (entry) => {
          const dir = join(consumersPath, entry)
          const result = await loadManifest(dir)
          if (result.ok) {
            const consumer: RegisteredConsumer = {
              id: result.value.id,
              dir,
              manifest: result.value
            }
            registered.set(result.value.id, consumer)
          } else {
            loadErrors.push({
              consumerId: entry,
              dir,
              message: result.error.message
            })
          }
        })
      )
    },

    get(id: string): RegisteredConsumer | undefined {
      return registered.get(id)
    },

    list(): RegisteredConsumer[] {
      return Array.from(registered.values())
    },

    errors(): ConsumerLoadError[] {
      return [...loadErrors]
    }
  }
}
