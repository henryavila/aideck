<template>
  <div class="timeline-widget">
    <div v-if="events.length === 0" class="empty">No events</div>
    <div v-else class="timeline-list">
      <div v-for="(ev, i) in events" :key="i" class="timeline-item" :class="{ even: i % 2 === 0 }">
        <div class="timeline-dot" />
        <div class="timeline-card">
          <div class="timeline-ts">{{ ev.timestamp }}</div>
          <div class="timeline-title">{{ ev.title }}</div>
          <div v-if="ev.body" class="timeline-body">{{ ev.body }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const tsField = computed(() => String(props.config.timestampField ?? 'timestamp'))
const titleField = computed(() => String(props.config.titleField ?? 'title'))
const bodyField = computed(() => String(props.config.bodyField ?? 'body'))

const events = computed(() =>
  props.source.map(r => ({
    timestamp: String(r[tsField.value] ?? ''),
    title: String(r[titleField.value] ?? ''),
    body: r[bodyField.value] ? String(r[bodyField.value]) : '',
  }))
)
</script>

<style scoped>
.timeline-widget {
  padding: var(--spacing-md);
  height: 100%;
  overflow: auto;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.timeline-list {
  position: relative;
  padding-left: var(--spacing-lg);
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border);
}

.timeline-item {
  position: relative;
  margin-bottom: var(--spacing-md);
}

.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--spacing-lg) + 4px);
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--color-bg-primary);
}

.timeline-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}

.timeline-ts {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.timeline-title {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text-primary);
}

.timeline-body {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: pre-wrap;
}
</style>
