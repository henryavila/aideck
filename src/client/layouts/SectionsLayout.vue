<template>
  <div class="sections-layout">
    <div v-for="(section, i) in sections" :key="i" class="section" v-show="isSectionVisible(i)">
      <div
        v-if="section.title"
        class="section-header"
        :class="{ collapsible: section.collapsible }"
        @click="section.collapsible && toggleSection(i)"
      >
        <span class="section-chevron" v-if="section.collapsible">{{ isCollapsed(i) ? '▸' : '▾' }}</span>
        <h3>{{ section.title }}</h3>
      </div>
      <div
        v-show="!isCollapsed(i)"
        class="section-grid"
        :class="{ 'section-grid--fill-screen': section.fillScreen }"
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
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  collapsedSections.value = next
}

function sectionGridStyle(section: Section): Record<string, string> {
  const gap = `${section.gap ?? 16}px`
  const style: Record<string, string> = {
    gap,
    alignItems: section.align ?? '',
    padding: section.padding ?? '',
  }

  if (section.autoGrid) {
    const minWidth = section.minCardWidth ?? '280px'
    const maxCols = section.maxColumns
    if (maxCols) {
      style.gridTemplateColumns = `repeat(auto-fill, minmax(min(${minWidth}, 100%), 1fr))`
      style.maxWidth = `calc(${maxCols} * (${minWidth} + ${gap}))`
    } else {
      style.gridTemplateColumns = `repeat(auto-fill, minmax(min(${minWidth}, 100%), 1fr))`
    }
  } else {
    style.gridTemplateColumns = `repeat(${section.columns ?? 12}, 1fr)`
  }

  if (!style.alignItems) delete style.alignItems
  if (!style.padding) delete style.padding

  return style
}

// Section visibility evaluation
const visibilityResults = reactive<Record<number, boolean>>({})

function parseVisibleExpression(expr: string): { key: string; value: string } | null {
  const eqIndex = expr.indexOf('=')
  if (eqIndex < 1) return null
  return { key: expr.slice(0, eqIndex).trim(), value: expr.slice(eqIndex + 1).trim() }
}

function evaluateVisibility(records: Record<string, unknown>[], expr: string): boolean {
  const parsed = parseVisibleExpression(expr)
  if (!parsed) return true
  return records.some(record => String(record[parsed.key] ?? '') === parsed.value)
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
    // String expression: evaluate against first widget's data source
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
.section {
  margin-bottom: var(--spacing-lg);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-header h3 {
  margin: 0;
  font-size: inherit;
  font-weight: 600;
  color: inherit;
}

.section-header.collapsible {
  cursor: pointer;
}

.section-header.collapsible:hover {
  color: var(--color-text-primary);
}

.section-chevron {
  font-size: 0.65rem;
  line-height: 1;
}

.section-grid {
  display: grid;
}

.section-grid--fill-screen {
  min-height: 100vh;
  align-content: start;
}
</style>
