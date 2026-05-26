<template>
  <div class="gauge-widget">
    <svg width="200" height="120" viewBox="0 0 200 120">
      <!-- Background arc -->
      <path :d="arcPath(0, 180)" fill="none"
        stroke="var(--color-bg-tertiary)" stroke-width="16" stroke-linecap="round" />
      <!-- Value arc -->
      <path :d="arcPath(0, fillAngle)" fill="none"
        stroke="var(--color-accent)" stroke-width="16" stroke-linecap="round" />
      <!-- Center text -->
      <text x="100" y="100" text-anchor="middle" class="gauge-value">{{ displayValue }}</text>
      <text x="100" y="116" text-anchor="middle" class="gauge-label">{{ label }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const label = computed(() => String(props.config.label ?? ''))
const maxVal = computed(() => Number(props.config.max ?? 100))

const value = computed(() => {
  const field = String(props.config.valueField ?? 'value')
  const row = props.source[0]
  return Number(row?.[field] ?? 0)
})

const displayValue = computed(() => String(value.value))
const fillAngle = computed(() => Math.min(180, (value.value / maxVal.value) * 180))

function arcPath(startDeg: number, endDeg: number): string {
  const cx = 100, cy = 100, r = 75
  const toRad = (d: number) => ((d - 180) * Math.PI) / 180
  const s = toRad(startDeg)
  const e = toRad(endDeg)
  const x1 = cx + r * Math.cos(s)
  const y1 = cy + r * Math.sin(s)
  const x2 = cx + r * Math.cos(e)
  const y2 = cy + r * Math.sin(e)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}
</script>

<style scoped>
.gauge-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-value {
  font-family: var(--font-family);
  font-size: 24px;
  font-weight: 700;
  fill: var(--color-text-primary);
}

.gauge-label {
  font-family: var(--font-family);
  font-size: 11px;
  fill: var(--color-text-muted);
}
</style>
