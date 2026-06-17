<template>
  <WidgetFrame
    :title="title"
    :icon="icon ?? '▦'"
    :meta="meta"
    :live="frameLive"
    :state="source.length ? 'ready' : 'empty'"
    empty-note="no records"
  >
    <div class="cg-grid" :style="gridStyle">
      <component
        :is="linkTo ? 'router-link' : 'div'"
        v-for="(record, i) in source"
        :key="i"
        class="subcard cg-card"
        :class="{
          'cg-attention': isAttention(record),
          'is-live': isLive(record),
        }"
        :style="isAttention(record) ? attentionStyle(record) : undefined"
        :to="linkTo ? resolveLink(linkTo, record) : undefined"
      >
        <div v-if="slots?.header?.length" class="cg-slot">
          <WidgetSlot :bindings="narrow(slots.header)" :parent-record="record" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        </div>
        <div v-else-if="hasHeader(record)" class="cg-head">
          <span v-if="titleField" class="cg-title">{{ display(record[titleField]) }}</span>
          <span v-if="badgeField && record[badgeField] != null" class="schip cg-badge" :class="badgeTone(record)">
            <span class="dot" />
            <span>{{ display(record[badgeField]) }}</span>
          </span>
        </div>

        <div v-if="slots?.body?.length" class="cg-slot cg-body">
          <WidgetSlot :bindings="narrow(slots.body)" :parent-record="record" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        </div>
        <template v-else>
          <span v-if="subtitleField" class="sc-sub">{{ display(record[subtitleField]) }}</span>
          <div v-if="extraFields.length" class="sc-fields">
            <div v-for="f in extraFields" :key="f" class="sf-row">
              <span class="sf-k">{{ f }}</span>
              <span class="sf-v" :class="{ mono: typeof record[f] === 'number' }">{{ display(record[f]) }}</span>
            </div>
          </div>
        </template>

        <div v-if="slots?.footer?.length" class="cg-slot cg-foot">
          <WidgetSlot :bindings="narrow(slots.footer)" :parent-record="record" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        </div>
      </component>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: named slots rendered per-card with the card record in scope.
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const statuses = useStatuses(props)

const DEFAULT_MIN_COL = 240
const DEFAULT_ATTENTION_TONE: Tone = 'error'

// A consumer-supplied predicate over a record field. The object form drives the
// per-card attention border; `gt` (numeric >), then `eq` (===), else truthy.
interface Attention {
  when: string
  gt?: number
  eq?: unknown
  tone?: Tone
}

// `config.live` is overloaded: an object selects a per-card live accent by field;
// a boolean drives the frame's "live" pill. The two never collide.
interface LiveByField {
  when: string
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function narrow(bindings: unknown[]): { widget: string }[] {
  return bindings.filter(
    (b): b is { widget: string } => typeof b === 'object' && b !== null && typeof (b as { widget?: unknown }).widget === 'string',
  )
}

function display(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const title = computed(() => str(props.config.title))
const icon = computed(() => str(props.config.icon))

const liveConfig = computed<LiveByField | undefined>(() => {
  const live = props.config.live
  if (live && typeof live === 'object' && typeof (live as { when?: unknown }).when === 'string') {
    return live as LiveByField
  }
  return undefined
})
const frameLive = computed(() => props.config.live === true)

const meta = computed(() => str(props.config.meta) ?? `${props.source.length} records`)

const minColWidth = computed(() => num(props.config.minColWidth) ?? DEFAULT_MIN_COL)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth.value}px, 1fr))`,
}))

const linkTo = computed(() => str(props.config.linkTo))
const titleField = computed(() => str(props.config.titleField) ?? 'title')
const subtitleField = computed(() => str(props.config.subtitleField) ?? 'subtitle')
const badgeField = computed(() => str(props.config.badgeField))
const badgeToneField = computed(() => str(props.config.badgeToneField))

const extraFields = computed<string[]>(() => {
  const fields = props.config.fields
  return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === 'string') : []
})

const attention = computed<Attention | undefined>(() => {
  const a = props.config.attention
  if (a && typeof a === 'object' && typeof (a as { when?: unknown }).when === 'string') {
    return a as Attention
  }
  return undefined
})

function resolveLink(link: string, record: Record<string, unknown>): string {
  return resolveRowLink(link, record, props.consumerId ?? '')
}

function hasHeader(record: Record<string, unknown>): boolean {
  return record[titleField.value] != null || (badgeField.value != null && record[badgeField.value] != null)
}

function badgeTone(record: Record<string, unknown>): Tone {
  const raw = badgeToneField.value ? str(record[badgeToneField.value]) : str(record[badgeField.value ?? ''])
  return statusInfo(raw ?? '', statuses.value).tone
}

function isAttention(record: Record<string, unknown>): boolean {
  const a = attention.value
  if (!a) return false
  const v = record[a.when]
  if (a.gt !== undefined) return num(v) !== undefined && (v as number) > a.gt
  if (a.eq !== undefined) return v === a.eq
  return Boolean(v)
}

function attentionTone(): Tone {
  return attention.value?.tone ?? DEFAULT_ATTENTION_TONE
}

function attentionStyle(record: Record<string, unknown>): Record<string, string> | undefined {
  if (!isAttention(record)) return undefined
  const t = attentionTone()
  return {
    borderColor: `var(--status-${t}-line)`,
    boxShadow: `0 0 0 1px color-mix(in srgb, var(--status-${t}) 18%, transparent), var(--shadow-ambient)`,
  }
}

function isLive(record: Record<string, unknown>): boolean {
  const cfg = liveConfig.value
  return cfg ? Boolean(record[cfg.when]) : false
}
</script>

<style scoped>
.cg-grid {
  display: grid;
  gap: 12px;
}

/* Reuses the global `.subcard` shell; these refine the per-card frame so the
   attention ring and live accent sit on a relative-positioned card. */
.cg-card {
  position: relative;
  gap: 8px;
}

.cg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.cg-title {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-default);
  letter-spacing: -0.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cg-badge {
  flex: none;
  height: 17px;
  padding: 0 7px 0 6px;
  font-size: 9.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cg-slot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.cg-body {
  flex: 1 1 auto;
}

.cg-foot {
  padding-top: 6px;
  margin-top: 2px;
  border-top: 1px solid var(--border-subtle);
}

/* Live accent: when no global `.is-live` scanline is wanted, a subtle
   info-tinted border keeps the streaming record legible. The global
   `.is-live::after` scanline (tokens.css) still layers above. */
.cg-card.is-live {
  border-color: var(--status-info-line);
}

/* The attention border tone is data-driven, so it's applied as an inline
   `border-color`/`box-shadow` (higher specificity than `.subcard:hover`),
   which keeps the ring stable on hover without a tone-specific rule here. */
</style>
