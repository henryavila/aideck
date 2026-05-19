import { readFile } from 'node:fs/promises'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import type { ErrorResponse } from '../../schemas/common.js'
import { annotationTargetSchema } from '../../schemas/validators/common.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'
import {
  annotationsPathFor,
  consumerRoot,
  highlightsPathFor,
  inboxPathFor
} from '../writers/paths.js'
import { listConsumers } from '../projections/consumers.js'
import { buildAllForConsumer, buildForSlug } from '../projections/state.js'
import { projectInbox } from '../projections/inbox.js'
import { projectNextAction } from '../projections/next-action.js'
import { projectHelp } from '../projections/help.js'
import type { EventBus } from '../event-bus.js'
import { join } from 'node:path'

export interface ApiDeps {
  rootDir: string
  eventBus: EventBus
  startedAt: number
  version: string
  demo: boolean
}

function errResp(c: Context, e: ErrorResponse, status: number): Response {
  return c.json({ schemaVersion: '0.1', error: e }, status as Parameters<Context['json']>[1])
}

function statusFor(code: ErrorResponse['code']): number {
  switch (code) {
    case 'slug_not_found':
    case 'consumer_unknown':
    case 'path_not_found':
      return 404
    case 'invalid_input':
    case 'schema_version_mismatch':
      return 400
    case 'precondition_failed':
      return 412
    case 'io_error':
    case 'internal_error':
      return 500
  }
}

async function readBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return null
  }
}

async function nextDailyId(prefix: string, path: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10)
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file → start at 0
  }
  return `${prefix}-${day}-${String(count + 1).padStart(3, '0')}`
}

const annotationInputSchema = z.object({
  target: annotationTargetSchema,
  author: z.enum(['human', 'ai']),
  body: z.string()
})

const highlightInputSchema = z.object({
  target: annotationTargetSchema,
  reason: z.string(),
  severity: z.enum(['info', 'warn', 'critical']),
  source: z.enum(['human', 'ai'])
})

const decisionInputSchema = z.object({
  target: annotationTargetSchema,
  decision: z.enum(['approve', 'reject', 'block', 'defer']),
  reason: z.string().optional(),
  by: z.enum(['human', 'ai'])
})

const resolutionInputSchema = z.object({
  by: z.enum(['human', 'ai']).default('human'),
  note: z.string().optional()
})

const ackInputSchema = z.object({
  by: z.enum(['human', 'ai']).default('human')
})

