<template>
  <WidgetFrame
    :title="title"
    :icon="icon"
    :meta="meta"
    :live="live"
    :state="phases.length ? 'ready' : 'empty'"
    empty-note="no phases"
  >
    <ol class="ptl" :class="'is-' + orientation">
      <li
        v-for="(phase, i) in phases"
        :key="phase.id + '::' + i"
        class="ptl-item"
        :class="['c-' + phase.tone, { 'is-active': phase.active, 'is-last': i === phases.length - 1 }]"
      >
        <!-- Rail + status glyph -->
        <div class="ptl-rail" aria-hidden="true">
          <span class="ptl-glyph">{{ phase.glyph }}</span>
          <span v-if="i < phases.length - 1" class="ptl-line" />
        </div>

        <!-- Card body -->
        <div class="ptl-card">
          <div class="ptl-head">
            <span class="ptl-id">{{ phase.id }}</span>
            <span class="ptl-title">{{ phase.title }}</span>
            <span class="ptl-status">{{ phase.label }}</span>
          </div>

          <!-- Generic per-step meters — labels + fields supplied by the consumer,
               no built-in domain meaning. `style: 'pips'` renders a discrete meter. -->
          <div v-for="(m, mi) in phase.meters" :key="mi" :class="m.style === 'pips' ? 'ptl-gates' : 'ptl-meter'">
            <template v-if="m.style !== 'pips'">
              <div class="ptl-meter-head">
                <span v-if="m.label" class="ptl-k">{{ m.label }}</span>
                <span class="ptl-frac">{{ m.value }} / {{ m.max }}</span>
              </div>
              <span class="ptl-track" :class="'c-' + m.tone"><i :style="{ width: m.pct + '%' }" /></span>
            </template>
            <template v-else>
              <span v-if="m.label" class="ptl-k">{{ m.label }}</span>
              <span class="ptl-gate-frac" :class="{ met: m.max > 0 && m.value >= m.max }">
                {{ m.value }} / {{ m.max }}
              </span>
              <span class="ptl-gate-meter" aria-hidden="true">
                <i v-for="g in m.max" :key="g" class="ptl-pip" :class="{ on: g <= m.value }" />
                <span v-if="m.max === 0" class="ptl-gate-none">none</span>
              </span>
            </template>
          </div>

          <!-- Optional next-action footer -->
          <div v-if="phase.nextAction" class="ptl-next">
            <span class="ptl-arrow">→</span>{{ phase.nextAction }}
          </div>

          <!-- §2b composition: per-phase 'phase-extra' slot, child scope = phase row -->
          <div v-if="hasPhaseExtra" class="ptl-extra">
            <WidgetSlot
              :bindings="phaseExtraBindings"
              :parent-record="phase.row"
              :depth="depth ?? 0"
              :consumer-id="consumerId ?? ''"
            />
          </div>
        </div>
      </li>
    </ol>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { statusInfo, toneForValue, type Tone, type ToneBand } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

// §4a phase-timeline — the spine of a plan. One exploded phase row per record,
// each carrying rollup scalars (task progress + gate readiness). The active
// phase ("you are here") gets accent emphasis. Page-level widget: uses
// WidgetFrame. Hosts a 'phase-extra' slot rendered per phase row.

interface Binding {
  widget: string
  [key: string]: unknown
}

interface MeterVM {
  label: string
  value: number
  max: number
  pct: number
  tone: Tone
  style: 'bar' | 'pips'
}

interface PhaseVM {
  id: string
  title: string
  status: string
  tone: Tone
  label: string
  glyph: string
  active: boolean
  meters: MeterVM[]
  nextAction: string
  row: Record<string, unknown>
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: 'phase-extra' bindings rendered per phase row (child scope).
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '⛓')
const live = computed(() => props.config.live === true)

const orientation = computed<'vertical' | 'horizontal'>(() =>
  props.config.orientation === 'horizontal' ? 'horizontal' : 'vertical',
)

// Field-name mappings — consumer-supplied, each with a neutral default.
const idField = computed(() => String(props.config.idField ?? 'id'))
const titleField = computed(() => String(props.config.titleField ?? 'title'))
const statusField = computed(() => String(props.config.statusField ?? 'status'))
const nextActionField = computed(() => String(props.config.nextActionField ?? 'nextAction'))
const statuses = useStatuses(props)

