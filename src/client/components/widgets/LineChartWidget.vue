<template>
  <div class="linechart-widget">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`">
      <!-- Grid lines -->
      <line v-for="y in gridYs" :key="y" :x1="pad" :y1="y" :x2="width - pad" :y2="y"
        stroke="var(--color-border-muted)" stroke-width="1" />
      <!-- Polyline -->
      <polyline v-if="points.length > 1" :points="pointsStr"
        fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <!-- Dots -->
      <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="3"
        fill="var(--color-accent)" />
      <!-- X axis labels -->
      <text v-for="(p, i) in points" :key="'xl' + i" :x="p.x" :y="height - 4"
        text-anchor="middle" class="axis-label">{{ p.label }}</text>
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
const pad = 40

const xField = computed(() => String(props.config.xField ?? 'x'))
const yField = computed(() => String(props.config.yField ?? 'y'))

const points = computed(() => {
  const data = props.source
  if (data.length === 0) return []
  const yValues = data.map(r => Number(r[yField.value] ?? 0))
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const rangeY = maxY - minY || 1
  const chartW = width.value - pad * 2
  const chartH = height.value - pad * 2 - 8
  return data.map((r, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * chartW,
    y: pad + (1 - (Number(r[yField.value] ?? 0) - minY) / rangeY) * chartH,
    label: String(r[xField.value] ?? i),
  }))
})

const pointsStr = computed(() => points.value.map(p => `${p.x},${p.y}`).join(' '))

const gridYs = computed(() => {
  const chartH = height.value - pad * 2 - 8
  return [0, 1, 2, 3].map(i => pad + (i / 3) * chartH)
})
</script>

<style scoped>
.linechart-widget {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

svg {
  overflow: visible;
}

.axis-label {
  font-family: var(--font-family);
  font-size: 10px;
  fill: var(--color-text-muted);
}
</style>
