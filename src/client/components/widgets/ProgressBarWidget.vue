<template>
  <div class="progress-widget">
    <div class="progress-label">
      <span>{{ label }}</span>
      <span class="progress-pct">{{ pct }}%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: pct + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const label = computed(() => String(props.config.label ?? 'Progress'))

const pct = computed(() => {
  const row = props.source[0] ?? {}
  const valueField = String(props.config.valueField ?? 'value')
  const maxField = String(props.config.maxField ?? 'max')
  const rawValue = Number(row[valueField] ?? 0)
  const rawMax = Number(row[maxField] ?? props.config.max ?? 100)
  if (rawMax === 0) return 0
  return Math.min(100, Math.round((rawValue / rawMax) * 100))
})
</script>

<style scoped>
.progress-widget {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  height: 100%;
  justify-content: center;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.progress-pct {
  color: var(--color-text-primary);
  font-weight: 600;
}

.progress-track {
  height: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border-muted);
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
  min-width: 2px;
}
</style>
