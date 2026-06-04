<template>
  <WidgetFrame
    :title="title"
    icon="≡"
    :meta="meta"
    :live="live"
    :state="source.length === 0 ? 'empty' : 'ready'"
    :empty-note="emptyNote"
  >
    <div class="lst">
      <div v-for="(item, i) in source" :key="i" class="lst-row">
        <WidgetSlot v-if="slots?.lead?.length" :bindings="slots.lead" :parent-record="item" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        <span v-else-if="leadOf(item)" class="l-lead">{{ leadOf(item) }}</span>
        <WidgetSlot v-if="slots?.item?.length" :bindings="slots.item" :parent-record="item" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        <span v-else class="l-title">{{ itemTitle(item) }}</span>
        <WidgetSlot v-if="slots?.tail?.length" :bindings="slots.tail" :parent-record="item" :depth="depth ?? 0" :consumer-id="consumerId ?? ''" />
        <span v-else-if="tailOf(item)" class="l-tail">
          <span v-if="isStatusTail(item)" :class="'schip ' + statusInfo(tailOf(item), statuses).tone">
            <span class="dot" />
            <span>{{ statusInfo(tailOf(item), statuses).label }}</span>
          </span>
          <span v-else class="l-sub">{{ tailOf(item) }}</span>
        </span>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import WidgetSlot from '../WidgetSlot.vue'
import { statusInfo } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  // §2b composition: `lead` / `item` / `tail` slots render per-row with the item in scope.
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const statuses = useStatuses(props)
const title = computed(() => props.config.title as string | undefined)
const live = computed(() => props.config.live === true)
const meta = computed(() => props.config.meta as string | undefined)
const emptyNote = computed(() => String(props.config.emptyNote ?? '0 items'))

const titleField = () => String(props.config.titleField ?? 'title')
const subtitleField = () => String(props.config.subtitleField ?? 'status')
const leadField = () => (props.config.leadField ? String(props.config.leadField) : undefined)

const STATUS_FIELDS = new Set(['status', 'state'])

function itemTitle(item: Record<string, unknown>): string {
  const field = titleField()
  const val = item[field] ?? item['title'] ?? item['id']
  return val !== undefined && val !== null ? String(val) : '—'
}

function tailOf(item: Record<string, unknown>): string {
  const field = subtitleField()
  const val = item[field]
  return val !== undefined && val !== null ? String(val) : ''
}

function isStatusTail(item: Record<string, unknown>): boolean {
  return STATUS_FIELDS.has(subtitleField().toLowerCase()) && !!tailOf(item)
}

function leadOf(item: Record<string, unknown>): string {
  const field = leadField()
  if (!field) return ''
  const val = item[field]
  return val !== undefined && val !== null ? String(val) : ''
}
</script>
