/**
 * Remote-access "expose" layer.
 *
 * aiDeck always binds 127.0.0.1 (Iron Law #4). To reach the dashboard from
 * another device, a SEPARATE local process terminates a private-tailnet HTTPS
 * connection and proxies to the loopback port. We drive Tailscale **Serve**
 * (tailnet-private) and never Funnel (public internet). The aiDeck server socket
 * itself is untouched — this module only manages the out-of-process proxy and
 * reports back the resulting remote URL.
 *
 * Pattern ported from ~/mdprobe/src/expose/index.js (same author), trimmed to the
 * three providers aiDeck needs: off / tailscale / external.
 */
import { execFile as nodeExecFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(nodeExecFile)

export type ExposeProvider = 'off' | 'tailscale' | 'tailnet' | 'external'

const PROVIDERS: ReadonlySet<string> = new Set(['off', 'tailscale', 'tailnet', 'external'])

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

export interface ExposeOptions {
  provider: ExposeProvider
  /** The loopback port aiDeck is already listening on. */
  localPort: number
  /** Public HTTPS port for the tailnet endpoint (string from CLI or number). */
  exposePort?: string | number
  /** Required when provider === 'external'; the https base the user's proxy serves. */
  remoteBaseUrl?: string
  /** Test seam. */
  execFile?: ExecFileFn
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

function errMsg(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}
