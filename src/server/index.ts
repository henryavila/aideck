import { Hono } from 'hono'
import { serve, type ServerType } from '@hono/node-server'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createEventBus, type EventBus } from './event-bus.js'
import { createWatcher } from './watcher.js'
import { corsMiddleware } from './cors.js'
import { hostGuard } from './host-guard.js'
import { createApiRouter } from './routes/api.js'
import { createApiV2Router } from './routes/api-v2.js'
import { createSseRouter } from './routes/sse.js'
import { createSpaRouter } from './routes/spa.js'
import { createProjectRegistry, type ProjectRegistry } from './project-registry.js'
import { createConsumerRegistry, type ConsumerRegistry } from './consumer-registry.js'
import { createConsumerWatcher, type ConsumerWatcher } from './consumer-watcher.js'
import { acquireLock, releaseLock } from './lockfile.js'
import { closeServerGracefully } from './graceful-shutdown.js'

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
  /** Base dir scanned for v2 consumer manifests (under `<dir>/consumers/`).
   *  Defaults to `~/.aideck`. Overridable so tests/embedders don't read the real
   *  home directory. */
  aideckBaseDir?: string
  /** When the server is exposed remotely (expose layer), the resolved remote
   *  hostname. Its CORS origin is accepted in addition to localhost. With the
   *  Serve/external providers the socket still binds 127.0.0.1 only. */
  remoteHost?: string
  /** Direct tailnet bind (Iron Law #4, exception 2): aiDeck binds a SECOND
   *  listener on its own Tailscale IP (never 0.0.0.0) in addition to loopback,
   *  and enforces a Host allowlist of {loopback, name, ip}. */
  tailnetBind?: { ip: string; name: string } | null
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
  /** Second listener bound to the Tailscale IP when `tailnetBind` is set; else null. */
  extraServer: ServerType | null
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

  // v2 consumer registry — scans <aideckBaseDir>/consumers/ (default ~/.aideck)
  const aideckBaseDir = opts.aideckBaseDir ?? join(homedir(), '.aideck')
  const consumers = createConsumerRegistry(aideckBaseDir)

  // Per-project watchers: created on-demand when projects register via /api/projects/register.
  // These watch .atomic-skills/ inside each registered project and classify changed
  // files against the registered consumers' manifest globs, emitting data_changed.
  if (!opts.skipWatcher) {
    registry.setWatcherFactory((projectId, rootDir) =>
      createWatcher({ rootDir, eventBus, projectId, consumers })
    )
  }

  // v2 consumer watcher — watches ~/.aideck/consumers/*/data/
  const consumerWatcher = opts.skipWatcher
    ? null
    : createConsumerWatcher({ consumersDir: consumers.consumersDir(), eventBus })

  const app = new Hono()
  // Host allowlist runs FIRST and only when directly bound to a routable address —
  // it closes DNS-rebinding, which is what makes the tailnet bind safe. On a
  // loopback-only bind it is unnecessary and stays unmounted (zero behavior change).
  if (opts.tailnetBind) {
    app.use('*', hostGuard([opts.tailnetBind.name, opts.tailnetBind.ip]))
  }
  const corsHosts = [opts.remoteHost, opts.tailnetBind?.name, opts.tailnetBind?.ip].filter(
    (h): h is string => typeof h === 'string' && h.length > 0
  )
  app.use('*', corsMiddleware(corsHosts))

  // v2 API router mounted FIRST — gets priority on shared paths (/api/health, /api/consumers)
  app.route('/', createApiV2Router({
    consumers,
    registry,
    version: opts.version ?? '0.0.1',
    startedAt,
    demo: opts.demo ?? false,
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

  // Acquire instance lock before binding the port
  await acquireLock({ port })

  const server = serve({
    fetch: built.app.fetch,
    hostname: LOCALHOST,
    port
  })

  // Direct tailnet bind: a SECOND listener on the node's own Tailscale IP (never
  // 0.0.0.0), same app port. Best-effort — a bind failure (e.g. the interface
  // went away) degrades to loopback-only with a stderr warning, never crashing
  // the primary listener. Reachability is gated by the Host allowlist mounted above.
  let extraServer: ServerType | null = null
  if (opts.tailnetBind) {
    const { ip } = opts.tailnetBind
    extraServer = serve({ fetch: built.app.fetch, hostname: ip, port })
    ;(extraServer as { on?: (ev: string, cb: (e: unknown) => void) => void }).on?.('error', (cause) => {
      const msg = cause instanceof Error ? cause.message : String(cause)
      process.stderr.write(`aideck: tailnet bind ${ip}:${port} failed (${msg}); loopback-only\n`)
    })
  }

  return {
    app: built.app,
    eventBus: built.eventBus,
    consumers: built.consumers,
    consumerWatcher: built.consumerWatcher,
    server,
    extraServer,
    port,
    async stop() {
      if (built.consumerWatcher) await built.consumerWatcher.stop()
      await closeServerGracefully(server)
      if (extraServer) await closeServerGracefully(extraServer)
      await releaseLock()
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
