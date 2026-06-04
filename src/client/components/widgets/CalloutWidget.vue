<template>
  <WidgetFrame frameless>
    <!-- Empty state: neither title nor body resolved → muted note, no banner. -->
    <span v-if="!title && !body" class="callout-empty">// no callout</span>

    <div
      v-else
      class="callout"
      :class="[`c-${tone}`, { 'is-pulse': pulse }]"
      role="status"
    >
      <span class="co-bar" aria-hidden="true" />
      <span class="co-glyph" aria-hidden="true">{{ glyph }}</span>
      <span class="co-text">
        <span v-if="title" class="co-title">{{ title }}</span>
        <span v-if="body" class="co-body">{{ body }}</span>
      </span>
      <router-link v-if="linkHref" class="co-action" :to="linkHref">
        {{ actionLabel }}<span class="co-arrow" aria-hidden="true">→</span>
      </router-link>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'
import { statusInfo, type Tone } from '../../utils/status.js'

type Variant = 'info' | 'success' | 'warning' | 'attention' | 'error'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

// A source-less callout placed in a slot is handed `[parentRecord]`; either way
// the banner binds to the first record in scope.
const record = computed<Record<string, unknown>>(() => props.source[0] ?? {})

const titleField = computed(() => String(props.config.titleField ?? 'title'))
const bodyField = computed(() => String(props.config.bodyField ?? 'body'))

function asText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s.length ? s : undefined
}

// config wins over the field read; both fall back to undefined → empty state.
const title = computed<string | undefined>(
  () => asText(props.config.title) ?? asText(record.value[titleField.value]),
)
const body = computed<string | undefined>(
  () => asText(props.config.body) ?? asText(record.value[bodyField.value]),
)

// Variant precedence: explicit config.variant, else the record's own `variant`,
// else a neutral 'info' tone. 'attention' is widget-specific (accent-primary);
// the other four map onto the design-system status tones via statusInfo.
const variant = computed<Variant>(() => {
  const raw = asText(props.config.variant) ?? asText(record.value.variant) ?? 'info'
  const v = raw as Variant
  return v === 'attention' || v === 'info' || v === 'success' || v === 'warning' || v === 'error'
    ? v
    : 'info'
})

// 'attention' is not a domain status — render it with the info/accent tone but
// keep its own glyph. Everything else routes through the canonical status map.
const VARIANT_STATUS: Record<Exclude<Variant, 'attention'>, string> = {
  info: 'active',
  success: 'done',
  warning: 'warning',
  error: 'error',
}

const tone = computed<Tone>(() => (variant.value === 'attention' ? 'info' : statusInfo(VARIANT_STATUS[variant.value]).tone))

const glyph = computed<string>(() => {
  if (variant.value === 'attention') return '◆'
  return statusInfo(VARIANT_STATUS[variant.value]).glyph
})

const pulse = computed(() => props.config.pulse === true && variant.value === 'attention')

const actionLabel = computed<string>(() => asText(props.config.actionLabel) ?? 'Open')

// Simple, tokenless link: '/' + consumerId + '/' + linkTo. No :token interpolation.
const linkHref = computed<string | undefined>(() => {
  const linkTo = asText(props.config.linkTo)
  if (!linkTo) return undefined
  return `/${props.consumerId ?? ''}/${linkTo}`
})
</script>

<style scoped>
.callout-empty {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-subtle);
  font-feature-settings: 'calt' 0;
}

.callout {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6) var(--space-5) var(--space-8);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-surface);
}

/* 3px left status bar. */
.co-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--status-neutral);
}

.co-glyph {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  line-height: 1;
  color: var(--status-neutral);
  background: var(--status-neutral-bg);
}

.co-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1 1 auto;
}

.co-title {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: var(--fw-semibold);
  line-height: var(--lh-snug);
  letter-spacing: -0.005em;
  color: var(--fg-default);
}

.co-body {
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: var(--lh-snug);
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
}

.co-action {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: var(--fw-medium);
  color: var(--accent-link);
  text-decoration: none;
  white-space: nowrap;
}
.co-action:hover { color: var(--accent-focus); }
.co-arrow {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
}

/* ── Tone modifiers ──────────────────────────────────────────────
   bar + glyph adopt the tone; background is a faint color-mix wash so
   the banner reads as accented without competing with widget cards. */
.callout.c-success {
  border-color: var(--status-success-line);
  background: color-mix(in srgb, var(--status-success) 7%, var(--bg-surface));
}
.callout.c-success .co-bar { background: var(--status-success); }
.callout.c-success .co-glyph { color: var(--status-success); background: var(--status-success-bg); }

.callout.c-warning {
  border-color: var(--status-warning-line);
  background: color-mix(in srgb, var(--status-warning) 8%, var(--bg-surface));
}
.callout.c-warning .co-bar { background: var(--status-warning); }
.callout.c-warning .co-glyph { color: var(--status-warning); background: var(--status-warning-bg); }

.callout.c-error {
  border-color: var(--status-error-line);
  background: color-mix(in srgb, var(--status-error) 9%, var(--bg-surface));
}
.callout.c-error .co-bar { background: var(--status-error); }
.callout.c-error .co-glyph { color: var(--status-error); background: var(--status-error-bg); }

.callout.c-info {
  border-color: var(--status-info-line);
  background: color-mix(in srgb, var(--status-info) 7%, var(--bg-surface));
}
.callout.c-info .co-bar { background: var(--accent-primary); }
.callout.c-info .co-glyph { color: var(--accent-primary); background: var(--status-info-bg); }

.callout.c-neutral .co-bar { background: var(--status-neutral); }
.callout.c-neutral .co-glyph { color: var(--status-neutral); background: var(--status-neutral-bg); }

/* ── Pulse (variant 'attention' only) ───────────────────────────── */
.callout.is-pulse .co-bar {
  animation: aideck-callout-pulse 2.4s var(--ease-in-out) infinite;
}
@keyframes aideck-callout-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .callout.is-pulse .co-bar { animation: none; }
}
</style>
