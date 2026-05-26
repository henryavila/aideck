<template>
  <div class="codeblock-widget">
    <div class="codeblock-header">
      <span class="codeblock-lang">{{ language }}</span>
    </div>
    <pre class="codeblock-pre"><code>{{ content }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const language = computed(() => String(props.config.language ?? 'text'))

const content = computed(() => {
  const field = String(props.config.field ?? 'content')
  const row = props.source[0]
  if (row && row[field] !== undefined) return String(row[field])
  if (props.config.content !== undefined) return String(props.config.content)
  return ''
})
</script>

<style scoped>
.codeblock-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-secondary);
}

.codeblock-header {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.codeblock-lang {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.codeblock-pre {
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
