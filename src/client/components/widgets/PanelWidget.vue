<template>
  <WidgetFrame
    :title="frameTitle"
    :icon="icon"
    :meta="meta"
    :state="state"
    empty-note="no content"
  >
    <div class="panel-body">
      <span v-if="title" class="panel-title">
        <RouterLink v-if="linkHref" :to="linkHref" class="panel-link">{{ title }}</RouterLink>
        <template v-else>{{ title }}</template>
      </span>
      <span v-if="body" class="panel-sub">{{ body }}</span>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WidgetFrame from '../WidgetFrame.vue'
import { resolveRowLink } from '../../utils/link.js'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

// A source-less panel placed in a slot is handed `[parentRecord]`; either way
// the panel binds to the first record in scope.
const record = computed<Record<string, unknown>>(() => props.source[0] ?? {})

const titleField = computed(() => String(props.config.titleField ?? 'title'))
const bodyField = computed(() => String(props.config.bodyField ?? 'body'))

function asText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s.length ? s : undefined
}

// `config.title` is the FRAME HEADER ONLY. It must not feed the prominent line —
// otherwise a header like "Fase atual" would be duplicated as the title and
// swallow record[titleField]. So the prominent line reads the record field
// directly (NOT the callout's `config.title ?? record[...]` precedence).
const frameTitle = computed(() => asText(props.config.title))
const title = computed(() => asText(record.value[titleField.value]))
// `config.body` is a distinct key from the header, so the override precedence is
// safe here (mirrors CalloutWidget).
const body = computed(() => asText(props.config.body) ?? asText(record.value[bodyField.value]))

const icon = computed(() => asText(props.config.icon))
const meta = computed(() => asText(props.config.meta))

// Render the panel when at least one line resolves; an all-empty record falls
// back to the frame's empty state. A title-only or body-only panel still renders.
const state = computed<'ready' | 'empty'>(() => (title.value || body.value ? 'ready' : 'empty'))

// §2c row-scoped link: when `linkTo` is set, the prominent title becomes a link,
// :tokens interpolated from the bound record (tokenless stays static).
const linkHref = computed<string | undefined>(() => {
  const linkTo = asText(props.config.linkTo)
  if (!linkTo) return undefined
  return resolveRowLink(linkTo, record.value, props.consumerId ?? '')
})
</script>

<style scoped>
.panel-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.panel-title {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: var(--fw-semibold);
  line-height: var(--lh-snug);
  letter-spacing: -0.005em;
  color: var(--fg-default);
  /* Phase titles are long and the panel is wide — wrap, never truncate. */
  white-space: normal;
  overflow-wrap: anywhere;
}

.panel-sub {
  font-family: var(--font-sans);
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--fg-muted);
  white-space: normal;
  overflow-wrap: anywhere;
}

/* Title-as-link: inherit the title type, accent on hover. */
.panel-link {
  color: inherit;
  text-decoration: none;
}
.panel-link:hover {
  color: var(--accent-link);
  text-decoration: underline;
}
</style>
