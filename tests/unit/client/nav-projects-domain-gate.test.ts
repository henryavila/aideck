import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * ⛔ Domain GATE for nav.style:'projects'.
 *
 * aiDeck is domain-agnostic: the project-centric shell must express itself with
 * generic primitives only (consumers, projects, pages, dataSources, scope) and
 * draw every human label from the consumer's manifest — never hardcode a
 * consumer's vocabulary. This test fails if any consumer-domain token leaks into
 * the generic shell surface this feature owns.
 *
 * Scope note: the gate scans the *feature-owned generic shell source* rather than
 * `git diff main`, because this branch already carries unrelated DS-v2 work whose
 * diff legitimately mentions some of these words in comments/examples. Scanning
 * the shell files the projects mode actually lives in is the precise, CI-stable
 * enforcement of the same invariant. Neutral fixtures (tests) are out of scope by
 * construction — they are not in this list.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

// The generic shell surface that nav.style:'projects' adds to or runs through.
const SHELL_FILES = [
  'src/client/components/shell/Sidebar.vue',
  'src/client/App.vue',
  'src/client/pages/ConsumerPage.vue',
  'src/client/composables/useActiveManifest.ts',
  'src/client/composables/useProjects.ts'
]

// Consumer-domain vocabulary forbidden in aiDeck core. `atomic-skills` is matched
// as a literal; the rest are whole-word (so generic words that merely *contain* a
// token — navigate/aggregate/propagate for "gate" — never trip the gate).
const LITERAL_FORBIDDEN = ['atomic-skills']
const WORD_FORBIDDEN = ['initiative', 'panorama', 'foco', 'frente', 'gate', 'plan', 'phase', 'task']

function leaks(source: string): string[] {
  const hits: string[] = []
  for (const term of LITERAL_FORBIDDEN) {
    if (new RegExp(term, 'i').test(source)) hits.push(term)
  }
  for (const term of WORD_FORBIDDEN) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(source)) hits.push(term)
  }
  return hits
}

describe('nav.style:projects — domain GATE (zero consumer vocabulary in the shell)', () => {
  for (const rel of SHELL_FILES) {
    it(`${rel} contains no consumer-domain tokens`, () => {
      const source = readFileSync(resolve(root, rel), 'utf8')
      expect(leaks(source)).toEqual([])
    })
  }

  it('the navSchema block declares no consumer-domain tokens', () => {
    const schema = readFileSync(resolve(root, 'src/server/manifest-schema.ts'), 'utf8')
    const block = schema.match(/const navSchema = z\.object\(\{[\s\S]*?\n\}\)/)
    expect(block, 'navSchema block not found').not.toBeNull()
    expect(leaks(block![0])).toEqual([])
  })

  it('the gate would actually catch a leak (sanity: detector is live)', () => {
    expect(leaks('const projectsLabel = "initiative"')).toContain('initiative')
    expect(leaks('read from .atomic-skills/')).toContain('atomic-skills')
    // generic words that merely contain a token must NOT trip the gate
    expect(leaks('aggregate and navigate the project')).toEqual([])
  })
})
