<template>
  <WidgetFrame
    :title="title"
    icon="▤"
    :meta="meta"
    :live="live"
    body-class="flush"
    :state="source.length === 0 ? 'empty' : 'ready'"
    :empty-note="emptyNote"
  >
    <!-- DESKTOP — wide table -->
    <table v-if="!isNarrow" class="tab tab-desktop">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in source"
          :key="i"
          :role="linkTo ? 'link' : undefined"
          :tabindex="linkTo ? 0 : undefined"
          @click="linkTo && navigate(row)"
          @keydown.enter="linkTo && navigate(row)"
        >
          <td v-for="col in columns" :key="col" :class="cellClass(col, row[col])">
            <WidgetSlot
              v-if="slots?.['cell:' + col]?.length"
              :bindings="slots['cell:' + col]"
              :parent-record="row"
              :depth="depth ?? 0"
              :consumer-id="consumerId ?? ''"
            />
            <span v-else-if="isStatusCol(col)" :class="'schip ' + statusInfo(String(row[col]), statuses).tone">
              <span class="dot" />
              <span>{{ statusInfo(String(row[col]), statuses).label }}</span>
            </span>
            <span v-else-if="isProgressCol(col)" class="row-pct">
              <span class="bar"><i :style="barStyle(row)" /></span>
              <span>{{ pct(row[col]) }}%</span>
            </span>
            <template v-else-if="isLinkCol(col) && rowHref(row)">
              <RouterLink class="cell-link cell-primary" :to="rowHref(row)!" @click.stop>{{ formatCell(row[col]) }}</RouterLink>
              <span v-if="subtitleFor(col, row)" class="cell-sub">{{ subtitleFor(col, row) }}</span>
            </template>
            <template v-else-if="subtitleFor(col, row)">
              <span class="cell-primary">{{ formatCell(row[col]) }}</span>
              <span class="cell-sub">{{ subtitleFor(col, row) }}</span>
            </template>
            <template v-else>{{ formatCell(row[col]) }}</template>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- MOBILE — same data, card-list shape -->
    <ul v-else class="tab-cards" role="list">
      <li
        v-for="(row, i) in source"
        :key="i"
        :class="'tc-row is-' + rowTone(row)"
        :role="linkTo ? 'link' : undefined"
        :tabindex="linkTo ? 0 : undefined"
        @click="linkTo && navigate(row)"
        @keydown.enter="linkTo && navigate(row)"
      >
        <div class="tc-top">
          <span class="tc-id">{{ cardId(row) }}</span>
          <span v-if="statusCol" :class="'schip ' + statusInfo(String(row[statusCol]), statuses).tone">
            <span class="dot" />
            <span>{{ statusInfo(String(row[statusCol]), statuses).label }}</span>
          </span>
        </div>
        <div class="tc-title">
          <RouterLink v-if="rowHref(row)" class="cell-link" :to="rowHref(row)!" @click.stop>{{ cardTitle(row) }}</RouterLink>
          <template v-else>{{ cardTitle(row) }}</template>
        </div>
        <div v-if="cardSub(row)" class="tc-sub">{{ cardSub(row) }}</div>
        <div v-if="progressCol" class="tc-progress">
          <span class="tc-bar"><i :style="barStyle(row)" /></span>
          <span class="tc-pct">{{ pct(row[progressCol]) }}%</span>
        </div>
        <div v-if="cardMeta(row).length" class="tc-meta">
          <template v-for="(m, mi) in cardMeta(row)" :key="mi">
            <span v-if="mi > 0" class="tc-dot">·</span>
            <span :class="mi === 0 ? 'tc-owner' : 'tc-date'">{{ m }}</span>
          </template>
        </div>
      </li>
    </ul>

    <div class="table-foot">
      <span>{{ source.length }} of {{ source.length }} · all</span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { useMediaQuery } from '../../composables/useMediaQuery.js'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: `cell:<columnId>` slots render a custom cell per row.
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const router = useRouter()
const linkTo = computed(() => props.config.linkTo as string | undefined)
const statuses = useStatuses(props)

// Render only ONE of the desktop/mobile layouts (v-if, not CSS display). Mirrors
// the .tab-desktop/.tab-cards toggle in styles/responsive.css (@media max-width:
// 720px). With CSS display both stay mounted, so the desktop table's `cell:`
// slots would fetch even while hidden on mobile.
const isNarrow = useMediaQuery('(max-width: 720px)')

// §2c: interpolate :tokens from the clicked row (static slug passes through).
function navigate(row: Record<string, unknown>): void {
  if (linkTo.value && props.consumerId) {
    router.push(resolveRowLink(linkTo.value, row, props.consumerId))
  }
}

// Optional VISIBLE link: `linkField` names the column whose value renders as a
// real <a> (RouterLink) — a discoverable affordance on top of the whole-row
// click. Without it, the row is still navigable but has no anchor. Generic: the
// column name is consumer-supplied, no domain meaning here.
const linkField = computed(() => props.config.linkField as string | undefined)
function isLinkCol(col: string): boolean {
  return !!linkField.value && col === linkField.value
}
function rowHref(row: Record<string, unknown>): string | undefined {
  return linkTo.value && props.consumerId ? resolveRowLink(linkTo.value, row, props.consumerId) : undefined
}

