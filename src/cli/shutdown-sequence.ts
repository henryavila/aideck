export interface ShutdownSteps {
  /** Tear down any out-of-process remote proxy (e.g. `tailscale serve off`). */
  stopExposure: () => Promise<void>
  /** Stop the HTTP server (bounded) and release the instance lock. */
  stopServer: () => Promise<void>
  /** Remove ~/.aideck/env. */
  removeEnvFile: () => Promise<void>
}

/**
 * Shut an instance down in the one safe order.
 *
 * The env file is removed LAST — only after the server has actually stopped. If
 * it were removed first (as it once was) and the stop lingered, `aideck down`
 * would report "no running instance" while a process still held the port: the
 * invisible orphan that split port 7777 (see docs/decisions.md). Proxy teardown
 * is best-effort and must never block the server stop or the env-file cleanup.
 */
export async function runShutdownSequence(steps: ShutdownSteps): Promise<void> {
  try {
    await steps.stopExposure()
  } catch {
    // best-effort: a failed proxy teardown must not strand the server or env file
  }
  await steps.stopServer()
  await steps.removeEnvFile()
}
