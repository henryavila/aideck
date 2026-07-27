/**
 * Remote-access "expose" layer.
 *
 * aiDeck always binds 127.0.0.1 (Iron Law #4). To reach the dashboard from
 * another device, a SEPARATE local process terminates a tunnel/proxy and
 * forwards to the loopback port. Providers:
 *   - tailscale / tailnet — private tailnet (never Funnel)
 *   - ngrok              — public HTTPS tunnel via the ngrok agent CLI
 *   - external           — bring-your-own proxy URL (ngrok/caddy/cloudflare by hand)
 *
 * The aiDeck server socket itself is untouched — this module only manages the
 * out-of-process proxy and reports back the resulting remote URL.
 *
 * Pattern ported from ~/mdprobe/src/expose/index.js (same author).
 */
import { execFile as nodeExecFile, spawn as nodeSpawn, type ChildProcess } from 'node:child_process'
import { readFile as nodeReadFile } from 'node:fs/promises'
import { homedir as nodeHomedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(nodeExecFile)

export type ExposeProvider = 'off' | 'tailscale' | 'tailnet' | 'external' | 'ngrok'

const PROVIDERS: ReadonlySet<string> = new Set(['off', 'tailscale', 'tailnet', 'external', 'ngrok'])

export const DEFAULT_EXPOSE_PORT = 8443

/** Raised for caller-fixable misconfiguration (bad provider, port, or URL). */
export class ExposeConfigError extends Error {
  constructor(message: string, public readonly hint?: string) {
    super(message)
    this.name = 'ExposeConfigError'
  }
}

/** Minimal shape of `execFile` we depend on; injectable so tests avoid spawning. */
export type ExecFileFn = (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string }>

/** Minimal spawn seam for long-lived processes (ngrok agent). */
export type SpawnFn = (cmd: string, args: string[], opts?: { detached?: boolean; stdio?: 'ignore' | 'pipe' }) => Pick<ChildProcess, 'pid' | 'kill' | 'unref'>

/** Injectable JSON GET used to poll the ngrok agent local API. */
export type FetchJsonFn = (url: string) => Promise<unknown>

/** Injectable file read (ngrok config probe; never logs secret values). */
export type ReadFileFn = (path: string) => Promise<string>

export interface ExposeOptions {
  provider: ExposeProvider
  /** The loopback port aiDeck is already listening on. */
  localPort: number
  /** Public HTTPS port for the tailnet endpoint (string from CLI or number). */
  exposePort?: string | number
  /** Required when provider === 'external'; the https base the user's proxy serves. */
  remoteBaseUrl?: string
  /** Test seams. */
  execFile?: ExecFileFn
  spawn?: SpawnFn
  fetchJson?: FetchJsonFn
  sleep?: (ms: number) => Promise<void>
  readFile?: ReadFileFn
  homedir?: () => string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
}

export interface ActiveExposure {
  provider: ExposeProvider
  /** Public URL the dashboard is reachable at, or null if local-only. */
  remoteUrl: string | null
  /** Hostname of remoteUrl — used to allow its CORS origin. Null if local-only. */
  remoteHost: string | null
  /** Set by the `tailnet` provider: aiDeck binds a second listener on this IP and
   *  enforces a Host allowlist of {loopback, name, ip}. Null for other providers. */
  tailnetBind?: { ip: string; name: string } | null
  /** Non-fatal notices (tailscale not running, mapping unverified, etc.). */
  warnings: string[]
  /** Tears down any proxy this module started. Safe to call always. */
  stop(): Promise<void>
}

const NOOP_STOP = async (): Promise<void> => {}

const NGROK_AGENT_API = 'http://127.0.0.1:4040/api/tunnels'
const NGROK_POLL_ATTEMPTS = 40
const NGROK_POLL_MS = 250

export function normalizeExposeProvider(value: string | undefined): ExposeProvider {
  const provider = String(value ?? '').trim().toLowerCase()
  if (!provider) return 'off'
  if (!PROVIDERS.has(provider)) {
    throw new ExposeConfigError(
      `unknown expose provider "${provider}"`,
      `Expected one of: ${[...PROVIDERS].join(', ')}`
    )
  }
  return provider as ExposeProvider
}

export function normalizeExposePort(value: string | number | undefined): number {
  if (value === undefined) return DEFAULT_EXPOSE_PORT
  const port = typeof value === 'number' ? value : (/^\d+$/.test(String(value).trim()) ? Number(value) : NaN)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new ExposeConfigError(
      `--expose-port=${value} is out of range`,
      'expose port must be an integer in 1024..65535'
    )
  }
  return port
}

