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
import CardWidget from './widgets/CardWidget.vue'
import CodeBlockWidget from './widgets/CodeBlockWidget.vue'
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
  'card': CardWidget,
  'card-grid': CardWidget,
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

const props = defineProps<{
  binding: {
    widget: string
    source?: { ref?: string; filter?: Record<string, unknown>; param?: string }
    config?: Record<string, unknown>
    colSpan?: number
    repeat?: string
    repeatDirection?: 'horizontal' | 'vertical'
    maxRepeatColumns?: number
  }
  consumerId: string
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
  if (props.binding.source?.ref) {
    const records = await fetchDataSource(
      props.consumerId,
      props.binding.source.ref as string,
      projectId.value
    )
    let filtered = records

    // Apply static filter if present
    const filter = props.binding.source?.filter as Record<string, unknown> | undefined
    if (filter) {
      filtered = filtered.filter(r =>
        Object.entries(filter).every(([k, v]) => r[k] === v)
      )
    }

    // Apply route param filter if source.param is declared
    const paramName = props.binding.source?.param
    if (paramName) {
      const paramValue = route.params[paramName]
      if (typeof paramValue === 'string' && paramValue) {
        filtered = filtered.filter(r =>
          r['id'] === paramValue || r['slug'] === paramValue
        )
      }
    }

    sourceData.value = filtered

    // Build repeat groups if repeat field is specified
    if (props.binding.repeat) {
      repeatGroups.value = groupByField(filtered, props.binding.repeat)
    } else {
      repeatGroups.value = []
    }
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
