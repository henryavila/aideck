<template>
  <!-- Frameless inline element: nests in table cells, card headers, stat trend slots. -->
  <span v-if="isEmpty" class="spk spk-empty">// {{ emptyNote }}</span>

  <!-- bar mode: stacked 0–100 scalar bar with right-aligned score label -->
  <span v-else-if="mode === 'bar'" class="spk spk-bar" :class="'c-' + barTone">
    <span class="spk-bar-track"><i :style="{ width: barPct + '%' }" /></span>
    <span class="spk-bar-label">{{ barPct }}%</span>
  </span>

  <!-- line mode: mini inline line + area chart -->
  <span v-else class="spk spk-line" :style="{ height: heightPx }">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="spk-area" :points="areaPoints" />
      <polyline class="spk-poly" :points="linePoints" />
    </svg>
    <svg
      v-if="endCap"
      class="spk-cap"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <circle class="spk-dot" :cx="endCap.x" :cy="endCap.y" r="2.6" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toneForValue } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

// ── config field mappings (every one has a default) ─────────────────────────
const mode = computed<'line' | 'bar'>(() =>
  props.config.mode === 'bar' ? 'bar' : 'line',
)
const xField = computed(() => String(props.config.xField ?? 'date'))
const yField = computed(() => String(props.config.yField ?? 'count'))
const valueField = computed(() => String(props.config.valueField ?? 'value'))
const height = computed(() => {
  const h = Number(props.config.height)
  return Number.isFinite(h) && h > 0 ? h : 38
})
const emptyNote = computed(() => String(props.config.emptyNote ?? 'no trend'))

// ── geometry (viewBox space; rendered responsive via preserveAspectRatio) ────
const W = 184
const H = 38
const PAD = 3 // inner padding so the stroke + end-cap never clip
const innerW = W - PAD * 2
const innerH = H - PAD * 2

const heightPx = computed(() => `${height.value}px`)

// ── line-mode series ─────────────────────────────────────────────────────────
interface Pt {
  x: number
  y: number
}

/** Numeric y-values for the line series, in source order. */
const values = computed<number[]>(() =>
  props.source.map((r) => {
    const v = Number(r[yField.value])
    return Number.isFinite(v) ? v : 0
  }),
)

const points = computed<Pt[]>(() => {
  const vals = values.value
  const n = vals.length
  if (n === 0) return []
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min
  // Guard divide-by-zero on a flat series → pin to mid-line.
  return vals.map((v, i) => {
    const fx = n === 1 ? 0 : i / (n - 1)
    const fy = span === 0 ? 0.5 : (v - min) / span
    return {
      x: PAD + fx * innerW,
      // higher value sits higher on screen (smaller y)
      y: PAD + (1 - fy) * innerH,
    }
  })
})

const linePoints = computed(() =>
  points.value.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
)

const areaPoints = computed(() => {
  const pts = points.value
  if (pts.length === 0) return ''
  const baseY = (H - PAD).toFixed(2)
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  return `${first.x.toFixed(2)},${baseY} ${linePoints.value} ${last.x.toFixed(2)},${baseY}`
})

/** Optional end-cap dot on the most recent point. Default on when >1 point. */
const endCap = computed<Pt | null>(() => {
  if (props.config.endCap === false) return null
  const pts = points.value
  if (pts.length === 0) return null
  if (pts.length === 1 && props.config.endCap !== true) return null
  return pts[pts.length - 1]!
})

// ── bar-mode (scalar) ─────────────────────────────────────────────────────────
type BarTone = 'success' | 'info' | 'warning' | 'error' | 'neutral'
const BAR_TONES: BarTone[] = ['success', 'info', 'warning', 'error', 'neutral']
interface Band { at: number; tone: BarTone }

// Optional [min,max] domain; the scalar is normalized into 0..1 before display.
const domain = computed<[number, number]>(() => {
  const d = props.config.domain
  if (Array.isArray(d) && d.length === 2 && d.every((n) => Number.isFinite(Number(n)))) {
    return [Number(d[0]), Number(d[1])]
  }
  return [0, 1]
})

