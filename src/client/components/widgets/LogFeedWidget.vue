<template>
  <div class="logfeed-widget" ref="containerRef">
    <div v-if="lines.length === 0" class="empty">No log entries</div>
    <div v-else class="logfeed-lines">
      <div v-for="(line, i) in lines" :key="i" class="logfeed-line">
        <span v-if="line.timestamp" class="logfeed-ts">{{ line.timestamp }}</span>
        <span class="logfeed-msg">{{ line.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

const containerRef = ref<HTMLElement | null>(null)

const tsField = computed(() => String(props.config.timestampField ?? 'timestamp'))
const msgField = computed(() => String(props.config.messageField ?? 'message'))
const maxLines = computed(() => Number(props.config.maxLines ?? 200))

const lines = computed(() => {
  const all = props.source.map(r => ({
    timestamp: r[tsField.value] ? String(r[tsField.value]) : '',
    message: String(r[msgField.value] ?? JSON.stringify(r)),
  }))
  return all.slice(-maxLines.value)
})

watch(lines, async () => {
  await nextTick()
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight
  }
})
</script>

<style scoped>
.logfeed-widget {
  height: 100%;
  overflow-y: auto;
  background: var(--color-bg-primary);
  padding: var(--spacing-sm);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

.empty {
  color: var(--color-text-muted);
  padding: var(--spacing-md);
}

.logfeed-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.logfeed-line {
  display: flex;
  gap: var(--spacing-sm);
  line-height: 1.5;
}

.logfeed-ts {
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.logfeed-msg {
  color: var(--color-text-primary);
  word-break: break-word;
}
</style>