/** Validate a user-supplied https base URL. Returns the normalized origin. */
export function normalizeRemoteBaseUrl(value: string | undefined): string {
  if (value == null || String(value).trim() === '') {
    throw new ExposeConfigError(
      'remote base URL is required when --expose=external',
      'pass --remote-base-url=https://host.example.ts.net'
    )
  }
  let parsed: URL
  try {
    parsed = new URL(String(value).trim())
  } catch {
    throw new ExposeConfigError(`--remote-base-url=${value} is not a valid URL`, 'use an https:// URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new ExposeConfigError('--remote-base-url must use https://', `got ${parsed.protocol}//`)
  }
  if (parsed.username || parsed.password) {
    throw new ExposeConfigError('--remote-base-url must not include credentials')
  }
  if (parsed.search || parsed.hash) {
    throw new ExposeConfigError('--remote-base-url must not include a query string or hash')
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new ExposeConfigError('--remote-base-url must be a bare origin without a path')
  }
  return `https://${parsed.host}`
}

/**
 * Start (or skip) the remote-access proxy. Configuration errors throw
 * `ExposeConfigError`; operational problems (tailscale down, access denied)
 * never throw — they degrade to local-only with a warning.
 */
export async function startExpose(opts: ExposeOptions): Promise<ActiveExposure> {
  const provider = normalizeExposeProvider(opts.provider)

  if (provider === 'off') {
    return { provider, remoteUrl: null, remoteHost: null, warnings: [], stop: NOOP_STOP }
  }

  if (provider === 'external') {
    const remoteUrl = normalizeRemoteBaseUrl(opts.remoteBaseUrl)
    return {
      provider,
      remoteUrl,
      remoteHost: new URL(remoteUrl).hostname,
      warnings: [],
      stop: NOOP_STOP
    }
  }

  if (provider === 'ngrok') {
    return startNgrok({
      localPort: opts.localPort,
      execFile: opts.execFile ?? execFileAsync,
      spawn: opts.spawn ?? defaultSpawn,
      fetchJson: opts.fetchJson ?? defaultFetchJson,
      sleep: opts.sleep ?? defaultSleep,
      readFile: opts.readFile ?? defaultReadFile,
      homedir: opts.homedir ?? nodeHomedir,
      platform: opts.platform ?? process.platform,
      env: opts.env ?? process.env
    })
  }

  if (provider === 'tailnet') {
    return startTailnetDirect({
      localPort: opts.localPort,
      execFile: opts.execFile ?? execFileAsync
    })
  }

  return startTailscale({
    localPort: opts.localPort,
    exposePort: normalizeExposePort(opts.exposePort),
    execFile: opts.execFile ?? execFileAsync
  })
}

/**
 * Direct tailnet bind. Unlike Serve, no proxy and no TLS — WireGuard already
 * encrypts the tunnel. We resolve the node's tailnet name + IPv4 so the caller
 * (startServer) can bind a second listener on that IP and allow its Host/origin.
 * Any tailscale problem degrades to local-only with a warning (never throws).
 */
async function startTailnetDirect(opts: { localPort: number; execFile: ExecFileFn }): Promise<ActiveExposure> {
  const { localPort, execFile } = opts
  const warnings: string[] = []

  let status: { BackendState?: string; Self?: { DNSName?: string } }
  try {
    const { stdout } = await execFile('tailscale', ['status', '--json'])
    status = JSON.parse(stdout)
  } catch (cause) {
    warnings.push(`tailscale is not available: ${errMsg(cause)}; continuing local-only`)
    return localOnly('tailnet', warnings)
  }

  if (status.BackendState !== 'Running') {
    warnings.push(`tailscale is not running (${status.BackendState ?? 'unknown'}); continuing local-only`)
    return localOnly('tailnet', warnings)
  }

  const name = status.Self?.DNSName ? String(status.Self.DNSName).replace(/\.$/, '') : ''
  if (!name) {
    warnings.push('tailscale status did not include Self.DNSName; continuing local-only')
    return localOnly('tailnet', warnings)
  }

  let ip = ''
  try {
    const { stdout } = await execFile('tailscale', ['ip', '-4'])
    ip = stdout.split('\n').map((s) => s.trim()).find(Boolean) ?? ''
  } catch (cause) {
    warnings.push(`could not read 'tailscale ip -4': ${errMsg(cause)}; continuing local-only`)
    return localOnly('tailnet', warnings)
  }
  if (!ip) {
    warnings.push("'tailscale ip -4' returned no address; continuing local-only")
    return localOnly('tailnet', warnings)
  }

  return {
    provider: 'tailnet',
    remoteUrl: `http://${name}:${localPort}`,
    remoteHost: name,
    tailnetBind: { ip, name },
    warnings,
    stop: NOOP_STOP
  }
}

interface TailscaleOptions {
  localPort: number
  exposePort: number
  execFile: ExecFileFn
}

function localOnly(provider: ExposeProvider, warnings: string[]): ActiveExposure {
  return { provider, remoteUrl: null, remoteHost: null, warnings, stop: NOOP_STOP }
}

async function startTailscale(opts: TailscaleOptions): Promise<ActiveExposure> {
  const { localPort, exposePort, execFile } = opts
  const warnings: string[] = []

  let status: { BackendState?: string; Self?: { DNSName?: string } }
  try {
    const { stdout } = await execFile('tailscale', ['status', '--json'])
    status = JSON.parse(stdout)
  } catch (cause) {
    warnings.push(`tailscale is not available: ${errMsg(cause)}; continuing local-only`)
    return localOnly('tailscale', warnings)
  }

  if (status.BackendState !== 'Running') {
    warnings.push(`tailscale is not running (${status.BackendState ?? 'unknown'}); continuing local-only`)
    return localOnly('tailscale', warnings)
  }

  const dnsName = status.Self?.DNSName ? String(status.Self.DNSName).replace(/\.$/, '') : ''
  if (!dnsName) {
    warnings.push('tailscale status did not include Self.DNSName; continuing local-only')
    return localOnly('tailscale', warnings)
  }

  try {
    // Serve (tailnet-private), never Funnel (public). --bg detaches the proxy.
    await execFile('tailscale', ['serve', '--bg', `--https=${exposePort}`, String(localPort)])
  } catch (cause) {
    const detail = /access denied/i.test(errMsg(cause))
      ? 'tailscale serve access denied; run once: sudo tailscale set --operator=$USER'
      : `tailscale serve failed: ${errMsg(cause)}`
    warnings.push(`${detail}; continuing local-only`)
    return localOnly('tailscale', warnings)
  }

  // A non-throwing `serve` does not guarantee the mapping persisted. Re-read and
  // only announce the URL if the mapping is actually present.
  try {
    const { stdout } = await execFile('tailscale', ['serve', 'status', '--json'])
    const serveStatus = JSON.parse(stdout)
    if (!serveStatusHasMapping(serveStatus, exposePort, localPort)) {
      warnings.push(`tailscale serve reported no mapping for :${exposePort} → ${localPort}; continuing local-only`)
      return localOnly('tailscale', warnings)
    }
  } catch {
    warnings.push(`could not verify the tailscale serve mapping for :${exposePort} → ${localPort}; assuming it is active`)
  }

  const remoteUrl = `https://${dnsName}:${exposePort}`
  return {
    provider: 'tailscale',
    remoteUrl,
    remoteHost: dnsName,
    warnings,
    async stop() {
      try {
        await execFile('tailscale', ['serve', `--https=${exposePort}`, 'off'])
      } catch {
        // best-effort teardown; nothing actionable if the CLI is already gone
      }
    }
  }
}

function serveStatusHasMapping(serveStatus: unknown, exposePort: number, localPort: number): boolean {
  if (!serveStatus || typeof serveStatus !== 'object') return false
  const web = (serveStatus as { Web?: Record<string, unknown> }).Web
  if (!web || typeof web !== 'object') return false
  const portTag = `:${exposePort}`
  const proxyTag = `:${localPort}`
  for (const [host, conf] of Object.entries(web)) {
    if (!String(host).endsWith(portTag)) continue
    const handlers = (conf as { Handlers?: Record<string, unknown> })?.Handlers
    if (!handlers || typeof handlers !== 'object') continue
    for (const handler of Object.values(handlers)) {
      const proxy = (handler as { Proxy?: string })?.Proxy
      if (proxy && String(proxy).includes(proxyTag)) return true
    }
  }
  return false
}

/**
 * Public HTTPS via the ngrok agent CLI.
 *
 * Unlike Tailscale Serve (private tailnet), ngrok publishes a **public** URL.
 * The dashboard still has no auth — every start surfaces a PUBLIC INTERNET
 * warning. Operational failures (CLI missing, missing/invalid authtoken, agent
 * API never answers) degrade to local-only with **actionable install/config
 * commands**; they never throw.
 *
 * Flow:
 *  0. Probe readiness (CLI on PATH + authtoken present in config) — if not
 *     ready, print install/config recipe and stay local-only (no spawn).
 *  1. Prefer an already-running agent tunnel that targets our localPort
 *     (reuse; stop is a no-op so we don't kill a user-owned agent).
 *  2. Otherwise spawn `ngrok http 127.0.0.1:<port>`, poll the local agent API
 *     at 127.0.0.1:4040/api/tunnels for the https public_url, own the child
 *     so stop() can SIGTERM it.
 *  3. If the agent never publishes, tear down and print fix-up commands.
 */
async function startNgrok(opts: {
  localPort: number
  execFile: ExecFileFn
  spawn: SpawnFn
  fetchJson: FetchJsonFn
  sleep: (ms: number) => Promise<void>
  readFile: ReadFileFn
  homedir: () => string
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
}): Promise<ActiveExposure> {
  const { localPort, execFile, spawn, fetchJson, sleep, readFile, homedir, platform, env } = opts

  // Reuse first — a live agent proves install+auth already work, even if our
  // config probe can't see the token (e.g. agent started with env authtoken).
  const existing = await discoverNgrokPublicUrl(fetchJson, localPort)
  if (existing) {
    return {
      provider: 'ngrok',
      remoteUrl: existing,
      remoteHost: new URL(existing).hostname,
      warnings: ['reusing existing ngrok agent tunnel (not started by aiDeck; stop is a no-op)'],
      stop: NOOP_STOP
    }
  }

  const readiness = await probeNgrokReadiness({ execFile, readFile, homedir, platform, env })
  if (readiness.status !== 'ready') {
    return localOnly('ngrok', readiness.hints)
  }

  let child: ReturnType<SpawnFn>
  try {
    // Point at loopback explicitly so we never accidentally target a LAN iface.
    child = spawn('ngrok', ['http', `127.0.0.1:${localPort}`], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref?.()
  } catch (cause) {
    return localOnly('ngrok', [
      `failed to spawn ngrok: ${errMsg(cause)}`,
      ...ngrokInstallHints(platform),
      'continuing local-only'
    ])
  }

  const publicUrl = await waitForNgrokPublicUrl(fetchJson, localPort, sleep)
  if (!publicUrl) {
    await killNgrokChild(child)
    return localOnly('ngrok', ngrokTunnelFailedHints())
  }

  return {
    provider: 'ngrok',
    remoteUrl: publicUrl,
    remoteHost: new URL(publicUrl).hostname,
    warnings: [],
    async stop() {
      await killNgrokChild(child)
    }
  }
}

export type NgrokReadiness =
  | { status: 'ready' }
  | { status: 'missing-cli' | 'missing-authtoken'; hints: string[] }

/**
 * Pre-flight for `--expose=ngrok`. Never prints secret values.
 * Returns multi-line `hints` the CLI prints verbatim when not ready.
 */
export async function probeNgrokReadiness(opts: {
  execFile: ExecFileFn
  readFile: ReadFileFn
  homedir: () => string
  platform: NodeJS.Platform
  env: NodeJS.ProcessEnv
}): Promise<NgrokReadiness> {
  const { execFile, readFile, homedir, platform, env } = opts

  try {
    await execFile('ngrok', ['version'])
  } catch (cause) {
    return {
      status: 'missing-cli',
      hints: [
        `ngrok is not installed or not on PATH (${errMsg(cause)}).`,
        ...ngrokInstallHints(platform),
        ...ngrokAuthHints(),
        'Then re-run: aideck serve --expose=ngrok',
        'continuing local-only'
      ]
    }
  }

  const hasToken = await ngrokConfigHasAuthtoken({ execFile, readFile, homedir, env })
  if (!hasToken) {
    return {
      status: 'missing-authtoken',
      hints: [
        'ngrok CLI is installed, but no authtoken is configured.',
        'aiDeck cannot open a public tunnel until you authenticate once:',
        ...ngrokAuthHints(),
        'Then re-run: aideck serve --expose=ngrok',
        'continuing local-only'
      ]
    }
  }

  return { status: 'ready' }
}

/** Install commands — platform-aware, always includes the universal download URL. */
export function ngrokInstallHints(platform: NodeJS.Platform = process.platform): string[] {
  const lines = ['Install the ngrok agent:']
  if (platform === 'darwin') {
    lines.push('  brew install ngrok/ngrok/ngrok')
  } else if (platform === 'linux') {
    lines.push('  # Debian/Ubuntu (or use the download page):')
    lines.push('  curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \\')
    lines.push('    | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \\')
    lines.push('    && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \\')
    lines.push('    | sudo tee /etc/apt/sources.list.d/ngrok.list \\')
    lines.push('    && sudo apt update && sudo apt install ngrok')
    lines.push('  # or Homebrew on Linux: brew install ngrok/ngrok/ngrok')
  } else if (platform === 'win32') {
    lines.push('  winget install Ngrok.Ngrok')
    lines.push('  # or: choco install ngrok')
  }
  lines.push('  # any OS: https://ngrok.com/download')
  return lines
}

/** One-time auth recipe (never embeds a real token). */
export function ngrokAuthHints(): string[] {
  return [
    'Authenticate once (free account):',
    '  1. Sign up / log in:  https://dashboard.ngrok.com/signup',
    '  2. Copy your token:   https://dashboard.ngrok.com/get-started/your-authtoken',
    '  3. Save it locally:   ngrok config add-authtoken <YOUR_TOKEN>',
    '  4. Verify:            ngrok config check && ngrok diagnose'
  ]
}

/** When the agent starts but never publishes a public URL. */
export function ngrokTunnelFailedHints(): string[] {
  return [
    'ngrok agent did not publish an https tunnel in time.',
    'Possible causes and fixes:',
    '  • Invalid / expired / missing authtoken:',
    '      ngrok config add-authtoken <YOUR_TOKEN>',
    '      # token: https://dashboard.ngrok.com/get-started/your-authtoken',
    '  • Another ngrok agent already holds the local API on :4040:',
    '      # stop the other agent, then retry',
    "      pkill -f 'ngrok http'   # macOS/Linux; or close the other terminal",
    '  • Network / region issues:',
    '      ngrok diagnose',
    'Then re-run: aideck serve --expose=ngrok',
    'continuing local-only'
  ]
}

/**
 * Detect a non-empty authtoken in the ngrok config without ever logging it.
 * Looks at `ngrok config check` path first, then well-known OS paths.
 */
export async function ngrokConfigHasAuthtoken(opts: {
  execFile: ExecFileFn
  readFile: ReadFileFn
  homedir: () => string
  env: NodeJS.ProcessEnv
}): Promise<boolean> {
  const { execFile, readFile, homedir, env } = opts

  // Env-var auth (supported by the agent) counts as configured.
  if (typeof env.NGROK_AUTHTOKEN === 'string' && env.NGROK_AUTHTOKEN.trim().length > 0) {
    return true
  }

  const candidates = new Set<string>()

  try {
    const { stdout, stderr } = await execFile('ngrok', ['config', 'check'])
    const combined = `${stdout}\n${stderr}`
    // e.g. "Valid configuration file at /Users/…/ngrok.yml"
    const m = combined.match(/configuration file at\s+(.+\S)/i)
    if (m?.[1]) candidates.add(m[1].trim())
  } catch {
    // config check failing is not fatal — fall through to well-known paths
  }

  for (const p of ngrokDefaultConfigPaths(homedir, env)) {
    candidates.add(p)
  }

  for (const path of candidates) {
    try {
      const text = await readFile(path)
      if (configYamlHasAuthtoken(text)) return true
    } catch {
      // missing/unreadable path — try next
    }
  }
  return false
}

/** Well-known ngrok v3 config locations (macOS / Linux / Windows / XDG). */
export function ngrokDefaultConfigPaths(
  homedir: () => string = nodeHomedir,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const home = homedir()
  const paths = [
    join(home, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'), // macOS
    join(home, '.config', 'ngrok', 'ngrok.yml'), // Linux / XDG default
    join(home, 'AppData', 'Local', 'ngrok', 'ngrok.yml') // Windows
  ]
  if (env.XDG_CONFIG_HOME) {
    paths.unshift(join(env.XDG_CONFIG_HOME, 'ngrok', 'ngrok.yml'))
  }
  if (env.NGROK_CONFIG) {
    // NGROK_CONFIG may be a single file or a colon/semicolon-separated list
    for (const part of String(env.NGROK_CONFIG).split(/[:;]/)) {
      const p = part.trim()
      if (p) paths.unshift(p)
    }
  }
  return paths
}

/** True when the YAML contains a non-empty authtoken (v2 flat or v3 agent:). */
export function configYamlHasAuthtoken(yamlText: string): boolean {
  // Match `authtoken: value` at any indentation; require a non-empty value.
  // Do NOT capture/return the value — presence only.
  return /^\s*authtoken:\s*['"]?(\S+)/m.test(yamlText)
}

async function waitForNgrokPublicUrl(
  fetchJson: FetchJsonFn,
  localPort: number,
  sleep: (ms: number) => Promise<void>
): Promise<string | null> {
  for (let i = 0; i < NGROK_POLL_ATTEMPTS; i++) {
    const url = await discoverNgrokPublicUrl(fetchJson, localPort)
    if (url) return url
    await sleep(NGROK_POLL_MS)
  }
  return null
}

/**
 * Read the ngrok agent local API once and pick an https public_url for our
 * localPort (or any https tunnel if the port match is absent — free-tier agents
 * typically only run one tunnel).
 */
export async function discoverNgrokPublicUrl(
  fetchJson: FetchJsonFn,
  localPort: number
): Promise<string | null> {
  let data: unknown
  try {
    data = await fetchJson(NGROK_AGENT_API)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const tunnels = (data as { tunnels?: unknown }).tunnels
  if (!Array.isArray(tunnels)) return null

  const portTag = `:${localPort}`
  const https = tunnels
    .map((t) => {
      if (!t || typeof t !== 'object') return null
      const publicUrl = (t as { public_url?: unknown }).public_url
      if (typeof publicUrl !== 'string' || !publicUrl.startsWith('https://')) return null
      const addr = String((t as { config?: { addr?: unknown } }).config?.addr ?? '')
      return { publicUrl, addr }
    })
    .filter((t): t is { publicUrl: string; addr: string } => t != null)

  const matched = https.find((t) => t.addr.includes(portTag))
  return (matched ?? https[0])?.publicUrl ?? null
}

async function killNgrokChild(child: Pick<ChildProcess, 'pid' | 'kill'>): Promise<void> {
  try {
    if (child.pid != null) {
      // Detached process group: try the group first so orphaned children die too.
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    // best-effort teardown
  }
}

function defaultSpawn(
  cmd: string,
  args: string[],
  opts?: { detached?: boolean; stdio?: 'ignore' | 'pipe' }
): Pick<ChildProcess, 'pid' | 'kill' | 'unref'> {
  return nodeSpawn(cmd, args, {
    detached: opts?.detached ?? true,
    stdio: opts?.stdio ?? 'ignore'
  })
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function defaultReadFile(path: string): Promise<string> {
  return nodeReadFile(path, 'utf8')
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errMsg(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
