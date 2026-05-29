<template>
  <WidgetFrame :title="title" :icon="icon" :meta="meta" :live="live" body-class="flush">
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 200 108" :style="{ maxWidth: '200px' }">
        <path class="gauge-track" :d="trackPath" stroke-width="13" />
        <path
          class="gauge-fill"
          :d="trackPath"
          stroke-width="13"
          :stroke-dasharray="dash"
          :style="{ stroke: fillColor }"
        />
        <text x="100" y="78" text-anchor="middle" class="gauge-value" :style="{ fontSize: '26px' }">
          {{ displayValue }}
        </text>
        <text x="100" y="98" text-anchor="middle" class="gauge-sub">of {{ maxVal }}</text>
      </svg>
      <span class="gauge-ticks">
        <span>0</span>
        <span>{{ midTick }}</span>
        <span>{{ maxVal }}</span>
      </span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { chartColor } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '◐')
const live = computed(() => props.config.live === true)
const maxVal = computed(() => Number(props.config.max ?? 100))

const meta = computed(
  () =>
    (props.config.meta as string | undefined) ??
    (props.config.label as string | undefined) ??
    `of ${maxVal.value}`,
)

const value = computed(() => {
  const field = String(props.config.valueField ?? 'value')
  const row = props.source[0]
  return Number(row?.[field] ?? 0)
})

const displayValue = computed(() =>
  value.value < 10 ? value.value.toFixed(1) : String(Math.round(value.value)),
)

// Semicircle arc geometry (mirrors the design handoff: R=80, CX=100, CY=90).
const R = 80
const CX = 100
const CY = 90
const trackPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
const arcLen = Math.PI * R

const ratio = computed(() => Math.max(0, Math.min(1, value.value / (maxVal.value || 1))))
const dash = computed(() => `${(arcLen * ratio.value).toFixed(2)} ${arcLen.toFixed(2)}`)

const midTick = computed(() => {
  const m = maxVal.value / 2
  return Number.isInteger(m) ? m : m.toFixed(1)
})

// Stroke color: explicit config.color (status token / chart slot) wins, else
// chart-2 default matching the global .gauge-fill rule.
const STATUS_COLORS: Record<string, string> = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  info: 'var(--status-info)',
  neutral: 'var(--status-neutral)',
}
const fillColor = computed(() => {
  const c = String(props.config.color ?? '')
  if (STATUS_COLORS[c]) return STATUS_COLORS[c]
  const chartMatch = c.match(/^chart-([1-8])$/)
  if (chartMatch) return `var(--chart-${chartMatch[1]})`
  if (c) return chartColor(Number(c) - 1)
  return 'var(--chart-2)'
})
</script>
