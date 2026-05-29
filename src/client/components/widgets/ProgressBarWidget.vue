<template>
  <WidgetFrame
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
          <span class="frac">{{ row.value }} / {{ row.max }}</span>
        </div>
        <span class="pbar-track" :class="'c-' + row.color"><i :style="{ width: row.pct + '%' }" /></span>
      </div>
      <div class="pbar-stack-foot">
        <span>weighted avg</span>
        <span class="ok">{{ weightedAvg }}%</span>
        <span class="foot-tail">{{ rows.length }} of {{ rows.length }} {{ unit }}</span>
      </div>
    </div>

    <!-- Single bar variant -->
    <div v-else class="pbar pbar-solo">
      <div class="pbar-head">
        <span class="name">{{ rows[0].name }}</span>
        <span class="frac">{{ showPct ? rows[0].pct + '%' : rows[0].value + ' / ' + rows[0].max }}</span>
      </div>
      <span class="pbar-track" :class="'c-' + rows[0].color"><i :style="{ width: rows[0].pct + '%' }" /></span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

interface PBarRow {
  name: string
  value: number
  max: number
  pct: number
  color: string
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '▭')
const live = computed(() => props.config.live === true)
const showPct = computed(() => props.config.pct === true)
const unit = computed(() => String(props.config.unit ?? 'items'))

const labelField = computed(() => String(props.config.labelField ?? 'name'))
const valueField = computed(() => String(props.config.valueField ?? 'value'))
const maxField = computed(() => String(props.config.maxField ?? 'max'))
const colorField = computed(() => String(props.config.colorField ?? 'color'))

const TONE_FOR_PCT = (pct: number): string => {
  if (pct >= 90) return 'success'
  if (pct >= 50) return 'info'
  if (pct >= 30) return 'warning'
  return 'error'
}

const rows = computed<PBarRow[]>(() => {
  const fallbackName = String(props.config.label ?? 'Progress')
  return props.source.map((r, i) => {
    const value = Number(r[valueField.value] ?? 0)
    const max = Number(r[maxField.value] ?? props.config.max ?? 100)
    const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
    const name = r[labelField.value] != null ? String(r[labelField.value]) : i === 0 ? fallbackName : ''
    const color = r[colorField.value] != null ? String(r[colorField.value]) : TONE_FOR_PCT(pct)
    return { name, value, max, pct, color }
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
