<template>
  <WidgetFrame :title="title" :icon="icon ?? '∿'" :meta="meta" :live="live" :state="frameState" :empty-note="emptyNote">
    <div class="chart">
      <div
        v-if="tip"
        class="chart-tip show"
        :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
      >
        <div v-if="tip.title" class="tt-title">{{ tip.title }}</div>
        <div v-for="(row, i) in tip.rows" :key="i" class="tt-row">
          <span class="tt-dot" :style="{ background: row.color }" />
          <span class="tt-k">{{ row.name }}</span>
          <span class="tt-v">{{ row.value }}</span>
        </div>
      </div>
      <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
        <defs>
          <linearGradient
            v-for="(s, i) in series" :key="'grad' + i"
            :id="`${uid}-grad-${i}`" x1="0" y1="0" x2="0" y2="1"
          >
            <stop offset="0%" :stop-color="chartColor(i)" :stop-opacity="area ? 0.24 : 0" />
            <stop offset="100%" :stop-color="chartColor(i)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <g v-for="(g, i) in gridlines" :key="'g' + i">
          <line class="chart-gridline" :x1="padL" :y1="gridY(g)" :x2="W - padR" :y2="gridY(g)" />
          <text class="chart-svg-text" :x="padL - 6" :y="gridY(g) + 3" text-anchor="end">
            {{ Math.round(max * g) }}
          </text>
        </g>

        <g v-for="(s, i) in series" :key="'s' + i">
          <polygon
            v-if="area"
            :points="areaPoints(s.points)"
            :fill="`url(#${uid}-grad-${i})`"
          />
          <polyline class="line-path" :points="polyPoints(s.points)" :stroke="chartColor(i)" />
          <template v-if="showDots">
            <circle
              v-for="(p, idx) in s.points" :key="idx"
              class="line-dot" :cx="p.x" :cy="p.y" r="3" :fill="chartColor(i)"
            />
          </template>
        </g>

        <rect
          v-for="(p, idx) in bandXs" :key="'band' + idx"
          class="line-hover-band"
          :x="p - bandW / 2" :y="padT" :width="bandW" :height="innerH"
          @mouseenter="onBand($event, idx)"
          @mouseleave="tip = null"
        />
      </svg>
      <div v-if="series.length > 1" class="chart-legend">
        <span v-for="(s, i) in series" :key="s.name" class="le">
          <span class="sw" :style="{ background: chartColor(i) }" />{{ s.name }}
        </span>
      </div>
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
const area = computed(() => props.config.area === true)
const showDots = computed(() => props.config.showDots !== false && seriesFields.value.length === 1)

const xField = computed(() => String(props.config.xField ?? 'x'))
// Multiple y-fields → multi-line with legend; single yField default.
const seriesFields = computed<string[]>(() => {
  const s = props.config.series
  if (Array.isArray(s) && s.length > 0) return s.map((f) => String(f))
  return [String(props.config.yField ?? 'y')]
})

const uid = `lc-${Math.random().toString(36).slice(2, 8)}`

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  return `${props.source.length}-point`
})

const frameState = computed<'ready' | 'empty'>(() =>
  props.source.length === 0 ? 'empty' : 'ready',
)
const emptyNote = computed(() => String(props.config.emptyNote ?? 'no data'))

// design geometry
const W = 340
const H = 150
const padL = 28
const padB = 20
const padT = 12
const padR = 6
const innerW = W - padL - padR
const innerH = H - padB - padT

const gridlines = [0, 0.5, 1]
function gridY(g: number): number {
  return padT + innerH * (1 - g)
}

function niceMax(v: number): number {
  if (v <= 5) return Math.ceil(v)
  if (v <= 10) return Math.ceil(v / 2) * 2
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / (mag / 2)) * (mag / 2)
}

const len = computed(() => props.source.length)

const max = computed(() => {
  const all: number[] = []
  for (const r of props.source) {
    for (const f of seriesFields.value) all.push(Number(r[f] ?? 0))
  }
  return niceMax(Math.max(...all, 1))
})

function xAt(i: number): number {
  return padL + (i / Math.max(len.value - 1, 1)) * innerW
}
function yAt(v: number): number {
  return padT + innerH - (v / max.value) * innerH
}

interface Pt {
  x: number
  y: number
}
interface Series {
  name: string
  points: Pt[]
  values: number[]
}

const series = computed<Series[]>(() =>
  seriesFields.value.map((field) => {
    const values = props.source.map((r) => Number(r[field] ?? 0))
    return {
      name: field,
      values,
      points: values.map((v, i) => ({ x: xAt(i), y: yAt(v) })),
    }
  }),
)

function polyPoints(pts: Pt[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ')
}
function areaPoints(pts: Pt[]): string {
  return `${padL},${padT + innerH} ${polyPoints(pts)} ${W - padR},${padT + innerH}`
}

const labels = computed(() => props.source.map((r) => String(r[xField.value] ?? '')))

const bandW = computed(() => innerW / Math.max(len.value - 1, 1))
const bandXs = computed(() => props.source.map((_, i) => xAt(i)))

interface TipRow {
  name: string
  value: number
  color: string
}
const tip = ref<{ x: number; y: number; title: string; rows: TipRow[] } | null>(null)

function onBand(e: MouseEvent, idx: number): void {
  const svg = (e.currentTarget as SVGElement).closest('svg')
  if (!svg) return
  const r = svg.getBoundingClientRect()
  tip.value = {
    x: (xAt(idx) / W) * r.width,
    y: (padT / H) * r.height + 2,
    title: labels.value[idx] ?? '',
    rows: series.value.map((s, si) => ({
      name: s.name,
      value: s.values[idx] ?? 0,
      color: chartColor(si),
    })),
  }
}
</script>
