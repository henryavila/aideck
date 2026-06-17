<template>
  <WidgetFrame frameless>
    <div class="banner" :class="`b-${tone}`">
      <div class="hb-lead">
        <span class="hb-count">{{ count }}</span>
        <span v-if="title" class="hb-title">{{ title }}</span>
        <span v-if="sub" class="hb-sub">{{ sub }}</span>
      </div>

      <div v-if="lanes.length" class="hb-strip" aria-hidden="true">
        <span
          v-for="(lane, i) in lanes"
          :key="i"
          class="hb-lane"
          :class="[`l-${lane.tone}`, { 'is-off': !lane.active }]"
          :title="lane.title"
        />
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, type Tone } from '../../utils/status.js'
import { useStatuses } from '../../composables/useStatuses.js'

interface Lane {
  tone: Tone
  active: boolean
  title: string
}

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

const statuses = useStatuses(props)

function asText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s.length ? s : undefined
}

const TONES: ReadonlySet<string> = new Set<Tone>(['success', 'warning', 'error', 'info', 'neutral'])

const laneStatusField = computed(() => String(props.config.laneStatusField ?? 'status'))
const laneActiveField = computed(() => String(props.config.laneActiveField ?? 'active'))
const laneTitleField = computed(() => String(props.config.laneTitleField ?? 'title'))

const title = computed<string | undefined>(() => asText(props.config.title))
const sub = computed<string | undefined>(() => asText(props.config.sub))

// The big number: explicit config.count wins, then a runtime aggregate injected
// as config.value (source.agg), else the collection size. A zero aggregate is
// meaningful, so an empty source renders '0' rather than an empty state.
const count = computed<string>(
  () => asText(props.config.count) ?? asText(props.config.value) ?? String(props.source.length)
)

// One lane per record, tone-coded from its status. Active unless the active
// field is explicitly false; tooltip falls back to the resolved status label.
const lanes = computed<Lane[]>(() =>
  props.source.map((rec) => {
    const info = statusInfo(String(rec[laneStatusField.value] ?? ''), statuses.value)
    return {
      tone: info.tone,
      active: rec[laneActiveField.value] !== false,
      title: asText(rec[laneTitleField.value]) ?? info.label,
    }
  }),
)

// Overall tone: config.tone may be a literal DS tone or a consumer status value
// resolved via statusInfo. Neutral when unset.
const tone = computed<Tone>(() => {
  const raw = asText(props.config.tone) ?? 'neutral'
  return TONES.has(raw) ? (raw as Tone) : statusInfo(raw, statuses.value).tone
})
</script>

<style scoped>
.banner {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 14px;
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-ambient);
}

.hb-lead {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hb-count {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 40px;
  font-weight: var(--fw-semibold);
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--fg-muted);
}

.hb-title {
  margin-top: var(--space-4);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: var(--fw-semibold);
  line-height: var(--lh-snug);
  color: var(--fg-default);
}

.hb-sub {
  margin-top: 3px;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  line-height: var(--lh-snug);
  color: var(--fg-subtle);
}

/* Lane strip: thin tone-coded bars, bottom-aligned, faded when inactive. */
.hb-strip {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  flex: 0 0 auto;
}

.hb-lane {
  width: 6px;
  height: 46px;
  border-radius: 2px 2px 0 0;
  background: var(--status-neutral);
}
.hb-lane.is-off {
  opacity: 0.28;
}

.hb-lane.l-success { background: var(--status-success); }
.hb-lane.l-warning { background: var(--status-warning); }
.hb-lane.l-error   { background: var(--status-error); }
.hb-lane.l-info    { background: var(--status-info); }
.hb-lane.l-neutral { background: var(--status-neutral); }

/* Banner tone: border adopts the tone line; the big number takes the tone color
   (neutral stays muted to avoid a colorless number reading as an error). */
.banner.b-success { border-color: var(--status-success-line); }
.banner.b-success .hb-count { color: var(--status-success); }

.banner.b-warning { border-color: var(--status-warning-line); }
.banner.b-warning .hb-count { color: var(--status-warning); }

.banner.b-error { border-color: var(--status-error-line); }
.banner.b-error .hb-count { color: var(--status-error); }

.banner.b-info { border-color: var(--status-info-line); }
.banner.b-info .hb-count { color: var(--status-info); }

.banner.b-neutral { border-color: var(--border-default); }
.banner.b-neutral .hb-count { color: var(--fg-muted); }
</style>
