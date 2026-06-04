<template>
  <WidgetFrame
    :title="title"
    icon="⌖"
    :meta="meta"
    :live="live"
    :state="events.length === 0 ? 'empty' : 'ready'"
    empty-note="no events"
  >
    <div class="tl">
      <div v-for="(ev, i) in events" :key="i" class="tl-row" :class="ev.tone">
        <div class="tl-head">
          <span class="tl-ts">{{ ev.short }}</span>
          <span v-if="ev.kind" class="tl-tag" :class="ev.tone">{{ ev.kind }}</span>
          <span class="tl-ts" style="color: var(--fg-faint)">·</span>
          <span class="tl-ts">{{ ev.rel }}</span>
        </div>
        <div class="tl-ti">
          <span v-if="ev.refId" class="id">{{ ev.refId }}</span>
          <span>{{ ev.title }}</span>
        </div>
        <div v-if="ev.by || ev.ts" class="tl-sub">
          <template v-if="ev.by"><span class="by">by</span> <span>{{ ev.by }}</span></template>
          <template v-if="ev.by && ev.ts"><span style="color: var(--fg-faint); margin: 0 4px">·</span></template>
          <span v-if="ev.ts">{{ ev.ts }}</span>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, shortTime, relTime, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const statuses = useStatuses(props)

const title = computed(() => (props.config.title as string | undefined) ?? 'Recent Activity')
const live = computed(() => props.config.live === true)

const tsField = computed(() => String(props.config.timestampField ?? 'ts'))
const kindField = computed(() => String(props.config.kindField ?? 'kind'))
const titleField = computed(() => String(props.config.titleField ?? 'title'))
const refField = computed(() => String(props.config.refField ?? 'refId'))
const byField = computed(() => String(props.config.byField ?? 'by'))

// Event kinds that are not status words map onto semantic tones.
const EVENT_TONE: Record<string, Tone> = {
  started: 'info',
  paused: 'warning',
}

function eventTone(kind: string): Tone {
  // consumer `statuses` override wins, then the built-in event seed, then the map
  return statuses.value?.[kind]?.tone ?? EVENT_TONE[kind] ?? statusInfo(kind).tone
}

const events = computed(() =>
  props.source.map((r) => {
    const ts = String(r[tsField.value] ?? '')
    const kind = String(r[kindField.value] ?? '')
    const refId = String(r[refField.value] ?? '')
    const rawTitle = String(r[titleField.value] ?? '')
    // Strip only the consumer's own refId prefix — never domain words (was
    // mutating any title starting with "Task "/"Project ").
    const title = refId ? rawTitle.replace(`${refId} `, '') : rawTitle
    return {
      ts,
      short: shortTime(ts),
      rel: relTime(ts),
      kind,
      tone: eventTone(kind),
      refId,
      title,
      by: r[byField.value] ? String(r[byField.value]) : '',
    }
  }),
)

const meta = computed(() => {
  const n = events.value.length
  return `${n} ${n === 1 ? 'event' : 'events'}`
})
</script>
