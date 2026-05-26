<template>
  <div class="graphdag-widget">
    <div class="graphdag-header">
      <span class="graphdag-badge">Mermaid</span>
    </div>
    <pre class="graphdag-pre">{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const content = computed(() => {
  const field = String(props.config.field ?? 'content')
  const row = props.source[0]
  if (row && row[field] !== undefined) return String(row[field])
  if (props.config.content !== undefined) return String(props.config.content)
  return '(no diagram)'
})
</script>

<style scoped>
.graphdag-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.graphdag-header {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.graphdag-badge {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
  font-family: var(--font-mono);
}

.graphdag-pre {
  margin: 0;
  padding: var(--spacing-md);
  overflow: auto;
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.6;
  white-space: pre;
}
</style>
