<template>
  <WidgetFrame frameless>
    <div class="grid-cols" :class="colClass">
      <slot>
        <div v-for="(row, i) in source" :key="i" class="lst-row">
          <span class="l-title">{{ rowLabel(row) }}</span>
        </div>
      </slot>
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

const colClass = computed(() => {
  if (props.config.uneven === true) return 'c-uneven'
  const n = Number(props.config.columns ?? 2)
  return n === 3 ? 'c-3' : 'c-2'
})

function rowLabel(row: Record<string, unknown>): string {
  return String(row.title ?? row.label ?? row.name ?? JSON.stringify(row))
}
</script>
