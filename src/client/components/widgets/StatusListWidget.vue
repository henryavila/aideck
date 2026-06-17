<template>
  <WidgetFrame
    :title="title"
    :icon="icon ?? '☰'"
    :meta="meta"
    :live="live"
    :state="items.length ? 'ready' : 'empty'"
    empty-note="no items"
  >
    <!-- checklist: square mark + label + optional mono meta -->
    <ul v-if="isChecklist" class="sl-check">
      <li v-for="(row, i) in items" :key="i" class="sl-crit">
        <span class="sl-mark" :class="markClass(row)">{{ markGlyph(row) }}</span>
        <span class="sl-clabel">{{ field(row, labelField) }}</span>
        <span v-if="field(row, metaField)" class="sl-cmeta">{{ field(row, metaField) }}</span>
      </li>
    </ul>

    <!-- grouped sections -->
    <div v-else-if="grouped" class="sl-groups">
      <section v-for="g in groups" :key="g.key" class="sl-group">
        <header class="sl-gh">
          <span class="sl-glabel">{{ g.key }}</span>
          <span class="sl-gcount">{{ g.rows.length }}</span>
          <span class="sl-grule" />
        </header>
        <ul class="sl-list">
          <li v-for="(row, i) in g.rows" :key="i" class="sl-row">
            <span v-if="field(row, idField)" class="sl-id">{{ field(row, idField) }}</span>
            <span v-else class="sl-id-gap" />
            <span class="sl-label">{{ field(row, labelField) }}</span>
            <span v-if="field(row, annotationField)" class="sl-annot" :class="`c-${annotTone(row)}`">{{ field(row, annotationField) }}</span>
            <span v-else class="sl-chip" :class="`c-${rowTone(row)}`">
              <span class="sl-dot" />
              <span>{{ chipLabel(row) }}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- flat list -->
    <ul v-else class="sl-list">
      <li v-for="(row, i) in items" :key="i" class="sl-row">
        <span v-if="field(row, idField)" class="sl-id">{{ field(row, idField) }}</span>
        <span v-else class="sl-id-gap" />
        <span class="sl-label">{{ field(row, labelField) }}</span>
        <span v-if="field(row, annotationField)" class="sl-annot" :class="`c-${annotTone(row)}`">{{ field(row, annotationField) }}</span>
        <span v-else class="sl-chip" :class="`c-${rowTone(row)}`">
          <span class="sl-dot" />
          <span>{{ chipLabel(row) }}</span>
        </span>
      </li>
    </ul>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const TONES: ReadonlySet<string> = new Set(['success', 'warning', 'error', 'info', 'neutral'])

function cfgStr(key: string, fallback: string): string {
  const v = props.config[key]
  return typeof v === 'string' && v ? v : fallback
}

function field(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  return v === undefined || v === null ? '' : String(v)
}

const statuses = useStatuses(props)

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)

const isChecklist = computed(() => props.config.variant === 'checklist')

const idField = computed(() => cfgStr('idField', 'id'))
const labelField = computed(() => cfgStr('labelField', 'label'))
const statusField = computed(() => cfgStr('statusField', 'status'))
const statusLabelField = computed(() => cfgStr('statusLabelField', 'statusLabel'))
const annotationField = computed(() => cfgStr('annotationField', 'annotation'))
const annotationToneField = computed(() => cfgStr('annotationToneField', 'annotationTone'))
const checkField = computed(() => cfgStr('checkField', 'check'))
const metaField = computed(() => cfgStr('metaField', 'meta'))

const groupBy = computed(() => (typeof props.config.groupBy === 'string' ? props.config.groupBy : undefined))
const grouped = computed(() => !isChecklist.value && !!groupBy.value)

const groupOrder = computed<string[]>(() =>
  Array.isArray(props.config.groupOrder) ? (props.config.groupOrder as unknown[]).map(String) : [],
)

const items = computed(() => props.source)

interface Group {
  key: string
  rows: Record<string, unknown>[]
}

const groups = computed<Group[]>(() => {
  const by = groupBy.value
  if (!by) return []
  const buckets = new Map<string, Record<string, unknown>[]>()
  for (const row of items.value) {
    const key = field(row, by) || '—'
    const bucket = buckets.get(key)
    if (bucket) bucket.push(row)
    else buckets.set(key, [row])
  }
  const ordered: Group[] = []
  const seen = new Set<string>()
  for (const key of groupOrder.value) {
    const rows = buckets.get(key)
    if (rows) {
      ordered.push({ key, rows })
      seen.add(key)
    }
  }
  for (const [key, rows] of buckets) {
    if (!seen.has(key)) ordered.push({ key, rows })
  }
  return ordered
})

