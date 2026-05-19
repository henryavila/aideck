import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { createEventBus, type EventBus } from './event-bus.js'
import { createWatcher, type Watcher } from './watcher.js'
import { corsMiddleware } from './cors.js'
import { createApiRouter } from './routes/api.js'
import { createSseRouter } from './routes/sse.js'
import { createSpaRouter } from './routes/spa.js'

export interface ServerOptions {
  rootDir: string
  port?: number
  hostname?: string
  /** Path to the built Vue client (defaults to `<rootDir>/dist/client`). */
  clientDir?: string
  version?: string
  demo?: boolean
  /** Set to true to skip starting the watcher (used by some tests). */
  skipWatcher?: boolean
}

export interface RunningServer {
  app: Hono
  eventBus: EventBus
  watcher: Watcher | null
  server: ServerType | null
  port: number
  stop(): Promise<void>
}

export interface BuiltApp {
  app: Hono
  eventBus: EventBus
  watcher: Watcher | null
  startedAt: number
  rootDir: string
}

export function buildApp(opts: ServerOptions): BuiltApp {
  const eventBus = createEventBus()
  const startedAt = Date.now()
  const watcher = opts.skipWatcher
    ? null
    : createWatcher({ rootDir: opts.rootDir, eventBus })

  const app = new Hono()
  app.use('*', corsMiddleware())
  app.route('/', createApiRouter({
    rootDir: opts.rootDir,
    eventBus,
    startedAt,
    version: opts.version ?? '0.0.1',
    demo: opts.demo ?? false
  }))
  app.route('/', createSseRouter({ eventBus, startedAt }))
  app.route(
    '/',
    createSpaRouter({ clientDir: opts.clientDir ?? `${opts.rootDir}/dist/client` })
  )

  return { app, eventBus, watcher, startedAt, rootDir: opts.rootDir }
}

export async function startServer(opts: ServerOptions): Promise<RunningServer> {
  const built = buildApp(opts)
  if (built.watcher) {
    await built.watcher.start()
  }
  const port = opts.port ?? 7777
  const hostname = opts.hostname ?? '127.0.0.1'
  const server = serve({
    fetch: built.app.fetch,
    hostname,
    port
  })
  return {
    app: built.app,
    eventBus: built.eventBus,
    watcher: built.watcher,
    server,
    port,
    async stop() {
      if (built.watcher) await built.watcher.stop()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
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
