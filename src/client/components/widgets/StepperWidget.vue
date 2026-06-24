<template>
  <!-- dense: a bare row of tone dots for embedding in a table cell — no frame. -->
  <WidgetFrame v-if="isDense" frameless>
    <div class="stp-dense" :class="{ 'is-empty': !steps.length }">
      <template v-if="steps.length">
        <span
          v-for="step in steps"
          :key="step.key"
          class="stp-dot"
          :class="['c-' + step.tone, { 'is-current': step.current }]"
          :title="step.dotTitle"
        />
      </template>
      <span v-else class="stp-dense-empty">—</span>
    </div>
  </WidgetFrame>

  <WidgetFrame
    v-else
    :frameless="!framed"
    :title="title"
    :icon="icon"
    :meta="meta"
    :live="live"
    :state="steps.length ? 'ready' : 'empty'"
    empty-note="no steps"
  >
    <!-- HORIZONTAL — pills joined by connectors -->
    <template v-if="orientation === 'horizontal'">
      <!-- Inline mode (frame:false) reinstates the label/summary the frame would
           otherwise carry — matches the design's "roteiro" sub-caption row. -->
      <div v-if="!framed && inlineLabel" class="stp-inline-head">
        <span class="pr-label">{{ inlineLabel }}</span>
        <span v-if="doneSummary" class="pr-val">{{ doneSummary }}</span>
      </div>
      <ol class="stp-h">
        <li v-for="(step, i) in steps" :key="step.key" class="stp-h-item">
          <span v-if="i > 0" class="stp-conn" :class="{ 'is-success': step.tone === 'success' }" aria-hidden="true" />
          <component
            :is="step.href ? RouterLink : 'span'"
            :to="step.href || undefined"
            class="stp-pill"
            :class="['c-' + step.tone, { 'is-current': step.current, 'is-link': !!step.href }]"
            :title="step.dotTitle"
          >{{ step.id }}</component>
        </li>
      </ol>
    </template>

    <!-- VERTICAL — a timeline of numbered rows -->
    <ol v-else class="stp-v">
      <component
        :is="step.href ? RouterLink : 'li'"
        v-for="(step, i) in steps"
        :key="step.key"
        :to="step.href"
        class="stp-v-item"
        :class="[
          'c-' + step.tone,
          {
            'is-last': i === steps.length - 1,
            'is-selectable': selectable || step.href,
            'is-selected': selectable && step.id === selectedId,
          },
        ]"
        @click="onSelect(step.id)"
      >
        <div class="stp-rail" aria-hidden="true">
          <span class="stp-circle" :class="['c-' + step.tone, { 'is-current': step.current }]">
            {{ step.tone === 'success' ? '✓' : i + 1 }}
          </span>
          <span v-if="i < steps.length - 1" class="stp-line" />
        </div>

        <div class="stp-body">
          <span class="stp-label">{{ step.label }}</span>
          <span class="stp-deps">depends on <span class="stp-dep-ids">{{ step.dependsOn }}</span></span>
        </div>

        <div class="stp-aside">
          <span v-if="step.metric" class="stp-metric">{{ step.metric }}</span>
          <span class="stp-chip" :class="'c-' + step.tone">
            <span class="stp-chip-dot" />{{ step.statusLabel }}
          </span>
        </div>
      </component>
    </ol>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import WidgetFrame from '../WidgetFrame.vue'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

// A generic ordered sequence of steps. Three layouts (horizontal pills /
// vertical timeline / dense dots). Like every aiDeck widget it bakes in no
// domain vocabulary: each field read maps through a config field-name, and
// every status value resolves through statusInfo so the consumer owns meaning.

interface StepVM {
  key: string
  id: string
  label: string
  tone: Tone
  statusLabel: string
  dependsOn: string
  metric: string
  current: boolean
  href?: string
  dotTitle: string
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

// Cross-widget bus: when `selectable`, emit the chosen step id so a sibling
// widget (wired via the binding's `emits`) can re-scope to it.
const emit = defineEmits<{ (e: 'select', id: string): void }>()

const statuses = useStatuses(props)

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '⋯')
const live = computed(() => props.config.live === true)
// Inline (frameless) horizontal mode for embedding in a card body.
const framed = computed(() => props.config.frame !== false)
const inlineLabel = computed(() => (props.config.label as string | undefined) || undefined)

const orientation = computed<'horizontal' | 'vertical'>(() =>
  props.config.orientation === 'vertical' ? 'vertical' : 'horizontal',
)
const isDense = computed(() => props.config.variant === 'dense')

const idField = computed(() => String(props.config.idField ?? 'id'))
const labelField = computed(() => String(props.config.labelField ?? 'label'))
const statusField = computed(() => String(props.config.statusField ?? 'status'))
const dependsOnField = computed(() => String(props.config.dependsOnField ?? 'dependsOn'))
const metricField = computed(() => String(props.config.metricField ?? 'metric'))
const statusLabelField = computed(() => String(props.config.statusLabelField ?? 'statusLabel'))
const currentField = computed(() =>
  props.config.currentField ? String(props.config.currentField) : undefined,
)
const currentId = computed(() =>
  props.config.currentId !== undefined && props.config.currentId !== null
    ? String(props.config.currentId)
    : undefined,
)
const selectable = computed(() => props.config.selectable === true)
const linkTo = computed(() => props.config.linkTo as string | undefined)
// Optional: seed the initial selection from a route query param (deep-link to a
// specific step, e.g. ?phase=F2). The consumer names the key; aiDeck stays generic.
const selectParam = computed(() => (props.config.selectParam ? String(props.config.selectParam) : undefined))

