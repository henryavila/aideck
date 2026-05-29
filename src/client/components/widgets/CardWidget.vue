<template>
  <WidgetFrame
    :title="title"
    :icon="icon ?? '▢'"
    :meta="meta"
    :live="live"
    :state="source.length === 0 ? 'empty' : 'ready'"
    empty-note="no records"
  >
    <div class="cards-grid">
      <component
        :is="linkTo ? 'router-link' : 'a'"
        v-for="(record, i) in source"
        :key="i"
        class="subcard"
        :to="linkTo ? '/' + consumerId + '/' + linkTo : undefined"
        :href="linkTo ? undefined : '#'"
        @click="onCardClick"
      >
        <div v-if="titleField" class="sc-title">{{ record[titleField] ?? '—' }}</div>
        <div v-if="subtitleField" class="sc-sub">{{ record[subtitleField] ?? '' }}</div>
        <div v-if="extraFields.length > 0" class="sc-fields">
          <div v-for="f in extraFields" :key="f" class="sf-row">
            <span class="sf-k">{{ f }}</span>
            <span v-if="f === 'status'" class="sf-v">
              <span class="schip" :class="statusInfo(String(record[f])).tone">
                <span class="dot" />
                <span>{{ statusInfo(String(record[f])).label }}</span>
              </span>
            </span>
            <span v-else class="sf-v" :class="{ mono: isMono(f, record[f]) }">
              {{ formatValue(record[f]) }}
            </span>
          </div>
        </div>
      </component>
    </div>
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

const linkTo = computed(() => props.config.linkTo as string | undefined)

function onCardClick(event: MouseEvent): void {
  if (!linkTo.value) event.preventDefault()
}

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => props.config.icon as string | undefined)
const live = computed(() => props.config.live === true)

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  return `${props.source.length} record${props.source.length === 1 ? '' : 's'}`
})

const titleField = computed(() => props.config.titleField as string | undefined)
const subtitleField = computed(() => props.config.subtitleField as string | undefined)

const extraFields = computed<string[]>(() => {
  const fields = props.config.fields as string[] | undefined
  if (Array.isArray(fields)) return fields
  return []
})

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
