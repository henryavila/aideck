import { join, relative, sep } from 'node:path'

const SAFE_CONSUMER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

export class UnsafeConsumerIdError extends Error {
  constructor(consumerId: string) {
    super(`unsafe consumerId: ${JSON.stringify(consumerId)}`)
    this.name = 'UnsafeConsumerIdError'
  }
}

export function assertSafeConsumerId(consumerId: string): void {
  if (!SAFE_CONSUMER_ID.test(consumerId)) {
    throw new UnsafeConsumerIdError(consumerId)
  }
}

export function atomicSkillsRoot(rootDir: string): string {
  return join(rootDir, '.atomic-skills')
}

export function consumerRoot(rootDir: string, consumerId: string): string {
  assertSafeConsumerId(consumerId)
  return join(atomicSkillsRoot(rootDir), consumerId)
}

function isoDay(date: Date): string {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function annotationsPathFor(consumerDir: string, date: Date = new Date()): string {
  return join(consumerDir, 'annotations', `${isoDay(date)}.jsonl`)
}

export function highlightsPathFor(consumerDir: string, date: Date = new Date()): string {
  return join(consumerDir, 'highlights', `${isoDay(date)}.jsonl`)
}

export function inboxPathFor(consumerDir: string, date: Date = new Date()): string {
  return join(consumerDir, 'inbox', `${isoDay(date)}.jsonl`)
}

/**
 * The three append-only subdirectories aiDeck itself writes for every consumer
 * (Iron Law #1). These are aiDeck's universal write contract — NOT a consumer's
 * domain vocabulary — so the generic classifier may recognize them by name. All
 * other directory structure (plans, initiatives, projects, …) is consumer
 * domain and must be declared via the manifest, never hardcoded here.
 */
const UNIVERSAL_SUBDIRS = {
  annotations: 'annotations-jsonl',
  highlights: 'highlights-jsonl',
  inbox: 'inbox-jsonl'
} as const

/**
 * Given an absolute path under `<rootDir>/.atomic-skills/...`, returns the
 * consumer id taken from the first (explicit) path segment, or null if the path
 * is not within the atomic-skills root. There is no flat-layout fallback: every
 * path is attributed to the consumer named by its leading segment
 * (`.atomic-skills/<consumer>/...`).
 */
export function extractConsumerId(filePath: string, rootDir: string): string | null {
  const rel = relative(atomicSkillsRoot(rootDir), filePath)
  if (rel.startsWith('..') || rel === '') return null
  const head = rel.split(sep)[0]
  return head || null
}

export type EntityKind = 'annotations-jsonl' | 'highlights-jsonl' | 'inbox-jsonl' | 'other'

/**
 * Classifies a path inside `.atomic-skills/` for the watcher's append-only
 * event path. Only the universal `<consumer>/{annotations,highlights,inbox}/`
 * subdirectories are recognized; everything else is `kind: 'other'` (entity/
 * data files are classified by manifest globs, not here). Returns null if the
 * path is outside the atomic-skills root.
 */
export function classifyFile(
  filePath: string,
  rootDir: string
): { consumer: string; kind: EntityKind } | null {
  const relFromAtomic = relative(atomicSkillsRoot(rootDir), filePath)
  if (relFromAtomic.startsWith('..') || relFromAtomic === '') return null
  const parts = relFromAtomic.split(sep).filter((p) => p !== '')
  if (parts.length === 0) return null

  const consumer = parts[0]
  const subdir = parts[1]
  const kind = subdir ? UNIVERSAL_SUBDIRS[subdir as keyof typeof UNIVERSAL_SUBDIRS] : undefined
  return { consumer, kind: kind ?? 'other' }
}
