<template>
  <component
    v-if="resolvedComponent"
    :is="resolvedComponent"
    :source="sourceData"
    :config="binding.config ?? {}"
  />
  <div v-else class="unknown-widget">
    Unknown widget: {{ binding.widget }}
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

// Widget map will be expanded in F4 as real widget implementations are added
const widgetMap: Record<string, Component> = {}

const props = defineProps<{
  binding: {
    widget: string
    source?: { ref: string; filter?: Record<string, unknown>; param?: string }
    config?: Record<string, unknown>
    colSpan?: number
  }
  consumerId: string
}>()

const resolvedComponent = computed(() => widgetMap[props.binding.widget] ?? null)

// useDataSource integration deferred to F4; pass empty array for now
const sourceData = computed(() => [])
</script>

<style scoped>
.unknown-widget {
  background: var(--color-bg-tertiary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  color: var(--color-text-muted);
  text-align: center;
  font-size: var(--font-size-sm);
}
</style>
