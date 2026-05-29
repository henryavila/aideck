<template>
  <footer class="statusbar">
    <span class="sb-item success"><span class="dot" />127.0.0.1:7777</span>
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
withDefaults(
  defineProps<{ consumerCount: number; connected: boolean; version?: string }>(),
  { version: '0.0.1' },
)
</script>
