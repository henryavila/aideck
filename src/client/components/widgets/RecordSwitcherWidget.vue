<template>
  <span v-if="!records.length" class="rs-empty">// no records</span>

  <div v-else ref="rootEl" class="rs">
    <button class="rs-trigger" type="button" :aria-expanded="open" @click.stop="toggle">
      <span class="rs-title">{{ field(current, titleField) }}</span>
      <span class="rs-caret" :class="{ up: open }">▾</span>
    </button>

    <div v-if="open" class="rs-menu" role="listbox">
      <component
        :is="linkTo ? 'router-link' : 'div'"
        v-for="(rec, i) in records"
        :key="i"
        class="rs-row"
        :class="{ on: rec === current, nav: !!linkTo }"
        :to="linkTo ? hrefFor(rec) : undefined"
        role="option"
        :aria-selected="rec === current"
        @click="onPick"
      >
        <span class="rs-chip" :class="`c-${tone(rec)}`">
          <span class="rs-dot" />
          <span class="rs-clabel">{{ chipLabel(rec) }}</span>
        </span>
        <span class="rs-body">
          <span class="rs-name">{{ field(rec, titleField) }}</span>
          <span v-if="field(rec, captionField)" class="rs-caption">{{ field(rec, captionField) }}</span>
        </span>
        <span class="rs-check">{{ rec === current ? '✓' : '' }}</span>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const route = useRoute()
const statuses = useStatuses(props)

function cfgStr(key: string, fallback: string): string {
  const v = props.config[key]
  return typeof v === 'string' && v ? v : fallback
}

function field(row: Record<string, unknown> | undefined, key: string): string {
  if (!row) return ''
  const v = row[key]
  return v === undefined || v === null ? '' : String(v)
}

const titleField = computed(() => cfgStr('titleField', 'title'))
const captionField = computed(() => cfgStr('captionField', 'caption'))
const statusField = computed(() => cfgStr('statusField', 'status'))
const statusLabelField = computed(() => cfgStr('statusLabelField', 'statusLabel'))
const idField = computed(() => cfgStr('idField', 'id'))
const paramField = computed(() => cfgStr('paramField', 'slug'))
const linkTo = computed(() => (typeof props.config.linkTo === 'string' && props.config.linkTo ? props.config.linkTo : undefined))

const records = computed(() => props.source)

function hrefFor(rec: Record<string, unknown>): string | undefined {
  return linkTo.value ? resolveRowLink(linkTo.value, rec, props.consumerId ?? '') : undefined
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

// Match the focused record against the current route: prefer the record whose
// resolved drill-down link equals route.path, then fall back to an id/param
// match, then the first record.
const current = computed<Record<string, unknown> | undefined>(() => {
  const rows = records.value
  if (!rows.length) return undefined

  if (linkTo.value) {
    const here = safeDecode(route.path)
    const byPath = rows.find((r) => {
      const href = hrefFor(r)
      return href !== undefined && safeDecode(href) === here
    })
    if (byPath) return byPath
  }

  const param = route.params[paramField.value]
  const paramValue = Array.isArray(param) ? param[0] : param
  if (paramValue != null) {
    const byId = rows.find((r) => field(r, idField.value) === String(paramValue))
    if (byId) return byId
  }

  return rows[0]
})

function tone(rec: Record<string, unknown>): Tone {
  return statusInfo(field(rec, statusField.value), statuses.value).tone
}

function chipLabel(rec: Record<string, unknown>): string {
  const explicit = field(rec, statusLabelField.value)
  if (explicit) return explicit
  const info = statusInfo(field(rec, statusField.value), statuses.value)
  return info.label || info.tone
}

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function onPick() {
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
  } else {
    document.removeEventListener('click', onDocClick)
    window.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.rs-empty {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 12px;
  color: var(--fg-muted);
}

.rs {
  position: relative;
  display: inline-block;
}

.rs-trigger {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.rs-title {
  font-family: var(--font-sans);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--fg-default);
}

.rs-caret {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 13px;
  color: var(--fg-subtle);
  transition: transform var(--duration-normal) var(--ease-out);
}
.rs-caret.up {
  transform: rotate(180deg);
}

.rs-menu {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  z-index: 20;
  min-width: 320px;
  max-height: min(60vh, 280px);
  overflow-y: auto;
  padding: var(--space-1);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.rs-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
}
.rs-row.nav {
  cursor: pointer;
}
.rs-row.nav:not(.on):hover {
  background: var(--bg-overlay);
}
.rs-row.on {
  background: color-mix(in srgb, var(--status-info) 10%, var(--bg-elevated));
}

.rs-chip {
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
.rs-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
}

.rs-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.rs-name {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--fg-default);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rs-caption {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  color: var(--fg-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-check {
  justify-self: end;
  width: 12px;
  text-align: center;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 12px;
  color: var(--status-info);
}

.c-success.rs-chip {
  color: var(--status-success);
  background: var(--status-success-bg);
  border-color: var(--status-success-line);
}
.c-success .rs-dot {
  background: var(--status-success);
}

.c-warning.rs-chip {
  color: var(--status-warning);
  background: var(--status-warning-bg);
  border-color: var(--status-warning-line);
}
.c-warning .rs-dot {
  background: var(--status-warning);
}

.c-error.rs-chip {
  color: var(--status-error);
  background: var(--status-error-bg);
  border-color: var(--status-error-line);
}
.c-error .rs-dot {
  background: var(--status-error);
}

.c-info.rs-chip {
  color: var(--status-info);
  background: var(--status-info-bg);
  border-color: var(--status-info-line);
}
.c-info .rs-dot {
  background: var(--status-info);
}

.c-neutral.rs-chip {
  color: var(--fg-muted);
  background: var(--status-neutral-bg);
  border-color: var(--status-neutral-line);
}
.c-neutral .rs-dot {
  background: var(--status-neutral);
}
</style>
