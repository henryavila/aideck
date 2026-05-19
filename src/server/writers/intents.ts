import { readFile } from 'node:fs/promises'
import type { IntentRecord, IsoTimestamp } from '../../schemas/common.js'
import { appendJsonlLine } from './jsonl-append.js'
import { inboxPathFor } from './paths.js'
import type { EventBus } from '../event-bus.js'

export interface IntentReceipt {
  intentId: string
  recordedAt: IsoTimestamp
}

export interface AppendIntentInput {
  consumerRoot: string
  consumerId: string
  operation: IntentRecord['operation']
  target: IntentRecord['target']
  args: IntentRecord['args']
  by: IntentRecord['by']
  eventBus?: EventBus
  /** Optional clock for tests; defaults to Date.now(). */
  now?: () => Date
}

async function nextDailyIntentId(path: string, day: string): Promise<string> {
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file: count stays 0
  }
  return `int-${day}-${String(count + 1).padStart(3, '0')}`
}

export async function appendIntent(input: AppendIntentInput): Promise<IntentReceipt> {
  const now = input.now ? input.now() : new Date()
  const day = now.toISOString().slice(0, 10)
  const path = inboxPathFor(input.consumerRoot, now)
  const intentId = await nextDailyIntentId(path, day)
  const recordedAt = now.toISOString()
  const intent: IntentRecord = {
    schemaVersion: '0.1',
    kind: 'intent',
    intentId,
    operation: input.operation,
    target: input.target,
    args: input.args,
    by: input.by,
    requestedAt: recordedAt
  }
  await appendJsonlLine(path, intent)
  // event-bus does not yet have an 'intent-recorded' kind; report as state-change for
  // consumers that want to observe. Keeps the event-bus type stable for v0.1.
  if (input.eventBus) {
    input.eventBus.emit({
      kind: 'state-change',
      consumer: input.consumerId,
      slug: typeof input.target.initiativeSlug === 'string'
        ? input.target.initiativeSlug
        : typeof input.target.planSlug === 'string'
          ? input.target.planSlug
          : '',
      entityKind: typeof input.target.planSlug === 'string' ? 'plan' : 'initiative',
      changeType: 'change'
    })
  }
  return { intentId, recordedAt }
}
