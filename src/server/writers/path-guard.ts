import { isAbsolute, relative, resolve } from 'node:path'

/**
 * True when `target` resolves to `dir` itself or a path nested inside it.
 * Uses path.relative (not string prefix) so sibling directories sharing a
 * name prefix (e.g. `/a/bcd` vs `/a/b`) are not falsely accepted, and `..`
 * segments that escape are rejected.
 */
export function isWithinDir(target: string, dir: string): boolean {
  const resolvedDir = resolve(dir)
  const resolvedTarget = resolve(target)
  if (resolvedTarget === resolvedDir) return true
  const rel = relative(resolvedDir, resolvedTarget)
  return rel.length > 0 && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * Resolve `target` relative to `baseDir` and return the absolute path ONLY if
 * it stays within `baseDir`. Returns null when the resolved path escapes
 * `baseDir` (path traversal). This is the single containment primitive shared
 * by every write/read/exec surface so the consumer-directory boundary
 * (Iron Law #1) is enforced consistently.
 */
export function resolveWithinDir(baseDir: string, target: string): string | null {
  const resolved = resolve(baseDir, target)
  return isWithinDir(resolved, baseDir) ? resolved : null
}
