import { describe, it, expect } from 'vitest'
import { parseUrlFromEnvContent } from '../../../src/cli/up.js'

describe('parseUrlFromEnvContent', () => {
  it('extracts URL from standard env file content', () => {
    const content = `# aiDeck environment — generated, do not edit
export AIDECK_URL='http://127.0.0.1:7777'
export AIDECK_PORT=7777
`
    expect(parseUrlFromEnvContent(content)).toBe('http://127.0.0.1:7777')
  })

  it('extracts URL with non-default port', () => {
    const content = `# aiDeck environment — generated, do not edit
export AIDECK_URL='http://127.0.0.1:7782'
export AIDECK_PORT=7782
`
    expect(parseUrlFromEnvContent(content)).toBe('http://127.0.0.1:7782')
  })

  it('returns null for empty content', () => {
    expect(parseUrlFromEnvContent('')).toBeNull()
  })

  it('returns null for malformed content without AIDECK_URL', () => {
    const content = `# some random file
export FOO=bar
`
    expect(parseUrlFromEnvContent(content)).toBeNull()
  })

  it('returns null for content with double quotes instead of single', () => {
    const content = `export AIDECK_URL="http://127.0.0.1:7777"\n`
    expect(parseUrlFromEnvContent(content)).toBeNull()
  })
})
