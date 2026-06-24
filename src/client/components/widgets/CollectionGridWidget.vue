<template>
  <div class="cgrid" :style="gridStyle">
    <div
      v-for="(record, i) in source"
      :key="i"
      class="rcard"
      :class="{ attn: isAttention(record), 'is-live': isLive(record) }"
      :style="isAttention(record) ? attentionStyle() : undefined"
    >
      <!-- HEAD: status dot · title-link (+ optional sub) · mode badge -->
      <div class="rc-head">
        <span v-if="dotTone(record)" class="rc-dot" :style="{ background: toneColor(dotTone(record)) }" />
        <div class="rc-titlewrap">
          <span class="rc-title">
            <component
              :is="linkFor(record) ? RouterLink : 'span'"
              :class="linkFor(record) ? 'lnk' : ''"
              :to="linkFor(record) || undefined"
            >{{ display(record[titleField]) }}</component>
          </span>
          <span v-if="subField && record[subField] != null" class="rc-sub">{{ display(record[subField]) }}</span>
        </div>
        <span v-if="badgeField && record[badgeField] != null" class="badge" :style="badgeStyle(record)">{{ display(record[badgeField]) }}</span>
      </div>

      <div class="rc-body">
        <!-- METRIC STRIP -->
        <div v-if="extraFields.length && fieldLabels.length" class="stat-row">
          <div v-for="(f, idx) in extraFields" :key="f" class="stat-cell">
            <div class="sv" :style="metricStyle(record, f)">{{ display(record[f]) }}</div>
            <div class="sl">{{ fieldLabels[idx] ?? f }}</div>
          </div>
        </div>

        <!-- NESTED mini-list (fronts) -->
        <div v-if="nestedRows(record).length" class="nest-wrap">
          <span v-if="nestedLabel" class="pr-label">{{ nestedLabel }}</span>
          <div class="nested">
            <component
              :is="nestedLinkFor(fr) ? RouterLink : 'div'"
              v-for="(fr, j) in nestedRows(record)"
              :key="j"
              class="nrow"
              :to="nestedLinkFor(fr) || undefined"
            >
              <span class="ndot" :style="{ background: toneColor(str(fr[nestedDotToneField]) || 'info') }" />
              <div class="nrow-main">
                <span class="ntitle">{{ display(fr[nestedTitleField]) }}</span>
                <span v-if="fr[nestedSubField]" class="nsub">{{ display(fr[nestedSubField]) }}</span>
              </div>
              <span v-if="fr[nestedCodeField]" class="ncode">{{ display(fr[nestedCodeField]) }}</span>
            </component>
          </div>
          <span v-if="moreField && record[moreField]" class="pr-label pr-faint">+{{ display(record[moreField]) }}</span>
        </div>
        <span v-else-if="idleField && record[idleField]" class="pr-label pr-faint">{{ display(record[idleField]) }}</span>

        <!-- §2b composed body: per-record slot widgets (rendered inline, no frame)
             — e.g. the Foco card's phase track + tasks progress + próxima-ação. -->
        <div v-if="slots?.body?.length" class="rc-slot-body">
          <WidgetSlot
            :bindings="slots.body"
            :parent-record="record"
            :depth="depth ?? 0"
            :consumer-id="consumerId ?? ''"
          />
        </div>
      </div>

      <!-- FOOT: timestamp · live -->
      <div v-if="(footerField && record[footerField] != null) || isLive(record)" class="rc-foot">
        <span class="ts">{{ footerField && record[footerField] != null ? display(record[footerField]) : '' }}</span>
        <span v-if="isLive(record)" class="lh-live"><i />live</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WidgetSlot from '../WidgetSlot.vue'
import { resolveRowLink } from '../../utils/link.js'
import { type Tone } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const DEFAULT_MIN_COL = 340