// Which step is emphasized ("you are here"): an explicit boolean field, or — as a
// convenience — the step whose status equals `activeStatus` (default 'active').
const currentField = computed(() => (props.config.currentField ? String(props.config.currentField) : undefined))
const activeStatus = computed(() => String(props.config.activeStatus ?? 'active'))

// Generic per-step meters. The consumer declares each meter's label + fields;
// the widget bakes in no domain meaning (no built-in "tasks"/"gates").
interface MeterDef {
  label: string
  valueField: string
  maxField?: string
  style: 'bar' | 'pips'
}
const meterDefs = computed<MeterDef[]>(() => {
  const raw = props.config.meters
  if (!Array.isArray(raw)) return []
  return (raw as unknown[])
    .map((e) => e as Record<string, unknown>)
    .filter((e) => typeof e.valueField === 'string')
    .map((e) => ({
      label: String(e.label ?? ''),
      valueField: String(e.valueField),
      maxField: e.maxField ? String(e.maxField) : undefined,
      style: e.style === 'pips' ? 'pips' : 'bar',
    }))
})

// Coerce an unknown record value into a non-negative finite integer (0 floor).
function toCount(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

// Coerce an unknown value into a trimmed display string ('' when absent).
function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

// Map a fill percentage onto a status tone (same intent as ProgressBarWidget).
const METER_BANDS: ToneBand[] = [
  { at: 1, tone: 'warning' },
  { at: 50, tone: 'info' },
  { at: 100, tone: 'success' },
]

const phases = computed<PhaseVM[]>(() =>
  props.source.map((row, i) => {
    const status = toStr(row[statusField.value])
    const info = statusInfo(status, statuses.value)

    // Never let value exceed max; never divide by zero.
    const meters: MeterVM[] = meterDefs.value.map((d) => {
      const total = d.maxField ? toCount(row[d.maxField]) : 0
      const rawVal = toCount(row[d.valueField])
      const value = total > 0 ? Math.min(rawVal, total) : rawVal
      const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
      return { label: d.label, value, max: total, pct, tone: toneForValue(pct, METER_BANDS, 'neutral'), style: d.style }
    })

    const idVal = toStr(row[idField.value])
    const titleVal = toStr(row[titleField.value])
    const current = currentField.value ? Boolean(row[currentField.value]) : status === activeStatus.value

    return {
      id: idVal || `step ${i + 1}`,
      title: titleVal || '—',
      status,
      tone: info.tone,
      label: info.label,
      glyph: info.glyph,
      active: current,
      meters,
      nextAction: toStr(row[nextActionField.value]),
      row,
    }
  }),
)

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  const active = phases.value.find((p) => p.active)
  if (active) return `at ${active.id}`
  return `${phases.value.length} phase${phases.value.length === 1 ? '' : 's'}`
})

// 'phase-extra' slot bindings — narrowed from unknown[] to a widget binding list.
const phaseExtraBindings = computed<Binding[]>(() => {
  const raw = props.slots?.['item-extra']?.length ? props.slots['item-extra'] : props.slots?.['phase-extra']
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (b): b is Binding => typeof b === 'object' && b !== null && typeof (b as { widget?: unknown }).widget === 'string',
  )
})
const hasPhaseExtra = computed(() => phaseExtraBindings.value.length > 0)
</script>

<style scoped>
/* The .ptl family is a §4a north-star widget not yet in the global stylesheet —
   token-driven implementation kept local (sanctioned per ProgressBarWidget). */
.ptl {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ptl.is-horizontal {
  flex-direction: row;
  gap: var(--space-4);
  overflow-x: auto;
}

.ptl-item {
  display: grid;
  grid-template-columns: 22px 1fr;
  column-gap: var(--space-3);
}
.ptl.is-horizontal .ptl-item {
  grid-template-columns: 1fr;
  grid-template-rows: 22px 1fr;
  min-width: 220px;
}

/* ── Rail + status glyph ─────────────────────────────────────────── */
.ptl-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ptl.is-horizontal .ptl-rail {
  flex-direction: row;
  justify-content: flex-start;
}
.ptl-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  border: 1px solid var(--status-neutral-line);
  background: var(--bg-elevated);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  font-feature-settings: 'calt' 0;
}
.ptl-line {
  flex: 1 1 auto;
  width: 1px;
  min-height: 14px;
  margin: 2px 0;
  background: var(--border-default);
}
.ptl.is-horizontal .ptl-line {
  width: auto;
  height: 1px;
  min-height: 0;
  min-width: 14px;
  margin: 0 2px;
}

