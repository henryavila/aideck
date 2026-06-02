import { join } from 'node:path'
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ConsumerRegistry } from '../consumer-registry.js'
import type { ProjectRegistry } from '../project-registry.js'
import { readDataSource } from '../data-source-reader.js'
import type { DataSourceDecl } from '../manifest-schema.js'
import { appendJsonlLine } from '../writers/jsonl-append.js'
import { isWithinDir } from '../writers/path-guard.js'

export interface ApiV2Deps {
  consumers: ConsumerRegistry
  registry: ProjectRegistry
  version: string
  startedAt: number
  demo?: boolean
}

function errResp(
  c: Context,
  code: string,
  message: string,
  status: number,
  extra?: { suggestion?: string; details?: Record<string, unknown> }
): Response {
  return c.json(
    {
      schemaVersion: '0.1',
      error: { code, message, ...extra }
    },
    status as Parameters<Context['json']>[1]
  )
}

export function createApiV2Router(deps: ApiV2Deps): Hono {
  const app = new Hono()

  app.get('/api/health', (c) => {
    const list = deps.consumers.list()
    return c.json({
      schemaVersion: '0.1',
      apiVersion: '0.1',
      service: 'aideck',
      version: deps.version,
      status: 'ok',
      uptimeMs: Date.now() - deps.startedAt,
      consumerCount: list.length,
      demo: deps.demo ?? false,
      consumers: list.map((cs) => ({ id: cs.id, title: cs.manifest.title }))
    })
  })

  app.get('/api/consumers', (c) => {
    const list = deps.consumers.list()
    return c.json({
      consumers: list.map((cs) => ({
        id: cs.id,
        title: cs.manifest.title,
        ...(cs.manifest.icon !== undefined ? { icon: cs.manifest.icon } : {}),
        dataSourceCount: cs.manifest.dataSources.length,
        pageCount: cs.manifest.pages.length
      }))
    })
  })

  app.get('/api/consumers/:id', (c) => {
    const id = c.req.param('id')
    const consumer = deps.consumers.get(id)
    if (!consumer) {
      return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    }
    return c.json({ manifest: consumer.manifest })
  })

  app.get('/api/consumers/:id/data/:dataSourceId', async (c) => {
    const id = c.req.param('id')
    const dataSourceId = c.req.param('dataSourceId')

    const consumer = deps.consumers.get(id)
    if (!consumer) {
      return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    }

    const decl = consumer.manifest.dataSources.find((ds) => ds.id === dataSourceId)
    if (!decl) {
      return errResp(
        c,
        'data_source_not_found',
        `data source "${dataSourceId}" not found in consumer "${id}"`,
        404
      )
    }

    const result = await readDataSource(consumer.dir, decl)
    if (!result.ok) {
      return errResp(c, result.error.code, result.error.message, 500, {
        suggestion: result.error.suggestion,
        details: result.error.details
      })
    }

    return c.json({ records: result.value.records, count: result.value.records.length })
  })

  app.get('/api/consumers/:id/data/:dataSourceId/:slug', async (c) => {
    const id = c.req.param('id')
    const dataSourceId = c.req.param('dataSourceId')
    const slug = c.req.param('slug')

    const consumer = deps.consumers.get(id)
    if (!consumer) {
      return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    }

    const decl = consumer.manifest.dataSources.find((ds) => ds.id === dataSourceId)
    if (!decl) {
      return errResp(
        c,
        'data_source_not_found',
        `data source "${dataSourceId}" not found in consumer "${id}"`,
        404
      )
    }

    const result = await readDataSource(consumer.dir, decl)
    if (!result.ok) {
      return errResp(c, result.error.code, result.error.message, 500, {
        suggestion: result.error.suggestion,
        details: result.error.details
      })
    }

    const record = result.value.records.find(
      (r) =>
        r['slug'] === slug ||
        r['id'] === slug ||
        (typeof r['_file'] === 'string' && r['_file'].startsWith(slug))
    )

    if (!record) {
      return errResp(
        c,
        'entity_not_found',
        `entity "${slug}" not found in data source "${dataSourceId}"`,
        404
      )
    }

    return c.json({ record })
  })

  // ─── Project-scoped data ──────────────────────────────────────────────
  // `root: 'project'` dataSources resolve their path against a registered
  // project's rootDir (the repo's git-tracked .atomic-skills/ tree, read in
  // place). `root: 'consumer'` sources still read from the consumer dir.

  function resolveProjectDataSource(
    c: Context
  ): { decl: DataSourceDecl; baseDir: string } | Response {
    const id = c.req.param('id') ?? ''
    const projectId = c.req.param('projectId') ?? ''
    const dataSourceId = c.req.param('dataSourceId') ?? ''
    const consumer = deps.consumers.get(id)
    if (!consumer) return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    const project = deps.registry.get(projectId)
    if (!project) {
      return errResp(c, 'path_not_found', `project "${projectId}" not registered`, 404)
    }
    const decl = consumer.manifest.dataSources.find((ds) => ds.id === dataSourceId)
    if (!decl) {
      return errResp(
        c,
        'data_source_not_found',
        `data source "${dataSourceId}" not found in consumer "${id}"`,
        404
      )
    }
    const baseDir = decl.root === 'project' ? project.rootDir : consumer.dir
    return { decl, baseDir }
  }

  app.get('/api/consumers/:id/projects', (c) => {
    const id = c.req.param('id')
    if (!deps.consumers.get(id)) {
      return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    }
    const projects = deps.registry.list().map(({ watcher: _w, ...p }) => p)
    return c.json({ projects })
  })

  app.get('/api/consumers/:id/projects/:projectId/data/:dataSourceId', async (c) => {
    const resolved = resolveProjectDataSource(c)
    if (resolved instanceof Response) return resolved
    const result = await readDataSource(resolved.baseDir, resolved.decl)
    if (!result.ok) {
      return errResp(c, result.error.code, result.error.message, 500, {
        suggestion: result.error.suggestion,
        details: result.error.details
      })
    }
    return c.json({ records: result.value.records, count: result.value.records.length })
  })

  app.get('/api/consumers/:id/projects/:projectId/data/:dataSourceId/:slug', async (c) => {
    const resolved = resolveProjectDataSource(c)
    if (resolved instanceof Response) return resolved
    const slug = c.req.param('slug')
    const result = await readDataSource(resolved.baseDir, resolved.decl)
    if (!result.ok) {
      return errResp(c, result.error.code, result.error.message, 500, {
        suggestion: result.error.suggestion,
        details: result.error.details
      })
    }
    const record = result.value.records.find(
      (r) =>
        r['slug'] === slug ||
        r['id'] === slug ||
        (typeof r['_file'] === 'string' && r['_file'].startsWith(slug))
    )
    if (!record) {
      return errResp(
        c,
        'entity_not_found',
        `entity "${slug}" not found in data source "${resolved.decl.id}"`,
        404
      )
    }
    return c.json({ record })
  })

  app.post('/api/consumers/:id/write/:target{.+}', async (c) => {
    const id = c.req.param('id')
    const target = c.req.param('target')

    const consumer = deps.consumers.get(id)
    if (!consumer) {
      return errResp(c, 'consumer_not_found', `consumer "${id}" not found`, 404)
    }

    if (!target.startsWith('data/')) {
      return errResp(
        c,
        'validation_error',
        `write target must start with "data/", got "${target}"`,
        400
      )
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return errResp(c, 'validation_error', 'request body must be valid JSON', 400)
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return errResp(c, 'validation_error', 'request body must be a JSON object', 400)
    }

    const filePath = join(consumer.dir, target)
    if (!isWithinDir(filePath, join(consumer.dir, 'data'))) {
      return errResp(
        c,
        'validation_error',
        `write target escapes the data directory: "${target}"`,
        400
      )
    }
    try {
      await appendJsonlLine(filePath, body as object)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return errResp(c, 'io_error', `failed to write to "${target}": ${message}`, 500)
    }

    return c.json({ ok: true, path: target })
  })

  return app
}
