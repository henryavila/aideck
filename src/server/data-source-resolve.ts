import type { DataSourceDecl } from './manifest-schema.js'

/**
 * A derived source (§2a) has no `root` of its own — its baseDir must follow the
 * root *ancestor* it ultimately derives from (e.g. `phases` → `plans`,
 * root: 'project'). Walk the derivesFrom chain (cycle-guarded) to that source.
 * For a non-derived source this returns the source itself.
 */
export function rootAncestor(decl: DataSourceDecl, all: DataSourceDecl[]): DataSourceDecl {
  let cur = decl
  const seen = new Set<string>()
  while (cur.derivesFrom && !seen.has(cur.id)) {
    seen.add(cur.id)
    const parent = all.find((ds) => ds.id === cur.derivesFrom)
    if (!parent) break
    cur = parent
  }
  return cur
}
