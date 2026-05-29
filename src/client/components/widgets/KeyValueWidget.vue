<template>
  <WidgetFrame
    :title="title"
    :icon="icon ?? '≣'"
    :meta="meta"
    :live="live"
    :state="rows.length === 0 ? 'empty' : 'ready'"
    empty-note="no fields"
  >
    <template v-for="(row, i) in rows" :key="i">
      <div class="kv2" :class="{ 'is-grid': grid }">
        <template v-for="field in visibleFields(row)" :key="field">
          <span class="k">{{ field }}</span>
          <span v-if="field === 'status'" class="v">
            <span class="schip" :class="statusInfo(String(row[field])).tone">
              <span class="dot" />
              <span>{{ statusInfo(String(row[field])).label }}</span>
            </span>
          </span>
          <span
            v-else
            class="v"
            :class="{ mono: isMono(field, row[field]) }"
          >{{ formatValue(row[field]) }}</span>
        </template>
      </div>
    </template>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo } from '../../utils/status.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const rows = computed(() => props.source)

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)
const grid = computed(() => props.config.layout === 'grid')

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  return rows.value.length === 1 ? 'all fields' : `${rows.value.length} records`
})

function visibleFields(row: Record<string, unknown>): string[] {
  const fields = props.config.fields as string[] | undefined
  if (Array.isArray(fields) && fields.length > 0) return fields
  return Object.keys(row)
}

const MONO_FIELDS = new Set(['id', 'startDate', 'progress', 'commit', 'branch'])

function isMono(field: string, value: unknown): boolean {
  if (MONO_FIELDS.has(field)) return true
  return typeof value === 'number'
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
</script>
