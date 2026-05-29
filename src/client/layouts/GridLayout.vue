<template>
  <div class="grid-layout" :style="gridStyle">
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
import { computed } from 'vue'
import type { WidgetBinding } from '../../server/manifest-schema.js'
import WidgetRenderer from '../components/WidgetRenderer.vue'
import { widgetGridStyle, isWidgetVisible } from '../utils/widgetGridStyle.js'
import { useBreakpoint } from '../composables/useBreakpoint.js'

const breakpoint = useBreakpoint()

const props = defineProps<{
  widgets: WidgetBinding[]
  columns?: number
  rowHeight?: number
  gap?: number
  align?: string
  padding?: string
  consumerId: string
}>()

const gridStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    gridTemplateColumns: `repeat(${props.columns ?? 12}, 1fr)`,
    gridAutoRows: `${props.rowHeight ?? 48}px`,
    gap: `${props.gap ?? 10}px`,
  }
  if (props.align) style.alignItems = props.align
  if (props.padding) style.padding = props.padding
  return style
})
</script>
