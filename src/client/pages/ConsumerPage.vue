<template>
  <div v-if="manifest && currentPage" class="consumer-view">
    <div class="page-title">
      <h1>
        <template v-if="!globalLanding">
          <span>{{ consumerTitle }}</span>
          <span class="pt-sep"> · </span>
        </template>
        <span class="pt-page">{{ currentPage.title }}</span>
      </h1>
      <div class="actions">
        <select
          v-if="hasProjectScope && projects.length && !projectsMode"
          class="project-select"
          :value="selectedProjectId"
          aria-label="Select project"
          @change="selectProject(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="p in projects" :key="p.projectId" :value="p.projectId">{{ p.projectId }}</option>
        </select>
        <button class="btn btn-ghost" @click="loadManifest"><span class="gly">↻</span>refresh</button>
      </div>
    </div>

    <div v-if="navPages.length > 1 && !sidebarNav && !projectsMode" class="tabs-bar" role="tablist">
      <router-link
        v-for="page in navPages"
        :key="page.slug"
        :to="page.route ?? `/${consumerId}/${page.slug}`"
        class="tb"
        :class="{ on: currentPage.slug === page.slug }"
        role="tab"
        :aria-selected="currentPage.slug === page.slug"
      >
        <span v-if="showIcons" class="tb-ico"><Icon :icon="page.icon" /></span>
        <span>{{ page.title }}</span>
        <span class="ct">{{ pageWidgetCount(page) }}</span>
      </router-link>
      <span class="tabs-tail">
        <span>{{ navPages.length }} pages</span>
      </span>
    </div>

    <div class="page-content">
      <SectionsLayout
        v-if="currentPage.layout === 'sections'"
        :sections="currentPage.sections ?? []"
        :consumer-id="consumerId"
      />
      <GridLayout
        v-else-if="currentPage.layout === 'grid'"
        :widgets="currentPage.widgets ?? []"
        :columns="currentPage.columns"
        :row-height="currentPage.rowHeight"
        :gap="currentPage.gap"
        :align="currentPage.align"
        :padding="currentPage.padding"
        :consumer-id="consumerId"
      />
      <SingleLayout
        v-else-if="currentPage.layout === 'single'"
        :widget="currentPage.widget ?? ''"
        :source="currentPage.source"
        :config="currentPage.config"
        :consumer-id="consumerId"
      />
    </div>
  </div>

  <div v-else-if="manifest && !currentPage" class="page-state">
    <div class="ps-headline">Page not found</div>
    <div class="ps-sub">This consumer has no page matching the route.</div>
  </div>

  <div v-else class="page-state is-loading">
    <div class="skel-stack">
      <span class="skel-block" />
      <span class="skel-block" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchProjects, type ProjectSummary } from '../api.js'
import { PROJECT_ID_KEY } from '../composables/useProjectScope.js'
import { nonLandingPages, resolveLandingSlug, useActiveManifest } from '../composables/useActiveManifest.js'
import { PAGE_STATE_KEY, type PageState } from '../composables/usePageState.js'
import { STATUS_MAP_KEY } from '../utils/status.js'
import { resolveSelectedProjectId } from '../utils/projectScope.js'
import Icon from '../components/shell/Icon.vue'
import SectionsLayout from '../layouts/SectionsLayout.vue'
import GridLayout from '../layouts/GridLayout.vue'
import SingleLayout from '../layouts/SingleLayout.vue'
import type { PageDecl } from '../../server/manifest-schema.js'

const route = useRoute()
const router = useRouter()
const props = withDefaults(
  defineProps<{
    consumerId?: string
    pageSlug?: string
    globalLanding?: boolean
  }>(),
  { globalLanding: false }
)
const globalLanding = computed(() => props.globalLanding)

// Project scope: when the consumer has root:'project' dataSources, widgets read
// the project-scoped endpoint for the selected project. The ref is provided to
// WidgetRenderer (which injects it). Seeded from ?project= for deep-link/refresh.
const projects = ref<ProjectSummary[]>([])
const selectedProjectId = ref<string | undefined>(
  (typeof route.params.projectId === 'string' && route.params.projectId
    ? route.params.projectId
    : undefined) ?? (typeof route.query.project === 'string' ? route.query.project : undefined)
)
provide(PROJECT_ID_KEY, selectedProjectId)
// Keep the scope in sync when navigating between detail pages client-side, from
// either the drill-down path param or the ?project= query (the projects shell
// switches scope via the sidebar by changing the query).
watch(
  () => route.params.projectId,
  (pid) => {
    if (typeof pid === 'string' && pid) selectedProjectId.value = pid
  }
)
watch(
  () => route.query.project,
  (proj) => {
    if (typeof proj === 'string' && proj) selectedProjectId.value = proj
  }
)

