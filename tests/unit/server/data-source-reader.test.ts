import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readDataSource } from '../../../src/server/data-source-reader.js'
import type { DataSourceDecl } from '../../../src/server/manifest-schema.js'

const CONSUMER_DIR = join(import.meta.dirname, '..', '..', 'fixtures', 'consumers', 'valid-consumer')

describe('readDataSource', () => {
  it('reads YAML array — 2 records with id, title, status', async () => {
    const decl: DataSourceDecl = { id: 'items', path: 'data/items.yaml', format: 'yaml' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dataSourceId).toBe('items')
    expect(result.value.records).toHaveLength(2)
    expect(result.value.records[0]).toMatchObject({ id: 'T-001', title: 'First task', status: 'active' })
    expect(result.value.records[1]).toMatchObject({ id: 'T-002', title: 'Second task', status: 'done' })
    expect(result.value.files).toHaveLength(1)
  })

  it('reads JSON file — 1 record with theme, maxItems', async () => {
    const decl: DataSourceDecl = { id: 'config', path: 'data/config.json', format: 'json' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.records).toHaveLength(1)
    expect(result.value.records[0]).toMatchObject({ theme: 'dark', maxItems: 50 })
  })

  it('reads JSONL with glob — 2 records', async () => {
    const decl: DataSourceDecl = { id: 'inbox', path: 'data/inbox/*.jsonl', format: 'jsonl' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.records.length).toBeGreaterThanOrEqual(2)
    const kinds = result.value.records.map((r) => r['kind'])
    expect(kinds).toContain('status_change')
    expect(kinds).toContain('annotation')
  })

  it('reads frontmatter with glob — 1 record with slug, _body containing narrative', async () => {
    const decl: DataSourceDecl = { id: 'plans', path: 'data/plans/*.md', format: 'frontmatter' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.records).toHaveLength(1)
    const record = result.value.records[0]
    expect(record['slug']).toBe('alpha')
    expect(record['title']).toBe('Alpha Plan')
    expect(record['status']).toBe('active')
    expect(typeof record['_body']).toBe('string')
    expect((record['_body'] as string)).toContain('Plan narrative here')
    expect(record['_file']).toBe('alpha.md')
  })

  it('returns empty records and ok for non-matching glob', async () => {
    const decl: DataSourceDecl = { id: 'nope', path: 'data/nope/*.yaml', format: 'yaml' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.records).toHaveLength(0)
    expect(result.value.files).toHaveLength(0)
  })

  it('returns io_error for unreadable file', async () => {
    const decl: DataSourceDecl = { id: 'missing', path: 'data/missing.yaml', format: 'yaml' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('io_error')
    expect(result.error.details?.['dataSourceId']).toBe('missing')
  })

  it('does not read files outside the consumer directory (path traversal)', async () => {
    // ../../../../package.json escapes tests/fixtures/consumers/valid-consumer to the repo root.
    const decl: DataSourceDecl = { id: 'evil', path: '../../../../package.json', format: 'json' }
    const result = await readDataSource(CONSUMER_DIR, decl)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Containment rejects the escaping path -> nothing read.
    expect(result.value.files).toHaveLength(0)
    expect(result.value.records).toHaveLength(0)
  })
})
