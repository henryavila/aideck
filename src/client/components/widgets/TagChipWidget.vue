<template>
  <div class="tagchip-widget">
    <div v-if="tags.length === 0" class="empty">No tags</div>
    <div v-else class="chip-list">
      <span v-for="tag in tags" :key="tag" class="chip">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const tags = computed<string[]>(() => {
  const field = String(props.config.field ?? 'tags')
  const result = new Set<string>()
  for (const row of props.source) {
    const val = row[field]
    if (Array.isArray(val)) {
      val.forEach(v => result.add(String(v)))
    } else if (val !== undefined && val !== null) {
      result.add(String(val))
    }
  }
  return Array.from(result)
})
</script>

<style scoped>
.tagchip-widget {
  padding: var(--spacing-md);
  height: 100%;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
</style>
