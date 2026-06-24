import { describe, expect, it } from 'vitest'
import { pathMatchesGlob } from '../../../src/server/data-source-reader.js'
import { classifyByManifests } from '../../../src/server/watch-classify.js'
import type { RegisteredConsumer } from '../../../src/server/consumer-registry.js'
import type { DataSourceDecl } from '../../../src/server/manifest-schema.js'

describe('pathMatchesGlob', () => {
  it('matches a single-star segment', () => {
    expect(pathMatchesGlob('.atomic-skills/x/plans/foo.md', '.atomic-skills/*/plans/foo.md')).toBe(true)
    expect(pathMatchesGlob('.atomic-skills/x/y/plans/foo.md', '.atomic-skills/*/plans/foo.md')).toBe(false)
  })

  it('matches in-segment wildcards', () => {
    expect(pathMatchesGlob('projects/proj-a/plan.md', 'projects/*/plan.md')).toBe(true)
    expect(pathMatchesGlob('f5-inc7.md', 'f*-*.md')).toBe(true)
    expect(pathMatchesGlob('nope.md', 'f*-*.md')).toBe(false)
  })

  it('** matches any depth including zero', () => {
    expect(pathMatchesGlob('plans/foo.md', 'plans/**/*.md')).toBe(true)
    expect(pathMatchesGlob('plans/archive/old.md', 'plans/**/*.md')).toBe(true)
    expect(pathMatchesGlob('plans/a/b/c/deep.md', 'plans/**/*.md')).toBe(true)
  })

  it('** at the boundary of projects/<id>/<slug>/phases/**', () => {
    const g = '.atomic-skills/projects/*/*/phases/**/*.md'
    expect(pathMatchesGlob('.atomic-skills/projects/p/s/phases/f0.md', g)).toBe(true)
    expect(pathMatchesGlob('.atomic-skills/projects/p/s/phases/archive/old.md', g)).toBe(true)
    expect(pathMatchesGlob('.atomic-skills/projects/p/s/plan.md', g)).toBe(false)
  })

  it('does not match a different extension or prefix', () => {
    expect(pathMatchesGlob('plans/foo.yaml', 'plans/**/*.md')).toBe(false)
    expect(pathMatchesGlob('other/foo.md', 'plans/**/*.md')).toBe(false)
  })
})

function consumer(id: string, dataSources: DataSourceDecl[]): RegisteredConsumer {
  return { id, dir: '/tmp/' + id, manifest: { dataSources } as RegisteredConsumer['manifest'] }
}

describe('classifyByManifests', () => {
  const consumers = [
    consumer('project-status', [
      { id: 'plans', path: '.atomic-skills/*/plans/**/*.md', format: 'frontmatter', root: 'project' },
      { id: 'project-plans', path: '.atomic-skills/projects/*/*/plan.md', format: 'frontmatter', root: 'project', captures: ['projectId', 'planSlug'] },
      // consumer-rooted source must be ignored by the watcher (not in the project tree)
      { id: 'local', path: 'data/local.yaml', format: 'yaml', root: 'consumer' },
      // derived source has no path — skipped
      { id: 'tasks', derivesFrom: 'plans', explode: 'tasks' }
    ])
  ]

  it('matches a project-rooted glob and returns {consumer, dataSourceId}', () => {
    expect(classifyByManifests('.atomic-skills/project-status/plans/p.md', consumers)).toEqual([
      { consumer: 'project-status', dataSourceId: 'plans' }
    ])
  })

  it('matches the nested project plan glob', () => {
    expect(classifyByManifests('.atomic-skills/projects/proj-a/plan-one/plan.md', consumers)).toEqual([
      { consumer: 'project-status', dataSourceId: 'project-plans' }
    ])
  })

  it('ignores consumer-rooted and derived sources', () => {
    expect(classifyByManifests('data/local.yaml', consumers)).toEqual([])
  })

  it('returns empty for an unmatched path', () => {
    expect(classifyByManifests('.atomic-skills/project-status/reviews/r.md', consumers)).toEqual([])
  })
})
