<template>
  <header class="headernav-widget">
    <div class="headernav-text">
      <h1 class="headernav-title">{{ title }}</h1>
      <p v-if="subtitle" class="headernav-subtitle">{{ subtitle }}</p>
    </div>
    <hr class="headernav-rule" />
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const title = computed(() => {
  const row = props.source[0]
  return String(props.config.title ?? row?.title ?? 'Untitled')
})

const subtitle = computed(() => {
  const row = props.source[0]
  const s = props.config.subtitle ?? row?.subtitle
  return s ? String(s) : ''
})
</script>

<style scoped>
.headernav-widget {
  padding: var(--spacing-md) var(--spacing-md) 0;
}

.headernav-title {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.headernav-subtitle {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.headernav-rule {
  margin: var(--spacing-md) 0 0;
  border: none;
  border-top: 1px solid var(--color-border);
}
</style>
