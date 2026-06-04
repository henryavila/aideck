<template>
  <template v-if="binding.repeat && repeatGroups.length > 0">
    <div
      class="repeat-container"
      :style="repeatContainerStyle"
    >
      <div v-for="group in repeatGroups" :key="group.key" class="repeat-item">
        <div v-if="group.key !== ''" class="repeat-label">{{ group.key }}</div>
        <component
          v-if="resolvedComponent"
          :is="resolvedComponent"
          :source="group.records"
          :config="binding.config ?? {}"
          :consumer-id="consumerId"
          :slots="binding.slots"
          :depth="depth ?? 0"
        />
      </div>
    </div>
  </template>
  <template v-else>
    <component
      v-if="resolvedComponent"
      :is="resolvedComponent"
      :source="sourceData"
      :config="binding.config ?? {}"
      :consumer-id="consumerId"
      :slots="binding.slots"
      :depth="depth ?? 0"
    />
    <div v-else class="unknown-widget">
      Unknown widget: {{ binding.widget }}
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, watchEffect, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { fetchDataSource } from '../api.js'
import { useLiveBus } from '../composables/useLiveBus.js'
import { PROJECT_ID_KEY } from '../composables/useProjectScope.js'
import AccordionWidget from './widgets/AccordionWidget.vue'
import BadgeWidget from './widgets/BadgeWidget.vue'
import BarChartWidget from './widgets/BarChartWidget.vue'
import BreadcrumbWidget from './widgets/BreadcrumbWidget.vue'
import CalloutWidget from './widgets/CalloutWidget.vue'
import CardWidget from './widgets/CardWidget.vue'
import CodeBlockWidget from './widgets/CodeBlockWidget.vue'
import PhaseTimelineWidget from './widgets/PhaseTimelineWidget.vue'
import SparklineWidget from './widgets/SparklineWidget.vue'
import ContainerWidget from './widgets/ContainerWidget.vue'
import DrawerWidget from './widgets/DrawerWidget.vue'
import GaugeWidget from './widgets/GaugeWidget.vue'
import GraphDagWidget from './widgets/GraphDagWidget.vue'
import GridColumnsWidget from './widgets/GridColumnsWidget.vue'
import HeaderNavWidget from './widgets/HeaderNavWidget.vue'
import KanbanBoardWidget from './widgets/KanbanBoardWidget.vue'
import KeyValueWidget from './widgets/KeyValueWidget.vue'
import LineChartWidget from './widgets/LineChartWidget.vue'
import ListWidget from './widgets/ListWidget.vue'
import LogFeedWidget from './widgets/LogFeedWidget.vue'
import MarkdownWidget from './widgets/MarkdownWidget.vue'
import ProgressBarWidget from './widgets/ProgressBarWidget.vue'
import SearchFilterWidget from './widgets/SearchFilterWidget.vue'
import StatWidget from './widgets/StatWidget.vue'
import TableWidget from './widgets/TableWidget.vue'
import TabsWidget from './widgets/TabsWidget.vue'
import TagChipWidget from './widgets/TagChipWidget.vue'
import TimelineWidget from './widgets/TimelineWidget.vue'
import TreeViewWidget from './widgets/TreeViewWidget.vue'

const widgetMap: Record<string, Component> = {
  'accordion': AccordionWidget,
  'badge': BadgeWidget,
  'bar-chart': BarChartWidget,
  'breadcrumb': BreadcrumbWidget,
  'callout': CalloutWidget,
  'card': CardWidget,
  'card-grid': CardWidget,
  'phase-timeline': PhaseTimelineWidget,
  'stepper': PhaseTimelineWidget,
  'sparkline': SparklineWidget,
  'code-block': CodeBlockWidget,
  'container': ContainerWidget,
  'drawer': DrawerWidget,
  'gauge': GaugeWidget,
  'graph-dag': GraphDagWidget,
  'grid-columns': GridColumnsWidget,
  'header-nav': HeaderNavWidget,
  'kanban-board': KanbanBoardWidget,
  'key-value': KeyValueWidget,
  'line-chart': LineChartWidget,
  'list': ListWidget,
  'log-feed': LogFeedWidget,
  'markdown': MarkdownWidget,
  'progress-bar': ProgressBarWidget,
  'search-filter': SearchFilterWidget,
  'stat': StatWidget,
  'table': TableWidget,
  'tabs': TabsWidget,
  'tag-chip': TagChipWidget,
  'timeline': TimelineWidget,
  'tree-view': TreeViewWidget,
}

interface RepeatGroup {
  key: string
  records: Record<string, unknown>[]
}

interface Binding {
  widget: string
  source?: {
    ref?: string
    filter?: Record<string, unknown>
    // §2c: a string matches one route param vs r.id/r.slug; { match } matches
    // each entry vs a route param — a bare string is record[f]==route[f]; an
    // object { field, param } maps a record field to a differently-named param.
    param?: string | { match: Array<string | { field: string; param: string }> }
  }
  config?: Record<string, unknown>
  colSpan?: number
  repeat?: string
  repeatDirection?: 'horizontal' | 'vertical'
  maxRepeatColumns?: number
  // §2b widget composition: named slot -> ordered child widget bindings.
  slots?: Record<string, Binding[]>
}

