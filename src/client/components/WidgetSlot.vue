<template>
  <div v-if="(depth ?? 0) >= 8" class="slot-too-deep">// slot too deep</div>
  <template v-else>
    <WidgetRenderer
      v-for="(b, i) in bindings"
      :key="i"
      :binding="b"
      :consumer-id="consumerId"
      :parent-record="parentRecord"
      :depth="(depth ?? 0) + 1"
    />
  </template>
</template>

<script setup lang="ts">
// §2b widget composition. A named host-widget slot renders an ordered list of
// child widget bindings, each recursing back through WidgetRenderer with the
// host's per-record scope as `parentRecord`. The depth guard (max 8) prevents a
// runaway recursive manifest.
import WidgetRenderer from './WidgetRenderer.vue'

interface Binding {
  widget: string
  source?: { ref?: string; filter?: Record<string, unknown>; param?: string | { match: string[] } }
  config?: Record<string, unknown>
  slots?: Record<string, Binding[]>
  [key: string]: unknown
}

defineProps<{
  bindings: Binding[]
  consumerId: string
  parentRecord?: Record<string, unknown>
  depth?: number
}>()
</script>

<style scoped>
.slot-too-deep {
  font: var(--fs-xs, 11px) / 1.4 var(--font-mono, monospace);
  color: var(--fg-subtle);
  padding: var(--space-1, 4px) var(--space-2, 8px);
}
</style>
