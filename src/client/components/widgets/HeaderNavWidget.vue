<template>
  <WidgetFrame frameless>
    <div v-if="vertical" class="vnav">
      <span
        v-for="link in links"
        :key="link.id"
        class="vnav-link"
        :class="{ on: link.id === active }"
      >
        <span v-if="link.glyph" class="gly">{{ link.glyph }}</span>
        <span class="vn-name">{{ link.name }}</span>
        <span v-if="link.count != null" class="vn-ct">{{ link.count }}</span>
      </span>
    </div>
    <div v-else class="hnav" :class="{ wrap }">
      <span
        v-for="link in links"
        :key="link.id"
        class="hnav-link"
        :class="{ on: link.id === active }"
      >
        <span v-if="showGlyphs && link.glyph" class="gly">{{ link.glyph }}</span>
        <span>{{ link.name }}</span>
      </span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

interface NavLink { id: string; name: string; glyph?: string; count?: number }

const vertical = computed(
  () => props.config.orientation === 'vertical' || props.config.variant === 'sidebar',
)
const wrap = computed(() => props.config.wrap === true)
const showGlyphs = computed(() => props.config.glyphs === true)

const links = computed<NavLink[]>(() => {
  const cfgItems = props.config.items ?? props.config.links
  const rows = Array.isArray(cfgItems) ? (cfgItems as Record<string, unknown>[]) : props.source
  return rows.map((r, i) => {
    const id = r.id ?? r.key ?? r.name ?? i
    const count = r.count
    return {
      id: String(id),
      name: String(r.name ?? r.label ?? r.title ?? id),
      glyph: r.glyph != null ? String(r.glyph) : r.icon != null ? String(r.icon) : undefined,
      count: typeof count === 'number' ? count : undefined,
    }
  })
})

const active = computed(() => {
  if (props.config.active != null) return String(props.config.active)
  return links.value[0]?.id
})
</script>
