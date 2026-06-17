<template>
  <template v-if="binding.repeat && repeatGroups.length > 0">
    <div
      class="repeat-container"
      :style="repeatContainerStyle"
    >
      <div v-for="group in repeatGroups" :key="group.key" class="repeat-item">
        <div v-if="group.key !== '' && showRepeatLabel" class="repeat-label">{{ groupLabel(group) }}</div>
        <component
          v-if="resolvedComponent"
          :is="resolvedComponent"
          :source="group.records"
          :config="effectiveConfig"
          :consumer-id="consumerId"
          :slots="binding.slots"
          :depth="depth ?? 0"
          @select="onWidgetSelect"
        />
      </div>
    </div>
  </template>
  <template v-else>
    <component
      v-if="resolvedComponent"
      :is="resolvedComponent"
      :source="sourceData"
      :config="effectiveConfig"
      :consumer-id="consumerId"
      :slots="binding.slots"
      :depth="depth ?? 0"
      @select="onWidgetSelect"
    />
    <div v-else class="unknown-widget">
      Unknown widget: {{ binding.widget }}
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, watchEffect, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { fetchDataSource, fetchDataSourceAllProjects } from '../api.js'
import { useLiveBus } from '../composables/useLiveBus.js'
import { PROJECT_ID_KEY } from '../composables/useProjectScope.js'
import { STATUS_MAP_KEY, type StatusOverrides } from '../utils/status.js'
import { aggregate, applyFieldMap, type AggResult, type AggKind, type Where, type RatioFormat } from '../utils/aggregate.js'
import { PAGE_STATE_KEY, type PageState } from '../composables/usePageState.js'
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
import PanelWidget from './widgets/PanelWidget.vue'
import ProgressBarWidget from './widgets/ProgressBarWidget.vue'
import SearchFilterWidget from './widgets/SearchFilterWidget.vue'
import StatWidget from './widgets/StatWidget.vue'
import TableWidget from './widgets/TableWidget.vue'
import TabsWidget from './widgets/TabsWidget.vue'
import TagChipWidget from './widgets/TagChipWidget.vue'
import TimelineWidget from './widgets/TimelineWidget.vue'
import TreeViewWidget from './widgets/TreeViewWidget.vue'
// DS v2.1 widget extension — compact step sequence, status/checklist, master-detail
// catalog, auto-fit record grid, detail-page record switcher, aggregate banner.
import CatalogWidget from './widgets/CatalogWidget.vue'
import CollectionGridWidget from './widgets/CollectionGridWidget.vue'
import HeadlineBannerWidget from './widgets/HeadlineBannerWidget.vue'
import RecordSwitcherWidget from './widgets/RecordSwitcherWidget.vue'
import StatusListWidget from './widgets/StatusListWidget.vue'
import StepperWidget from './widgets/StepperWidget.vue'

