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
    <table class="tab tab-desktop">
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
          @click="linkTo && navigate()"
          @keydown.enter="linkTo && navigate()"
        >
          <td v-for="col in columns" :key="col" :class="cellClass(col, row[col])">
            <span v-if="isStatusCol(col)" :class="'schip ' + statusInfo(String(row[col])).tone">
              <span class="dot" />
              <span>{{ statusInfo(String(row[col])).label }}</span>
            </span>
            <span v-else-if="isProgressCol(col)" class="row-pct">
              <span class="bar"><i :style="barStyle(row)" /></span>
              <span>{{ pct(row[col]) }}%</span>
            </span>
            <template v-else>{{ formatCell(row[col]) }}</template>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- MOBILE — same data, card-list shape -->
    <ul class="tab-cards" role="list">
      <li
        v-for="(row, i) in source"
        :key="i"
        :class="'tc-row is-' + rowTone(row)"
        :role="linkTo ? 'link' : undefined"
        :tabindex="linkTo ? 0 : undefined"
        @click="linkTo && navigate()"
        @keydown.enter="linkTo && navigate()"
      >
        <div class="tc-top">
          <span class="tc-id">{{ cardId(row) }}</span>
          <span v-if="statusCol" :class="'schip ' + statusInfo(String(row[statusCol])).tone">
            <span class="dot" />
            <span>{{ statusInfo(String(row[statusCol])).label }}</span>
          </span>
        </div>
        <div class="tc-title">{{ cardTitle(row) }}</div>
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
import { useRouter } from 'vue-router'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, type Tone } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const router = useRouter()
const linkTo = computed(() => props.config.linkTo as string | undefined)

function navigate(): void {
  if (linkTo.value && props.consumerId) {
    router.push('/' + props.consumerId + '/' + linkTo.value)
  }
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
  return statusInfo(String(row[statusCol.value])).tone
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
  if (isStatusCol(col) || isProgressCol(col)) return ''
  if (typeof value === 'number') return 'num'
  if (ID_KEYS.includes(col.toLowerCase())) return 'mono'
  if (TITLE_KEYS.includes(col.toLowerCase())) return 'title'
  if (col.toLowerCase() === 'owner') return 'owner'
  return ''
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>
