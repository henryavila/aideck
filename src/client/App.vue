<template>
  <div class="app" :class="{ 'drawer-open': drawerOpen }">
    <ChromeHeader
      :crumb="crumb"
      :has-sidebar="hasSidebar"
      :has-help="!!helpSlug"
      :help-active="helpActive"
      @open-palette="palette.open"
      @toggle-sidebar="drawer.toggle"
      @open-help="openHelp"
    />
    <DemoBanner v-if="isDemo" />
    <div class="shell" :class="{ 'no-side': !hasSidebar }">
      <template v-if="hasSidebar">
        <div class="drawer-backdrop" @click="drawer.close" />
        <Sidebar
          :consumers="consumers"
          :current-id="currentConsumerId"
          :pages="sidebarPages"
          :show-icons="nav.showIcons === true"
          :current-page-slug="activePageSlug"
          :nav-style="navStyle"
          :projects-label="projectsLabel"
          :projects="projects"
          :selected-project-id="selectedProjectId"
          :landing-page="landingPage"
          :project-pages="projectPages"
          @close="drawer.close"
        />
      </template>
      <main class="main">
        <router-view />
      </main>
    </div>
    <StatusBar :consumer-count="consumers.length" :connected="connected" :version="version" />
    <CommandPalette />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChromeHeader from './components/shell/ChromeHeader.vue'
import DemoBanner from './components/shell/DemoBanner.vue'
import Sidebar from './components/shell/Sidebar.vue'
import StatusBar from './components/shell/StatusBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useConsumers } from './composables/useConsumers.js'
import {
  useActiveManifest,
  pinLanding,
  resolveLandingSlug,
  nonLandingPages
} from './composables/useActiveManifest.js'
import { useProjects } from './composables/useProjects.js'
import { useDemoMode } from './composables/useDemoMode.js'
import { useLiveBus } from './composables/useLiveBus.js'
import { useDrawer } from './composables/useDrawer.js'
import { usePalette } from './composables/usePalette.js'
import { fetchHealth } from './api.js'

const route = useRoute()
const router = useRouter()
const { consumers } = useConsumers()
const { isDemo } = useDemoMode()
const { connected } = useLiveBus()
const drawer = useDrawer()
const drawerOpen = drawer.isOpen
const palette = usePalette()

const version = ref('0.0.1')
onMounted(async () => {
  try {
    version.value = (await fetchHealth()).version
  } catch {
    // health fetch failure is non-fatal for the status bar
  }
})

const currentConsumerId = computed(() => route.params.consumerId as string | undefined)
const currentPageSlug = computed(() => route.params.pageSlug as string | undefined)
const hasSidebar = computed(() => !!currentConsumerId.value)

const { nav, pages, helpSlug } = useActiveManifest(currentConsumerId)

const navStyle = computed(() => nav.value.style)
const projectsMode = computed(() => navStyle.value === 'projects')

// nav.style: projects — a project-centric shell. The cross-project landing is the
// explicit nav.landingPage (else the default page); the remaining pages are the
// per-project pages a selected project expands to. The group label is consumer-
// owned (nav.projectsLabel), defaulting to a generic English word.
const landingPageSlug = computed(() => resolveLandingSlug(pages.value, nav.value))
const landingPage = computed(() => pages.value.find((p) => p.slug === landingPageSlug.value))
const projectPages = computed(() => nonLandingPages(pages.value, landingPageSlug.value))
const projectsLabel = computed(() => nav.value.projectsLabel ?? 'projects')

// Registered projects for the project-centric shell — fetched only in that mode.
const { projects } = useProjects(currentConsumerId, projectsMode)

// The scope reflected in the URL: ?project= (or a drill-down :projectId param).
const selectedProjectId = computed(
  () =>
    (typeof route.query.project === 'string' ? route.query.project : undefined) ??
    (typeof route.params.projectId === 'string' ? route.params.projectId : undefined)
)

// Sidebar pages (only under nav.style: sidebar): the landing page is pinned to
// the top regardless of its position in the manifest array. At the consumer root
// (no pageSlug) the landing page renders, so its row reads active there too.
const sidebarPages = computed(() => (navStyle.value === 'sidebar' ? pinLanding(pages.value) : []))
const activePageSlug = computed(() => currentPageSlug.value ?? landingPageSlug.value)

// The chrome `?` opens the consumer's declared help page; it reads active when
// that page is the one showing. Help is reached from chrome, not the page nav.
const helpActive = computed(() => !!helpSlug.value && currentPageSlug.value === helpSlug.value)
function openHelp(): void {
  if (helpSlug.value && currentConsumerId.value) {
    void router.push(`/${currentConsumerId.value}/${helpSlug.value}`)
  }
}
const crumb = computed<string[]>(() => {
  const segs: string[] = []
  if (currentConsumerId.value) segs.push(currentConsumerId.value)
  // projects shell: consumer / project / page. The project segment appears only
  // on a scoped page, never on the cross-project landing (root).
  if (projectsMode.value && selectedProjectId.value && currentPageSlug.value) {
    segs.push(selectedProjectId.value)
  }
  if (currentPageSlug.value) segs.push(currentPageSlug.value)
  return segs
})

watch(() => route.fullPath, () => drawer.close())

function onKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    palette.toggle()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>
