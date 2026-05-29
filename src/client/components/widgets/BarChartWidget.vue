<template>
  <WidgetFrame :title="title" :icon="icon ?? '▥'" :meta="meta" :live="live" :state="frameState" :empty-note="emptyNote">
    <div class="chart">
      <div
        v-if="tip"
        class="chart-tip show"
        :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
      >
        {{ tip.label }}: <span class="tt-v">{{ tip.value }}</span>
      </div>
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
        <g v-for="(g, i) in gridlines" :key="'g' + i">
          <line class="chart-gridline" :x1="padL" :y1="gridY(g)" :x2="W" :y2="gridY(g)" />
          <text class="chart-svg-text" :x="padL - 6" :y="gridY(g) + 3" text-anchor="end">
            {{ Math.round(max * g) }}
          </text>
        </g>
        <line class="chart-axisline" :x1="padL" :y1="padT + innerH" :x2="W" :y2="padT + innerH" />
        <g v-for="(b, i) in bars" :key="'b' + i">
          <rect
            class="bar-rect-svg"
            :x="b.x" :y="b.y" :width="b.w" :height="b.h"
            rx="3" ry="3"
            :fill="barFill"
            @mouseenter="onEnter($event, b)"
            @mouseleave="tip = null"
          />
          <text class="chart-svg-text" :x="b.x + b.w / 2" :y="padT + innerH + 14" text-anchor="middle">
            {{ b.short }}
          </text>
        </g>
      </svg>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { chartColor } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)

const labelField = computed(() => String(props.config.labelField ?? 'label'))
const valueField = computed(() => String(props.config.valueField ?? 'value'))

const colorIdx = computed(() => Number(props.config.colorIdx ?? 1))
const barFill = computed(() => chartColor(colorIdx.value - 1))

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  const n = props.source.length
  return n === 1 ? '1 bar' : `${n} bars`
})

const frameState = computed<'ready' | 'empty'>(() =>
  props.source.length === 0 ? 'empty' : 'ready',
)
const emptyNote = computed(() => String(props.config.emptyNote ?? 'no data'))

// design geometry
const W = 320
const H = 150
const padL = 28
const padB = 22
const padT = 14
const innerW = W - padL
const innerH = H - padB - padT

const gridlines = [0.25, 0.5, 0.75, 1]
function gridY(g: number): number {
  return padT + innerH * (1 - g)
}

function niceMax(v: number): number {
  if (v <= 5) return Math.ceil(v)
  if (v <= 10) return Math.ceil(v / 2) * 2
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (mag / 2)) * (mag / 2)
}

const max = computed(() =>
  niceMax(Math.max(...props.source.map((r) => Number(r[valueField.value] ?? 0)), 1)),
)

interface Bar {
  x: number
  y: number
  w: number
  h: number
  label: string
  short: string
  value: number
}

const bars = computed<Bar[]>(() => {
  const data = props.source
  if (data.length === 0) return []
  const bw = innerW / data.length
  // Axis labels can't ellipsize in SVG — clip to what fits the slot; the
  // full label stays in the hover tooltip.
  const maxChars = Math.max(4, Math.floor(bw / 6))
  return data.map((r, i) => {
    const value = Number(r[valueField.value] ?? 0)
    const h = Math.max(2, (value / max.value) * innerH)
    const x = padL + i * bw + bw * 0.18
    const w = bw * 0.64
    const label = String(r[labelField.value] ?? i)
    const short = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label
    return { x, y: padT + innerH - h, w, h, label, short, value }
  })
})

const tip = ref<{ x: number; y: number; label: string; value: number } | null>(null)
function onEnter(e: MouseEvent, b: Bar): void {
  const svg = (e.currentTarget as SVGElement).closest('svg')
  if (!svg) return
  const r = svg.getBoundingClientRect()
  tip.value = {
    x: ((b.x + b.w / 2) / W) * r.width,
    y: (b.y / H) * r.height - 4,
    label: b.label,
    value: b.value,
  }
}
</script>
