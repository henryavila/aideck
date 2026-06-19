import type { MiddlewareHandler } from 'hono'

/** Hosts always accepted — the loopback names aiDeck binds by default. */
export const DEFAULT_ALLOWED_HOSTS: readonly string[] = ['localhost', '127.0.0.1', '::1']

/** Strip the port from a `Host` header value, handling IPv6 `[..]` literals. */
export function hostnameFromHeader(hostHeader: string): string {
  const trimmed = hostHeader.trim()
  if (trimmed.startsWith('[')) {
    const close = trimmed.indexOf(']')
    return (close >= 0 ? trimmed.slice(1, close) : trimmed.slice(1)).toLowerCase()
  }
  const colon = trimmed.indexOf(':')
  return (colon >= 0 ? trimmed.slice(0, colon) : trimmed).toLowerCase()
}

export function isAllowedHost(hostHeader: string, allowed: ReadonlySet<string>): boolean {
  const host = hostnameFromHeader(hostHeader)
  return host.length > 0 && allowed.has(host)
}

/**
 * Reject requests whose `Host` header is not in the allowlist. This is the
 * defense that makes a direct tailnet bind safe (Iron Law #4, exception 2): it
 * closes **DNS rebinding**, where a malicious page rebinds its own hostname to
 * this node's Tailscale IP and then talks to aiDeck as if same-origin.
 *
 * Browsers ALWAYS send `Host`, so a present-but-disallowed Host is rejected. An
 * absent `Host` (non-browser clients, HTTP/1.0) is allowed — such callers already
 * have unauthenticated access by design and cannot mount a rebinding attack. Only
 * mount this when aiDeck is bound to a routable address; on a loopback-only bind
 * the rebinding vector is already closed by the OS + browser private-network rules.
 */
export function hostGuard(allowedHosts: readonly string[] = []): MiddlewareHandler {
  const allowed = new Set<string>([
    ...DEFAULT_ALLOWED_HOSTS,
    ...allowedHosts.map((h) => h.toLowerCase())
  ])
  const suggestion = `aiDeck accepts requests addressed to ${[...allowed].join(', ')}`
  return async (c, next) => {
    const host = c.req.header('host')
    if (host && !isAllowedHost(host, allowed)) {
      return c.json({ code: 'invalid_input', message: `Host ${host} not allowed`, suggestion }, 403)
    }
    await next()
  }
}
