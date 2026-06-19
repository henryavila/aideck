import type { MiddlewareHandler } from 'hono'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function isAllowedOrigin(origin: string, allowedRemoteHost?: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (LOCAL_HOSTS.has(url.hostname)) return true
    // When the dashboard is exposed (e.g. Tailscale Serve), its own origin is the
    // remote host — allow exactly that host, nothing wildcard.
    return allowedRemoteHost !== undefined && url.hostname === allowedRemoteHost
  } catch {
    return false
  }
}

/**
 * @param allowedRemoteHost When the server is exposed via the expose layer, the
 *   resolved remote hostname (e.g. host.example.ts.net). Its origin is accepted
 *   in addition to localhost. Omit for the default localhost-only behavior.
 */
export function corsMiddleware(allowedRemoteHost?: string): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin')
    const suggestion = allowedRemoteHost
      ? `aiDeck accepts requests from localhost / 127.0.0.1 and ${allowedRemoteHost}`
      : 'aiDeck only accepts requests from localhost / 127.0.0.1'
    if (c.req.method === 'OPTIONS') {
      if (!origin || isAllowedOrigin(origin, allowedRemoteHost)) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin, allowedRemoteHost)
        })
      }
      return c.json(
        { code: 'invalid_input', message: `Origin ${origin} not allowed`, suggestion },
        403,
        corsHeaders(origin, allowedRemoteHost, true)
      )
    }
    if (origin && !isAllowedOrigin(origin, allowedRemoteHost)) {
      return c.json(
        { code: 'invalid_input', message: `Origin ${origin} not allowed`, suggestion },
        403
      )
    }
    await next()
    for (const [k, v] of Object.entries(corsHeaders(origin, allowedRemoteHost))) {
      c.res.headers.set(k, v)
    }
  }
}

function corsHeaders(origin: string | undefined, allowedRemoteHost?: string, denied = false): Record<string, string> {
  const out: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Last-Event-ID',
    'Access-Control-Max-Age': '600'
  }
  if (!denied && origin && isAllowedOrigin(origin, allowedRemoteHost)) {
    out['Access-Control-Allow-Origin'] = origin
    out['Vary'] = 'Origin'
  }
  return out
}
