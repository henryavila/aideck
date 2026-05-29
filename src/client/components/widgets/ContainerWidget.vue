<template>
  <WidgetFrame frameless>
    <div class="container-w" :class="{ 'container-nested-mark': nested }">
      <div v-if="title" class="container-title">{{ title }}</div>
      <div class="container-w" :class="{ 'is-row': row }">
        <slot>
          <div v-for="(item, i) in source" :key="i" class="lst-row">
            <span class="l-title">{{ rowLabel(item) }}</span>
          </div>
        </slot>
      </div>
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

const title = computed(() => props.config.title as string | undefined)
const row = computed(() => props.config.row === true || props.config.direction === 'row')
const nested = computed(() => props.config.nested === true)

function rowLabel(item: Record<string, unknown>): string {
  return String(item.title ?? item.label ?? item.name ?? JSON.stringify(item))
}
</script>
