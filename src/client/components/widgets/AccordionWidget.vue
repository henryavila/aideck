<template>
  <div class="accordion-widget">
    <div v-if="sections.length === 0" class="empty">No sections</div>
    <div v-for="(section, i) in sections" :key="i" class="accordion-item">
      <button class="accordion-header" @click="toggle(i)">
        <span>{{ section.title }}</span>
        <span class="chevron" :class="{ open: openSet.has(i) }">›</span>
      </button>
      <div v-if="openSet.has(i)" class="accordion-body">
        {{ section.content }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const titleField = computed(() => String(props.config.titleField ?? 'title'))
const contentField = computed(() => String(props.config.contentField ?? 'content'))

const sections = computed(() =>
  props.source.map(r => ({
    title: String(r[titleField.value] ?? ''),
    content: String(r[contentField.value] ?? ''),
  }))
)

const openSet = reactive(new Set<number>())

function toggle(i: number) {
  if (openSet.has(i)) openSet.delete(i)
  else openSet.add(i)
}
</script>

<style scoped>
.accordion-widget {
  height: 100%;
  overflow: auto;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  padding: var(--spacing-md);
}

.accordion-item {
  border-bottom: 1px solid var(--color-border-muted);
}

.accordion-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: none;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
}

.accordion-header:hover {
  background: var(--color-bg-hover);
}

.chevron {
  font-size: 1.2em;
  color: var(--color-text-muted);
  transition: transform 0.2s;
  display: inline-block;
}

.chevron.open {
  transform: rotate(90deg);
}

.accordion-body {
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  white-space: pre-wrap;
}
</style>
