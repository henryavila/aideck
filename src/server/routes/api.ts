import { randomUUID } from 'node:crypto'
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
  inboxPathFor,
  UnsafeConsumerIdError
} from '../writers/paths.js'
import { listConsumers } from '../projections/consumers.js'
import { buildDiscoverState, hasDiscoverRun } from '../projections/discover.js'
import { buildAllForConsumer, buildForSlug } from '../projections/state.js'
import { projectInbox } from '../projections/inbox.js'
import { projectNextAction } from '../projections/next-action.js'
import { projectHelp } from '../projections/help.js'
import type { EventBus } from '../event-bus.js'
import type { ProjectRegistry } from '../project-registry.js'
import { validateRootDir } from '../project-registry.js'

export interface ApiDeps {
  rootDir: string
  eventBus: EventBus
  startedAt: number
  version: string
  demo: boolean
  registry: ProjectRegistry
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
    case 'validation_error':
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

function nextDailyId(prefix: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `${prefix}-${day}-${randomUUID().slice(0, 8)}`
}

const annotationInputSchema = z
  .object({
    target: annotationTargetSchema,
    author: z.enum(['human', 'ai']),
    body: z.string()
  })
  .strict()

const highlightInputSchema = z
  .object({
    target: annotationTargetSchema,
    reason: z.string(),
    severity: z.enum(['info', 'warn', 'critical']),
    source: z.enum(['human', 'ai'])
  })
  .strict()

const decisionInputSchema = z
  .object({
    target: annotationTargetSchema,
    decision: z.enum(['approve', 'reject', 'block', 'defer']),
    reason: z.string().optional(),
    by: z.enum(['human', 'ai'])
  })
  .strict()

const resolutionInputSchema = z
  .object({
    by: z.enum(['human', 'ai']).default('human'),
    note: z.string().optional()
  })
  .strict()

const ackInputSchema = z
  .object({
    by: z.enum(['human', 'ai']).default('human')
  })
  .strict()

export function createApiRouter(deps: ApiDeps): Hono {
  const app = new Hono()

  app.get('/api/health', async (c) => {
    const consumers = await listConsumers(deps.rootDir)
    const projects = deps.registry.list().map(({ watcher: _w, ...p }) => p)
    return c.json({
      schemaVersion: '0.1',
      apiVersion: '0.1',
      service: 'aideck',
      version: deps.version,
      status: 'ok',
      uptimeMs: Date.now() - deps.startedAt,
      consumerCount: consumers.length,
      demo: deps.demo,
      modes: ['http', 'sse'] as const,
      rootDir: deps.rootDir,
      projects
    })
  })

  app.post('/api/shutdown', (c) => {
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 100)
    return c.json({ schemaVersion: '0.1', status: 'shutting-down' })
  })

  app.get('/api/consumers', async (c) => {
    const consumers = await listConsumers(deps.rootDir)
    return c.json({ schemaVersion: '0.1', consumers })
  })

  // ─── Project-scoped state routes ───────────────────────────────────────

  app.get('/api/projects/:projectId/state/:consumer', async (c) => {
    const projectId = c.req.param('projectId')
    const consumer = c.req.param('consumer')
    const project = deps.registry.get(projectId)
    if (!project) {
      return errResp(c, { code: 'path_not_found', message: `project ${projectId} not registered` }, 404)
    }
    if (hasDiscoverRun(project.rootDir, consumer)) {
      const r = await buildDiscoverState(project.rootDir, consumer)
      if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
      return c.json({ schemaVersion: '0.1', state: r.value })
    }
    const r = await buildAllForConsumer(project.rootDir, consumer)
    if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
    return c.json({ schemaVersion: '0.1', state: r.value })
  })

  app.get('/api/projects/:projectId/state/:consumer/:slug', async (c) => {
    const projectId = c.req.param('projectId')
    const consumer = c.req.param('consumer')
    const slug = c.req.param('slug')
    const project = deps.registry.get(projectId)
    if (!project) {
      return errResp(c, { code: 'path_not_found', message: `project ${projectId} not registered` }, 404)
    }
    const r = await buildForSlug(project.rootDir, consumer, slug)
    if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
    return c.json({ schemaVersion: '0.1', entity: r.value })
  })

  // ─── Legacy state routes (backward-compat: uses rootDir / default project) ─

