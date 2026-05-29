<template>
  <div class="single-layout">
    <WidgetRenderer
      :binding="{ widget, source, config, colSpan: 12 }"
      :consumer-id="consumerId"
    />
  </div>
</template>

<script setup lang="ts">
import WidgetRenderer from '../components/WidgetRenderer.vue'

defineProps<{
  widget: string
  source?: { ref: string; filter?: Record<string, unknown>; param?: string }
  config?: Record<string, unknown>
  consumerId: string
}>()
</script>

<style scoped>
/* Single layout fills the available main height; the widget frame inside
   stretches to it. responsive.css relaxes this to auto on mobile. */
.single-layout {
  height: 100%;
  min-height: calc(100vh - 200px);
}
.single-layout > * {
  height: 100%;
}
</style>
