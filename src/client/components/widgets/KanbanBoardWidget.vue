<template>
  <div class="kanban-widget">
    <div v-if="columns.length === 0" class="empty">No columns configured</div>
    <div v-else class="kanban-columns">
      <div v-for="col in columns" :key="col" class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title">{{ col }}</span>
          <span class="kanban-col-count">{{ cardsByColumn[col]?.length ?? 0 }}</span>
        </div>
        <div class="kanban-cards">
          <div v-for="(card, i) in cardsByColumn[col] ?? []" :key="i" class="kanban-card">
            <div v-for="f in visibleFields" :key="f" class="kanban-card-field">
              <span v-if="f !== statusField" class="kanban-card-val">{{ card[f] }}</span>
            </div>
          </div>
          <div v-if="!cardsByColumn[col]?.length" class="kanban-empty-col">Empty</div>
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

const columns = computed<string[]>(() => {
  const c = props.config.columns
  if (Array.isArray(c)) return c as string[]
  return []
})

const statusField = computed(() => String(props.config.statusField ?? 'status'))

const visibleFields = computed<string[]>(() => {
  const f = props.config.cardFields
  if (Array.isArray(f)) return f as string[]
  if (props.source.length > 0) return Object.keys(props.source[0])
  return []
})

const cardsByColumn = computed<Record<string, Record<string, unknown>[]>>(() => {
  const result: Record<string, Record<string, unknown>[]> = {}
  for (const col of columns.value) result[col] = []
  for (const row of props.source) {
    const status = String(row[statusField.value] ?? '')
    if (result[status]) result[status].push(row)
  }
  return result
})
</script>

<style scoped>
.kanban-widget {
  height: 100%;
  overflow: auto;
  padding: var(--spacing-md);
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.kanban-columns {
  display: flex;
  gap: var(--spacing-md);
  height: 100%;
  align-items: flex-start;
}

.kanban-col {
  min-width: 180px;
  flex: 1;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.kanban-col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
}

.kanban-col-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.kanban-col-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: var(--color-bg-hover);
  border-radius: 999px;
  padding: 0 6px;
}

.kanban-cards {
  padding: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.kanban-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-muted);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.kanban-card-val {
  color: var(--color-text-primary);
  display: block;
}

.kanban-empty-col {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: var(--spacing-xs);
  text-align: center;
}
</style>
