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
      <div v-if="slots?.trend?.length" class="stat-trend">
        <WidgetSlot
          :bindings="slots.trend"
          :parent-record="source[0]"
          :depth="depth ?? 0"
          :consumer-id="consumerId ?? ''"
        />
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: a `trend` slot (e.g. a sparkline) under the number.
  slots?: Record<string, unknown[]>
  depth?: number
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
  // §2b: `field(<name>)` reads a field off the first record — used by a
  // source-less stat slot bound to its parent (e.g. value: field(currentPhase)).
  const fieldMatch = expr.match(/^field\((\w+)\)$/)
  if (fieldMatch) {
    const v = props.source[0]?.[fieldMatch[1]]
    return v === undefined || v === null ? '—' : String(v)
  }
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
