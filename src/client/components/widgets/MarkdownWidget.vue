<template>
  <div class="markdown-widget" v-html="renderedHtml" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const field = computed(() => String(props.config.field ?? '_body'))

const markdownContent = computed<string>(() => {
  if (props.source.length > 0) {
    const val = props.source[0][field.value]
    return val !== undefined && val !== null ? String(val) : ''
  }
  if (props.config.content) {
    return String(props.config.content)
  }
  return ''
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderMarkdown(md: string): string {
  let html = escapeHtml(md)

  // Code blocks (must come before inline code)
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.slice(3, -3).replace(/^\w+\n/, '')
    return `<pre><code>${code}</code></pre>`
  })

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>')

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // Line breaks (only outside block elements)
  html = html.replace(/\n/g, '<br>')

  return html
}

const renderedHtml = computed(() => renderMarkdown(markdownContent.value))
</script>

<style scoped>
.markdown-widget {
  padding: var(--spacing-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  line-height: 1.6;
  height: 100%;
  overflow: auto;
}

.markdown-widget :deep(h1),
.markdown-widget :deep(h2),
.markdown-widget :deep(h3) {
  color: var(--color-text-primary);
  font-weight: 600;
  margin: var(--spacing-md) 0 var(--spacing-sm);
  line-height: 1.3;
}

.markdown-widget :deep(h1) { font-size: var(--font-size-xl); }
.markdown-widget :deep(h2) { font-size: var(--font-size-lg); }
.markdown-widget :deep(h3) { font-size: var(--font-size-base); }

.markdown-widget :deep(strong) {
  color: var(--color-text-primary);
  font-weight: 600;
}

.markdown-widget :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.markdown-widget :deep(a:hover) {
  text-decoration: underline;
}

.markdown-widget :deep(code) {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  background: var(--color-bg-tertiary);
  padding: 1px var(--spacing-xs);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
}

.markdown-widget :deep(pre) {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
  margin: var(--spacing-sm) 0;
}

.markdown-widget :deep(pre code) {
  background: none;
  padding: 0;
  border-radius: 0;
}
</style>