const route = useRoute()
function queryStepId(): string | undefined {
  if (!selectParam.value) return undefined
  const q = route.query[selectParam.value]
  const v = Array.isArray(q) ? q[0] : q
  return v == null ? undefined : String(v)
}

// Coerce an unknown record value into a trimmed display string ('' when absent).
function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

// A dependsOn value may be a string[] or a comma-separated list; '—' when none.
function toDeps(v: unknown): string {
  const parts = Array.isArray(v)
    ? v.map((e) => toStr(e))
    : toStr(v).split(',').map((p) => p.trim())
  const ids = parts.filter((p) => p.length > 0)
  return ids.length ? ids.join(', ') : '—'
}

const steps = computed<StepVM[]>(() =>
  props.source.map((row, i) => {
    const status = toStr(row[statusField.value])
    const info = status ? statusInfo(status, statuses.value) : null
    const tone: Tone = info?.tone ?? 'neutral'
    const id = toStr(row[idField.value]) || `${i + 1}`
    const current =
      (currentField.value ? Boolean(row[currentField.value]) : false) ||
      (currentId.value !== undefined && id === currentId.value)
    const statusLabel = toStr(row[statusLabelField.value]) || info?.label || '—'

    return {
      key: `${id}::${i}`,
      id,
      label: toStr(row[labelField.value]) || id,
      tone,
      statusLabel,
      dependsOn: toDeps(row[dependsOnField.value]),
      metric: toStr(row[metricField.value]),
      current,
      href: linkTo.value ? resolveRowLink(linkTo.value, row, props.consumerId ?? '') : undefined,
      dotTitle: `${id} · ${statusLabel}`,
    }
  }),
)

const selectedId = ref<string | undefined>(undefined)
function onSelect(id: string): void {
  if (!selectable.value) return
  selectedId.value = id
  emit('select', id)
}

// Default the selection (and the bus value) so a dependent widget shows an item
// before the user clicks. Precedence: a deep-link query (?<selectParam>=id) wins
// and re-applies whenever it changes; otherwise the current step; otherwise the
// first. A query that hasn't changed never overrides a step the user clicked.
const lastQueryId = ref<string | undefined>(undefined)
watch(
  () => [selectable.value, steps.value, queryStepId()] as const,
  () => {
    if (!selectable.value) return
    const qid = queryStepId()
    const queryHits = qid !== undefined && steps.value.some((s) => s.id === qid)
    // Deep-link changed → honor it (initial load, or a new ?param navigation).
    if (queryHits && qid !== lastQueryId.value) {
      lastQueryId.value = qid
      if (selectedId.value !== qid) {
        selectedId.value = qid
        emit('select', qid as string)
      }
      return
    }
    // Keep a still-valid existing selection (don't fight user clicks on refresh).
    if (selectedId.value && steps.value.some((s) => s.id === selectedId.value)) return
    // Initial seed: query (if valid) → current → first.
    const seed = (queryHits && qid) || (steps.value.find((s) => s.current) ?? steps.value[0])?.id
    if (seed) {
      lastQueryId.value = qid
      selectedId.value = seed
      emit('select', seed)
    }
  },
  { immediate: true }
)

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  const at = steps.value.find((s) => s.current)
  if (at) return `at ${at.id}`
  const n = steps.value.length
  return `${n} step${n === 1 ? '' : 's'}`
})

// Inline-head right caption: "{done}/{total}" + an optional consumer-supplied
// suffix (config.summaryLabel) — the widget stays domain-agnostic.
const doneSummary = computed<string | undefined>(() => {
  const total = steps.value.length
  if (!total) return undefined
  const done = steps.value.filter((s) => s.tone === 'success').length
  const suffix = props.config.summaryLabel ? ` ${String(props.config.summaryLabel)}` : ''
  return `${done}/${total}${suffix}`
})
</script>

<style scoped>
/* ── Inline-head (frameless horizontal): label + done summary ─────── */
.stp-inline-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
}
.stp-inline-head .pr-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
}
.stp-inline-head .pr-val {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
}

