#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { ArgError, parseCliArgs } from './cli/args.js'
import { HELP_TEXT } from './cli/help.js'
import { readVersion } from './cli/version.js'

export interface CliRunOptions {
  argv?: string[]
  stdout?: NodeJS.WritableStream
  stderr?: NodeJS.WritableStream
  /** Test hook: skip `process.exit` so the runner can assert exit codes. */
  shouldExit?: (code: number) => void
}

function printHelp(stdout: NodeJS.WritableStream): void {
  stdout.write(HELP_TEXT)
}

function printVersion(stdout: NodeJS.WritableStream): void {
  stdout.write(`${readVersion()}\n`)
}

async function dispatchServe(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { startServer } = await import('./server/index.js')
  const { resolvePort, PortInUseError } = await import('./server/port-resolver.js')
  const { writeEnvFile, removeEnvFile } = await import('./server/env-file.js')
  const { InstanceAlreadyRunningError } = await import('./server/lockfile.js')
  const { stat } = await import('node:fs/promises')
  const { resolve } = await import('node:path')
  try {
    let staticDir: string | undefined
    if (parsed.flags.staticDir) {
      const abs = resolve(parsed.flags.staticDir)
      try {
        const st = await stat(abs)
        if (!st.isDirectory()) {
          stderr.write(`aideck serve: --static-dir=${parsed.flags.staticDir} is not a directory\n`)
          return 1
        }
      } catch {
        stderr.write(`aideck serve: --static-dir=${parsed.flags.staticDir} does not exist\n`)
        return 1
      }
      staticDir = abs
    }
    const port = await resolvePort({
      requested: parsed.flags.port,
      isExplicit: parsed.portExplicit
    })
    const running = await startServer({ rootDir: process.cwd(), port, staticDir })
    const url = `http://127.0.0.1:${running.port}`
    await writeEnvFile({ url, port: running.port, pid: process.pid })
    stdout.write(`aideck serve: listening on ${url}${staticDir ? ` (static: ${staticDir})` : ''}\n`)
    let stopping = false
    const shutdown = async (signal: string) => {
      if (stopping) return
      stopping = true
      stdout.write(`aideck serve: received ${signal}, shutting down\n`)
      await removeEnvFile()
      await running.stop()
      process.exit(0)
    }
    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
    return -1 // long-running
  } catch (cause) {
    if (cause instanceof PortInUseError) {
      stderr.write(`aideck serve: ${cause.message}. Try --port=<higher>\n`)
      return 1
    }
    if (cause instanceof InstanceAlreadyRunningError) {
      stderr.write(`aideck serve: ${cause.message}. Stop it first with 'aideck down'\n`)
      return 1
    }
    stderr.write(`aideck serve: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }
}

async function dispatchDemo(parsed: ReturnType<typeof parseCliArgs>, stdout: NodeJS.WritableStream): Promise<number> {
  const { startServer } = await import('./server/index.js')
  const { resolvePort, PortInUseError } = await import('./server/port-resolver.js')
  const { writeEnvFile, removeEnvFile } = await import('./server/env-file.js')
  const { InstanceAlreadyRunningError } = await import('./server/lockfile.js')
  const { seedDemo } = await import('./demo/seed.js')
  const { createFakeConsumer } = await import('./demo/fake-consumer.js')
  const { seedDemoConsumer, cleanDemoConsumer } = await import('./demo/seed-demo.js')
  const { existsSync } = await import('node:fs')
  const { resolve, dirname, join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')

  // Track resources in startup order so the catch path can tear them down.
  let env: Awaited<ReturnType<typeof seedDemo>> | null = null
  let running: Awaited<ReturnType<typeof startServer>> | null = null
  let consumer: ReturnType<typeof createFakeConsumer> | null = null
  let envFileWritten = false
  let demoConsumerSeeded = false

  try {
    env = await seedDemo()

    // Seed v2 demo consumer into ~/.aideck/consumers/aideck-demo/
    await seedDemoConsumer()
    demoConsumerSeeded = true

    const port = await resolvePort({
      requested: parsed.flags.port,
      isExplicit: parsed.portExplicit
    })
    // Serve the built Vue client if it has been bundled, so `aideck demo`
    // launches the full dashboard (not just the API) in a single command.
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    const staticDir = [
      resolve(process.cwd(), 'dist/client'),
      resolve(moduleDir, '..', 'dist/client'),
      resolve(moduleDir, 'client')
    ].find((dir) => existsSync(join(dir, 'index.html')))
    running = await startServer({ rootDir: env.rootDir, port, demo: true, staticDir })
    const url = `http://127.0.0.1:${running.port}`
    await writeEnvFile({ url, port: running.port, pid: process.pid })
    envFileWritten = true
    consumer = createFakeConsumer({ rootDir: env.rootDir })
    await consumer.start()
    stdout.write(`aideck DEMO mode — ${url} (root=${env.rootDir})\n`)
    if (!staticDir) {
      stdout.write('  note: client bundle not found — run `npx vite build` to serve the dashboard UI\n')
    }

    if (!process.env.AIDECK_DEMO_NO_OPEN) {
      try {
        const { default: open } = await import('open')
        await open(url)
      } catch {
        // Ignore browser-open failures (headless CI).
      }
    }

    let stopping = false
    const startedConsumer = consumer
    const startedRunning = running
    const startedEnv = env
    const shutdown = async (signal: string) => {
      if (stopping) return
      stopping = true
      stdout.write(`aideck demo: received ${signal}, cleaning up\n`)
      if (envFileWritten) await removeEnvFile()
      await startedConsumer.stop()
      await startedRunning.stop()
      await startedEnv.cleanup()
      await cleanDemoConsumer()
      process.exit(0)
    }
    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
    return -1
  } catch (cause) {
    // Best-effort cleanup in reverse startup order.
    if (consumer) {
      try { await consumer.stop() } catch { /* swallow */ }
    }
    if (envFileWritten) {
      try { await removeEnvFile() } catch { /* swallow */ }
    }
    if (running) {
      try { await running.stop() } catch { /* swallow */ }
    }
    if (env) {
      try { await env.cleanup() } catch { /* swallow */ }
    }
    if (demoConsumerSeeded) {
      try { await cleanDemoConsumer() } catch { /* swallow */ }
    }
    if (cause instanceof PortInUseError) {
      process.stderr.write(`aideck demo: ${cause.message}. Try --port=<higher>\n`)
      return 1
    }
    if (cause instanceof InstanceAlreadyRunningError) {
      process.stderr.write(`aideck demo: ${cause.message}. Stop it first with 'aideck down'\n`)
      return 1
    }
    process.stderr.write(`aideck demo: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }
}

async function dispatchMcp(): Promise<number> {
  const { startStdio } = await import('./mcp/index.js')
  const { setupToolListWatcher } = await import('./mcp/tool-list-watcher.js')
  const { createConsumerRegistry } = await import('./server/consumer-registry.js')
  const { createConsumerWatcher } = await import('./server/consumer-watcher.js')
  const { createEventBus } = await import('./server/event-bus.js')
  const { homedir } = await import('node:os')
  const { join } = await import('node:path')
  try {
    const aideckBaseDir = join(homedir(), '.aideck')
    const consumers = createConsumerRegistry(aideckBaseDir)
    await consumers.scan()
    const bundle = await startStdio({ rootDir: process.cwd(), consumers })

    const eventBus = createEventBus()
    const consumerWatcher = createConsumerWatcher({
      consumersDir: consumers.consumersDir(),
      eventBus
    })

    setupToolListWatcher({
      server: bundle.server,
      registry: bundle.registry,
      consumers,
      eventBus
    })

    await consumerWatcher.start()

    let stopping = false
    const shutdown = async (signal: string) => {
      if (stopping) return
      stopping = true
      process.stderr.write(`aideck mcp: received ${signal}, shutting down\n`)
      await consumerWatcher.stop()
      process.exit(0)
    }
    process.on('SIGINT', () => void shutdown('SIGINT'))
    process.on('SIGTERM', () => void shutdown('SIGTERM'))

    return -1
  } catch (cause) {
    process.stderr.write(`aideck mcp: ${cause instanceof Error ? cause.message : String(cause)}\n`)
    return 1
  }
}

async function dispatchEnv(stdout: NodeJS.WritableStream): Promise<number> {
  const { runEnvCmd } = await import('./cli/env-cmd.js')
  return runEnvCmd(stdout)
}

async function dispatchUp(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { runUp } = await import('./cli/up.js')
  return runUp(parsed, stdout, stderr)
}

async function dispatchDown(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { runDown } = await import('./cli/down.js')
  return runDown(stdout, stderr)
}

async function dispatchBuildDiscoverRun(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { runBuildDiscoverRun } = await import('./cli/build-discover-run.js')
  return runBuildDiscoverRun(parsed, stdout, stderr)
}

async function dispatchValidateFile(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { runValidate } = await import('./cli/validate.js')

  const filePath = parsed.positionals[0]
  if (!filePath || parsed.flags.help) {
    stdout.write('Usage: aideck validate-file <file>\n\n')
    stdout.write('Validate a data file against its consumer schema.json.\n')
    stdout.write('Walks up from the file to find manifest.yaml, matches the dataSource\n')
    stdout.write('by path pattern, and validates each record via schema.json.\n\n')
    stdout.write('Exit codes: 0=valid, 1=invalid, 2=file/consumer not found\n')
    return filePath ? 0 : 1
  }

  return runValidate(filePath, { stdout, stderr })
}

async function dispatchInitConsumer(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { runInitConsumer } = await import('./cli/init-consumer.js')

  const { id, title, mcpNamespace } = parsed.flags

  if (parsed.flags.help || !id || !title || !mcpNamespace) {
    if (!parsed.flags.help) {
      const missing = [
        !id && '--id',
        !title && '--title',
        !mcpNamespace && '--mcp-namespace',
      ].filter(Boolean).join(', ')
      stderr.write(`aideck init-consumer: missing required flags: ${missing}\n`)
    }
    stdout.write('Usage: aideck init-consumer --id=<id> --title=<title> --mcp-namespace=<ns>\n\n')
    stdout.write('Scaffold a new consumer directory with manifest.yaml, schema.json,\n')
    stdout.write('and sample data files under ~/.aideck/consumers/<id>/\n')
    return parsed.flags.help ? 0 : 1
  }

  return runInitConsumer({ id, title, mcpNamespace })
}

async function dispatchValidate(
  parsed: ReturnType<typeof parseCliArgs>,
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): Promise<number> {
  const { resolve } = await import('node:path')
  const { parseDiscoverRunFile } = await import('./server/parsers/discover-run.js')

  const filePath = parsed.positionals[0]
  if (!filePath) {
    stderr.write('aideck validate: missing file path\nUsage: aideck validate <discover-run.json>\n')
    return 1
  }

  const result = await parseDiscoverRunFile(resolve(filePath))
  if (result.ok) {
    stdout.write('valid\n')
    return 0
  }

  stderr.write(`aideck validate: INVALID\n`)
  stderr.write(JSON.stringify(result.error, null, 2) + '\n')
  return 1
}

export async function runCli(opts: CliRunOptions = {}): Promise<number> {
  const stdout = opts.stdout ?? process.stdout
  const stderr = opts.stderr ?? process.stderr
  const argv = opts.argv ?? process.argv.slice(2)
  let parsed: ReturnType<typeof parseCliArgs>
  try {
    parsed = parseCliArgs(argv)
  } catch (cause) {
    const msg = cause instanceof ArgError
      ? `${cause.message}${cause.hint ? `\n${cause.hint}` : ''}`
      : (cause instanceof Error ? cause.message : String(cause))
    stderr.write(`${msg}\n`)
    return 1
  }

  if (parsed.flags.version) {
    printVersion(stdout)
    return 0
  }
  if (parsed.flags.help || !parsed.subcommand) {
    printHelp(stdout)
    return 0
  }

  switch (parsed.subcommand) {
    case 'serve':
      return dispatchServe(parsed, stdout, stderr)
    case 'demo':
      return dispatchDemo(parsed, stdout)
    case 'mcp':
      return dispatchMcp()
    case 'env':
      return dispatchEnv(stdout)
    case 'up':
      return dispatchUp(parsed, stdout, stderr)
    case 'down':
      return dispatchDown(stdout, stderr)
    case 'validate':
      return dispatchValidate(parsed, stdout, stderr)
    case 'build-discover-run':
      return dispatchBuildDiscoverRun(parsed, stdout, stderr)
    case 'validate-file':
      return dispatchValidateFile(parsed, stdout, stderr)
    case 'init-consumer':
      return dispatchInitConsumer(parsed, stdout, stderr)
  }
}

export function placeholder(): void {
  // Kept so prior re-exports remain compatible during transition.
}

if (!import.meta.url.endsWith('.mjs') && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(
    (code) => {
      if (code >= 0) process.exit(code)
    },
    (cause) => {
      process.stderr.write(`aideck: ${cause instanceof Error ? cause.message : String(cause)}\n`)
      process.exit(1)
    }
  )
}
