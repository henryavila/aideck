import { ref, computed, watch, type Ref } from 'vue'
import { fetchConsumerManifest } from '../api.js'
import { normalizeStatusMap, type StatusOverrides } from '../utils/status.js'

export interface NavConfig {
  style?: 'tabs' | 'sidebar'
  showIcons?: boolean
}

export interface PageMeta {
  slug: string
  title: string
  icon?: string
  route?: string
  layout?: string
  default?: boolean
}

// Module-scoped so the chrome (App/Sidebar/ChromeHeader) and the routed
// ConsumerPage share ONE reactive manifest and a single fetch per consumer —
// the sidebar nav and the page body must agree on the same pages/nav/help.
const manifest = ref<Record<string, unknown> | null>(null)
const loadedId = ref<string | undefined>(undefined)
const loading = ref(false)
let inflight: Promise<void> | null = null
let inflightId: string | undefined

async function load(id: string | undefined, force = false): Promise<void> {
  if (!id) {
    manifest.value = null
    loadedId.value = undefined
    return
  }
  if (!force && loadedId.value === id && manifest.value) return
  if (!force && inflight && inflightId === id) return inflight
  inflightId = id
  loading.value = true
  inflight = (async () => {
    try {
      manifest.value = await fetchConsumerManifest(id)
      loadedId.value = id
    } catch {
      manifest.value = null
      loadedId.value = undefined
    } finally {
      loading.value = false
      inflight = null
    }
  })()
  return inflight
}

/**
 * The active consumer's manifest, keyed by the current `consumerId`. Reloads on
 * navigation between consumers; `reload()` forces a refetch (the refresh button,
 * or after a manifest-change SSE event). All derived refs are read-only views.
 */
export function useActiveManifest(consumerId: Ref<string | undefined>) {
  watch(consumerId, (id) => void load(id), { immediate: true })

  const nav = computed<NavConfig>(() => (manifest.value?.nav as NavConfig) ?? {})
  const pages = computed<PageMeta[]>(() => (manifest.value?.pages as PageMeta[]) ?? [])
  const helpSlug = computed<string | undefined>(() => manifest.value?.help as string | undefined)
  const statusMap = computed<StatusOverrides>(() => normalizeStatusMap(manifest.value?.statusMap))

  return {
    manifest,
    loading,
    nav,
    pages,
    helpSlug,
    statusMap,
    reload: () => load(consumerId.value, true)
  }
}

/** The landing page slug: explicit `default: true`, else the first declared page. */
export function landingSlug(pages: PageMeta[]): string | undefined {
  return pages.find((p) => p.default)?.slug ?? pages[0]?.slug
}

/** Order pages with the landing page pinned first (its manifest position aside). */
export function pinLanding(pages: PageMeta[]): PageMeta[] {
  const landing = pages.find((p) => p.default)
  return landing ? [landing, ...pages.filter((p) => p !== landing)] : pages
}

/** Test-only: clear the module-scoped cache so each mount starts isolated. */
export function __resetActiveManifest(): void {
  manifest.value = null
  loadedId.value = undefined
  loading.value = false
  inflight = null
  inflightId = undefined
}