/* ── Horizontal: pills + connectors ──────────────────────────────── */
.stp-h {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: var(--space-3);
}
.stp-h-item {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
}
.stp-h-item:first-child {
  flex: 0 1 auto;
}
.stp-conn {
  flex: 1 1 auto;
  height: 2px;
  min-width: 12px;
  margin: 0 var(--space-2);
  border-radius: 2px;
  background: var(--border-default);
}
.stp-conn.is-success {
  background: var(--status-success-line);
}
.stp-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  min-width: 30px;
  padding: 0 9px;
  border-radius: var(--radius-pill);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  font-feature-settings: 'calt' 0;
  border: 1px solid transparent;
}
/* neutral / absent — a dashed "future" pill. */
.stp-pill.c-neutral {
  border: 1px dashed var(--border-bright);
  background: transparent;
  color: var(--fg-subtle);
}
/* success — a filled pill (tone mixed into the surface). */
.stp-pill.c-success {
  background: color-mix(in srgb, var(--status-success) 24%, var(--bg-surface));
  border-color: var(--status-success-line);
  color: var(--status-success);
}
/* info — solid accent fill. */
.stp-pill.c-info {
  background: var(--status-info);
  border-color: var(--status-info);
  color: var(--fg-on-accent);
}
/* warning / error — a soft tint. */
.stp-pill.c-warning {
  background: var(--status-warning-bg);
  border-color: var(--status-warning-line);
  color: var(--status-warning);
}
.stp-pill.c-error {
  background: var(--status-error-bg);
  border-color: var(--status-error-line);
  color: var(--status-error);
}
.stp-pill.is-current {
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 3px var(--status-info);
}
/* Linked pill (config.linkTo): drill straight to this step. Reset anchor chrome
   and signal clickability with a ring on hover/focus. */
.stp-pill.is-link {
  cursor: pointer;
  text-decoration: none;
}
.stp-pill.is-link:hover,
.stp-pill.is-link:focus-visible {
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 3px var(--status-info);
  outline: none;
}

/* ── Vertical: a timeline ────────────────────────────────────────── */
.stp-v {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.stp-v-item {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: start;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
}
.stp-v-item.is-selectable {
  cursor: pointer;
  transition: background var(--duration-normal) var(--ease-out);
}
.stp-v-item.is-selectable:hover {
  background: var(--bg-highlight);
}
.stp-v-item.is-selected {
  background: var(--bg-overlay);
  box-shadow: inset 2px 0 0 var(--status-info);
}

.stp-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stp-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  border: 1px solid var(--status-neutral-line);
  background: var(--bg-elevated);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  font-feature-settings: 'calt' 0;
}
.stp-circle.c-success { color: var(--status-success); border-color: var(--status-success-line); background: var(--status-success-bg); }
.stp-circle.c-warning { color: var(--status-warning); border-color: var(--status-warning-line); background: var(--status-warning-bg); }
.stp-circle.c-error   { color: var(--status-error);   border-color: var(--status-error-line);   background: var(--status-error-bg); }
.stp-circle.c-info    { color: var(--status-info);    border-color: var(--status-info-line);    background: var(--status-info-bg); }
.stp-circle.c-neutral { color: var(--fg-muted);       border-color: var(--status-neutral-line); background: var(--bg-elevated); }
.stp-circle.is-current {
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 3px var(--status-info);
}
.stp-line {
  flex: 1 1 auto;
  width: 1px;
  min-height: 12px;
  margin: 2px 0;
  background: var(--border-default);
}

.stp-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stp-label {
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: var(--fw-medium);
  color: var(--fg-default);
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stp-v-item.is-selectable:hover .stp-label {
  color: var(--accent-link);
}
.stp-deps {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
}
.stp-dep-ids {
  color: var(--fg-muted);
}

.stp-aside {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  justify-self: end;
}
.stp-metric {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'calt' 0;
}

/* ── Tone chip (dot + label) ─────────────────────────────────────── */
.stp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 18px;
  padding: 0 8px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: var(--tracking-wide);
  white-space: nowrap;
  font-feature-settings: 'calt' 0;
}
.stp-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.stp-chip.c-success { color: var(--status-success); background: var(--status-success-bg); border-color: var(--status-success-line); }
.stp-chip.c-warning { color: var(--status-warning); background: var(--status-warning-bg); border-color: var(--status-warning-line); }
.stp-chip.c-error   { color: var(--status-error);   background: var(--status-error-bg);   border-color: var(--status-error-line); }
.stp-chip.c-info    { color: var(--status-info);    background: var(--status-info-bg);    border-color: var(--status-info-line); }
.stp-chip.c-neutral { color: var(--status-neutral); background: var(--status-neutral-bg); border-color: var(--status-neutral-line); }

/* ── Dense: a row of tone dots for a table cell ──────────────────── */
.stp-dense {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.stp-dense-empty {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--fg-faint);
  font-feature-settings: 'calt' 0;
}
.stp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--status-neutral-line);
  background: var(--status-neutral);
}
.stp-dot.c-success { background: var(--status-success); border-color: var(--status-success-line); }
.stp-dot.c-warning { background: var(--status-warning); border-color: var(--status-warning-line); }
.stp-dot.c-error   { background: var(--status-error);   border-color: var(--status-error-line); }
.stp-dot.c-info    { background: var(--status-info);    border-color: var(--status-info-line); }
.stp-dot.c-neutral { background: transparent;           border-color: var(--border-bright); border-style: dashed; }
.stp-dot.is-current {
  box-shadow: 0 0 0 1.5px var(--bg-surface), 0 0 0 2.5px var(--status-info);
}
</style>
