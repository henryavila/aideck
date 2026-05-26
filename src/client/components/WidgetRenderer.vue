<template>
  <component
    v-if="resolvedComponent"
    :is="resolvedComponent"
    :source="sourceData"
    :config="binding.config ?? {}"
  />
  <div v-else class="unknown-widget">
    Unknown widget: {{ binding.widget }}
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, type Component } from 'vue'
import { fetchDataSource } from '../api.js'
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

const props = defineProps<{
  binding: {
    widget: string
    source?: { ref?: string; filter?: Record<string, unknown>; param?: string }
    config?: Record<string, unknown>
    colSpan?: number
  }
  consumerId: string
}>()

const resolvedComponent = computed(() => widgetMap[props.binding.widget] ?? null)

const sourceData = ref<Record<string, unknown>[]>([])

watchEffect(async () => {
  if (props.binding.source?.ref) {
    const records = await fetchDataSource(props.consumerId, props.binding.source.ref as string)
    const filter = props.binding.source?.filter as Record<string, unknown> | undefined
    if (filter) {
      sourceData.value = records.filter(r =>
        Object.entries(filter).every(([k, v]) => r[k] === v)
      )
    } else {
      sourceData.value = records
    }
  }
})
</script>

<style scoped>
.unknown-widget {
  background: var(--color-bg-tertiary);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  color: var(--color-text-muted);
  text-align: center;
  font-size: var(--font-size-sm);
}
</style>
