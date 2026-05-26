<template>
  <div class="kv-widget">
    <div v-if="rows.length === 0" class="empty">No data</div>
    <div v-else class="kv-grid">
      <template v-for="(row, i) in rows" :key="i">
        <template v-for="field in visibleFields(row)" :key="field">
          <div class="kv-key">{{ field }}</div>
          <div class="kv-value">{{ formatValue(row[field]) }}</div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const rows = props.source

function visibleFields(row: Record<string, unknown>): string[] {
  const fields = props.config.fields as string[] | undefined
  if (Array.isArray(fields) && fields.length > 0) return fields
  return Object.keys(row)
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<style scoped>
.kv-widget {
  padding: var(--spacing-md);
  height: 100%;
  overflow: auto;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--spacing-md);
}

.kv-grid {
  display: grid;
  grid-template-columns: minmax(80px, max-content) 1fr;
  gap: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
}

.kv-key {
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
  padding: var(--spacing-xs) 0;
}

.kv-value {
  color: var(--color-text-primary);
  word-break: break-word;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--color-border-muted);
}
</style>
