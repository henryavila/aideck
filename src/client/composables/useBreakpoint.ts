import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

const QUERIES: [Breakpoint, string][] = [
  ['xl', '(min-width: 1441px)'],
  ['lg', '(min-width: 1025px) and (max-width: 1440px)'],
  ['md', '(min-width: 640px) and (max-width: 1024px)'],
  ['sm', '(max-width: 639px)'],
]

function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

function detectBreakpoint(): Breakpoint {
  if (!hasMatchMedia()) return 'lg'
  for (const [bp, query] of QUERIES) {
    if (window.matchMedia(query).matches) return bp
  }
  return 'lg'
}

export function useBreakpoint(): Ref<Breakpoint> {
  const breakpoint = ref<Breakpoint>(detectBreakpoint())

  const matchers: { mql: MediaQueryList; handler: (e: MediaQueryListEvent) => void }[] = []

  onMounted(() => {
    if (!hasMatchMedia()) return
    for (const [bp, query] of QUERIES) {
      const mql = window.matchMedia(query)
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) breakpoint.value = bp
      }
      mql.addEventListener('change', handler)
      matchers.push({ mql, handler })
    }
  })

  onUnmounted(() => {
    for (const { mql, handler } of matchers) {
      mql.removeEventListener('change', handler)
    }
    matchers.length = 0
  })

  return breakpoint
}
