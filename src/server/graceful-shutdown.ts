import type { ServerType } from '@hono/node-server'

/** Time to let in-flight requests finish before lingering connections are force-closed. */
export const SHUTDOWN_GRACE_MS = 3_000

interface ClosableServer {
  close(cb?: (err?: Error) => void): unknown
  closeIdleConnections?: () => void
  closeAllConnections?: () => void
}

/**
 * Stop a server without the unbounded wait of a plain `server.close()`.
 *
 * `http.Server.close()` fires its callback only once EVERY connection has ended,
 * so a single long-lived SSE/keep-alive stream makes it hang forever. That is how
 * a SIGTERM'd instance became an undead process — listener closed, but still alive
 * holding the relay's connection, splitting the port with its replacement (see
 * docs/decisions.md, "instance lifecycle resilience"). We instead: stop accepting,
 * drop idle keep-alives immediately, and force-destroy whatever is left once the
 * grace window elapses.
 */
export async function closeServerGracefully(server: ServerType, graceMs = SHUTDOWN_GRACE_MS): Promise<void> {
  const s = server as unknown as ClosableServer
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      // Grace elapsed: force-destroy lingering connections (active SSE, slow clients).
      s.closeAllConnections?.()
      finish()
    }, graceMs)
    // The grace timer must not, by itself, keep the process alive.
    ;(timer as { unref?: () => void }).unref?.()

    s.close(() => finish())
    // Idle keep-alives have no in-flight request — release them now so the grace
    // window is spent only on genuinely active requests.
    s.closeIdleConnections?.()
  })
}