function rowTone(row: Record<string, unknown>): Tone {
  return statusInfo(field(row, statusField.value), statuses.value).tone
}

function chipLabel(row: Record<string, unknown>): string {
  const explicit = field(row, statusLabelField.value)
  if (explicit) return explicit
  const info = statusInfo(field(row, statusField.value), statuses.value)
  return info.label || info.tone
}

function annotTone(row: Record<string, unknown>): Tone {
  const raw = field(row, annotationToneField.value)
  return TONES.has(raw) ? (raw as Tone) : 'warning'
}

function markGlyph(row: Record<string, unknown>): string {
  const v = field(row, checkField.value)
  if (v === 'ok') return '✓'
  if (v === 'no') return '×'
  return '·'
}

function markClass(row: Record<string, unknown>): string {
  const v = field(row, checkField.value)
  if (v === 'ok') return 'mk-ok'
  if (v === 'no') return 'mk-no'
  return 'mk-idle'
}

const meta = computed(() => {
  const explicit = props.config.meta
  if (typeof explicit === 'string' && explicit) return explicit
  if (isChecklist.value) return 'checklist'
  if (grouped.value) return `groupBy: ${groupBy.value}`
  const n = items.value.length
  return `${n} item${n === 1 ? '' : 's'}`
})
</script>

<style scoped>
.sl-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sl-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-1);
}
.sl-row + .sl-row {
  border-top: 1px solid var(--border-subtle);
}

.sl-id {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  color: var(--fg-subtle);
}
.sl-id-gap {
  width: 0;
}

.sl-label {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--fg-default);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-annot {
  justify-self: end;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
}

.sl-chip {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 1px var(--space-2) 1px var(--space-1);
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  white-space: nowrap;
}
.sl-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
}

/* groups */
.sl-group + .sl-group {
  margin-top: var(--space-4);
}
.sl-gh {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.sl-glabel {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
}
.sl-gcount {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  color: var(--fg-faint);
}
.sl-grule {
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

/* checklist */
.sl-check {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sl-crit {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-1);
}
.sl-crit + .sl-crit {
  border-top: 1px solid var(--border-subtle);
}
.sl-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  line-height: 1;
}
.sl-clabel {
  min-width: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--fg-default);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sl-cmeta {
  justify-self: end;
  max-width: 130px;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mk-ok {
  background: var(--status-success-bg);
  border-color: var(--status-success-line);
  color: var(--status-success);
}
.mk-no {
  background: var(--status-error-bg);
  border-color: var(--status-error-line);
  color: var(--status-error);
}
.mk-idle {
  background: var(--bg-elevated);
  border-color: var(--border-default);
  color: var(--fg-faint);
}

/* per-tone: chip + dot + annotation share one rule each */
.c-success.sl-chip {
  color: var(--status-success);
  background: var(--status-success-bg);
  border-color: var(--status-success-line);
}
.c-success .sl-dot {
  background: var(--status-success);
}
.c-success.sl-annot {
  color: var(--status-success);
}

.c-warning.sl-chip {
  color: var(--status-warning);
  background: var(--status-warning-bg);
  border-color: var(--status-warning-line);
}
.c-warning .sl-dot {
  background: var(--status-warning);
}
.c-warning.sl-annot {
  color: var(--status-warning);
}

.c-error.sl-chip {
  color: var(--status-error);
  background: var(--status-error-bg);
  border-color: var(--status-error-line);
}
.c-error .sl-dot {
  background: var(--status-error);
}
.c-error.sl-annot {
  color: var(--status-error);
}

.c-info.sl-chip {
  color: var(--status-info);
  background: var(--status-info-bg);
  border-color: var(--status-info-line);
}
.c-info .sl-dot {
  background: var(--status-info);
}
.c-info.sl-annot {
  color: var(--status-info);
}

.c-neutral.sl-chip {
  color: var(--fg-muted);
  background: var(--status-neutral-bg);
  border-color: var(--status-neutral-line);
}
.c-neutral .sl-dot {
  background: var(--status-neutral);
}
.c-neutral.sl-annot {
  color: var(--fg-muted);
}
</style>