/** Scalar from the first record, normalized into 0..1 via `domain`. */
const barValue = computed<number>(() => {
  const first = props.source[0]
  if (!first) return 0
  const v = Number(first[valueField.value])
  if (!Number.isFinite(v)) return 0
  const [lo, hi] = domain.value
  const span = hi - lo
  const norm = span === 0 ? 0 : (v - lo) / span
  return Math.min(1, Math.max(0, norm))
})

const barPct = computed(() => Math.round(barValue.value * 100))

// Consumer-supplied color bands over the normalized 0..1 value; the default
// reproduces the previous fixed rendering. Tone = highest band with at <= value.
const DEFAULT_BANDS: Band[] = [
  { at: 0, tone: 'neutral' },
  { at: 0.2, tone: 'warning' },
  { at: 0.4, tone: 'info' },
  { at: 0.6, tone: 'success' },
]
const thresholds = computed<Band[]>(() => {
  const t = props.config.thresholds
  if (Array.isArray(t) && t.length) {
    return (t as unknown[])
      .map((e) => e as Record<string, unknown>)
      .filter((e) => Number.isFinite(Number(e.at)))
      .map((e) => {
        const t = String(e.tone ?? 'neutral')
        // Unknown/typo tones fall back to neutral so a band never emits an unstyled class.
        return { at: Number(e.at), tone: (BAR_TONES.includes(t as BarTone) ? t : 'neutral') as BarTone }
      })
      .sort((a, b) => a.at - b.at)
  }
  return DEFAULT_BANDS
})

// Highest band whose `at` <= value; neutral when the value is below every band.
const barTone = computed<BarTone>(() => toneForValue(barValue.value, thresholds.value, 'neutral'))

// ── empty / insufficient data ─────────────────────────────────────────────────
const isEmpty = computed<boolean>(() => {
  if (props.source.length === 0) return true
  // line mode needs at least 2 points to draw a trend
  return mode.value === 'line' && props.source.length < 2
})
</script>

<style scoped>
/* Inline trend element — no WidgetFrame. Token-driven, self-contained. */
.spk {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  max-width: 100%;
}

.spk-empty {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
  letter-spacing: 0.01em;
}

/* ── line mode ──────────────────────────────────────────────────────────── */
.spk-line {
  position: relative;
  width: 100%;
  min-width: 60px;
  overflow: hidden;
}
.spk-line svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
}
/* the end-cap dot lives on a second overlaid svg so its radius is not stretched
   by the non-uniform preserveAspectRatio of the trend path */
.spk-cap {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.spk-area {
  fill: var(--chart-1-fill);
  stroke: none;
}
.spk-poly {
  fill: none;
  stroke: var(--chart-1);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.spk-dot {
  fill: var(--chart-1);
  stroke: var(--bg-surface);
  stroke-width: 1;
}

/* ── bar mode (scalar) ───────────────────────────────────────────────── */
.spk-bar {
  width: 100%;
  min-width: 80px;
  gap: var(--space-4);
}
.spk-bar-track {
  display: block;
  flex: 1 1 auto;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.spk-bar-track i {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--status-neutral);
  transition: width 200ms var(--ease-out);
}
.spk-bar-label {
  flex: 0 0 auto;
  min-width: 30px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
  color: var(--fg-muted);
}

/* threshold tone modifiers — fill + label color from the status palette */
.spk-bar.c-success .spk-bar-track i { background: var(--status-success); }
.spk-bar.c-success .spk-bar-label   { color: var(--status-success); }
.spk-bar.c-info    .spk-bar-track i { background: var(--status-info); }
.spk-bar.c-info    .spk-bar-label   { color: var(--status-info); }
.spk-bar.c-warning .spk-bar-track i { background: var(--status-warning); }
.spk-bar.c-warning .spk-bar-label   { color: var(--status-warning); }
.spk-bar.c-error   .spk-bar-track i { background: var(--status-error); }
.spk-bar.c-error   .spk-bar-label   { color: var(--status-error); }
.spk-bar.c-neutral .spk-bar-track i { background: var(--status-neutral); }
.spk-bar.c-neutral .spk-bar-label   { color: var(--fg-subtle); }

@media (prefers-reduced-motion: reduce) {
  .spk-bar-track i { transition: none; }
}
</style>
