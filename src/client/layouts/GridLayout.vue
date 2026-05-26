<template>
  <div
    class="grid-layout"
    :style="{
      gridTemplateColumns: `repeat(${columns ?? 12}, 1fr)`,
      gridAutoRows: `${rowHeight ?? 48}px`,
      gap: `${gap ?? 12}px`,
    }"
  >
    <div
      v-for="(widget, i) in widgets"
      :key="i"
      :style="widgetGridStyle(widget)"
    >
      <WidgetRenderer :binding="widget" :consumer-id="consumerId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WidgetBinding } from '../../server/manifest-schema.js'
import WidgetRenderer from '../components/WidgetRenderer.vue'
import { widgetGridStyle } from '../utils/widgetGridStyle.js'

defineProps<{
  widgets: WidgetBinding[]
  columns?: number
  rowHeight?: number
  gap?: number
  consumerId: string
}>()
</script>

<style scoped>
.grid-layout {
  display: grid;
}
</style>