interface Attention {
  when: string
  gt?: number
  eq?: unknown
  tone?: Tone
}
interface LiveByField {
  when: string
}
const EMPTY_ROWS: Record<string, unknown>[] = []

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}
function display(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
function toneColor(tone: string | undefined): string {
  return tone ? `var(--status-${tone})` : 'var(--status-neutral)'
}

const minColWidth = computed(() => num(props.config.minColWidth) ?? DEFAULT_MIN_COL)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth.value}px, 1fr))`,
}))

const titleField = computed(() => str(props.config.titleField) ?? 'title')
const subField = computed(() => str(props.config.subField))
const linkTo = computed(() => str(props.config.linkTo))
const badgeField = computed(() => str(props.config.badgeField))
const badgeToneField = computed(() => str(props.config.badgeToneField))
const dotToneField = computed(() => str(props.config.dotToneField))

const extraFields = computed<string[]>(() => {
  const f = props.config.fields
  return Array.isArray(f) ? f.filter((x): x is string => typeof x === 'string') : []
})
const fieldLabels = computed<string[]>(() => {
  const v = props.config.fieldLabels
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
})
const alertField = computed(() => str(props.config.alertField))

const nestedField = computed(() => str(props.config.nestedField))
const nestedTitleField = computed(() => str(props.config.nestedTitleField) ?? 'title')
const nestedSubField = computed(() => str(props.config.nestedSubField) ?? 'nextAction')
const nestedCodeField = computed(() => str(props.config.nestedCodeField) ?? 'phaseId')
const nestedDotToneField = computed(() => str(props.config.nestedDotToneField) ?? 'dotTone')
const nestedLinkTo = computed(() => str(props.config.nestedLinkTo))
const nestedLabel = computed(() => str(props.config.nestedLabel))
const moreField = computed(() => str(props.config.moreField))
const idleField = computed(() => str(props.config.idleField))
const footerField = computed(() => str(props.config.footerField))

const attention = computed<Attention | undefined>(() => {
  const a = props.config.attention
  return a && typeof a === 'object' && typeof (a as { when?: unknown }).when === 'string' ? (a as Attention) : undefined
})
const liveConfig = computed<LiveByField | undefined>(() => {
  const l = props.config.live
  return l && typeof l === 'object' && typeof (l as { when?: unknown }).when === 'string' ? (l as LiveByField) : undefined
})

function linkFor(record: Record<string, unknown>): string | undefined {
  return linkTo.value && props.consumerId ? resolveRowLink(linkTo.value, record, props.consumerId) : undefined
}
function nestedLinkFor(fr: Record<string, unknown>): string | undefined {
  return nestedLinkTo.value && props.consumerId ? resolveRowLink(nestedLinkTo.value, fr, props.consumerId) : undefined
}
function nestedRows(record: Record<string, unknown>): Record<string, unknown>[] {
  if (!nestedField.value) return EMPTY_ROWS
  const v = record[nestedField.value]
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : EMPTY_ROWS
}
function dotTone(record: Record<string, unknown>): string | undefined {
  return dotToneField.value ? str(record[dotToneField.value]) : undefined
}
function badgeStyle(record: Record<string, unknown>): Record<string, string> | undefined {
  const tone = badgeToneField.value ? str(record[badgeToneField.value]) : undefined
  if (!tone || tone === 'neutral') return undefined
  return { color: `var(--status-${tone})`, borderColor: `var(--status-${tone}-line)` }
}
function metricStyle(record: Record<string, unknown>, f: string): Record<string, string> | undefined {
  if (alertField.value === f) {
    const n = num(record[f])
    if (n !== undefined && n > 0) return { color: 'var(--status-error)' }
  }
  return undefined
}
function isAttention(record: Record<string, unknown>): boolean {
  const a = attention.value
  if (!a) return false
  const v = record[a.when]
  if (a.gt !== undefined) return num(v) !== undefined && (v as number) > a.gt
  if (a.eq !== undefined) return v === a.eq
  return Boolean(v)
}
function attentionStyle(): Record<string, string> {
  const t = attention.value?.tone ?? 'error'
  return {
    borderColor: `var(--status-${t}-line)`,
    boxShadow: `0 0 0 1px color-mix(in srgb, var(--status-${t}) 18%, transparent), var(--shadow-ambient)`,
  }
}
function isLive(record: Record<string, unknown>): boolean {
  return liveConfig.value ? Boolean(record[liveConfig.value.when]) : false
}
</script>

<style scoped>
/* Record-card preset — lifted verbatim from the DS spec (aideck-widgets.css).
   Scoped so the nested rows (rendered here) get the canonical hover/styling. */
.cgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 14px; align-items: start; }

.rcard { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-ambient); overflow: hidden; display: flex; flex-direction: column; }
.rcard.attn { border-color: var(--status-error-line); box-shadow: 0 0 0 1px color-mix(in srgb, var(--status-error) 18%, transparent), var(--shadow-ambient); }

.rc-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--border-subtle); }
.rc-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.rc-titlewrap { min-width: 0; display: flex; flex-direction: column; gap: 2px; flex: 1; }
.rc-title { font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--fg-default); letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-title :deep(a), .rc-title .lnk { color: var(--accent-link); text-decoration: none; cursor: pointer; }
.rc-title .lnk:hover { text-decoration: underline; text-underline-offset: 3px; }
.rc-sub { font-family: var(--font-mono); font-size: 10px; color: var(--fg-subtle); font-feature-settings: 'calt' 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.badge { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fg-muted); background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 2px 6px; font-feature-settings: 'calt' 0; white-space: nowrap; flex: none; }

.rc-body { padding: 11px 12px; display: flex; flex-direction: column; gap: 11px; }
/* Composed slot body: stack the inline child widgets with the same rhythm. */
.rc-slot-body { display: flex; flex-direction: column; gap: 11px; min-width: 0; }

.stat-row { display: flex; gap: 14px; }
.stat-cell .sv { font-family: var(--font-mono); font-size: 16px; font-weight: 600; color: var(--fg-default); font-variant-numeric: tabular-nums; line-height: 1; font-feature-settings: 'calt' 0; }
.stat-cell .sl { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fg-subtle); margin-top: 3px; font-feature-settings: 'calt' 0; }

.nest-wrap { display: flex; flex-direction: column; gap: 5px; }
.pr-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-subtle); font-feature-settings: 'calt' 0; }
.pr-faint { color: var(--fg-subtle); }

.nested { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
.nrow { display: flex; align-items: center; gap: 7px; padding: 5px 8px; cursor: pointer; text-decoration: none; }
.nrow + .nrow { border-top: 1px solid var(--border-subtle); }
.nrow:hover { background: var(--bg-elevated); }
.ndot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.nrow-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ntitle { font-family: var(--font-sans); font-size: 11px; color: var(--fg-default); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nsub { font-family: var(--font-sans); font-size: 10px; color: var(--fg-subtle); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ncode { font-family: var(--font-mono); font-size: 9px; color: var(--fg-subtle); font-feature-settings: 'calt' 0; flex: none; }

.rc-foot { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-top: 1px solid var(--border-subtle); background: var(--bg-canvas); }
.rc-foot .ts { font-family: var(--font-mono); font-size: 10px; color: var(--fg-subtle); font-feature-settings: 'calt' 0; }
.lh-live { display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono); font-size: 9px; color: var(--status-success); font-feature-settings: 'calt' 0; letter-spacing: 0.04em; text-transform: uppercase; }
.lh-live i { width: 5px; height: 5px; border-radius: 50%; background: var(--status-success); box-shadow: 0 0 6px color-mix(in srgb, var(--status-success) 80%, transparent); }
</style>
