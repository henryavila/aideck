<template>
  <div class="sections-layout">
    <div v-for="(section, i) in sections" :key="i" class="section">
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
        :style="{
          gridTemplateColumns: `repeat(${section.columns ?? 12}, 1fr)`,
          gap: `${section.gap ?? 16}px`,
        }"
      >
        <div
          v-for="(widget, j) in section.widgets"
          :key="j"
          :style="widgetGridStyle(widget)"
        >
          <WidgetRenderer :binding="widget" :consumer-id="consumerId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WidgetBinding } from '../../server/manifest-schema.js'
import WidgetRenderer from '../components/WidgetRenderer.vue'
import { widgetGridStyle } from '../utils/widgetGridStyle.js'

interface Section {
  title?: string
  collapsible?: boolean
  collapsed?: boolean
  columns?: number
  gap?: number
  widgets: WidgetBinding[]
}

defineProps<{
  sections: Section[]
  consumerId: string
}>()

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
</style>
