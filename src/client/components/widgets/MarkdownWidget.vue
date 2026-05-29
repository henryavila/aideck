<template>
  <WidgetFrame :title="title" :icon="icon ?? '¶'" :meta="meta" :live="live">
    <div v-if="markdownContent" class="md" v-html="renderedHtml" />
    <div v-else class="md-empty">// no content</div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const meta = computed(() => props.config.meta as string | undefined)
const live = computed(() => props.config.live === true)

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
