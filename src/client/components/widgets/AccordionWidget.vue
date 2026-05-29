<template>
  <WidgetFrame
    v-if="sections.length === 0"
    :title="title"
    :icon="icon ?? '☰'"
    :meta="meta"
    :live="live"
    state="empty"
    empty-note="no sections"
  />
  <WidgetFrame v-else :title="title" :icon="icon ?? '☰'" :meta="meta" :live="live" body-class="flush">
    <div class="acc">
      <div v-for="(section, i) in sections" :key="i" class="acc-item">
        <button class="acc-head" :aria-expanded="openSet.has(i)" @click="toggle(i)">
          <span class="acc-caret">{{ openSet.has(i) ? '▾' : '▸' }}</span>
          <span class="acc-title">{{ section.title }}</span>
          <span v-if="section.tail" class="acc-tail" :class="section.tailTone">{{ section.tail }}</span>
        </button>
        <div v-if="openSet.has(i)" class="acc-body">{{ section.content }}</div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)

const titleField = computed(() => String(props.config.titleField ?? 'title'))
const contentField = computed(() => String(props.config.contentField ?? 'content'))
const tailField = computed(() => String(props.config.tailField ?? 'status'))

const sections = computed(() =>
  props.source.map((r) => {
    const tailRaw = r[tailField.value]
    const tail = tailRaw != null ? String(tailRaw) : ''
    return {
      title: String(r[titleField.value] ?? ''),
      content: String(r[contentField.value] ?? ''),
      tail,
      tailTone: tail ? statusInfo(tail).tone : 'neutral',
    }
  }),
)

const meta = computed(() => {
  const m = props.config.meta
  if (typeof m === 'string') return m
  const n = sections.value.length
  return n ? `${n} section${n === 1 ? '' : 's'}` : undefined
})

const openSet = reactive(new Set<number>())

function toggle(i: number) {
  if (openSet.has(i)) openSet.delete(i)
  else openSet.add(i)
}
</script>
