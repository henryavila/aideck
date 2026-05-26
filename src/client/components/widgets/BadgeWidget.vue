<template>
  <div class="badge-widget">
    <template v-if="source.length === 1">
      <span class="badge" :style="badgeStyle(singleValue)">{{ singleValue }}</span>
    </template>
    <template v-else-if="source.length > 1">
      <div class="badge-counts">
        <div v-for="(count, value) in valueCounts" :key="value" class="badge-count-row">
          <span class="badge" :style="badgeStyle(String(value))">{{ value }}</span>
          <span class="badge-count">{{ count }}</span>
        </div>
      </div>
    </template>
    <div v-else class="empty">No data</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const DEFAULT_COLOR_MAP: Record<string, string> = {
  active: 'var(--color-accent)',
  done: 'var(--color-success)',
  pending: 'var(--color-text-muted)',
  blocked: 'var(--color-warning)',
}

const field = computed(() => String(props.config.field ?? 'status'))

const colorMap = computed<Record<string, string>>(() => {
  if (props.config.colorMap && typeof props.config.colorMap === 'object') {
    return { ...DEFAULT_COLOR_MAP, ...(props.config.colorMap as Record<string, string>) }
  }
  return DEFAULT_COLOR_MAP
})

const singleValue = computed(() => {
  const val = props.source[0]?.[field.value]
  return val !== undefined && val !== null ? String(val) : '—'
})

const valueCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const record of props.source) {
    const val = record[field.value]
    const key = val !== undefined && val !== null ? String(val) : '—'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

function badgeStyle(value: string) {
  const color = colorMap.value[value] ?? 'var(--color-text-secondary)'
  return {
    color,
    borderColor: color,
  }
}
</script>

<style scoped>
.badge-widget {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  height: 100%;
}

.badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-transform: capitalize;
}

.badge-counts {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  width: 100%;
}

.badge-count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.badge-count {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
