import type { MiddlewareHandler } from 'hono'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function isAllowedOrigin(origin: string, allowedRemoteHosts: ReadonlySet<string>): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (LOCAL_HOSTS.has(url.hostname)) return true
    // When the dashboard is exposed (Tailscale Serve or a direct tailnet bind), its own
    // origin(s) are the remote host name and/or IP — allow exactly those, nothing wildcard.
    return allowedRemoteHosts.has(url.hostname)
  } catch {
    return false
  }
}

function toHostSet(allowedRemoteHost?: string | readonly string[]): Set<string> {
  if (allowedRemoteHost == null) return new Set()
  return new Set(Array.isArray(allowedRemoteHost) ? allowedRemoteHost : [allowedRemoteHost as string])
}

/**
 * @param allowedRemoteHost When the server is exposed via the expose layer, the resolved
 *   remote hostname(s) (e.g. `host.example.ts.net`, and for a direct tailnet bind also the
 *   `100.x` IP). Their origins are accepted in addition to localhost. Omit for the default
 *   localhost-only behavior.
 */
export function corsMiddleware(allowedRemoteHost?: string | readonly string[]): MiddlewareHandler {
  const hosts = toHostSet(allowedRemoteHost)
  const suggestion = hosts.size
    ? `aiDeck accepts requests from localhost / 127.0.0.1 and ${[...hosts].join(', ')}`
    : 'aiDeck only accepts requests from localhost / 127.0.0.1'
  return async (c, next) => {
    const origin = c.req.header('origin')
    if (c.req.method === 'OPTIONS') {
      if (!origin || isAllowedOrigin(origin, hosts)) {
        return new Response(null, { status: 204, headers: corsHeaders(origin, hosts) })
      }
      return c.json(
        { code: 'invalid_input', message: `Origin ${origin} not allowed`, suggestion },
        403,
        corsHeaders(origin, hosts, true)
      )
    }
    if (origin && !isAllowedOrigin(origin, hosts)) {
      return c.json({ code: 'invalid_input', message: `Origin ${origin} not allowed`, suggestion }, 403)
    }
    await next()
    for (const [k, v] of Object.entries(corsHeaders(origin, hosts))) {
      c.res.headers.set(k, v)
    }
  }
}

function corsHeaders(origin: string | undefined, hosts: ReadonlySet<string>, denied = false): Record<string, string> {
  const out: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    'Access-Control-Max-Age': '600'
  }
  if (!denied && origin && isAllowedOrigin(origin, hosts)) {
    out['Access-Control-Allow-Origin'] = origin
    out['Vary'] = 'Origin'
  }
  return out
}
