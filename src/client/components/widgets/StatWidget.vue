<template>
  <div class="stat-widget">
    <div class="stat-value" :style="valueStyle">{{ computedValue }}</div>
    <div class="stat-label">{{ config.label ?? 'Value' }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const computedValue = computed(() => {
  const expr = String(props.config.value ?? 'count()')
  const countMatch = expr.match(/^count\((\w+)=(.+)\)$/)
  if (countMatch) {
    const [, key, val] = countMatch
    return props.source.filter(r => String(r[key]) === val).length
  }
  if (expr === 'count()') return props.source.length
  return expr
})

const valueStyle = computed(() => ({
  color: props.config.color ? String(props.config.color) : undefined,
}))
</script>

<style scoped>
.stat-widget {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  height: 100%;
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}
</style>
