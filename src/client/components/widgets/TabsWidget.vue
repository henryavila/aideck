<template>
  <WidgetFrame :title="title" :icon="icon ?? '⊟'" :meta="meta" :live="live" body-class="flush">
    <div class="tabw">
      <div ref="barEl" class="tabw-bar" role="tablist" @keydown="onKey">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          class="tabw-tab"
          :class="{ on: activeIndex === i }"
          role="tab"
          :aria-selected="activeIndex === i"
          :tabindex="activeIndex === i ? 0 : -1"
          @click="activeIndex = i"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.count != null" class="tw-ct">{{ tab.count }}</span>
        </button>
      </div>
      <div class="tabw-body" role="tabpanel">
        <div v-if="!activeTab || (activeTab.widgets?.length ?? 0) === 0" class="lst-empty">
          // no widgets in this panel
        </div>
        <div v-else class="lst">
          <div v-for="(w, i) in activeTab.widgets" :key="i" class="lst-row">
            <span class="l-title">{{ widgetLabel(w) }}</span>
          </div>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

interface TabDef { label: string; count?: number; widgets?: unknown[] }

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)

const tabs = computed<TabDef[]>(() => {
  const t = props.config.tabs
  if (Array.isArray(t)) return t as TabDef[]
  return []
})

const meta = computed(() => {
  const m = props.config.meta
  if (typeof m === 'string') return m
  const n = tabs.value.length
  return n ? `${n} panel${n === 1 ? '' : 's'}` : undefined
})

const activeIndex = ref(0)
const activeTab = computed(() => tabs.value[activeIndex.value])
const barEl = ref<HTMLElement | null>(null)

function widgetLabel(w: unknown): string {
  if (w && typeof w === 'object') {
    const o = w as Record<string, unknown>
    return String(o.title ?? o.type ?? 'widget')
  }
  return String(w)
}

function focusTab(n: number) {
  const btns = barEl.value?.querySelectorAll<HTMLButtonElement>('.tabw-tab')
  btns?.[n]?.focus()
}

function onKey(e: KeyboardEvent) {
  const len = tabs.value.length
  if (len === 0) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % len
    focusTab(activeIndex.value)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + len) % len
    focusTab(activeIndex.value)
  }
}
</script>
