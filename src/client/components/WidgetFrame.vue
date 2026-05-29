<template>
  <div v-if="frameless" class="w-frameless"><slot /></div>
  <div
    v-else
    class="w"
    :class="{
      'is-error': state === 'error',
      'is-stale': state === 'disconnected',
      'is-live': live && state !== 'error',
    }"
  >
    <div v-if="hasHead" class="w-head">
      <span class="w-title">
        <span v-if="state === 'error'" class="w-ico">×</span>
        <span v-else-if="icon" class="w-ico">{{ icon }}</span>
        {{ title }}
      </span>
      <span class="w-meta">
        <slot name="meta"><span v-if="meta">{{ meta }}</span></slot>
        <span v-if="state === 'disconnected'" class="stale"><span class="stale-dot" />stale</span>
        <template v-else-if="live && state === 'ready'"><span class="live" /><span class="live-text">live</span></template>
        <span v-if="state === 'error'" class="retry" role="button" tabindex="0" @click="$emit('retry')" @keydown.enter="$emit('retry')">× retry</span>
        <slot name="actions" />
      </span>
    </div>

    <div class="w-body" :class="bodyClass">
      <slot v-if="state === 'loading'" name="loading">
        <span class="skel-line tall full" />
        <span class="skel-line w-70" />
        <span class="skel-line w-50" />
      </slot>
      <slot v-else-if="state === 'empty'" name="empty">
        <div class="w-empty">
          <span class="we-note">// {{ emptyNote }}</span>
          <span v-if="emptyMsg" class="we-msg">{{ emptyMsg }}</span>
        </div>
      </slot>
      <slot v-else-if="state === 'error'" name="error">
        <div class="err-body">
          <span class="err-1">{{ error?.message ?? 'Failed to load.' }}</span>
          <span v-if="error?.detail" class="err-2">{{ error.detail }}</span>
          <span v-if="error?.suggestion" class="err-3"><span class="arrow">→</span>{{ error.suggestion }}</span>
        </div>
      </slot>
      <slot v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

type WidgetState = 'ready' | 'loading' | 'empty' | 'error' | 'disconnected'
interface WidgetError { message?: string; detail?: string; suggestion?: string }

const props = withDefaults(
  defineProps<{
    title?: string
    icon?: string
    meta?: string
    live?: boolean
    state?: WidgetState
    bodyClass?: string
    frameless?: boolean
    emptyNote?: string
    emptyMsg?: string
    error?: WidgetError
  }>(),
  { state: 'ready', emptyNote: 'no data', bodyClass: '', live: false, frameless: false },
)

defineEmits<{ (e: 'retry'): void }>()

const slots = useSlots()
const hasHead = computed(
  () =>
    !!(
      props.title ||
      props.meta ||
      props.live ||
      props.state === 'error' ||
      props.state === 'disconnected' ||
      slots.actions ||
      slots.meta
    ),
)
</script>