const widgetMap: Record<string, Component> = {
  'accordion': AccordionWidget,
  'badge': BadgeWidget,
  'bar-chart': BarChartWidget,
  'breadcrumb': BreadcrumbWidget,
  'callout': CalloutWidget,
  'card': CardWidget,
  'card-grid': CardWidget,
  'phase-timeline': PhaseTimelineWidget,
  // DS v2.1: `stepper` is now the compact pill/timeline/dense step sequence — a
  // distinct widget from the exploded `phase-timeline` cards. No live consumer
  // bound the former alias (see decisions.md).
  'stepper': StepperWidget,
  'status-list': StatusListWidget,
  'catalog': CatalogWidget,
  'collection-grid': CollectionGridWidget,
  'record-switcher': RecordSwitcherWidget,
  'headline-banner': HeadlineBannerWidget,
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
  'panel': PanelWidget,
  'progress-bar': ProgressBarWidget,
  // `progress` is the natural name a manifest reaches for; alias it so `type:
  // progress` renders instead of falling through to "Unknown widget".
  'progress': ProgressBarWidget,
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

type MatchEntry = string | { field: string; param: string } | { field: string; state: string }
type SourceParam = string | { match: MatchEntry[] }

interface Binding {
  widget: string
  source?: {
    ref?: string
    filter?: Record<string, unknown>
    // §2c: a string matches one route param vs r.id/r.slug; { match } matches
    // each entry vs a route param — a bare string is record[f]==route[f]; an
    // object { field, param } maps a record field to a differently-named param.
    param?: SourceParam
    // §8 aggregation
    agg?: AggKind
    where?: Where
    of?: string
    ratioFormat?: RatioFormat
    scope?: 'project' | 'all-projects'
  }
  config?: Record<string, unknown>
  fieldMap?: Record<string, string>
  emits?: Record<string, { set: string; value?: string }>
  colSpan?: number
  repeat?:
    | string
    | { ref: string; filter?: Record<string, unknown>; param?: SourceParam; scope?: 'project' | 'all-projects' }
  repeatDirection?: 'horizontal' | 'vertical'
  maxRepeatColumns?: number
  // §2a: sibling field supplying a human group label; falls back to the humanized key.
  repeatLabelField?: string
  // §2b: group-header visibility. 'auto' (default) hides the header for a single group.
  repeatLabel?: 'auto' | 'always' | 'never'
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
const statusMap = inject(STATUS_MAP_KEY, ref<StatusOverrides>({}))
const pageState = inject(PAGE_STATE_KEY, ref<PageState>({}))

// Cross-widget bus: a widget's `select` event writes the configured page-state
// key, which another widget's `source.param: { field, state }` reads to re-scope.
function onWidgetSelect(payload: unknown): void {
  const emit = props.binding.emits?.select
  if (!emit) return
  const value =
    emit.value && payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)[emit.value]
      : payload
  pageState.value = { ...pageState.value, [emit.set]: value }
}

const resolvedComponent = computed(() => widgetMap[props.binding.widget] ?? null)

const aggResult = ref<AggResult | null>(null)

// Build the config the widget actually receives, layering three additive,
// author-overridable transforms over `binding.config`:
//   1. fieldMap sugar → flat `<role>Field` keys,
//   2. manifest statusMap → default status vocabulary (own `statuses` wins),
//   3. a computed aggregate → `value` (+ raw `aggCount`/`aggTotal`/`aggRatio`).
const effectiveConfig = computed<Record<string, unknown>>(() => {
  let config = applyFieldMap(props.binding.config ?? {}, props.binding.fieldMap)

  const manifestMap = statusMap.value
  if (manifestMap && Object.keys(manifestMap).length > 0) {
    const own = (config.statuses as StatusOverrides | undefined) ?? {}
    config = { ...config, statuses: { ...manifestMap, ...own } }
  }

  const agg = aggResult.value
  if (agg) {
    config = {
      ...config,
      value: config.value ?? agg.value,
      aggCount: agg.count,
      aggTotal: agg.total,
      aggRatio: agg.ratio
    }
  }
  return config
})

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

// §2b: a single-group header is redundant, so 'auto' hides it; 'always'/'never' opt out.
const showRepeatLabel = computed(() => {
  const mode = props.binding.repeatLabel ?? 'auto'
  if (mode === 'never') return false
  if (mode === 'always') return true
  return repeatGroups.value.length > 1
})

// §2c: turn a slug/key into a typographic display string. Used ONLY for the raw-key
// fallback — a consumer-supplied repeatLabelField is rendered verbatim (it may be
// human-cased already, e.g. "iOS", "API").
function humanizeKey(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// §2a: every record in a group shares the grouping key, so the consumer guarantees they
// also share the label value — read it off the first record. Empty/unset -> humanized key.
function groupLabel(group: RepeatGroup): string {
  const field = props.binding.repeatLabelField
  const supplied = field ? group.records[0]?.[field] : undefined
  return supplied ? String(supplied) : humanizeKey(group.key)
}

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

type Params = Record<string, string | string[]>

// §2b mode 2 + array membership: resolve `$parent.<field>` tokens against the
// parent record, then keep records matching every clause. An array clause is
// membership (`status: [active, paused]`); a scalar is equality.
function applyFilter(
  records: Record<string, unknown>[],
  filter: Record<string, unknown> | undefined,
  parent?: Record<string, unknown>
): Record<string, unknown>[] {
  if (!filter) return records
  const resolved = parent
    ? Object.fromEntries(
        Object.entries(filter).map(([k, v]) => [
          k,
          typeof v === 'string' && v.startsWith('$parent.') ? parent[v.slice(8)] : v
        ])
      )
    : filter
  return records.filter(r =>
    Object.entries(resolved).every(([k, v]) =>
      Array.isArray(v) ? v.includes(r[k]) : r[k] === v
    )
  )
}

// §2c route-param filter. A string matches one param vs r.id/r.slug; a composite
// { match } matches each entry: a route param (string / `{field,param}`) or a
// page-state key (`{field,state}` — set by another widget's `emits`). A state
// clause whose key is unset is skipped (the dependent widget shows all until a
// selection narrows it), so the bus degrades gracefully.
function applyRouteParam(
  records: Record<string, unknown>[],
  param: SourceParam | undefined,
  params: Params,
  state: PageState,
  resolveParam: (field: string) => string | undefined
): Record<string, unknown>[] {
  if (typeof param === 'string') {
    const v = params[param]
    if (typeof v === 'string' && v) {
      return records.filter(r => r['id'] === v || r['slug'] === v)
    }
    return records
  }
  if (param && Array.isArray(param.match) && param.match.length > 0) {
    return records.filter(r =>
      param.match.every(entry => {
        if (typeof entry === 'string') {
          const rv = resolveParam(entry)
          return rv !== undefined && String(r[entry]) === rv
        }
        if ('state' in entry) {
          const sv = state[entry.state]
          if (sv === undefined || sv === null || sv === '') return true
          return String(r[entry.field]) === String(sv)
        }
        const rv = resolveParam(entry.param)
        return rv !== undefined && String(r[entry.field]) === rv
      })
    )
  }
  return records
}

async function loadData(): Promise<void> {
  // Snapshot reactive deps (route params + injected projectId) synchronously
  // BEFORE the first await — watchEffect only registers dependencies touched
  // before it suspends. Reading route.params after the fetch would miss sibling
  // drill-down navigations (same component instance, only a route param changes)
  // and leave the widget showing stale data.
  const params = { ...route.params } as Params
  const pid = projectId.value
  // Snapshot page state synchronously too, so watchEffect tracks bus changes.
  const state = { ...pageState.value }
  const resolveParam = (field: string): string | undefined => {
    const v = params[field]
    if (typeof v === 'string' && v) return v
    // projectId may come from the injected scope rather than a path param.
    if (field === 'projectId' && pid) return pid
    return undefined
  }

  // §8 fan-out: `repeat: { ref }` renders one widget instance per record of
  // another source. Each instance receives that single record as its source;
  // deeper per-instance data resolves through slots (which fetch per parent).
  // Read a source by its scope: 'all-projects' merges every registered project
  // (each record tagged with projectId); otherwise the selected project / consumer dir.
  const fetchScoped = (
    ref: string,
    scope?: 'project' | 'all-projects'
  ): Promise<Record<string, unknown>[]> =>
    scope === 'all-projects'
      ? fetchDataSourceAllProjects(props.consumerId, ref)
      : fetchDataSource(props.consumerId, ref, pid)

  const rep = props.binding.repeat
  if (rep && typeof rep === 'object') {
    let recs = await fetchScoped(rep.ref, rep.scope)
    recs = applyFilter(recs, rep.filter, props.parentRecord)
    recs = applyRouteParam(recs, rep.param, params, state, resolveParam)
    repeatGroups.value = recs.map((r, i) => ({ key: String(r.id ?? r.slug ?? i), records: [r] }))
    sourceData.value = []
    aggResult.value = null
    return
  }

  // §2b mode 1: a source-less child renders against the parent record (the
  // row / card / item it sits in). No fetch, no repeat.
  if (!props.binding.source?.ref) {
    sourceData.value = props.parentRecord ? [props.parentRecord] : []
    repeatGroups.value = []
    aggResult.value = null
    return
  }

  const records = await fetchScoped(props.binding.source.ref as string, props.binding.source.scope)
  let filtered = applyFilter(records, props.binding.source.filter, props.parentRecord)
  filtered = applyRouteParam(filtered, props.binding.source.param, params, state, resolveParam)

  sourceData.value = filtered

  // §8 aggregation: compute the scalar over the filtered records, narrowed by
  // `where`. The widget still receives the records (lanes/lists), the number is
  // injected into the config via effectiveConfig.
  const src = props.binding.source
  aggResult.value = src.agg
    ? aggregate(filtered, { agg: src.agg, where: src.where, of: src.of, ratioFormat: src.ratioFormat })
    : null

  repeatGroups.value =
    typeof rep === 'string' ? groupByField(filtered, rep) : []
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
}
</style>
