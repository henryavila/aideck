<template>
  <div class="barchart-widget">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <!-- Grid lines -->
      <line v-for="y in gridYs" :key="y" :x1="padL" :y1="y" :x2="width - padR" :y2="y"
        stroke="var(--color-border-muted)" stroke-width="1" />
      <!-- Bars -->
      <rect v-for="(b, i) in bars" :key="i"
        :x="b.x" :y="b.y" :width="barWidth - 4" :height="b.h"
        rx="2" fill="var(--color-accent)" fill-opacity="0.85" />
      <!-- X labels -->
      <text v-for="(b, i) in bars" :key="'l' + i"
        :x="b.x + (barWidth - 4) / 2" :y="height - 4"
        text-anchor="middle" class="axis-label">{{ b.label }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const width = computed(() => Number(props.config.width ?? 400))
const height = computed(() => Number(props.config.height ?? 200))
const padL = 8
const padR = 8
const padTop = 8
const padBottom = 20

const labelField = computed(() => String(props.config.labelField ?? 'label'))
const valueField = computed(() => String(props.config.valueField ?? 'value'))

const barWidth = computed(() => {
  const n = props.source.length || 1
  return (width.value - padL - padR) / n
})

const bars = computed(() => {
  const data = props.source
  if (data.length === 0) return []
  const vals = data.map(r => Number(r[valueField.value] ?? 0))
  const maxVal = Math.max(...vals, 1)
  const chartH = height.value - padTop - padBottom
  return data.map((r, i) => {
    const val = Number(r[valueField.value] ?? 0)
    const h = (val / maxVal) * chartH
    return {
      x: padL + i * barWidth.value,
      y: padTop + chartH - h,
      h,
      label: String(r[labelField.value] ?? i),
    }
  })
})

const gridYs = computed(() => {
  const chartH = height.value - padTop - padBottom
  return [0, 1, 2, 3].map(i => padTop + (i / 3) * chartH)
})
</script>

<style scoped>
.barchart-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.axis-label {
  font-family: var(--font-family);
  font-size: 10px;
  fill: var(--color-text-muted);
}
</style>
