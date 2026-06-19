export interface RestartDeps {
  /** Stop the running instance (robust: SIGTERM + bounded wait + SIGKILL fallback). */
  down: () => Promise<number>
  /** Start a fresh instance. Returns -1 when it stays foreground (long-running). */
  serve: () => Promise<number>
}

/**
 * `aideck restart` = stop the running instance, then start a fresh one.
 *
 * `down` always runs first (even if it reports "nothing to stop") and never
 * blocks the restart: the server's shutdown is now bounded, so the old instance
 * actually exits before `serve` reconciles the port and binds.
 */
export async function runRestart(deps: RestartDeps): Promise<number> {
  await deps.down()
  return deps.serve()
}