  app.get('/api/state/:consumer', async (c) => {
    const id = c.req.param('consumer')
    if (hasDiscoverRun(deps.rootDir, id)) {
      const r = await buildDiscoverState(deps.rootDir, id)
      if (!r.ok) return errResp(c, r.error, statusFor(r.error.code))
      return c.json({ schemaVersion: '0.1', state: r.value })
    }
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
    let dir: string
    try {
      dir = consumerRoot(deps.rootDir, consumer)
    } catch (e) {
      if (e instanceof UnsafeConsumerIdError) {
        return errResp(c, { code: 'invalid_input', message: e.message }, 400)
      }
      throw e
    }
    const path = annotationsPathFor(dir)
    const id = nextDailyId('ann')
    const createdAt = new Date().toISOString()
    const annotation = { schemaVersion: '0.1' as const, ...parsed.data, id, createdAt }
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
    let dir: string
    try {
      dir = consumerRoot(deps.rootDir, consumer)
    } catch (e) {
      if (e instanceof UnsafeConsumerIdError) {
        return errResp(c, { code: 'invalid_input', message: e.message }, 400)
      }
      throw e
    }
    const path = highlightsPathFor(dir)
    const id = nextDailyId('hl')
    const createdAt = new Date().toISOString()
    const highlight = { schemaVersion: '0.1' as const, ...parsed.data, id, createdAt }
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
    let dir: string
    try {
      dir = consumerRoot(deps.rootDir, consumer)
    } catch (e) {
      if (e instanceof UnsafeConsumerIdError) {
        return errResp(c, { code: 'invalid_input', message: e.message }, 400)
      }
      throw e
    }
    const path = inboxPathFor(dir)
    const id = nextDailyId('dec')
    const createdAt = new Date().toISOString()
    const decision = { schemaVersion: '0.1' as const, kind: 'decision' as const, ...parsed.data, id, createdAt }
    await appendJsonlLine(path, decision)
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
    let path: string
    try {
      path = inboxPathFor(consumerRoot(deps.rootDir, consumer))
    } catch (e) {
      if (e instanceof UnsafeConsumerIdError) {
        return errResp(c, { code: 'invalid_input', message: e.message }, 400)
      }
      throw e
    }
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

  // ─── Project registration ─────────────────────────────────────────────

  app.post('/api/projects/register', async (c) => {
    const raw = await readBody(c)
    if (!raw || typeof raw !== 'object' || !('rootDir' in raw) || typeof (raw as Record<string, unknown>).rootDir !== 'string') {
      return errResp(c, { code: 'invalid_input', message: 'body must include rootDir (string)' }, 400)
    }
    const body = raw as { rootDir: string; projectId?: string }

    const validation = await validateRootDir(body.rootDir)
    if (!validation.ok) {
      return errResp(c, { code: 'invalid_input', message: validation.reason }, 400)
    }

    const existing = deps.registry.getByRootDir(validation.canonical)
    if (existing) {
      const { watcher: _w, ...proj } = existing
      return c.json({ schemaVersion: '0.1', project: proj }, 200)
    }

    const entry = deps.registry.register(validation.canonical, body.projectId)
    if (entry.watcher) {
      entry.watcher.start().catch(() => { /* watcher start failure is non-fatal */ })
    }
    const { watcher: _w, ...proj } = entry
    return c.json({ schemaVersion: '0.1', project: proj }, 201)
  })

  app.get('/api/projects', (c) => {
    const projects = deps.registry.list().map(({ watcher: _w, ...p }) => p)
    return c.json({ schemaVersion: '0.1', projects })
  })

  app.delete('/api/projects/:id', async (c) => {
    const id = c.req.param('id')
    const removed = await deps.registry.unregister(id)
    if (!removed) {
      return errResp(c, { code: 'path_not_found', message: `project ${id} not registered` }, 404)
    }
    return c.json({ schemaVersion: '0.1', status: 'unregistered' })
  })

  // ─── Highlight acknowledge ──────────────────────────────────────────

  app.post('/api/highlight/:id/acknowledge', async (c) => {
    const id = c.req.param('id')
    const raw = (await readBody(c)) ?? {}
    const parsed = ackInputSchema.safeParse(raw)
    if (!parsed.success) {
      return errResp(c, { code: 'invalid_input', message: 'invalid acknowledgement payload' }, 400)
    }
    const consumer = c.req.query('consumer') ?? 'project-status'
    let path: string
    try {
      path = inboxPathFor(consumerRoot(deps.rootDir, consumer))
    } catch (e) {
      if (e instanceof UnsafeConsumerIdError) {
        return errResp(c, { code: 'invalid_input', message: e.message }, 400)
      }
      throw e
    }
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
