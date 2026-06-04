<template>
  <WidgetFrame
    :title="title"
    :icon="icon"
    :meta="meta"
    :live="live"
    :state="source.length ? 'ready' : 'empty'"
    empty-note="no data"
  >
    <!-- Single value -->
    <div v-if="source.length === 1" class="badge-row">
      <span class="badge" :class="singleInfo.tone">
        <span class="dot" />
        <span class="b-name">{{ singleInfo.label }}</span>
      </span>
    </div>

    <!-- Distribution: count per value -->
    <div v-else class="badge-row">
      <span v-for="b in badges" :key="b.value" class="badge" :class="b.tone">
        <span class="dot" />
        <span class="b-name">{{ b.label }}</span>
        <span class="b-bar"><i :style="{ width: b.barPct + '%' }" /></span>
        <span class="b-ct">{{ b.count }}</span>
      </span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '◇')
const live = computed(() => props.config.live === true)
const field = computed(() => String(props.config.field ?? 'status'))
const statuses = useStatuses(props)

const meta = computed(
  () => (props.config.meta as string | undefined) ?? `field · ${field.value}`,
)

function valueOf(record: Record<string, unknown>): string {
  const v = record[field.value]
  return v !== undefined && v !== null ? String(v) : '—'
}

const singleInfo = computed(() => statusInfo(valueOf(props.source[0] ?? {}), statuses.value))

const valueCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const record of props.source) {
    const key = valueOf(record)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

const badges = computed(() => {
  const entries = Object.entries(valueCounts.value)
  const max = entries.reduce((m, [, c]) => Math.max(m, c), 0) || 1
  return entries.map(([value, count]) => {
    const info = statusInfo(value, statuses.value)
    return {
      value,
      label: info.label,
      tone: info.tone,
      count,
      barPct: Math.round((count / max) * 100),
    }
  })
})
</script>
