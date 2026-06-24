import type { RegisteredConsumer } from './consumer-registry.js'
import { pathMatchesGlob } from './data-source-reader.js'
import { rootAncestor } from './data-source-resolve.js'

export interface DataSourceMatch {
  consumer: string
  dataSourceId: string
}

/**
 * Classify a changed file (path relative to the watched project's rootDir, e.g.
 * `.atomic-skills/plans/foo.md`) by matching it against every registered
 * consumer's declared dataSource globs. Only `root: 'project'` sources are
 * considered — those are the ones whose `path` is resolved against the project
 * rootDir and therefore live inside the watched repo tree. Derived sources have
 * no own `path` (their parent's file event already fires) and are skipped.
 *
 * This is the agnostic replacement for the old hardcoded `classifyFile` plan/
 * initiative/projects branches: aiDeck core no longer knows any consumer's path
 * conventions — the manifest declares them.
 */
export function classifyByManifests(
  relPath: string,
  consumers: RegisteredConsumer[]
): DataSourceMatch[] {
  const out: DataSourceMatch[] = []
  for (const consumer of consumers) {
    const all = consumer.manifest.dataSources
    for (const ds of all) {
      if (!ds.path) continue
      if (rootAncestor(ds, all).root !== 'project') continue
      if (pathMatchesGlob(relPath, ds.path)) {
        out.push({ consumer: consumer.id, dataSourceId: ds.id })
      }
    }
  }
  return out
}
