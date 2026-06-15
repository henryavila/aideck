<template>
  <div v-if="manifest && currentPage" class="consumer-view">
    <div class="page-title">
      <h1>
        <span>{{ consumerTitle }}</span>
        <span class="pt-sep"> · </span>
        <span class="pt-page">{{ currentPage.title }}</span>
      </h1>
      <span class="meta">
        <span>{{ currentPage.layout }} layout</span>
      </span>
      <div class="actions">
        <select
          v-if="hasProjectScope && projects.length"
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

    <div v-if="pages.length > 1" class="tabs-bar" role="tablist">
      <router-link
        v-for="page in pages"
        :key="page.slug"
        :to="`/${consumerId}/${page.slug}`"
        class="tb"
        :class="{ on: currentPage.slug === page.slug }"
        role="tab"
        :aria-selected="currentPage.slug === page.slug"
      >
        <span>{{ page.title }}</span>
      </router-link>
      <span class="tabs-tail">
        <span>layout · {{ currentPage.layout }}</span>
        <span style="color: var(--fg-faint)">·</span>
        <span>{{ pages.length }} pages</span>
      </span>
    </div>

    <div v-if="scopeReady" class="page-content">
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
    <div v-else class="page-state is-loading">
      <div class="skel-stack">
        <span class="skel-block" />
        <span class="skel-block" />
      </div>
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
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchConsumerManifest, fetchProjects, type ProjectSummary } from '../api.js'
import { PROJECT_ID_KEY } from '../composables/useProjectScope.js'
import SectionsLayout from '../layouts/SectionsLayout.vue'
import GridLayout from '../layouts/GridLayout.vue'
import SingleLayout from '../layouts/SingleLayout.vue'
import type { PageDecl } from '../../server/manifest-schema.js'

const route = useRoute()
const router = useRouter()
const manifest = ref<Record<string, unknown> | null>(null)

// Project scope: when the consumer has root:'project' dataSources, widgets read
// the project-scoped endpoint for the selected project. The ref is provided to
// WidgetRenderer (which injects it). Seeded from ?project= for deep-link/refresh.
const projects = ref<ProjectSummary[]>([])
// Seeded from the drill-down path param (/:consumerId/:pageSlug/:projectId/:slug)
// first, else ?project= — for deep-link/refresh into a project-scoped detail page.
const selectedProjectId = ref<string | undefined>(
  (typeof route.params.projectId === 'string' && route.params.projectId
    ? route.params.projectId
    : undefined) ?? (typeof route.query.project === 'string' ? route.query.project : undefined)
)
provide(PROJECT_ID_KEY, selectedProjectId)
// Keep the scope in sync when navigating between detail pages client-side.
watch(
  () => route.params.projectId,
  (pid) => {
    if (typeof pid === 'string' && pid) selectedProjectId.value = pid
  }
)

const consumerId = computed(() => String(route.params.consumerId))
const pageSlug = computed(() => route.params.pageSlug as string | undefined)
const dataSources = computed(
  () => (manifest.value?.dataSources as Array<{ root?: string }> | undefined) ?? []
)
const hasProjectScope = computed(() => dataSources.value.some((d) => d.root === 'project'))

// Which consumer the current `projects` / `selectedProjectId` were resolved for.
// `selectedProjectId` is a single ref that persists across consumer navigation
// (Vue reuses this route component on a param change), and it is reset only
// asynchronously inside loadManifest. Between the synchronous consumerId change
// and that async reset, widgets would otherwise fetch the NEW consumer against
// the OLD consumer's project — a cross-consumer read (404 with the server-side
// binding guard, a data leak without it). Gate the widgets on this so they never
// render until the project scope has been resolved for the consumer on screen.
const scopeConsumerId = ref<string | undefined>(undefined)
const scopeReady = computed(() => !hasProjectScope.value || scopeConsumerId.value === consumerId.value)

function selectProject(id: string): void {
  selectedProjectId.value = id
  void router.replace({ query: { ...route.query, project: id } })
}
const consumerTitle = computed(() => (manifest.value?.title as string | undefined) ?? consumerId.value)

const pages = computed(() => (manifest.value?.pages as PageDecl[]) ?? [])
const currentPage = computed(() => {
  if (pageSlug.value) return pages.value.find((p) => p.slug === pageSlug.value)
  return pages.value.find((p) => p.default) ?? pages.value[0]
})

async function loadManifest(): Promise<void> {
  // Capture the consumer this run is for, so a fast double-navigation can't mark
  // the scope ready for the wrong consumer.
  const cid = consumerId.value
  try {
    manifest.value = await fetchConsumerManifest(cid)
  } catch {
    manifest.value = null
    return
  }
  if (hasProjectScope.value) {
    projects.value = await fetchProjects(cid)
    const ids = projects.value.map((p) => p.projectId)
    if (!selectedProjectId.value || !ids.includes(selectedProjectId.value)) {
      selectedProjectId.value = ids[0]
    }
  }
  // Scope resolved for `cid` — unblocks the widgets (selectedProjectId is now this
  // consumer's own project, or undefined when it has none registered).
  scopeConsumerId.value = cid
}

onMounted(loadManifest)
watch(consumerId, loadManifest)
</script>
