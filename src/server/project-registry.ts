import { resolve, basename } from 'node:path'
import { access } from 'node:fs/promises'
import { join } from 'node:path'
import type { Watcher } from './watcher.js'

export interface ProjectEntry {
  projectId: string
  rootDir: string
  registeredAt: string
  watcher?: Watcher
}

const PROJECT_ID_RE = /^[a-z][a-z0-9-]{0,63}$/

export function deriveProjectId(rootDir: string): string {
  let id = basename(rootDir)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^[^a-z]+/, '')
    .slice(0, 64)

  if (!id) return 'project'

  return id
}

export function isValidProjectId(id: string): boolean {
  return PROJECT_ID_RE.test(id)
}

export type WatcherFactory = (projectId: string, rootDir: string) => Watcher

export interface ProjectRegistry {
  register(rootDir: string, explicitId?: string): ProjectEntry
  unregister(projectId: string): Promise<boolean>
  get(projectId: string): ProjectEntry | undefined
  getByRootDir(rootDir: string): ProjectEntry | undefined
  list(): ProjectEntry[]
  defaultProject(): ProjectEntry | undefined
  clear(): Promise<void>
  setWatcherFactory(factory: WatcherFactory): void
}

export function createProjectRegistry(): ProjectRegistry {
  const entries = new Map<string, ProjectEntry>()
  const insertionOrder: string[] = []
  let watcherFactory: WatcherFactory | null = null

  function resolveCollision(baseId: string): string {
    if (!entries.has(baseId)) return baseId
    for (let i = 2; ; i++) {
      const candidate = `${baseId}-${i}`.slice(0, 64)
      if (!entries.has(candidate)) return candidate
    }
  }

  return {
    setWatcherFactory(factory: WatcherFactory): void {
      watcherFactory = factory
    },

    register(rootDir: string, explicitId?: string): ProjectEntry {
      const canonical = resolve(rootDir)

      const existing = [...entries.values()].find((e) => e.rootDir === canonical)
      if (existing) return existing

      let baseId = explicitId ?? deriveProjectId(canonical)
      if (!isValidProjectId(baseId)) {
        baseId = deriveProjectId(canonical)
      }

      const projectId = resolveCollision(baseId)
      const watcher = watcherFactory ? watcherFactory(projectId, canonical) : undefined
      const entry: ProjectEntry = {
        projectId,
        rootDir: canonical,
        registeredAt: new Date().toISOString(),
        watcher
      }
      entries.set(projectId, entry)
      insertionOrder.push(projectId)
      return entry
    },

    async unregister(projectId: string): Promise<boolean> {
      const entry = entries.get(projectId)
      if (!entry) return false
      if (entry.watcher) {
        try { await entry.watcher.stop() } catch { /* best effort */ }
      }
      entries.delete(projectId)
      const idx = insertionOrder.indexOf(projectId)
      if (idx !== -1) insertionOrder.splice(idx, 1)
      return true
    },

    get(projectId: string): ProjectEntry | undefined {
      return entries.get(projectId)
    },

    getByRootDir(rootDir: string): ProjectEntry | undefined {
      const canonical = resolve(rootDir)
      return [...entries.values()].find((e) => e.rootDir === canonical)
    },

    list(): ProjectEntry[] {
      return insertionOrder
        .filter((id) => entries.has(id))
        .map((id) => entries.get(id)!)
    },

    defaultProject(): ProjectEntry | undefined {
      for (const id of insertionOrder) {
        const entry = entries.get(id)
        if (entry) return entry
      }
      return undefined
    },

    async clear(): Promise<void> {
      for (const entry of entries.values()) {
        if (entry.watcher) {
          try { await entry.watcher.stop() } catch { /* best effort */ }
        }
      }
      entries.clear()
      insertionOrder.length = 0
    }
  }
}

export async function validateRootDir(rootDir: string): Promise<{ ok: true; canonical: string } | { ok: false; reason: string }> {
  const canonical = resolve(rootDir)

  try {
    await access(canonical)
  } catch {
    return { ok: false, reason: `rootDir does not exist: ${canonical}` }
  }

  try {
    await access(join(canonical, '.atomic-skills'))
  } catch {
    return { ok: false, reason: `rootDir has no .atomic-skills/ directory: ${canonical}` }
  }

  return { ok: true, canonical }
}
