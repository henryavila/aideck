<template>
  <WidgetFrame frameless>
    <div class="crumbw" :class="{ truncate }">
      <template v-for="(seg, i) in displaySegments" :key="i">
        <span
          class="seg"
          :class="{ current: i === displaySegments.length - 1 && !seg.ellip, mid: i > 0 && i < displaySegments.length - 1 && !seg.ellip, ellip: seg.ellip }"
        >{{ seg.label }}</span>
        <span v-if="i < displaySegments.length - 1" class="sep">/</span>
      </template>
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

interface Segment { label: string; ellip?: boolean }

const truncate = computed(() => props.config.truncate === true)

const segments = computed<Segment[]>(() => {
  const cfgItems = props.config.items ?? props.config.segments
  const rows = Array.isArray(cfgItems) ? (cfgItems as Record<string, unknown>[]) : props.source
  return rows.map((r) => ({ label: String(r.label ?? r.name ?? r.title ?? '') }))
})

const displaySegments = computed<Segment[]>(() => {
  const segs = segments.value
  if (truncate.value && segs.length > 3) {
    return [segs[0], { label: '…', ellip: true }, segs[segs.length - 1]]
  }
  return segs
})
</script>
