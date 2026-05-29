<template>
  <div class="sections-layout">
    <div
      v-for="(section, i) in sections"
      :key="i"
      v-show="isSectionVisible(i)"
      class="section"
      :class="{ collapsed: isCollapsed(i) }"
    >
      <div class="sec-head">
        <span
          class="caret"
          role="button"
          tabindex="0"
          @click="toggleSection(i)"
          @keydown.enter="toggleSection(i)"
        >{{ isCollapsed(i) ? '▸' : '▾' }}</span>
        <h2 v-if="section.title">{{ section.title }}</h2>
        <span class="sub">— {{ section.widgets.length }} widget{{ section.widgets.length === 1 ? '' : 's' }}</span>
      </div>
      <div
        class="sec-grid"
        :class="{ 'is-stats': isStatsSection(section), 'sec-grid--fill-screen': section.fillScreen }"
        :style="sectionGridStyle(section)"
      >
        <div
          v-for="(widget, j) in section.widgets"
          :key="j"
          v-show="isWidgetVisible(widget, breakpoint)"
          :style="widgetGridStyle(widget, breakpoint)"
        >
          <WidgetRenderer :binding="widget" :consumer-id="consumerId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect } from 'vue'
import type { WidgetBinding } from '../../server/manifest-schema.js'
import WidgetRenderer from '../components/WidgetRenderer.vue'
import { widgetGridStyle, isWidgetVisible } from '../utils/widgetGridStyle.js'
import { useBreakpoint } from '../composables/useBreakpoint.js'
import { fetchDataSource } from '../api.js'

interface Section {
  title?: string
  collapsible?: boolean
  collapsed?: boolean
  columns?: number
  gap?: number
  align?: string
  padding?: string
  visible?: boolean | string
  autoGrid?: boolean
  maxColumns?: number
  minCardWidth?: string
  fillScreen?: boolean
  widgets: WidgetBinding[]
}

const props = defineProps<{
  sections: Section[]
  consumerId: string
}>()

const breakpoint = useBreakpoint()
const collapsedSections = ref<Set<number>>(new Set())

function isCollapsed(index: number): boolean {
  return collapsedSections.value.has(index)
}

function toggleSection(index: number): void {
  const next = new Set(collapsedSections.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  collapsedSections.value = next
}

function isStatsSection(section: Section): boolean {
  return section.widgets.length > 0 && section.widgets.every((w) => w.widget === 'stat')
}

function sectionGridStyle(section: Section): Record<string, string> {
  const gap = `${section.gap ?? 12}px`
  const style: Record<string, string> = { gap }

  if (section.autoGrid) {
    const minWidth = section.minCardWidth ?? '280px'
    style.gridTemplateColumns = `repeat(auto-fill, minmax(min(${minWidth}, 100%), 1fr))`
    if (section.maxColumns) style.maxWidth = `calc(${section.maxColumns} * (${minWidth} + ${gap}))`
  } else {
    style.gridTemplateColumns = `repeat(${section.columns ?? 12}, 1fr)`
  }

  if (section.align) style.alignItems = section.align
  if (section.padding) style.padding = section.padding
  return style
}

// Section visibility evaluation (supports boolean or "key=value" expression)
const visibilityResults = reactive<Record<number, boolean>>({})

function parseVisibleExpression(expr: string): { key: string; value: string } | null {
  const eqIndex = expr.indexOf('=')
  if (eqIndex < 1) return null
  return { key: expr.slice(0, eqIndex).trim(), value: expr.slice(eqIndex + 1).trim() }
}

function evaluateVisibility(records: Record<string, unknown>[], expr: string): boolean {
  const parsed = parseVisibleExpression(expr)
  if (!parsed) return true
  return records.some((record) => String(record[parsed.key] ?? '') === parsed.value)
}

watchEffect(async () => {
  for (let i = 0; i < props.sections.length; i++) {
    const section = props.sections[i]
    if (section.visible === undefined || section.visible === null || section.visible === true) {
      visibilityResults[i] = true
      continue
    }
    if (section.visible === false) {
      visibilityResults[i] = false
      continue
    }
    const firstWidgetSource = section.widgets[0]?.source?.ref
    if (!firstWidgetSource) {
      visibilityResults[i] = true
      continue
    }
    try {
      const records = await fetchDataSource(props.consumerId, firstWidgetSource)
      visibilityResults[i] = evaluateVisibility(records, section.visible)
    } catch {
      visibilityResults[i] = true
    }
  }
})

function isSectionVisible(index: number): boolean {
  return visibilityResults[index] !== false
}
</script>

<style scoped>
/* v2 dynamic-layout feature (T-014): a section grid that fills the viewport.
   Not part of the design handoff's shared vocabulary, so scoped here. */
.sec-grid--fill-screen {
  min-height: 100vh;
  align-content: start;
}
</style>
