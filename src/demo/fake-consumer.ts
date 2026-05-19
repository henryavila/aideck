/**
 * Demo-only fake consumer.
 *
 * Tails <demoRoot>/.atomic-skills/project-status/inbox/, reads each new
 * IntentRecord, applies a best-effort mutation to the corresponding
 * plans/<slug>.md or initiatives/<slug>.md inside the demo tmp dir, then
 * appends an IntentApplication record back to the same inbox.
 *
 * This module is the ONLY place in aiDeck that writes to entity files,
 * and it intentionally lives under src/demo/ — not src/server/ — to make
 * the boundary explicit. In production, atomic-skills:project-status
 * (running outside aiDeck) does this.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import type { IntentRecord, IntentApplication } from '../schemas/common.js'
import { splitFrontmatter } from '../server/parsers/frontmatter.js'
import { appendJsonlLine } from '../server/writers/jsonl-append.js'
import { consumerRoot } from '../server/writers/paths.js'

export interface FakeConsumerOptions {
  rootDir: string
  consumerId?: string
  /** Optional logger; defaults to silent. */
  log?: (msg: string) => void
}

export interface FakeConsumer {
  start(): Promise<void>
  stop(): Promise<void>
}

export function createFakeConsumer(opts: FakeConsumerOptions): FakeConsumer {
  const consumer = opts.consumerId ?? 'project-status'
  const log = opts.log ?? (() => {})
  const inboxDir = join(consumerRoot(opts.rootDir, consumer), 'inbox')
  const seenIntentIds = new Set<string>()
  let watcher: FSWatcher | null = null
  let ready = false

  async function processFile(path: string): Promise<void> {
    let raw: string
    try {
      raw = await readFile(path, 'utf8')
    } catch (cause) {
      log(`fake-consumer: read ${path} failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      return
    }
    const lines = raw.split('\n').filter((l) => l.trim() !== '')
    for (const line of lines) {
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const obj = parsed as { kind?: string; intentId?: string }
      if (obj.kind !== 'intent' || typeof obj.intentId !== 'string') continue
      if (seenIntentIds.has(obj.intentId)) continue
      seenIntentIds.add(obj.intentId)
      const intent = parsed as IntentRecord
      const application = await applyIntent(opts.rootDir, consumer, intent, log)
      try {
        await appendJsonlLine(path, application)
      } catch (cause) {
        log(`fake-consumer: failed to record application: ${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }
  }

  return {
    async start() {
      watcher = chokidar.watch(inboxDir, {
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 30, pollInterval: 10 }
      })
      const handle = (p: string) => {
        if (p.endsWith('.jsonl')) {
          void processFile(p)
        }
      }
      watcher.on('add', handle)
      watcher.on('change', handle)
      await new Promise<void>((resolve) => {
        watcher?.once('ready', () => {
          ready = true
          resolve()
        })
      })
    },
    async stop() {
      if (watcher) {
        await watcher.close()
        watcher = null
      }
      ready = false
    }
  }
}

async function applyIntent(
  rootDir: string,
  consumer: string,
  intent: IntentRecord,
  log: (msg: string) => void
): Promise<IntentApplication> {
  const now = new Date().toISOString()
  const slug = intent.target.initiativeSlug
  if (!slug && (intent.operation !== 'mark_task_done')) {
    return baseApplication(intent.intentId, now, 'rejected', 'no initiativeSlug supplied')
  }

  const path = join(consumerRoot(rootDir, consumer), 'initiatives', `${slug}.md`)
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    return baseApplication(intent.intentId, now, 'rejected', `initiative ${slug} not readable`)
  }
  const split = splitFrontmatter(raw)
  if (!split) return baseApplication(intent.intentId, now, 'rejected', 'no frontmatter')

  const fm = parseYaml(split.frontmatter) as Record<string, unknown> | null
  if (!fm || typeof fm !== 'object') return baseApplication(intent.intentId, now, 'rejected', 'frontmatter not a mapping')

  let applied = false
  switch (intent.operation) {
    case 'mark_task_done': {
      const tasks = (fm.tasks as Array<Record<string, unknown>>) ?? []
      const target = tasks.find((t) => t.id === intent.target.taskId)
      if (target) {
        target.status = 'done'
        target.lastUpdated = now
        target.closedAt = now
        fm.tasks = tasks
        applied = true
      }
      break
    }
    case 'update_initiative_status': {
      const status = intent.args.status as string | undefined
      if (status) {
        fm.status = status
        fm.lastUpdated = now
        applied = true
      }
      break
    }
    case 'update_next_action': {
      fm.nextAction = (intent.args.nextAction as string | null | undefined) ?? null
      fm.lastUpdated = now
      applied = true
      break
    }
    case 'add_task': {
      const tasks = (fm.tasks as Array<Record<string, unknown>>) ?? []
      const id = `T-${String(tasks.length + 1).padStart(3, '0')}`
      tasks.push({
        id,
        title: (intent.args.title as string) ?? 'untitled',
        status: 'pending',
        lastUpdated: now
      })
      fm.tasks = tasks
      fm.lastUpdated = now
      applied = true
      break
    }
    case 'park_item': {
      const parked = (fm.parked as Array<Record<string, unknown>>) ?? []
      parked.push({ title: intent.args.title, surfacedAt: now, fromFrame: null })
      fm.parked = parked
      fm.lastUpdated = now
      applied = true
      break
    }
    case 'emerge_item': {
      const emerged = (fm.emerged as Array<Record<string, unknown>>) ?? []
      emerged.push({ title: intent.args.title, surfacedAt: now, promoted: false })
      fm.emerged = emerged
      fm.lastUpdated = now
      applied = true
      break
    }
    case 'push_frame': {
      const stack = (fm.stack as Array<Record<string, unknown>>) ?? []
      stack.push({
        id: stack.length + 1,
        title: intent.args.title,
        type: intent.args.type ?? 'task',
        openedAt: now
      })
      fm.stack = stack
      fm.lastUpdated = now
      applied = true
      break
    }
    case 'pop_frame': {
      const stack = (fm.stack as Array<Record<string, unknown>>) ?? []
      if (stack.length > 0) {
        stack.pop()
        fm.stack = stack
        fm.lastUpdated = now
        applied = true
      }
      break
    }
    case 'promote_parked': {
      const parked = (fm.parked as Array<Record<string, unknown>>) ?? []
      const ref = intent.args.parked
      const idx = typeof ref === 'number'
        ? ref
        : parked.findIndex((p) => p.title === ref)
      if (idx >= 0 && idx < parked.length) {
        const [removed] = parked.splice(idx, 1)
        const tasks = (fm.tasks as Array<Record<string, unknown>>) ?? []
        tasks.push({
          id: `T-${String(tasks.length + 1).padStart(3, '0')}`,
          title: removed.title,
          status: 'pending',
          lastUpdated: now
        })
        fm.parked = parked
        fm.tasks = tasks
        fm.lastUpdated = now
        applied = true
      }
      break
    }
    default:
      log(`fake-consumer: unsupported operation ${intent.operation}`)
  }

  if (!applied) {
    return baseApplication(intent.intentId, now, 'rejected', 'operation could not be applied to current state')
  }

  const newFrontmatter = stringifyYaml(fm, { indent: 2, lineWidth: 0 })
  await writeFile(path, `---\n${newFrontmatter}---\n${split.body}`)
  return baseApplication(intent.intentId, now, 'applied')
}

function baseApplication(refId: string, appliedAt: string, result: 'applied' | 'rejected', note?: string): IntentApplication {
  return {
    schemaVersion: '0.1',
    kind: 'intent_application',
    refId,
    appliedAt,
    by: 'demo:fake-consumer',
    result,
    ...(note ? { note } : {})
  }
}
