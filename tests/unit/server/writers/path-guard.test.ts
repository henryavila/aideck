import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { isWithinDir, resolveWithinDir } from '../../../../src/server/writers/path-guard.js'

describe('path-guard', () => {
  const base = '/srv/consumers/demo'

  it('accepts the dir itself and nested paths', () => {
    expect(isWithinDir(base, base)).toBe(true)
    expect(isWithinDir(join(base, 'data/x.jsonl'), base)).toBe(true)
  })

  it('rejects parent, sibling, and prefix-sibling escapes', () => {
    expect(isWithinDir('/srv/consumers/other', base)).toBe(false)
    // prefix sibling: /srv/consumers/demo-evil must NOT be considered inside /srv/consumers/demo
    expect(isWithinDir('/srv/consumers/demo-evil', base)).toBe(false)
    expect(isWithinDir(join(base, '../secret'), base)).toBe(false)
  })

  it('resolveWithinDir returns absolute path for contained target', () => {
    expect(resolveWithinDir(base, 'data/x.jsonl')).toBe(join(base, 'data/x.jsonl'))
  })

  it('resolveWithinDir returns null for traversal escapes', () => {
    expect(resolveWithinDir(base, '../../etc/passwd')).toBeNull()
    expect(resolveWithinDir(base, 'data/../../../etc/passwd')).toBeNull()
  })
})
