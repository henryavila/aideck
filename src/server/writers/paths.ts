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
 * Given an absolute path that lives under `<rootDir>/.atomic-skills/<consumerId>/...`,
 * returns the consumer id segment, or null if the path does not match.
 */
export function extractConsumerId(filePath: string, rootDir: string): string | null {
  const rel = relative(atomicSkillsRoot(rootDir), filePath)
  if (rel.startsWith('..') || rel === '') return null
  const head = rel.split(sep)[0]
  return head || null
}

export type EntityKind = 'plan' | 'initiative' | 'annotations-jsonl' | 'highlights-jsonl' | 'inbox-jsonl' | 'other'

/**
 * Classifies a path under a consumer root. The path may include
 * `<consumerRoot>/plans/foo.md`, `<consumerRoot>/initiatives/bar.md`, or
 * `<consumerRoot>/{annotations,highlights,inbox}/YYYY-MM-DD.jsonl`.
 */
export function classifyFile(filePath: string, rootDir: string): { consumer: string; kind: EntityKind; slug?: string } | null {
  const consumer = extractConsumerId(filePath, rootDir)
  if (!consumer) return null
  const rel = relative(consumerRoot(rootDir, consumer), filePath)
  if (rel.startsWith('..')) return null
  const parts = rel.split(sep)
  const sub = parts[0]
  const file = parts[parts.length - 1]
  switch (sub) {
    case 'plans':
      return { consumer, kind: 'plan', slug: file.replace(/\.md$/, '') }
    case 'initiatives':
      return { consumer, kind: 'initiative', slug: file.replace(/\.md$/, '') }
    case 'annotations':
      return { consumer, kind: 'annotations-jsonl' }
    case 'highlights':
      return { consumer, kind: 'highlights-jsonl' }
    case 'inbox':
      return { consumer, kind: 'inbox-jsonl' }
    default:
      return { consumer, kind: 'other' }
  }
}
