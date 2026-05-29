<template>
  <WidgetFrame
    :title="title"
    :icon="icon ?? '#'"
    :meta="meta"
    :live="live"
    :state="tags.length === 0 ? 'empty' : 'ready'"
    empty-note="no tags"
  >
    <div class="tag-cloud">
      <span
        v-for="(tag, i) in tags"
        :key="tag.name"
        class="tag-chip"
        :class="'t-' + ((i % 8) + 1)"
      >
        <span>{{ tag.name }}</span>
        <span v-if="!hideCounts && tag.count > 1" class="ct">·&nbsp;{{ tag.count }}</span>
      </span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

interface TagCount {
  name: string
  count: number
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)
const hideCounts = computed(() => props.config.hideCounts === true)
const take = computed(() =>
  typeof props.config.take === 'number' ? (props.config.take as number) : undefined,
)

const tags = computed<TagCount[]>(() => {
  const field = String(props.config.field ?? 'tags')
  const counts = new Map<string, number>()
  for (const row of props.source) {
    const val = row[field]
    const values = Array.isArray(val) ? val : val !== undefined && val !== null ? [val] : []
    for (const v of values) {
      const name = String(v)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  const sorted = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return take.value ? sorted.slice(0, take.value) : sorted
})

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  return `${tags.value.length} unique`
})
</script>
