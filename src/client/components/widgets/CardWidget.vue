<template>
  <div class="card-widget">
    <div v-if="source.length === 0" class="empty">No data</div>
    <div v-else class="card-grid">
      <component
        v-for="(record, i) in source"
        :key="i"
        :is="linkTo ? 'router-link' : 'div'"
        :to="linkTo ? '/' + consumerId + '/' + linkTo : undefined"
        class="card"
      >
        <div v-if="titleField" class="card-title">{{ record[titleField] ?? '—' }}</div>
        <div v-if="subtitleField" class="card-subtitle">{{ record[subtitleField] ?? '' }}</div>
        <div v-if="extraFields.length > 0" class="card-fields">
          <div v-for="f in extraFields" :key="f" class="card-field">
            <span class="card-field-key">{{ f }}</span>
            <span class="card-field-value">{{ formatValue(record[f]) }}</span>
          </div>
        </div>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const linkTo = computed(() => props.config.linkTo as string | undefined)

const titleField = computed(() => props.config.titleField as string | undefined)
const subtitleField = computed(() => props.config.subtitleField as string | undefined)

const extraFields = computed<string[]>(() => {
  const fields = props.config.fields as string[] | undefined
  if (Array.isArray(fields)) return fields
  return []
})

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>

<style scoped>
.card-widget {
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

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-decoration: none;
  color: inherit;
  display: block;
}

a.card:hover {
  border-color: var(--color-accent, #4f8ff7);
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.card-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border-muted);
  padding-top: var(--spacing-sm);
}

.card-field {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  gap: var(--spacing-sm);
}

.card-field-key {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.card-field-value {
  color: var(--color-text-primary);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
