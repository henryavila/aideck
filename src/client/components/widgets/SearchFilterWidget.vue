<template>
  <div class="searchfilter-widget">
    <div class="searchfilter-bar">
      <span class="searchfilter-icon" aria-hidden="true">⌕</span>
      <input
        v-model="query"
        class="searchfilter-input"
        :placeholder="placeholder"
        type="search"
        @input="onInput"
      />
      <span class="searchfilter-count">{{ filteredCount }} of {{ source.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const placeholder = computed(() => String(props.config.placeholder ?? 'Search…'))
const filterField = computed(() => props.config.field as string | undefined)
const query = ref('')

const filteredCount = computed(() => {
  if (!query.value) return props.source.length
  const q = query.value.toLowerCase()
  return props.source.filter(r => {
    if (filterField.value) return String(r[filterField.value] ?? '').toLowerCase().includes(q)
    return Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
  }).length
})

function onInput() {
  // For v0.1: filtering UI only, parent coordination deferred
}
</script>

<style scoped>
.searchfilter-widget {
  padding: var(--spacing-sm) var(--spacing-md);
}

.searchfilter-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.searchfilter-icon {
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.searchfilter-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
}

.searchfilter-input::placeholder {
  color: var(--color-text-muted);
}

.searchfilter-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
