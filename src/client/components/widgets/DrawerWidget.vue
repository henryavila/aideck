<template>
  <WidgetFrame :title="title" :icon="icon" :meta="meta" body-class="flush">
    <div class="drawer-demo" :class="{ open }">
      <span class="dd-hint">{{ side }} drawer</span>
      <button
        type="button"
        class="dd-trigger dd-open-btn"
        @click="open = true"
      >
        <span class="gly">⌗</span>open drawer
      </button>
      <div class="drawer-backdrop-local" @click="open = false" />
      <div class="drawer-panel" :class="`from-${side}`">
        <div class="drawer-head">
          <span class="dh-title">{{ panelTitle }}</span>
          <button type="button" class="dh-close" @click="open = false">✕</button>
        </div>
        <div class="drawer-body">
          <div v-if="rows.length === 0" class="lst-empty">// no content</div>
          <div v-else class="lst">
            <div v-for="(row, i) in rows" :key="i" class="lst-row">
              <span v-if="row.lead" class="l-lead">{{ row.lead }}</span>
              <span class="l-title">{{ row.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '⌗')
const meta = computed(() => props.config.meta as string | undefined)
const side = computed(() =>
  props.config.position === 'left' || props.config.side === 'left' ? 'left' : 'right',
)
const panelTitle = computed(
  () => String(props.config.panelTitle ?? props.config.title ?? 'Details'),
)

interface Row { lead?: string; title: string }

const rows = computed<Row[]>(() =>
  props.source.map((r) => ({
    lead: r.id != null ? String(r.id) : r.key != null ? String(r.key) : undefined,
    title: String(r.title ?? r.name ?? r.label ?? Object.values(r)[0] ?? ''),
  })),
)

const open = ref(false)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* The design's trigger uses `.btn .btn-secondary`, which is not part of the
   global widget CSS. Minimal local button styling so the drawer is operable. */
.dd-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--fg-default);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 100ms var(--ease-out),
    border-color 100ms var(--ease-out);
}
.dd-trigger:hover {
  background: var(--bg-overlay);
  border-color: var(--border-bright);
}
.dd-trigger .gly {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--fg-subtle);
}
</style>
