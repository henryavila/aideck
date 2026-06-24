<template>
  <WidgetFrame
    :frameless="!framed"
    :title="title"
    :icon="icon"
    :meta="meta"
    :live="live"
    :state="rows.length ? 'ready' : 'empty'"
    empty-note="no rows to chart"
  >
    <!-- Stacked variant: one bar per row -->
    <div v-if="stacked" class="pbar-stack">
      <div v-for="row in rows" :key="row.name" class="pbar">
        <div class="pbar-head">
          <span class="name">{{ row.name }}</span>
          <span class="frac">{{ row.valueText ?? row.value + ' / ' + row.max }}</span>
        </div>
        <span class="pbar-track" :class="'c-' + row.color"><i :style="{ width: row.pct + '%' }" /></span>
        <div v-if="row.caption" class="pbar-caption">{{ row.caption }}</div>
      </div>
      <div class="pbar-stack-foot">
        <span>weighted avg</span>
        <span class="ok">{{ weightedAvg }}%</span>
        <span class="foot-tail">{{ rows.length }} of {{ rows.length }} {{ unit }}</span>
      </div>
    </div>

    <!-- Single bar variant -->
    <div v-else class="pbar pbar-solo" :class="{ 'is-inline': !framed }">
      <div class="pbar-head">
        <span class="name">{{ rows[0].name }}</span>
        <span class="frac">{{ rows[0].valueText ?? (showPct ? rows[0].pct + '%' : rows[0].value + ' / ' + rows[0].max) }}</span>
      </div>
      <!-- Segmented: `max` discrete cells, `value` filled — for small discrete counts. -->
      <span v-if="segmented && rows[0].max > 0 && rows[0].max <= 40" class="pbar-seg" :class="'c-' + rows[0].color" aria-hidden="true">
        <i v-for="n in rows[0].max" :key="n" :class="{ on: n <= rows[0].value }" />
      </span>
      <span v-else class="pbar-track" :class="'c-' + rows[0].color"><i :style="{ width: rows[0].pct + '%' }" /></span>
      <div v-if="rows[0].caption" class="pbar-caption">{{ rows[0].caption }}</div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, toneForValue, type Tone, type ToneBand } from '../../utils/status.js'

interface PBarRow {
  name: string
  value: number
  max: number
  pct: number
  color: string
  // DS v2.1: custom right-aligned head text (e.g. "5/12") and a subtle caption below.
  valueText?: string
  caption?: string
}

const TONES = new Set<Tone>(['success', 'warning', 'error', 'info', 'neutral'])

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '▭')
const live = computed(() => props.config.live === true)
// Inline (frameless) mode for embedding in a card body (config.frame: false).
const framed = computed(() => props.config.frame !== false)
const showPct = computed(() => props.config.pct === true)
const unit = computed(() => String(props.config.unit ?? 'items'))
// DS v2.1: render the single bar as `max` discrete units instead of a fill.
const segmented = computed(() => props.config.segmented === true)

const labelField = computed(() => String(props.config.labelField ?? 'name'))
const valueField = computed(() => String(props.config.valueField ?? 'value'))
const maxField = computed(() => String(props.config.maxField ?? 'max'))
const colorField = computed(() => String(props.config.colorField ?? 'color'))
const valueTextField = computed(() => (props.config.valueTextField ? String(props.config.valueTextField) : undefined))
const captionField = computed(() => (props.config.captionField ? String(props.config.captionField) : undefined))

// DS v2.1: a config-level forced fill tone — a literal DS tone or a consumer
// status value resolved through statusInfo. Per-row colorField still wins.
const forcedTone = computed<Tone | undefined>(() => {
  const raw = props.config.tone
  if (typeof raw !== 'string' || !raw) return undefined
  return TONES.has(raw as Tone) ? (raw as Tone) : statusInfo(raw).tone
})

function asText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s.length ? s : undefined
}

const PBAR_BANDS: ToneBand[] = [
  { at: 30, tone: 'warning' },
  { at: 50, tone: 'info' },
  { at: 90, tone: 'success' },
]

const rows = computed<PBarRow[]>(() => {
  const fallbackName = String(props.config.label ?? 'Progress')
  return props.source.map((r, i) => {
    const value = Number(r[valueField.value] ?? 0)
    const max = Number(r[maxField.value] ?? props.config.max ?? 100)
    const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
    const name = r[labelField.value] != null ? String(r[labelField.value]) : i === 0 ? fallbackName : ''
    // Precedence: explicit per-row colorField > config-level forced tone > threshold band.
    const color =
      r[colorField.value] != null
        ? String(r[colorField.value])
        : forcedTone.value ?? toneForValue(pct, PBAR_BANDS, 'error')
    const valueText =
      asText(valueTextField.value ? r[valueTextField.value] : undefined) ??
      (i === 0 ? asText(props.config.valueText) : undefined)
    const caption =
      asText(captionField.value ? r[captionField.value] : undefined) ??
      (i === 0 ? asText(props.config.caption) : undefined)
    return { name, value, max, pct, color, valueText, caption }
  })
})

const stacked = computed(() => rows.value.length > 1)

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  if (stacked.value) return `${rows.value.length} rows`
  const r = rows.value[0]
  return r ? `${r.value} / ${r.max}` : undefined
})

const weightedAvg = computed(() => {
  if (!rows.value.length) return '0'
  const sum = rows.value.reduce((acc, r) => acc + r.pct, 0)
  return (sum / rows.value.length).toFixed(1)
})
</script>

<style scoped>
/* The .pbar family is part of the design handoff but not yet in the global
   stylesheet — minimal token-driven implementation kept local. */
.pbar-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pbar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pbar-solo {
  justify-content: center;
  height: 100%;
}
/* Inline (in a card body): size to content, top-aligned — no frame to fill. */
.pbar-solo.is-inline {
  height: auto;
  justify-content: flex-start;
}
.pbar-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.pbar-head .name {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--fg-default);
  letter-spacing: -0.005em;
}
.pbar-head .frac {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
}
.pbar-track {
  display: block;
  width: 100%;
  height: 7px;
  background: var(--bg-elevated);
  border-radius: 2px;
  overflow: hidden;
}
.pbar-track i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--chart-1);
  transition: width 200ms var(--ease-out);
}
.pbar-track.c-success i { background: var(--status-success); }
.pbar-track.c-info i { background: var(--status-info); }
.pbar-track.c-warning i { background: var(--status-warning); }
.pbar-track.c-error i { background: var(--status-error); }
.pbar-track.c-neutral i { background: var(--status-neutral); }

/* DS v2.1: segmented (discrete-unit) bar — equal cells, filled up to value. */
.pbar-seg {
  display: flex;
  gap: 3px;
  width: 100%;
  height: 7px;
}
.pbar-seg i {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 2px;
  background: var(--bg-elevated);
  transition: background 200ms var(--ease-out);
}
.pbar-seg.c-success i.on { background: var(--status-success); }
.pbar-seg.c-info i.on { background: var(--status-info); }
.pbar-seg.c-warning i.on { background: var(--status-warning); }
.pbar-seg.c-error i.on { background: var(--status-error); }
.pbar-seg.c-neutral i.on { background: var(--status-neutral); }

/* DS v2.1: subtle caption beneath a bar. */
.pbar-caption {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
  letter-spacing: 0.02em;
}
.pbar-stack-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
  letter-spacing: 0.02em;
}
.pbar-stack-foot .ok { color: var(--status-success); }
.pbar-stack-foot .foot-tail {
  margin-left: auto;
  color: var(--fg-faint);
}
</style>
