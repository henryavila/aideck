<template>
  <div class="consumer-page" v-if="manifest">
    <nav class="consumer-nav" v-if="pages.length > 1">
      <router-link
        v-for="page in pages"
        :key="page.slug"
        :to="`/${consumerId}/${page.slug}`"
        class="nav-tab"
        :class="{ active: currentPage?.slug === page.slug }"
      >
        {{ page.title }}
      </router-link>
    </nav>

    <div class="page-content" v-if="currentPage">
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

    <div v-else class="no-page">
      Page not found.
    </div>
  </div>
  <div v-else class="loading">Loading consumer...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchConsumerManifest } from '../api.js'
import SectionsLayout from '../layouts/SectionsLayout.vue'
import GridLayout from '../layouts/GridLayout.vue'
import SingleLayout from '../layouts/SingleLayout.vue'
import type { PageDecl } from '../../server/manifest-schema.js'

const route = useRoute()
const manifest = ref<Record<string, unknown> | null>(null)

const consumerId = computed(() => String(route.params.consumerId))
const pageSlug = computed(() => route.params.pageSlug as string | undefined)

const pages = computed(() => (manifest.value?.pages as PageDecl[]) ?? [])
const currentPage = computed(() => {
  if (pageSlug.value) return pages.value.find((p) => p.slug === pageSlug.value)
  return pages.value.find((p) => p.default) ?? pages.value[0]
})

async function loadManifest(): Promise<void> {
  try {
    manifest.value = await fetchConsumerManifest(consumerId.value)
  } catch {
    manifest.value = null
  }
}

onMounted(loadManifest)
watch(consumerId, loadManifest)
</script>

<style scoped>
.consumer-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-xl);
}

.consumer-nav {
  display: flex;
  gap: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-xs);
}

.nav-tab {
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  font-size: var(--font-size-sm);
  text-decoration: none;
}

.nav-tab:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}

.nav-tab.active {
  color: var(--color-accent);
  border-bottom: 2px solid var(--color-accent);
}

.loading,
.no-page {
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--spacing-xl);
}
</style>