export function createApiRouter(deps: ApiDeps): Hono {
  const app = new Hono()

  app.get('/api/health', async (c) => {
    const consumers = await listConsumers(deps.rootDir)
    return c.json({
      schemaVersion: '0.1',
      apiVersion: '0.1',
      service: 'aideck',
      version: deps.version,
      status: 'ok',
      uptimeMs: Date.now() - deps.startedAt,
      consumerCount: consumers.length,
      demo: deps.demo,
      modes: ['http', 'sse'] as const
    })
  })

  app.get('/api/consumers', async (c) => {
    const consumers = await listConsumers(deps.rootDir)
    return c.json({ schemaVersion: '0.1', consumers })
  })

  app.get('/api/state/:consumer', async (c) => {
    const id = c.req.param('consumer')
    const r = await buildAllForConsumer(deps.rootDir, id)
    if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
    return c.json({ schemaVersion: '0.1', state: r.value })
  })

  app.get('/api/state/:consumer/:slug', async (c) => {
    const id = c.req.param('consumer')
    const slug = c.req.param('slug')
    const r = await buildForSlug(deps.rootDir, id, slug)
    if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
    return c.json({ schemaVersion: '0.1', entity: r.value })
  })

  app.get('/api/help', (c) => {
    return c.json({ schemaVersion: '0.1', skills: projectHelp(deps.rootDir) })
  })

  app.get('/api/inbox', async (c) => {
    const consumer = c.req.query('consumer') || undefined
    const since = c.req.query('since') || undefined
    const limitRaw = c.req.query('limit')
    const limit = limitRaw ? Number(limitRaw) : 50
    if (Number.isNaN(limit) || limit <= 0 || limit > 500) {
      return errResp(c, { code: 'invalid_input', message: 'limit must be 1..500' }, 400)
    }
    const proj = await projectInbox(deps.rootDir, { consumer, since, limit })
    return c.json({ schemaVersion: '0.1', ...proj })
  })

  app.get('/api/next-action', async (c) => {
    const consumer = c.req.query('consumer') ?? 'project-status'
    const planSlug = c.req.query('plan') ?? undefined
    const initiativeSlug = c.req.query('initiative') ?? undefined
    const proj = await projectNextAction(deps.rootDir, { consumer, planSlug, initiativeSlug })
    return c.json({ schemaVersion: '0.1', nextAction: proj })
  })

  app.post('/api/annotate', async (c) => {
    const raw = await readBody(c)
    const parsed = annotationInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, {
        code: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'invalid annotation payload'
      }, 400)
    }
    const consumer = parsed.data.target.consumer
    const dir = consumerRoot(deps.rootDir, consumer)
    const path = annotationsPathFor(dir)
    const id = await nextDailyId('ann', path)
    const createdAt = new Date().toISOString()
    const annotation = { ...parsed.data, id, createdAt }
    await appendJsonlLine(path, annotation)
    deps.eventBus.emit({ kind: 'annotation-added', consumer, annotation })
    return c.json({ schemaVersion: '0.1', id, createdAt }, 201)
  })

  app.post('/api/highlight', async (c) => {
    const raw = await readBody(c)
    const parsed = highlightInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, {
        code: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'invalid highlight payload'
      }, 400)
    }
    const consumer = parsed.data.target.consumer
    const dir = consumerRoot(deps.rootDir, consumer)
    const path = highlightsPathFor(dir)
    const id = await nextDailyId('hl', path)
    const createdAt = new Date().toISOString()
    const highlight = { ...parsed.data, id, createdAt }
    await appendJsonlLine(path, highlight)
    deps.eventBus.emit({ kind: 'highlight-added', consumer, highlight })
    return c.json({ schemaVersion: '0.1', id, createdAt }, 201)
  })

  app.post('/api/decision', async (c) => {
    const raw = await readBody(c)
    const parsed = decisionInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, {
        code: 'invalid_input',
        message: parsed.error.issues[0]?.message ?? 'invalid decision payload'
      }, 400)
    }
    const consumer = parsed.data.target.consumer
    const dir = consumerRoot(deps.rootDir, consumer)
    const path = join(dir, 'decisions', `${new Date().toISOString().slice(0, 10)}.jsonl`)
    const id = await nextDailyId('dec', path)
    const createdAt = new Date().toISOString()
    await appendJsonlLine(path, { ...parsed.data, id, createdAt })
    return c.json({ schemaVersion: '0.1', id, createdAt }, 201)
  })

  app.post('/api/annotation/:id/resolve', async (c) => {
    const id = c.req.param('id')
    const raw = (await readBody(c)) ?? {}
    const parsed = resolutionInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, { code: 'invalid_input', message: 'invalid resolution payload' }, 400)
    }
    const consumer = c.req.query('consumer') ?? 'project-status'
    const path = inboxPathFor(consumerRoot(deps.rootDir, consumer))
    const resolution = {
      schemaVersion: '0.1' as const,
      kind: 'resolution' as const,
      refId: id,
      by: parsed.data.by,
      resolvedAt: new Date().toISOString(),
      ...(parsed.data.note ? { note: parsed.data.note } : {})
    }
    await appendJsonlLine(path, resolution)
    return c.json({ schemaVersion: '0.1', resolution }, 201)
  })

  app.post('/api/highlight/:id/acknowledge', async (c) => {
    const id = c.req.param('id')
    const raw = (await readBody(c)) ?? {}
    const parsed = ackInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, { code: 'invalid_input', message: 'invalid acknowledgement payload' }, 400)
    }
    const consumer = c.req.query('consumer') ?? 'project-status'
    const path = inboxPathFor(consumerRoot(deps.rootDir, consumer))
    const ack = {
      schemaVersion: '0.1' as const,
      kind: 'acknowledgement' as const,
      refId: id,
      by: parsed.data.by,
      acknowledgedAt: new Date().toISOString()
    }
    await appendJsonlLine(path, ack)
    return c.json({ schemaVersion: '0.1', acknowledgement: ack }, 201)
  })

  return app
}
