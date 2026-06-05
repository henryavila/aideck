<template>
  <WidgetFrame
    :title="title"
    icon="▦"
    :meta="meta"
    :live="live"
    body-class="flush"
    :state="columns.length === 0 ? 'empty' : 'ready'"
    empty-note="no columns configured"
  >
    <!-- DESKTOP — tonal column grid -->
    <div v-if="!isNarrow" class="kb kb-desktop" :style="{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }">
      <div v-for="col in columns" :key="col.id" class="kb-col" :data-col="col.id">
        <div class="kb-col-h">
          <span class="accent" :class="`tone-${columnTone(col.id)}`" />
          <span class="name" :class="`tone-${columnTone(col.id)}`">{{ col.label }}</span>
          <span class="ct" :class="`tone-${columnTone(col.id)}`">{{ cardsByColumn[col.id]?.length ?? 0 }}</span>
        </div>
        <div class="kb-cards">
          <template v-if="(cardsByColumn[col.id]?.length ?? 0) === 0">
            <div class="kb-empty">// no cards · drop a task to begin</div>
          </template>
          <div
            v-for="(card, i) in cardsByColumn[col.id] ?? []"
            :key="i"
            class="kb-card"
            :class="columnAccent(col.id)"
            tabindex="0"
          >
            <div class="row-top">
              <span class="id">{{ card.id }}</span>
              <span v-if="card.priority" class="prio" :class="`p-${card.priority}`">
                <span class="pdot" />
                <span>p{{ card.priority }}</span>
              </span>
            </div>
            <div class="ti">
              <RouterLink v-if="cardHref(card)" :to="cardHref(card)!" class="kb-title-link">{{ card.title }}</RouterLink>
              <template v-else>{{ card.title }}</template>
            </div>
            <div v-if="card.tags.length" class="tags">
              <span v-for="(t, ti) in card.tags" :key="t" class="tk" :class="`t-${tagIndex(ti)}`">{{ t }}</span>
            </div>
            <WidgetSlot
              v-if="slots?.card?.length"
              :bindings="slots.card"
              :parent-record="card"
              :depth="depth ?? 0"
              :consumer-id="consumerId ?? ''"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- MOBILE — segmented control + single column -->
    <div v-else class="kb-mobile">
      <div class="kb-seg" role="tablist">
        <button
          v-for="(col, i) in columns"
          :key="col.id"
          class="seg"
          :class="i === activeIdx ? `on tone-${columnTone(col.id)}` : ''"
          role="tab"
          :aria-selected="i === activeIdx"
          @click="activeIdx = i"
        >
          <span class="seg-dot" :class="`tone-${columnTone(col.id)}`" />
          <span class="seg-name">{{ col.label }}</span>
          <span class="seg-ct">{{ cardsByColumn[col.id]?.length ?? 0 }}</span>
        </button>
      </div>
      <div class="kb-mobile-list">
        <template v-if="(cardsByColumn[activeColumn?.id ?? '']?.length ?? 0) === 0">
          <div class="kb-empty kb-empty-lg">
            <span class="ke-dot" />
            <span class="ke-msg">// nothing in <em>{{ (activeColumn?.label ?? '').toLowerCase() }}</em></span>
            <span class="ke-hint">tasks land here when their status changes to <code>{{ activeColumn?.id }}</code>.</span>
          </div>
        </template>
        <div v-else class="kb-cards kb-cards-mobile">
          <div
            v-for="(card, i) in cardsByColumn[activeColumn?.id ?? ''] ?? []"
            :key="i"
            class="kb-card"
            :class="columnAccent(activeColumn?.id ?? '')"
            tabindex="0"
          >
            <div class="row-top">
              <span class="id">{{ card.id }}</span>
              <span v-if="card.priority" class="prio" :class="`p-${card.priority}`">
                <span class="pdot" />
                <span>p{{ card.priority }}</span>
              </span>
            </div>
            <div class="ti">
              <RouterLink v-if="cardHref(card)" :to="cardHref(card)!" class="kb-title-link">{{ card.title }}</RouterLink>
              <template v-else>{{ card.title }}</template>
            </div>
            <div v-if="card.tags.length" class="tags">
              <span v-for="(t, ti) in card.tags" :key="t" class="tk" :class="`t-${tagIndex(ti)}`">{{ t }}</span>
            </div>
            <WidgetSlot
              v-if="slots?.card?.length"
              :bindings="slots.card"
              :parent-record="card"
              :depth="depth ?? 0"
              :consumer-id="consumerId ?? ''"
            />
          </div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { useMediaQuery } from '../../composables/useMediaQuery.js'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

