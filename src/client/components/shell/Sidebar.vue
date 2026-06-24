<template>
  <aside class="side">
    <div class="side-mobile-head">
      <span class="side-mobile-title">{{ mobileTitle }}</span>
      <button class="icon-btn" title="close" aria-label="close sidebar" @click="$emit('close')">×</button>
    </div>

    <!-- nav.style: projects — a project-centric shell. A fixed cross-project
         landing pinned at the top, then the active consumer's registered projects
         as the primary nav unit. No other consumers are listed here. -->
    <template v-if="navStyle === 'projects'">
      <router-link
        v-if="landingPage && currentId"
        :to="`/${currentId}`"
        class="consumer-row landing-row"
        :class="{ on: !currentPageSlug }"
        :title="landingPage.title"
        @click="$emit('close')"
      >
        <span class="landing-ico"><Icon :icon="landingPage.icon" /></span>
        <span class="name">{{ landingPage.title }}</span>
      </router-link>

      <div class="grp" style="margin-top: 8px">
        <span>{{ projectsLabel }}</span>
        <span class="count">{{ projects.length }}</span>
      </div>

      <template v-for="(p, i) in projects" :key="p.projectId">
        <router-link
          :to="projectTarget(p.projectId)"
          class="consumer-row"
          :class="{ on: p.projectId === selectedProjectId }"
          :title="p.projectId"
          @click="$emit('close')"
        >
          <span class="dot" :style="{ background: chartColor(i) }" />
          <span class="name">{{ p.projectId }}</span>
        </router-link>

        <!-- the selected project expands to its per-project pages -->
        <router-link
          v-for="page in (p.projectId === selectedProjectId ? navProjectPages : [])"
          :key="`${p.projectId}/${page.slug}`"
          :to="pageTarget(page, p.projectId)"
          class="page-row"
          :class="{ on: page.slug === currentPageSlug }"
          :title="page.title"
          @click="$emit('close')"
        >
          <span v-if="showIcons" class="page-ico"><Icon :icon="page.icon" /></span>
          <span class="name">{{ page.title }}</span>
        </router-link>
      </template>
    </template>

    <!-- nav.style: tabs | sidebar — consumer-centric (default, unchanged) -->
    <template v-else>
      <div class="grp">
        <span>consumers</span>
        <span class="count">{{ consumers.length }}</span>
      </div>
      <template v-for="(c, i) in consumers" :key="c.id">
        <router-link
          :to="`/${c.id}`"
          class="consumer-row"
          :class="{ on: c.id === currentId }"
          :title="c.id"
          @click="$emit('close')"
        >
          <span class="dot" :style="{ background: chartColor(i) }" />
          <span class="name">{{ c.title }}</span>
          <span class="ct">{{ c.dataSourceCount }}</span>
        </router-link>

        <!-- nav.style: sidebar — the active consumer expands to its pages nested -->
        <router-link
          v-for="page in (c.id === currentId ? navPages : [])"
          :key="`${c.id}/${page.slug}`"
          :to="page.route ?? `/${c.id}/${page.slug}`"
          class="page-row"
          :class="{ on: page.slug === currentPageSlug }"
          :title="page.title"
          @click="$emit('close')"
        >
          <span v-if="showIcons" class="page-ico"><Icon :icon="page.icon" /></span>
          <span class="name">{{ page.title }}</span>
        </router-link>
      </template>
    </template>

    <div class="grp" style="margin-top: 12px"><span>data sources</span></div>
    <div class="fs-tree">
      <div class="fs-row"><span class="fs-name fs-root">~/.aideck/</span></div>
      <div class="fs-row lvl-2"><span class="fs-name fs-root">consumers/</span></div>
      <div
        v-for="(c, i) in consumers"
        :key="c.id"
        class="fs-row lvl-3"
        :class="dirClass(i)"
      >
        <span class="fs-name">{{ c.id }}/</span>
        <span class="fs-meta">{{ c.dataSourceCount }} srcs</span>
      </div>
    </div>

    <div class="side-foot">
      <span style="flex: 1">collapse</span>
      <span class="kbd">⌘</span><span class="kbd">B</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { ConsumerSummary, ProjectSummary } from '../../api.js'
import type { PageMeta } from '../../composables/useActiveManifest.js'
import { chartColor } from '../../utils/status.js'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{
    consumers: ConsumerSummary[]
    currentId?: string
    pages?: PageMeta[]
    showIcons?: boolean
    currentPageSlug?: string
    // nav.style: 'projects' inputs (generic project-registry shell)
    navStyle?: 'tabs' | 'sidebar' | 'projects'
    projectsLabel?: string
    projects?: ProjectSummary[]
    selectedProjectId?: string
    landingPage?: PageMeta
    projectPages?: PageMeta[]
  }>(),
  {
    pages: () => [],
    showIcons: false,
    projectsLabel: 'projects',
    projects: () => [],
    projectPages: () => []
  }
)
defineEmits<{ (e: 'close'): void }>()

const mobileTitle = computed(() =>
  props.navStyle === 'projects' ? (props.landingPage?.title ?? 'navigation') : 'consumers'
)

// Nav rows render only pages flagged for nav (showInNav !== false). A hidden page
// stays routable and openable via help/?/commandPalette; it just gets no row here.
const navPages = computed(() => props.pages.filter((p) => p.showInNav !== false))
const navProjectPages = computed(() => props.projectPages.filter((p) => p.showInNav !== false))

// A project row navigates to the first per-project page scoped to that project
// (else the consumer root with the scope query) — selecting it sets the scope
// (?project=) and expands its pages.
function projectTarget(projectId: string): RouteLocationRaw {
  const first = navProjectPages.value[0]
  const path = first ? `/${props.currentId}/${first.slug}` : `/${props.currentId}`
  return { path, query: { project: projectId } }
}

function pageTarget(page: PageMeta, projectId: string): RouteLocationRaw {
  return { path: page.route ?? `/${props.currentId}/${page.slug}`, query: { project: projectId } }
}

function dirClass(i: number): string {
  const n = (i % 4) + 1
  return n === 1 ? 'dir' : `dir-${n}`
}
</script>

<style scoped>
.landing-row {
  font-weight: 600;
  color: var(--fg-default);
}
.landing-row .landing-ico {
  width: 14px;
  text-align: center;
  flex: none;
  font-size: 12px;
}
</style>
