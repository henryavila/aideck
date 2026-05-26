import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { loadManifest } from '../../../src/server/manifest-loader.js'

const FIXTURES = join(import.meta.dirname, '..', '..', 'fixtures', 'consumers')

describe('loadManifest', () => {
  it('loads and parses a valid manifest.yaml', async () => {
    const result = await loadManifest(join(FIXTURES, 'valid-consumer'))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe('valid-consumer')
      expect(result.value.dataSources).toHaveLength(1)
      expect(result.value.pages).toHaveLength(1)
    }
  })

  it('returns error for missing directory', async () => {
    const result = await loadManifest('/nonexistent/path')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('io_error')
  })

  it('returns error for directory without manifest.yaml', async () => {
    // FIXTURES dir itself has no manifest.yaml at root
    const result = await loadManifest(FIXTURES)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('io_error')
  })

  it('returns error for invalid YAML syntax', async () => {
    const result = await loadManifest(join(FIXTURES, 'broken-yaml'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_input')
      expect(result.error.message).toMatch(/YAML syntax error/)
    }
  })

  it('returns validation error for invalid manifest content', async () => {
    const result = await loadManifest(join(FIXTURES, 'broken-consumer'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Missing required fields: mcpNamespace, title, dataSources, pages
      expect(['invalid_input', 'schema_version_mismatch']).toContain(result.error.code)
    }
  })
})
