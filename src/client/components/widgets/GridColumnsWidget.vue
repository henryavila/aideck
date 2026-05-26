<template>
  <div class="grid-columns-widget" :style="gridStyle">
    <slot>
      <div v-for="(row, i) in source" :key="i" class="grid-cell">
        <div v-for="(val, key) in row" :key="key" class="cell-entry">
          <span class="cell-key">{{ key }}</span>
          <span class="cell-val">{{ val }}</span>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.config.columns ?? 2}, 1fr)`,
  gap: props.config.gap ? String(props.config.gap) : 'var(--spacing-md)',
}))
</script>

<style scoped>
.grid-columns-widget {
  height: 100%;
  overflow: auto;
  padding: var(--spacing-md);
}

.grid-cell {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
}

.cell-entry {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  gap: var(--spacing-sm);
}

.cell-key {
  color: var(--color-text-secondary);
}

.cell-val {
  color: var(--color-text-primary);
}
</style>