const props = defineProps<{
  binding: Binding
  consumerId: string
  // §2b: when rendered inside a slot, the host widget's per-record scope and
  // the recursion depth (guarded in WidgetSlot).
  parentRecord?: Record<string, unknown>
  depth?: number
}>()

const route = useRoute()
const { lastEvent } = useLiveBus()
const projectId = inject(PROJECT_ID_KEY, ref<string | undefined>(undefined))

const resolvedComponent = computed(() => widgetMap[props.binding.widget] ?? null)

const sourceData = ref<Record<string, unknown>[]>([])
const repeatGroups = ref<RepeatGroup[]>([])

const repeatContainerStyle = computed(() => {
  const direction = props.binding.repeatDirection ?? 'horizontal'
  const maxCols = props.binding.maxRepeatColumns ?? 3
  if (direction === 'vertical') {
    return { display: 'flex', flexDirection: 'column' as const, gap: '16px' }
  }
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
    gap: '16px'
  }
})

function groupByField(records: Record<string, unknown>[], field: string): RepeatGroup[] {
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const record of records) {
    const key = String(record[field] ?? '')
    const existing = groups.get(key)
    if (existing) {
      existing.push(record)
    } else {
      groups.set(key, [record])
    }
  }
  return Array.from(groups.entries()).map(([key, recs]) => ({ key, records: recs }))
}

async function loadData(): Promise<void> {
  // Snapshot reactive deps (route params + injected projectId) synchronously
  // BEFORE the first await — watchEffect only registers dependencies touched
  // before it suspends. Reading route.params after the fetch would miss sibling
  // drill-down navigations (same component instance, only a route param changes)
  // and leave the widget showing stale data.
  const params = { ...route.params }
  const pid = projectId.value
  const resolveParam = (field: string): string | undefined => {
    const v = params[field]
    if (typeof v === 'string' && v) return v
    // projectId may come from the injected scope rather than a path param.
    if (field === 'projectId' && pid) return pid
    return undefined
  }

  // §2b mode 1: a source-less child renders against the parent record (the
  // row / card / item it sits in). No fetch, no repeat.
  if (!props.binding.source?.ref) {
    sourceData.value = props.parentRecord ? [props.parentRecord] : []
    repeatGroups.value = []
    return
  }

  const records = await fetchDataSource(
    props.consumerId,
    props.binding.source.ref as string,
    pid
  )
  let filtered = records

  // §2b mode 2: resolve `$parent.<field>` tokens in the static filter against
  // the parent record before applying it.
  let filter = props.binding.source?.filter as Record<string, unknown> | undefined
  if (filter && props.parentRecord) {
    const pr = props.parentRecord
    filter = Object.fromEntries(
      Object.entries(filter).map(([k, v]) => [
        k,
        typeof v === 'string' && v.startsWith('$parent.') ? pr[v.slice(8)] : v
      ])
    )
  }
  if (filter) {
    const f = filter
    filtered = filtered.filter(r => Object.entries(f).every(([k, v]) => r[k] === v))
  }

  // §2c: route-param filter. A string matches one param vs r.id/r.slug; a
  // composite { match: [...] } matches each named field vs the route param of
  // the same name (projectId-scoped detail pages).
  const param = props.binding.source?.param
  if (typeof param === 'string') {
    const paramValue = params[param]
    if (typeof paramValue === 'string' && paramValue) {
      filtered = filtered.filter(r => r['id'] === paramValue || r['slug'] === paramValue)
    }
  } else if (param && Array.isArray(param.match) && param.match.length > 0) {
    filtered = filtered.filter(r =>
      param.match.every(entry => {
        const field = typeof entry === 'string' ? entry : entry.field
        const routeKey = typeof entry === 'string' ? entry : entry.param
        const rv = resolveParam(routeKey)
        return rv !== undefined && String(r[field]) === rv
      })
    )
  }

  sourceData.value = filtered

  if (props.binding.repeat) {
    repeatGroups.value = groupByField(filtered, props.binding.repeat)
  } else {
    repeatGroups.value = []
  }
}

watchEffect(loadData)

// Live refresh: re-fetch when an SSE event for this consumer arrives.
watch(
  () => lastEvent.value,
  (e) => {
    if (!e || e.consumer === props.consumerId) void loadData()
  },
)
</script>

<style scoped>
.unknown-widget {
  background: var(--bg-elevated);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-8);
  color: var(--fg-subtle);
  text-align: center;
  font-size: var(--fs-sm);
}

.repeat-container {
  width: 100%;
}

.repeat-item {
  min-width: 0;
}

.repeat-label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--fg-muted);
  margin-bottom: var(--space-2);
  text-transform: capitalize;
}
</style>
