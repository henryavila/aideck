// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

describe('useBreakpoint', () => {
  let listeners: Map<string, (e: MediaQueryListEvent) => void>
  let matchStates: Map<string, boolean>

  function setMatch(query: string, matches: boolean) {
    matchStates.set(query, matches)
  }

  beforeEach(() => {
    listeners = new Map()
    matchStates = new Map()
    vi.resetModules()

    vi.stubGlobal('matchMedia', (query: string) => {
      return {
        matches: matchStates.get(query) ?? false,
        media: query,
        addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
          listeners.set(query, handler)
        },
        removeEventListener: (_event: string, _handler: (e: MediaQueryListEvent) => void) => {
          listeners.delete(query)
        },
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to lg when no media query matches', async () => {
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(bp.value).toBe('lg')
  })

  it('detects sm breakpoint (<640px)', async () => {
    setMatch('(max-width: 639px)', true)
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(bp.value).toBe('sm')
  })

  it('detects md breakpoint (640-1024px)', async () => {
    setMatch('(min-width: 640px) and (max-width: 1024px)', true)
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(bp.value).toBe('md')
  })

  it('detects lg breakpoint (1025-1440px)', async () => {
    setMatch('(min-width: 1025px) and (max-width: 1440px)', true)
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(bp.value).toBe('lg')
  })

  it('detects xl breakpoint (>1440px)', async () => {
    setMatch('(min-width: 1441px)', true)
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(bp.value).toBe('xl')
  })

  it('returns a value from the valid set', async () => {
    const { useBreakpoint } = await import('../../../src/client/composables/useBreakpoint.js')
    const bp = useBreakpoint()
    expect(['sm', 'md', 'lg', 'xl']).toContain(bp.value)
  })
})