const title = computed(() => props.config.title as string | undefined)
const live = computed(() => props.config.live === true)

const SKIP_KEYS = new Set(['_body', '_file'])

const columns = computed<string[]>(() => {
  if (Array.isArray(props.config.columns) && props.config.columns.length > 0) {
    return props.config.columns as string[]
  }
  if (props.source.length === 0) return []
  return Object.keys(props.source[0]).filter((k) => !SKIP_KEYS.has(k))
})

const meta = computed(() => {
  const ref = props.config.sourceRef as string | undefined
  const rows = props.source.length + ' rows'
  return ref ? `source · ${ref} · ${rows}` : rows
})

const emptyNote = computed(() => String(props.config.emptyNote ?? '0 rows'))

// A `subtitles` config maps a columnId -> the field whose value renders as a
// muted second line under that column's primary value (e.g. a task `title` with
// its one-line `summary` beneath it). Lets a manifest fold two fields into one
// readable cell instead of two columns. Generic: no column name is hardcoded.
const subtitles = computed<Record<string, string>>(() => {
  const s = props.config.subtitles
  return s && typeof s === 'object' && !Array.isArray(s) ? (s as Record<string, string>) : {}
})
function subtitleFor(col: string, row: Record<string, unknown>): string {
  const f = subtitles.value[col]
  if (!f) return ''
  const v = row[f]
  return v === null || v === undefined || v === '' ? '' : String(v)
}

const STATUS_KEYS = new Set(['status', 'state'])
const PROGRESS_KEYS = new Set(['progress', 'pct', 'percent'])

const statusCol = computed(() => columns.value.find((c) => STATUS_KEYS.has(c.toLowerCase())))
const progressCol = computed(() => columns.value.find((c) => PROGRESS_KEYS.has(c.toLowerCase())))

function isStatusCol(col: string): boolean {
  return col === statusCol.value
}
function isProgressCol(col: string): boolean {
  return col === progressCol.value && typeof firstNum(col) === 'number'
}
function firstNum(col: string): number | undefined {
  const v = props.source[0]?.[col]
  return typeof v === 'number' ? v : undefined
}

const ID_KEYS = ['id', 'slug', 'key', 'ref']
const TITLE_KEYS = ['title', 'name', 'label']

function pickKey(candidates: string[]): string | undefined {
  return columns.value.find((c) => candidates.includes(c.toLowerCase()))
}

function cardId(row: Record<string, unknown>): string {
  const k = pickKey(ID_KEYS)
  return k ? formatCell(row[k]) : ''
}
function cardTitle(row: Record<string, unknown>): string {
  const k = pickKey(TITLE_KEYS) ?? columns.value.find((c) => c !== statusCol.value && c !== progressCol.value)
  return k ? formatCell(row[k]) : ''
}
// Mobile counterpart of the desktop subtitle: the muted line under the card's
// title, resolved from the same column the card uses as its title.
function cardSub(row: Record<string, unknown>): string {
  const titleKey =
    pickKey(TITLE_KEYS) ?? columns.value.find((c) => c !== statusCol.value && c !== progressCol.value)
  return titleKey ? subtitleFor(titleKey, row) : ''
}
function cardMeta(row: Record<string, unknown>): string[] {
  const used = new Set(
    [pickKey(ID_KEYS), pickKey(TITLE_KEYS), statusCol.value, progressCol.value].filter(Boolean) as string[],
  )
  return columns.value
    .filter((c) => !used.has(c))
    .slice(0, 2)
    .map((c) => formatCell(row[c]))
    .filter((v) => v && v !== '—')
}

function rowTone(row: Record<string, unknown>): Tone {
  if (!statusCol.value) return 'neutral'
  return statusInfo(String(row[statusCol.value]), statuses.value).tone
}

function barColor(row: Record<string, unknown>): string {
  const tone = rowTone(row)
  if (tone === 'success') return 'var(--status-success)'
  if (tone === 'warning') return 'var(--status-warning)'
  return 'var(--status-info)'
}
function barStyle(row: Record<string, unknown>): Record<string, string> {
  const col = progressCol.value
  const value = col ? row[col] : 0
  return { width: pct(value) + '%', background: barColor(row) }
}

function pct(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return 0
  return Math.round((n <= 1 ? n * 100 : n))
}

function cellClass(col: string, value: unknown): string {
  let base = ''
  if (isStatusCol(col) || isProgressCol(col)) base = ''
  else if (typeof value === 'number') base = 'num'
  else if (ID_KEYS.includes(col.toLowerCase())) base = 'mono'
  else if (TITLE_KEYS.includes(col.toLowerCase())) base = 'title'
  else if (col.toLowerCase() === 'owner') base = 'owner'
  // A column carrying a subtitle stacks two lines — top-align it so a two-line
  // cell reads cleanly next to single-line cells (id, status).
  if (subtitles.value[col]) base = base ? base + ' has-sub' : 'has-sub'
  return base
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<style scoped>
/* Visible row link (config.linkField): a real anchor on the named column, so the
   row's navigation is discoverable, not just a bare click target. */
.cell-link {
  color: var(--accent-link);
  text-decoration: none;
}
.cell-link:hover {
  text-decoration: underline;
}
</style>
