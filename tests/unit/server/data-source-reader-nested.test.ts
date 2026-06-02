import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readDataSource } from '../../../src/server/data-source-reader.js'
import type { DataSourceDecl } from '../../../src/server/manifest-schema.js'

// A registered project's repo root. `root: 'project'` dataSources resolve their
// path against this (here passed directly as readDataSource's baseDir — the
// route layer is what swaps consumer.dir for project.rootDir in production).
const REPO = join(import.meta.dirname, '..', '..', 'fixtures', 'projects', 'sample-repo')

describe('readDataSource — nested project layout (multi-*, **, captures)', () => {
  it('reads plans across projects and injects projectId/planSlug captures', async () => {
    const decl: DataSourceDecl = {
      id: 'plans',
      path: '.atomic-skills/projects/*/*/plan.md',
      format: 'frontmatter',
      root: 'project',
      captures: ['projectId', 'planSlug']
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.records).toHaveLength(2)
    const byProject = Object.fromEntries(r.value.records.map((x) => [x['projectId'], x]))
    expect(byProject['proj-a']).toMatchObject({ slug: 'plan-one', planSlug: 'plan-one', status: 'active' })
    expect(byProject['proj-b']).toMatchObject({ slug: 'plan-two', planSlug: 'plan-two', status: 'paused' })
  })

  it('reads phase initiatives but not the archive subdir, with 3 captures', async () => {
    const decl: DataSourceDecl = {
      id: 'initiatives',
      path: '.atomic-skills/projects/*/*/phases/*.md',
      format: 'frontmatter',
      root: 'project',
      captures: ['projectId', 'planSlug', 'phaseFile']
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const slugs = r.value.records.map((x) => x['slug']).sort()
    expect(slugs).toEqual(['f0-setup', 'f1-build']) // archive/f-legacy.md is a subdir, excluded
    expect(r.value.records.every((x) => x['projectId'] === 'proj-a')).toBe(true)
    const f1 = r.value.records.find((x) => x['slug'] === 'f1-build')
    expect(f1).toMatchObject({ planSlug: 'plan-one', phaseFile: 'f1-build.md' })
  })

  it('** matches files at any depth (includes archive)', async () => {
    const decl: DataSourceDecl = {
      id: 'all',
      path: '.atomic-skills/projects/**/*.md',
      format: 'frontmatter',
      root: 'project'
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const slugs = r.value.records.map((x) => x['slug']).sort()
    expect(slugs).toEqual(['f-legacy', 'f0-setup', 'f1-build', 'plan-one', 'plan-two'])
  })

  it('reads bootstrap-drafts inbox jsonl in order', async () => {
    const decl: DataSourceDecl = {
      id: 'inbox',
      path: '.atomic-skills/bootstrap-drafts/inbox/*.jsonl',
      format: 'jsonl',
      root: 'project'
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.records).toHaveLength(2)
    expect(r.value.records.map((x) => x['decision'])).toEqual(['approve', 'reject'])
  })

  it('a capture never clobbers an existing frontmatter field', async () => {
    const decl: DataSourceDecl = {
      id: 'plans',
      path: '.atomic-skills/projects/*/*/plan.md',
      format: 'frontmatter',
      root: 'project',
      captures: ['slug', 'planSlug'] // first capture deliberately collides with frontmatter `slug`
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // slug stays the frontmatter value; the projectId capture value never leaks into it
    expect(r.value.records.map((x) => x['slug']).sort()).toEqual(['plan-one', 'plan-two'])
  })

  it('does not escape the base dir via a no-glob traversal path', async () => {
    const decl: DataSourceDecl = {
      id: 'evil',
      path: '../../../../package.json',
      format: 'json',
      root: 'project'
    }
    const r = await readDataSource(REPO, decl)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.files).toHaveLength(0)
  })
})
