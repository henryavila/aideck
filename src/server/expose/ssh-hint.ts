/**
 * SSH local-forward connection hint.
 *
 * The most generic and most secure way to reach the dashboard from another
 * machine: the user's own authenticated SSH session forwards a local port to
 * aiDeck's loopback socket. aiDeck binds 127.0.0.1 only (Iron Law #4) and this
 * path keeps it that way — nothing new is exposed, no proxy process is spawned,
 * no relay or credential is involved. aiDeck merely PRINTS the command for the
 * user to run from their client; it never executes it.
 *
 * The one detail worth getting right is the SSH port: it must be the host's
 * REAL sshd port, never an assumed 22. We resolve it in layers, most reliable
 * first:
 *   1. `$SSH_CONNECTION` — when aiDeck runs inside an SSH session, its 4th
 *      field is the exact server port the session arrived on.
 *   2. `Port` in sshd_config (+ `sshd_config.d/*.conf` drop-ins).
 *   3. Fall back to 22, with an explicit warning that it is a guess.
 */
import { readdir, readFile } from 'node:fs/promises'
import { hostname, userInfo } from 'node:os'
import { join } from 'node:path'

export const DEFAULT_SSH_PORT = 22

const SSHD_CONFIG_PATH = '/etc/ssh/sshd_config'
const SSHD_CONFIG_DROPIN_DIR = '/etc/ssh/sshd_config.d'

export type SshPortSource = 'ssh-connection' | 'sshd-config' | 'default'

export interface ResolvedSshPort {
  port: number
  source: SshPortSource
  warnings: string[]
}

function isValidPort(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 65535
}

/** Parse the server-side port from `$SSH_CONNECTION` ("cip cport sip sport"). */
export function portFromSshConnection(env: NodeJS.ProcessEnv): number | null {
  const raw = env.SSH_CONNECTION
  if (!raw) return null
  const parts = String(raw).trim().split(/\s+/)
  if (parts.length < 4) return null
  const port = Number(parts[3])
  return isValidPort(port) ? port : null
}

/** First uncommented `Port N` across the given sshd_config file contents. */
export function portFromSshdConfig(configTexts: readonly string[]): number | null {
  for (const text of configTexts) {
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = /^Port\s+(\d+)\s*$/i.exec(trimmed)
      if (!match) continue
      const port = Number(match[1])
      if (isValidPort(port)) return port
    }
  }
  return null
}

/**
 * Resolve the sshd port from already-gathered sources. Pure — the CLI feeds it
 * `process.env` and the sshd_config contents; tests feed fakes.
 */
export function detectSshPort(sources: {
  env: NodeJS.ProcessEnv
  configTexts: readonly string[]
}): ResolvedSshPort {
  const fromSession = portFromSshConnection(sources.env)
  if (fromSession !== null) {
    return { port: fromSession, source: 'ssh-connection', warnings: [] }
  }
  const fromConfig = portFromSshdConfig(sources.configTexts)
  if (fromConfig !== null) {
    return { port: fromConfig, source: 'sshd-config', warnings: [] }
  }
  return {
    port: DEFAULT_SSH_PORT,
    source: 'default',
    warnings: [
      `could not detect the sshd port; assuming ${DEFAULT_SSH_PORT}. ` +
        'If SSH listens elsewhere, replace -p in the command below.'
    ]
  }
}

/** Read sshd_config and its drop-in fragments; unreadable files are skipped. */
export async function loadSshdConfigTexts(): Promise<string[]> {
  const texts: string[] = []
  try {
    texts.push(await readFile(SSHD_CONFIG_PATH, 'utf8'))
  } catch {
    // unreadable (perms) or absent — fall through to drop-ins / default
  }
  try {
    const entries = await readdir(SSHD_CONFIG_DROPIN_DIR)
    for (const name of entries.filter((n) => n.endsWith('.conf')).sort()) {
      try {
        texts.push(await readFile(join(SSHD_CONFIG_DROPIN_DIR, name), 'utf8'))
      } catch {
        // skip an individual unreadable fragment
      }
    }
  } catch {
    // no drop-in dir — fine
  }
  return texts
}

export interface SshTunnelHint extends ResolvedSshPort {
  /** The `ssh -L` command the user runs from their client machine. */
  command: string
  /** Where to point the browser once the tunnel is up. */
  openUrl: string
  /** Suggested SSH target; a placeholder the user may swap for their alias. */
  host: string
}

/** Build the `ssh -L` command + open URL from a resolved port. Pure. */
export function formatSshTunnelHint(opts: {
  localPort: number
  sshPort: number
  host: string
  user: string
}): { command: string; openUrl: string } {
  const { localPort, sshPort, host, user } = opts
  const portFlag = sshPort === DEFAULT_SSH_PORT ? '' : `-p ${sshPort} `
  const command = `ssh -L ${localPort}:127.0.0.1:${localPort} ${portFlag}${user}@${host}`
  return { command, openUrl: `http://localhost:${localPort}` }
}

/**
 * Convenience used by the CLI: gather sources from the environment and produce
 * a ready-to-print hint. `host`/`user`/`env`/`loadConfigTexts` are injectable so
 * the command can be derived deterministically in tests.
 */
export async function buildSshTunnelHint(opts: {
  localPort: number
  env?: NodeJS.ProcessEnv
  host?: string
  user?: string
  loadConfigTexts?: () => Promise<string[]>
}): Promise<SshTunnelHint> {
  const env = opts.env ?? process.env
  const configTexts = await (opts.loadConfigTexts ?? loadSshdConfigTexts)()
  const resolved = detectSshPort({ env, configTexts })
  const host = opts.host ?? hostname()
  const user = opts.user ?? safeUsername()
  const { command, openUrl } = formatSshTunnelHint({
    localPort: opts.localPort,
    sshPort: resolved.port,
    host,
    user
  })
  return { ...resolved, command, openUrl, host }
}

function safeUsername(): string {
  try {
    return userInfo().username
  } catch {
    return process.env.USER ?? process.env.LOGNAME ?? 'user'
  }
}
