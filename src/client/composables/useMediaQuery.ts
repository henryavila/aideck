import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Reactive boolean for a CSS media query. Initialised synchronously so a `v-if`
 * driven by it matches the first client paint, then kept in sync via a `change`
 * listener. Falls back to `false` where matchMedia is unavailable (SSR / jsdom).
 *
 * Use this (rather than CSS `display`) when the two branches mount stateful or
 * data-fetching children that must not run twice — CSS toggling keeps both
 * subtrees in the DOM.
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  const matches = ref<boolean>(supported ? window.matchMedia(query).matches : false)

  let mql: MediaQueryList | null = null
  const handler = (e: MediaQueryListEvent): void => {
    matches.value = e.matches
  }

  onMounted(() => {
    if (!supported) return
    // `matches` was already seeded synchronously above; just attach the listener.
    mql = window.matchMedia(query)
    mql.addEventListener('change', handler)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', handler)
    mql = null
  })

  return matches
}
