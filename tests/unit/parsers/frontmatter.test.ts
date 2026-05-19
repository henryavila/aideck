import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from '../../../src/server/parsers/frontmatter.js'

describe('splitFrontmatter', () => {
  it('splits frontmatter and body with LF newlines', () => {
    const raw = '---\nfoo: 1\nbar: two\n---\n# Heading\nbody line\n'
    const res = splitFrontmatter(raw)
    expect(res).not.toBeNull()
    expect(res?.frontmatter).toBe('foo: 1\nbar: two\n')
    expect(res?.body).toBe('# Heading\nbody line\n')
  })

  it('returns null when file does not start with ---', () => {
    expect(splitFrontmatter('# no frontmatter\n')).toBeNull()
    expect(splitFrontmatter('')).toBeNull()
  })

  it('returns null when frontmatter is not closed', () => {
    expect(splitFrontmatter('---\nfoo: 1\nnever closes\n')).toBeNull()
  })

  it('does not confuse a horizontal rule (---) inside the body', () => {
    const raw = '---\nfoo: 1\n---\n# Heading\n\n---\n\nmore body\n'
    const res = splitFrontmatter(raw)
    expect(res).not.toBeNull()
    expect(res?.frontmatter).toBe('foo: 1\n')
    expect(res?.body).toBe('# Heading\n\n---\n\nmore body\n')
  })

  it('handles CRLF newlines', () => {
    const raw = '---\r\nfoo: 1\r\n---\r\nbody\r\n'
    const res = splitFrontmatter(raw)
    expect(res).not.toBeNull()
    expect(res?.frontmatter).toBe('foo: 1\r\n')
    expect(res?.body).toBe('body\r\n')
  })
})
