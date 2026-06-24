<template>
  <footer class="statusbar">
    <span class="sb-item success"><span class="dot" />{{ host }}</span>
    <span class="sep sb-d-only">·</span>
    <span class="sb-item sb-d-only"><span class="sb-em">aideck</span> v{{ version }}</span>
    <span class="sep sb-d-only">·</span>
    <span class="sb-item sb-d-only"><span class="sb-em">consumers</span> {{ consumerCount }}</span>

    <span class="grow" />

    <span class="sb-item" :class="{ success: connected }">
      <span class="dot" /><span class="sb-em">sse</span> {{ connected ? 'live' : 'offline' }}
    </span>
    <span class="sep sb-d-only">·</span>
    <span class="sb-item sb-d-only">MIT</span>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

withDefaults(
  defineProps<{ consumerCount: number; connected: boolean; version?: string }>(),
  { version: '0.0.1' },
)

// Reflect the actual origin so remote (e.g. Tailscale) sessions don't show a
// misleading loopback address.
const host = computed(() =>
  typeof window !== 'undefined' && window.location.host ? window.location.host : '127.0.0.1',
)
</script>