interface KanbanCard {
  id: string
  title: string
  priority: string
  tags: string[]
  [key: string]: unknown
}

interface KanbanColumn {
  id: string
  label: string
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: a `card` slot overlays each kanban card (the card record,
  // which spreads the full row incl. rollup fields, is the slot scope).
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const title = computed(() => (props.config.title as string | undefined) ?? 'issues')
const live = computed(() => props.config.live === true)

// Render only ONE of the desktop/mobile layouts (v-if, not CSS display). The
// breakpoint mirrors the `.kb-desktop`/`.kb-mobile` toggle in
// styles/responsive.css (@media max-width: 720px). With CSS display both
// subtrees stay mounted, so each card's `card` slot would fetch twice.
const isNarrow = useMediaQuery('(max-width: 720px)')

const statusField = computed(() => String(props.config.statusField ?? 'status'))
const titleField = computed(() => String(props.config.titleField ?? 'title'))
const idField = computed(() => String(props.config.idField ?? 'id'))
const priorityField = computed(() => String(props.config.priorityField ?? 'priority'))
const tagsField = computed(() => String(props.config.tagsField ?? 'tags'))

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

const columns = computed<KanbanColumn[]>(() => {
  const c = props.config.columns
  if (Array.isArray(c)) {
    return (c as unknown[]).map((entry) => {
      if (typeof entry === 'string') return { id: entry, label: entry }
      const o = entry as Record<string, unknown>
      const id = String(o.id ?? o.label ?? '')
      return { id, label: String(o.label ?? id) }
    })
  }
  return DEFAULT_COLUMNS
})

const statuses = useStatuses(props)

function columnTone(id: string): string {
  return statusInfo(id, statuses.value).tone
}

function columnAccent(id: string): string {
  const tone = statusInfo(id, statuses.value).tone
  if (tone === 'info') return 'accent-info'
  if (tone === 'success') return 'accent-success'
  if (tone === 'warning') return 'accent-warning'
  return ''
}

// Tags use chart palette (t-1..t-6) rotation; status colors are reserved for status.
function tagIndex(i: number): number {
  return (Math.abs(i) % 6) + 1
}

const cardsByColumn = computed<Record<string, KanbanCard[]>>(() => {
  const result: Record<string, KanbanCard[]> = {}
  for (const col of columns.value) result[col.id] = []
  for (const row of props.source) {
    const status = String(row[statusField.value] ?? '')
    if (!result[status]) continue
    const rawTags = row[tagsField.value]
    result[status].push({
      ...row,
      id: String(row[idField.value] ?? ''),
      title: String(row[titleField.value] ?? ''),
      priority: row[priorityField.value] != null ? String(row[priorityField.value]) : '',
      tags: Array.isArray(rawTags) ? (rawTags as unknown[]).map(String) : [],
    })
  }
  return result
})

const meta = computed(() => {
  const total = props.source.length
  return `${total} ${total === 1 ? 'card' : 'cards'} · ${columns.value.length} columns`
})

const activeIdx = ref(Math.max(0, columns.value.findIndex((c) => c.id === 'in-progress')))
const activeColumn = computed<KanbanColumn | undefined>(() => columns.value[activeIdx.value])

// §2c row-scoped card link: when `linkTo` is set, the card title links, :tokens
// interpolated from that card's record (tokenless stays static). Generic — the
// card record spreads the full source row, so any field token resolves.
const linkTo = computed(() => props.config.linkTo as string | undefined)
function cardHref(card: Record<string, unknown>): string | undefined {
  return linkTo.value ? resolveRowLink(linkTo.value, card, props.consumerId ?? '') : undefined
}
</script>

<style scoped>
/* Title-as-link inside a kanban card: inherit the card title type, accent on hover. */
.kb-title-link {
  color: inherit;
  text-decoration: none;
}
.kb-title-link:hover {
  color: var(--accent-link);
  text-decoration: underline;
}
</style>
