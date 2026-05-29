<template>
  <div class="app" :class="{ 'drawer-open': drawerOpen }">
    <ChromeHeader
      :crumb="crumb"
      :has-sidebar="hasSidebar"
      @open-palette="palette.open"
      @toggle-sidebar="drawer.toggle"
    />
    <DemoBanner v-if="isDemo" />
    <div class="shell" :class="{ 'no-side': !hasSidebar }">
      <template v-if="hasSidebar">
        <div class="drawer-backdrop" @click="drawer.close" />
        <Sidebar :consumers="consumers" :current-id="currentConsumerId" @close="drawer.close" />
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
import { useRoute } from 'vue-router'
import ChromeHeader from './components/shell/ChromeHeader.vue'
import DemoBanner from './components/shell/DemoBanner.vue'
import Sidebar from './components/shell/Sidebar.vue'
import StatusBar from './components/shell/StatusBar.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useConsumers } from './composables/useConsumers.js'
import { useDemoMode } from './composables/useDemoMode.js'
import { useLiveBus } from './composables/useLiveBus.js'
import { useDrawer } from './composables/useDrawer.js'
import { usePalette } from './composables/usePalette.js'
import { fetchHealth } from './api.js'

const route = useRoute()
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
const hasSidebar = computed(() => !!currentConsumerId.value)
const crumb = computed<string[]>(() => {
  const segs: string[] = []
  if (currentConsumerId.value) segs.push(currentConsumerId.value)
  const page = route.params.pageSlug as string | undefined
  if (page) segs.push(page)
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