/* Tone the glyph per status. */
.ptl-item.c-success .ptl-glyph { color: var(--status-success); border-color: var(--status-success-line); background: var(--status-success-bg); }
.ptl-item.c-warning .ptl-glyph { color: var(--status-warning); border-color: var(--status-warning-line); background: var(--status-warning-bg); }
.ptl-item.c-error   .ptl-glyph { color: var(--status-error);   border-color: var(--status-error-line);   background: var(--status-error-bg); }
.ptl-item.c-info    .ptl-glyph { color: var(--status-info);    border-color: var(--status-info-line);    background: var(--status-info-bg); }
.ptl-item.c-neutral .ptl-glyph { color: var(--status-neutral); border-color: var(--status-neutral-line); background: var(--bg-elevated); }

/* ── Card ────────────────────────────────────────────────────────── */
.ptl-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-left: 2px solid var(--status-neutral);
  border-radius: var(--radius-md);
}
.ptl-item.is-last .ptl-card { margin-bottom: 0; }

/* Left status accent bar — tone from statusInfo(status). */
.ptl-item.c-success .ptl-card { border-left-color: var(--status-success); }
.ptl-item.c-warning .ptl-card { border-left-color: var(--status-warning); }
.ptl-item.c-error   .ptl-card { border-left-color: var(--status-error); }
.ptl-item.c-info    .ptl-card { border-left-color: var(--status-info); }
.ptl-item.c-neutral .ptl-card { border-left-color: var(--status-neutral); }

/* Active "you are here" emphasis — accent edge + glow. */
.ptl-item.is-active .ptl-card {
  border-color: var(--status-info-line);
  border-left-color: var(--accent-primary);
  box-shadow: var(--shadow-glow-info);
}

.ptl-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.ptl-id {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--fg-muted);
  font-feature-settings: 'calt' 0;
  flex: 0 0 auto;
}
.ptl-title {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: var(--fw-medium);
  color: var(--fg-default);
  letter-spacing: -0.005em;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ptl-status {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
  flex: 0 0 auto;
}
.ptl-item.c-success .ptl-status { color: var(--status-success); }
.ptl-item.c-warning .ptl-status { color: var(--status-warning); }
.ptl-item.c-error   .ptl-status { color: var(--status-error); }
.ptl-item.c-info    .ptl-status { color: var(--status-info); }
.ptl-item.c-neutral .ptl-status { color: var(--status-neutral); }

/* ── Task progress meter (same look as ProgressBarWidget) ────────── */
.ptl-meter {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.ptl-meter-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.ptl-k {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
}
.ptl-frac {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
}
.ptl-track {
  display: block;
  width: 100%;
  height: 6px;
  background: var(--bg-elevated);
  border-radius: var(--radius-xs);
  overflow: hidden;
}
.ptl-track i {
  display: block;
  height: 100%;
  width: 0;
  border-radius: var(--radius-xs);
  background: var(--status-neutral);
  transition: width var(--duration-normal) var(--ease-out);
}
.ptl-track.c-success i { background: var(--status-success); }
.ptl-track.c-info i    { background: var(--status-info); }
.ptl-track.c-warning i { background: var(--status-warning); }
.ptl-track.c-error i   { background: var(--status-error); }
.ptl-track.c-neutral i { background: var(--status-neutral); }

/* ── Gate meter ──────────────────────────────────────────────────── */
.ptl-gates {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.ptl-gate-frac {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
}
.ptl-gate-frac.met { color: var(--status-success); }
.ptl-gate-meter {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}
.ptl-pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--status-neutral-line);
  background: transparent;
}
.ptl-pip.on {
  border-color: var(--status-success-line);
  background: var(--status-success);
}
.ptl-gate-none {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--fg-faint);
  letter-spacing: var(--tracking-wide);
  font-feature-settings: 'calt' 0;
}

/* ── Next-action footer ──────────────────────────────────────────── */
.ptl-next {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
}
.ptl-arrow { color: var(--fg-faint); }

/* ── Hosted 'phase-extra' slot ───────────────────────────────────── */
.ptl-extra {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
</style>
