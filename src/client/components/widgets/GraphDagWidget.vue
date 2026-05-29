<template>
  <WidgetFrame :title="title" :icon="icon ?? '⬡'" :meta="meta" :live="live" body-class="flush">
    <div class="code-block is-tall">
      <div class="cb-head">
        <span class="cb-lang">mermaid</span>
      </div>
      <div class="cb-scroll">
        <pre><span v-for="(line, i) in lines" :key="i" class="cb-line"><span class="cb-num">{{ i + 1 }}</span><span class="cb-code">{{ line || ' ' }}</span></span></pre>
      </div>
    </div>
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
const live = computed(() => props.config.live === true)
const meta = computed(() => (props.config.meta ? String(props.config.meta) : undefined))

const content = computed(() => {
  const field = String(props.config.field ?? 'content')
  const row = props.source[0]
  if (row && row[field] !== undefined) return String(row[field])
  if (props.config.content !== undefined) return String(props.config.content)
  return '(no diagram)'
})

const lines = computed(() => content.value.split('\n'))
</script>
