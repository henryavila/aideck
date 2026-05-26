<template>
  <div class="tabs-widget">
    <div class="tab-bar" role="tablist">
      <button
        v-for="(tab, i) in tabs"
        :key="i"
        class="tab-btn"
        :class="{ active: activeIndex === i }"
        role="tab"
        :aria-selected="activeIndex === i"
        @click="activeIndex = i"
      >{{ tab.label }}</button>
    </div>
    <div class="tab-content">
      <div v-if="activeTab" class="tab-panel">
        <div v-if="!activeTab.widgets || activeTab.widgets.length === 0" class="tab-empty">
          No widgets configured for this tab.
        </div>
        <div v-else class="tab-placeholder">
          {{ activeTab.widgets.length }} widget(s) — rendered by layout engine
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

interface TabDef { label: string; widgets?: unknown[] }

const tabs = computed<TabDef[]>(() => {
  const t = props.config.tabs
  if (Array.isArray(t)) return t as TabDef[]
  return []
})

const activeIndex = ref(0)
const activeTab = computed(() => tabs.value[activeIndex.value])
</script>

<style scoped>
.tabs-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab-content {
  flex: 1;
  overflow: auto;
}

.tab-panel {
  padding: var(--spacing-md);
}

.tab-empty,
.tab-placeholder {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--spacing-md);
}
</style>
