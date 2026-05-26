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
.single-layout {
  height: 100%;
  padding: var(--spacing-md);
}
</style>
