<template>
  <div class="drawer-wrapper" :class="position">
    <aside class="drawer-panel" :style="panelStyle">
      <div class="drawer-content">
        <slot>
          <div v-for="(row, i) in source" :key="i" class="drawer-row">
            <span v-for="(val, key) in row" :key="key" class="drawer-entry">
              <span class="drawer-key">{{ key }}:</span>
              <span class="drawer-val">{{ val }}</span>
            </span>
          </div>
        </slot>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const position = computed(() => String(props.config.position ?? 'left'))

const panelStyle = computed(() => ({
  width: props.config.width ? String(props.config.width) : '240px',
}))
</script>

<style scoped>
.drawer-wrapper {
  display: flex;
  height: 100%;
}

.drawer-wrapper.left {
  flex-direction: row;
}

.drawer-wrapper.right {
  flex-direction: row-reverse;
}

.drawer-panel {
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
  overflow-y: auto;
}

.drawer-wrapper.right .drawer-panel {
  border-right: none;
  border-left: 1px solid var(--color-border);
}

.drawer-content {
  padding: var(--spacing-md);
}

.drawer-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.drawer-entry {
  display: flex;
  gap: var(--spacing-xs);
}

.drawer-key {
  color: var(--color-text-secondary);
}

.drawer-val {
  color: var(--color-text-primary);
}
</style>
