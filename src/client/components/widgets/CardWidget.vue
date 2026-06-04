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
        :to="linkTo ? resolveLink(linkTo, record) : undefined"
        :href="linkTo ? undefined : '#'"
        @click="onCardClick"
      >
        <WidgetSlot
          v-if="slots?.header?.length"
          :bindings="slots.header"
          :parent-record="record"
          :depth="depth ?? 0"
          :consumer-id="consumerId ?? ''"
        />
        <div v-if="slots?.media?.length" class="sc-media">
          <WidgetSlot :bindings="slots.media" :parent-record="record" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        </div>
        <div v-if="titleField" class="sc-title">{{ record[titleField] ?? '—' }}</div>
        <div v-if="subtitleField" class="sc-sub">{{ record[subtitleField] ?? '' }}</div>
        <div v-if="extraFields.length > 0" class="sc-fields">
          <div v-for="f in extraFields" :key="f" class="sf-row">
            <span class="sf-k">{{ f }}</span>
            <span v-if="f === 'status'" class="sf-v">
              <span class="schip" :class="statusInfo(String(record[f]), statuses).tone">
                <span class="dot" />
                <span>{{ statusInfo(String(record[f]), statuses).label }}</span>
              </span>
            </span>
            <span v-else class="sf-v" :class="{ mono: isMono(f, record[f]) }">
              {{ formatValue(record[f]) }}
            </span>
          </div>
        </div>
        <WidgetSlot
          v-if="slots?.body?.length"
          :bindings="slots.body"
          :parent-record="record"
          :depth="depth ?? 0"
          :consumer-id="consumerId ?? ''"
        />
        <WidgetSlot
          v-if="slots?.footer?.length"
          :bindings="slots.footer"
          :parent-record="record"
          :depth="depth ?? 0"
          :consumer-id="consumerId ?? ''"
        />
      </component>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { resolveRowLink } from '../../utils/link.js'
import { statusInfo } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: named slots rendered per-card with the card record in scope.
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const statuses = useStatuses(props)

const linkTo = computed(() => props.config.linkTo as string | undefined)

// §2c row-scoped link: interpolate :tokens from the card record (or use the
// static page slug as-is for a tokenless linkTo).
function resolveLink(link: string, record: Record<string, unknown>): string {
  return resolveRowLink(link, record, props.consumerId ?? '')
}

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
