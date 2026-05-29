<template>
  <WidgetFrame :title="title" :icon="icon" :meta="sub" :live="live">
    <div class="stat">
      <span class="lbl">{{ label }}</span>
      <span class="v" :class="tone" :style="colorStyle">{{ computedValue }}</span>
      <span v-if="delta" class="d">
        <span class="delta" :class="deltaTone">
          <span v-if="deltaArrow">{{ deltaArrow }}</span>
          <span>{{ delta }}</span>
        </span>
      </span>
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
const icon = computed(() => props.config.icon as string | undefined)
const sub = computed(() => props.config.sub as string | undefined)
const live = computed(() => props.config.live === true)
const label = computed(() => String(props.config.label ?? 'Value'))

const computedValue = computed(() => {
  const expr = String(props.config.value ?? 'count()')
  const countMatch = expr.match(/^count\((\w+)=(.+)\)$/)
  if (countMatch) {
    const [, key, val] = countMatch
    return props.source.filter((r) => String(r[key]) === val).length
  }
  if (expr === 'count()') return props.source.length
  return expr
})

// Design value tones: info / success / warning / error. Legacy manifests may
// still pass a raw `color`; honor it as an inline override.
const tone = computed(() => {
  const t = String(props.config.tone ?? '')
  return ['info', 'success', 'warning', 'error'].includes(t) ? t : ''
})
const colorStyle = computed(() =>
  props.config.color ? { color: String(props.config.color) } : undefined,
)

const delta = computed(() => props.config.delta as string | undefined)
const deltaTone = computed(() => {
  const t = String(props.config.deltaTone ?? '')
  return t === 'up' || t === 'down' ? t : ''
})
const deltaArrow = computed(() => {
  if (props.config.deltaArrow) return String(props.config.deltaArrow)
  if (deltaTone.value === 'up') return '↑'
  if (deltaTone.value === 'down') return '↓'
  return ''
})
</script>
