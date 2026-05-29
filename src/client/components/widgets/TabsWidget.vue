<template>
  <WidgetFrame :title="title" :icon="icon ?? '⊟'" :meta="meta" :live="live" body-class="flush">
    <div class="tabw">
      <div ref="barEl" class="tabw-bar" role="tablist" @keydown="onKey">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          class="tabw-tab"
          :class="{ on: activeIndex === i }"
          role="tab"
          :aria-selected="activeIndex === i"
          :tabindex="activeIndex === i ? 0 : -1"
          @click="activeIndex = i"
        >
          <span>{{ tab.label }}</span>
          <span class="tw-ct">{{ tabCounts[i] }}</span>
        </button>
      </div>
      <div class="tabw-body" role="tabpanel">
        <div v-if="panelRows.length === 0" class="lst-empty">// nothing here</div>
        <div v-else class="lst">
          <div v-for="(row, i) in panelRows" :key="i" class="lst-row">
            <span class="l-title">{{ row.title }}</span>
            <span v-if="row.tail" class="l-tail">{{ row.tail }}</span>
          </div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

interface TabDef {
  label: string
  count?: number
  filter?: Record<string, unknown>
  widgets?: unknown[]
}
interface PanelRow {
  title: string
  tail?: string
}

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)
const titleField = computed(() => String(props.config.titleField ?? 'title'))
const tailField = computed(() => String(props.config.tailField ?? 'status'))

const tabs = computed<TabDef[]>(() => {
  const t = props.config.tabs
  return Array.isArray(t) ? (t as TabDef[]) : []
})

// Each tab renders either its declared widgets (by label) or the bound data
// source filtered by the tab's `filter` — so a tab is never an empty panel.
function rowsForTab(tab: TabDef): PanelRow[] {
  if (tab.widgets?.length) {
    return tab.widgets.map((w) => ({ title: widgetLabel(w) }))
  }
  let recs = props.source
  if (tab.filter) {
    recs = recs.filter((r) => Object.entries(tab.filter as Record<string, unknown>).every(([k, v]) => r[k] === v))
  }
  return recs.map((r) => ({
    title: String(r[titleField.value] ?? r['title'] ?? r['name'] ?? r['id'] ?? ''),
    tail: r[tailField.value] != null ? String(r[tailField.value]) : undefined,
  }))
}

const activeIndex = ref(0)
const activeTab = computed(() => tabs.value[activeIndex.value])
const panelRows = computed<PanelRow[]>(() => (activeTab.value ? rowsForTab(activeTab.value) : []))
const tabCounts = computed(() => tabs.value.map((t) => t.count ?? rowsForTab(t).length))

const meta = computed(() => {
  const m = props.config.meta
  if (typeof m === 'string') return m
  const n = tabs.value.length
  return n ? `${n} panel${n === 1 ? '' : 's'}` : undefined
})

const barEl = ref<HTMLElement | null>(null)

function widgetLabel(w: unknown): string {
  if (w && typeof w === 'object') {
    const o = w as Record<string, unknown>
    return String(o.title ?? o.widget ?? o.type ?? 'widget')
  }
  return String(w)
}

function focusTab(n: number): void {
  barEl.value?.querySelectorAll<HTMLButtonElement>('.tabw-tab')[n]?.focus()
}

function onKey(e: KeyboardEvent): void {
  const len = tabs.value.length
  if (len === 0) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % len
    focusTab(activeIndex.value)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + len) % len
    focusTab(activeIndex.value)
  }
}
</script>
