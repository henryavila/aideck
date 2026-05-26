<template>
  <div class="container-widget" :style="containerStyle">
    <slot>
      <div v-if="source.length > 0" class="container-items">
        <div v-for="(row, i) in source" :key="i" class="container-item">
          {{ JSON.stringify(row) }}
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

const containerStyle = computed(() => ({
  padding: props.config.padding ? String(props.config.padding) : 'var(--spacing-md)',
  background: props.config.background ? String(props.config.background) : undefined,
  border: props.config.border ? String(props.config.border) : undefined,
  borderRadius: props.config.border ? 'var(--radius-md)' : undefined,
}))
</script>

<style scoped>
.container-widget {
  height: 100%;
  overflow: auto;
}

.container-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.container-item {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs);
  border-bottom: 1px solid var(--color-border-muted);
  word-break: break-all;
}
</style>
