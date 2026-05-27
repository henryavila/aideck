import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createEventBus, type EventBus } from './event-bus.js'
import { createWatcher } from './watcher.js'
import { corsMiddleware } from './cors.js'
import { createApiRouter } from './routes/api.js'
import { createApiV2Router } from './routes/api-v2.js'
import { createSseRouter } from './routes/sse.js'
import { createSpaRouter } from './routes/spa.js'
import { createProjectRegistry, type ProjectRegistry } from './project-registry.js'
import { createConsumerRegistry, type ConsumerRegistry } from './consumer-registry.js'
import { createConsumerWatcher, type ConsumerWatcher } from './consumer-watcher.js'

export interface ServerOptions {
  rootDir: string
  port?: number
  /** Absolute path to a built SPA bundle (consumer-side, e.g. atomic-skills'
   *  dashboard build). When set, aideck serves it as a SPA with API
   *  passthrough. When unset, no static handler is mounted. */
  staticDir?: string
  version?: string
  demo?: boolean
  /** Set to true to skip starting the watcher (used by some tests). */
  skipWatcher?: boolean
}

/**
 * aiDeck binds to 127.0.0.1 only. Iron Law #4 (no telemetry, localhost-only).
 * This is intentionally not configurable.
 */
const LOCALHOST = '127.0.0.1'

export interface RunningServer {
  app: Hono
  eventBus: EventBus
  consumers: ConsumerRegistry
  consumerWatcher: ConsumerWatcher | null
  server: ServerType | null
  port: number
  stop(): Promise<void>
}

export interface BuiltApp {
  app: Hono
  eventBus: EventBus
  consumers: ConsumerRegistry
  consumerWatcher: ConsumerWatcher | null
  startedAt: number
  rootDir: string
  registry: ProjectRegistry
}

export function buildApp(opts: ServerOptions): BuiltApp {
  const eventBus = createEventBus()
  const startedAt = Date.now()
  const registry = createProjectRegistry()

  // Per-project watchers: created on-demand when projects register via /api/projects/register.
  // These watch .atomic-skills/ inside each registered project and emit SSE events.
  if (!opts.skipWatcher) {
    registry.setWatcherFactory((projectId, rootDir) =>
      createWatcher({ rootDir, eventBus, projectId })
    )
  }

  // v2 consumer registry — scans ~/.aideck/consumers/
  const aideckBaseDir = join(homedir(), '.aideck')
  const consumers = createConsumerRegistry(aideckBaseDir)

  // v2 consumer watcher — watches ~/.aideck/consumers/*/data/
  const consumerWatcher = opts.skipWatcher
    ? null
    : createConsumerWatcher({ consumersDir: consumers.consumersDir(), eventBus })

  const app = new Hono()
  app.use('*', corsMiddleware())

  // v2 API router mounted FIRST — gets priority on shared paths (/api/health, /api/consumers)
  app.route('/', createApiV2Router({
    consumers,
    version: opts.version ?? '0.0.1',
    startedAt,
  }))

  // v0.1 API router (legacy routes: /api/state/*, /api/annotate, /api/inbox, etc.)
  app.route('/', createApiRouter({
    rootDir: opts.rootDir,
    eventBus,
    startedAt,
    version: opts.version ?? '0.0.1',
    demo: opts.demo ?? false,
    registry
  }))

  app.route('/', createSseRouter({ eventBus, startedAt, registry }))
  if (opts.staticDir) {
    app.route('/', createSpaRouter({ staticDir: opts.staticDir }))
  }

  // 404 contract: /api/* and /sse return a structured JSON error matching
  // ErrorResponse so consumers can rely on it whether or not a SPA bundle
  // is mounted. Other paths fall through to plain 404 (browsers see HTML
  // null body unless --static-dir is set).
  app.notFound((c) => {
    const path = c.req.path
    if (path.startsWith('/api/') || path.startsWith('/sse')) {
      return c.json(
        { schemaVersion: '0.1', error: { code: 'path_not_found', message: `no route for ${path}` } },
        404
      )
    }
    return c.text('not found', 404)
  })

  return { app, eventBus, consumers, consumerWatcher, startedAt, rootDir: opts.rootDir, registry }
}

export async function startServer(opts: ServerOptions): Promise<RunningServer> {
  const built = buildApp(opts)

  // Scan v2 consumers before starting (safe even if ~/.aideck/consumers/ doesn't exist)
  await built.consumers.scan()

  if (built.consumerWatcher) {
    await built.consumerWatcher.start()
  }

  const port = opts.port ?? 7777
  const server = serve({
    fetch: built.app.fetch,
    hostname: LOCALHOST,
    port
  })
  return {
    app: built.app,
    eventBus: built.eventBus,
    consumers: built.consumers,
    consumerWatcher: built.consumerWatcher,
    server,
    port,
    async stop() {
      if (built.consumerWatcher) await built.consumerWatcher.stop()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
}

if (!import.meta.url.endsWith('.mjs') && import.meta.url === `file://${process.argv[1]}`) {
  startServer({ rootDir: process.cwd() }).then(
    (s) => {
      const handler = async () => {
        await s.stop()
        process.exit(0)
      }
      process.on('SIGINT', handler)
      process.on('SIGTERM', handler)
      process.stderr.write(`aideck: listening on http://127.0.0.1:${s.port}\n`)
    },
    (cause) => {
      const msg = cause instanceof Error ? cause.message : String(cause)
      process.stderr.write(`aideck: failed to start: ${msg}\n`)
      process.exit(1)
    }
  )
}
