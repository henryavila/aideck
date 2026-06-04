import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { explodeRecords, readDataSource } from '../../../src/server/data-source-reader.js'
import type { DataSourceDecl } from '../../../src/server/manifest-schema.js'

const REPO = join(import.meta.dirname, '..', '..', 'fixtures', 'projects', 'sample-repo')

describe('explodeRecords — §2a array-explode (pure)', () => {
  const parents = [
    {
      slug: 'plan-one',
      projectId: 'proj-a',
      currentPhase: 'F1',
      phases: [
        { id: 'F0', status: 'done' },
        { id: 'F1', status: 'active' }
      ]
    },
    { slug: 'plan-two', projectId: 'proj-b', phases: [] },
    { slug: 'plan-three', projectId: 'proj-c' } // no phases field
  ]

  it('flattens the array field into one record per element', () => {
    const rows = explodeRecords(parents, 'phases', ['projectId', 'currentPhase'])
    expect(rows).toHaveLength(2) // only plan-one has elements
  })

  it('carries the named parent scalars and adds _parentId/_index', () => {
    const rows = explodeRecords(parents, 'phases', ['projectId', 'currentPhase'])
    expect(rows[0]).toMatchObject({
      id: 'F0',
      status: 'done',
      projectId: 'proj-a',
      currentPhase: 'F1',
      _parentId: 'plan-one',
      _index: 0
    })
    expect(rows[1]).toMatchObject({ id: 'F1', _parentId: 'plan-one', _index: 1 })
  })

  it('only carries fields that exist on the parent', () => {
    const rows = explodeRecords(parents, 'phases', ['projectId', 'missingField'])
    expect(rows[0]).not.toHaveProperty('missingField')
    expect(rows[0]).toHaveProperty('projectId', 'proj-a')
  })

  it('falls back to id when the parent has no slug', () => {
    const rows = explodeRecords([{ id: 'p1', items: [{ x: 1 }] }], 'items', [])
    expect(rows[0]).toMatchObject({ x: 1, _parentId: 'p1', _index: 0 })
  })

  it('skips parents whose field is missing or not an array', () => {
    expect(explodeRecords([{ slug: 'a', phases: 'nope' }], 'phases', [])).toHaveLength(0)
    expect(explodeRecords([{ slug: 'a' }], 'phases', [])).toHaveLength(0)
  })

  it('wraps scalar array elements under `value`', () => {
    const rows = explodeRecords([{ slug: 'a', tags: ['x', 'y'] }], 'tags', [])
    expect(rows).toEqual([
      { value: 'x', _parentId: 'a', _index: 0 },
      { value: 'y', _parentId: 'a', _index: 1 }
    ])
  })
})

describe('readDataSource — §2a derived/exploded source (integration)', () => {
  const plansDecl: DataSourceDecl = {
    id: 'plans',
    path: '.atomic-skills/projects/*/*/plan.md',
    format: 'frontmatter',
    root: 'project',
    captures: ['projectId', 'planSlug']
  }
  const phasesDecl: DataSourceDecl = {
    id: 'phases',
    derivesFrom: 'plans',
    explode: 'phases',
    carry: ['projectId', 'planSlug', 'currentPhase']
  }

  it('reads the parent then explodes its nested array, carrying captures', async () => {
    const r = await readDataSource(REPO, phasesDecl, [plansDecl, phasesDecl])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // plan-one (proj-a) has 2 phases; plan-two (proj-b) has none → 2 rows
    expect(r.value.records).toHaveLength(2)
    const f1 = r.value.records.find((x) => x['id'] === 'F1')
    expect(f1).toMatchObject({
      id: 'F1',
      status: 'active',
      tasksDone: 1,
      tasksTotal: 3,
      projectId: 'proj-a', // injected capture, carried down
      planSlug: 'plan-one',
      currentPhase: 'F1',
      _parentId: 'plan-one',
      _index: 1
    })
  })

  it('errors when derivesFrom references an unknown parent source', async () => {
    const orphan: DataSourceDecl = { id: 'orphan', derivesFrom: 'nope', explode: 'x' }
    const r = await readDataSource(REPO, orphan, [orphan])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('validation_error')
    expect(r.error.message).toContain('unknown parent')
  })

  it('errors on a derivesFrom cycle instead of overflowing the stack (A→B→A)', async () => {
    const a: DataSourceDecl = { id: 'a', derivesFrom: 'b', explode: 'x' }
    const b: DataSourceDecl = { id: 'b', derivesFrom: 'a', explode: 'x' }
    const r = await readDataSource(REPO, a, [a, b])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('validation_error')
    expect(r.error.message).toContain('cycle')
  })

  it('errors on a self-referential derivesFrom (A→A)', async () => {
    const a: DataSourceDecl = { id: 'a', derivesFrom: 'a', explode: 'x' }
    const r = await readDataSource(REPO, a, [a])
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('validation_error')
    expect(r.error.message).toContain('cycle')
  })
})
