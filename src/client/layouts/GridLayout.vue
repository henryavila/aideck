<template>
  <div
    class="grid-layout"
    :style="{
      gridTemplateColumns: `repeat(${columns ?? 12}, 1fr)`,
      gridAutoRows: `${rowHeight ?? 48}px`,
      gap: `${gap ?? 12}px`,
      alignItems: align ?? undefined,
      padding: padding ?? undefined,
    }"
  >
    <div
      v-for="(widget, i) in widgets"
      :key="i"
      v-show="isWidgetVisible(widget, breakpoint)"
      :style="widgetGridStyle(widget, breakpoint)"
    >
      <WidgetRenderer :binding="widget" :consumer-id="consumerId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WidgetBinding } from '../../server/manifest-schema.js'
import WidgetRenderer from '../components/WidgetRenderer.vue'
import { widgetGridStyle, isWidgetVisible } from '../utils/widgetGridStyle.js'
import { useBreakpoint } from '../composables/useBreakpoint.js'

const breakpoint = useBreakpoint()

defineProps<{
  widgets: WidgetBinding[]
  columns?: number
  rowHeight?: number
  gap?: number
  align?: string
  padding?: string
  consumerId: string
}>()
</script>

<style scoped>
.grid-layout {
  display: grid;
}
</style>