const consumerId = computed(() => props.consumerId ?? String(route.params.consumerId))
const pageSlug = computed(() => props.pageSlug ?? (route.params.pageSlug as string | undefined))

// Shared with the chrome/sidebar so nav and page body agree on one manifest.
const { manifest, nav, statusMap, reload } = useActiveManifest(consumerId)
// Manifest-level statusMap → default status vocabulary for every descendant widget.
provide(STATUS_MAP_KEY, statusMap)

// Cross-widget interaction state, scoped to the page and reset on navigation so
// a selection never bleeds across consumers or pages.
const pageState = ref<PageState>({})
provide(PAGE_STATE_KEY, pageState)
watch(
  () => [consumerId.value, pageSlug.value],
  () => {
    pageState.value = {}
  }
)

// nav.style: sidebar moves page navigation into the left Sidebar, so the in-page
// tab bar is suppressed; tabs remain the default. nav.style: projects likewise
// owns nav (landing + projects) in the sidebar, so it suppresses tabs + the
// in-page project picker too.
const sidebarNav = computed(() => nav.value.style === 'sidebar')
const projectsMode = computed(() => nav.value.style === 'projects')
const showIcons = computed(() => nav.value.showIcons === true)

const dataSources = computed(
  () => (manifest.value?.dataSources as Array<{ root?: string }> | undefined) ?? []
)
const hasProjectScope = computed(() => dataSources.value.some((d) => d.root === 'project'))

function selectProject(id: string): void {
  selectedProjectId.value = id
  void router.replace({ query: { ...route.query, project: id } })
}
const consumerTitle = computed(() => (manifest.value?.title as string | undefined) ?? consumerId.value)

const pages = computed(() => (manifest.value?.pages as PageDecl[]) ?? [])
const landingPageSlug = computed(() => resolveLandingSlug(pages.value, nav.value))
const projectPages = computed(() => nonLandingPages(pages.value, landingPageSlug.value))
const isProjectsLanding = computed(
  () => projectsMode.value && (!pageSlug.value || pageSlug.value === landingPageSlug.value)
)
// The tab bar lists only nav-visible pages; a showInNav:false page stays routable
// (currentPage still resolves it below) but gets no tab.
const navPages = computed(() => pages.value.filter((p) => p.showInNav !== false))
const currentPage = computed(() => {
  if (pageSlug.value) return pages.value.find((p) => p.slug === pageSlug.value)
  // Consumer root: an explicit nav.landingPage wins (the projects-shell
  // cross-project landing), else the default/first page.
  if (landingPageSlug.value) {
    const found = pages.value.find((p) => p.slug === landingPageSlug.value)
    if (found) return found
  }
  return pages.value.find((p) => p.default) ?? pages.value[0]
})

function pageWidgetCount(page: PageDecl): number {
  if (page.layout === 'sections') {
    return (page.sections ?? []).reduce((n, s) => n + (s.widgets?.length ?? 0), 0)
  }
  if (page.layout === 'grid') return (page.widgets ?? []).length
  return 1
}

function routeProjectId(): string | undefined {
  if (isProjectsLanding.value) return undefined
  return resolveSelectedProjectId({
    queryProject: route.query.project,
    pathProjectId: route.params.projectId,
    routeParam: route.params.routeParam,
    pageSlug: pageSlug.value,
    landingSlug: landingPageSlug.value,
    pages: projectPages.value,
    projects: projects.value
  })
}

function syncRouteProjectId(): void {
  const next = routeProjectId()
  if (next) selectedProjectId.value = next
  else if (isProjectsLanding.value) selectedProjectId.value = undefined
}

// Project-scoped consumers seed their project list once the manifest resolves.
watch(
  manifest,
  async (m) => {
    if (!m || !hasProjectScope.value) return
    projects.value = await fetchProjects(consumerId.value)
    if (isProjectsLanding.value) {
      selectedProjectId.value = undefined
      return
    }
    const routeScoped = routeProjectId()
    if (routeScoped) {
      selectedProjectId.value = routeScoped
      return
    }
    const ids = projects.value.map((p) => p.projectId)
    if (!selectedProjectId.value || !ids.includes(selectedProjectId.value)) {
      selectedProjectId.value = ids[0]
    }
  },
  { immediate: true }
)

watch(
  () => [
    route.params.projectId,
    route.params.routeParam,
    route.query.project,
    pageSlug.value,
    projects.value,
    projectPages.value
  ],
  () => syncRouteProjectId()
)

function loadManifest(): void {
  void reload()
}
</script>
