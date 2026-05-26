<template>
  <div class="list-widget-container">
    <ul v-if="source.length > 0" class="list-widget">
      <li v-for="(item, i) in source" :key="i" class="list-item">
        <span class="item-title">{{ itemTitle(item) }}</span>
        <span v-if="itemSubtitle(item)" class="item-subtitle">{{ itemSubtitle(item) }}</span>
      </li>
    </ul>
    <div v-else class="empty">No data</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const titleField = () => String(props.config.titleField ?? 'title')
const subtitleField = () => String(props.config.subtitleField ?? 'status')

function itemTitle(item: Record<string, unknown>): string {
  const field = titleField()
  const val = item[field] ?? item['title'] ?? item['id']
  return val !== undefined && val !== null ? String(val) : '—'
}

function itemSubtitle(item: Record<string, unknown>): string {
  const field = subtitleField()
  const val = item[field]
  return val !== undefined && val !== null ? String(val) : ''
}
</script>

<style scoped>
.list-widget-container {
  height: 100%;
  overflow: auto;
}

.list-widget {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-muted);
  gap: var(--spacing-sm);
}

.list-item:hover {
  background: var(--color-bg-hover);
}

.item-title {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
}

.empty {
  padding: var(--spacing-md);
  color: var(--color-text-muted);
  text-align: center;
  font-size: var(--font-size-sm);
}
</style>
