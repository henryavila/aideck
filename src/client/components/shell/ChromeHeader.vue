<template>
  <header class="chrome">
    <button
      v-if="hasSidebar"
      class="icon-btn drawer-tg"
      title="open sidebar"
      aria-label="open sidebar"
      @click="$emit('toggle-sidebar')"
    >≡</button>

    <span class="wm">
      <span class="wm-ai">ai</span><span class="wm-deck">Deck</span><i class="wm-dot" />
    </span>

    <div class="crumb">
      <span class="sep">/</span>
      <template v-if="crumb.length">
        <template v-for="(seg, i) in crumb" :key="i">
          <span :class="i === crumb.length - 1 ? 'now' : 'crumb-hide-sm'">{{ seg }}</span>
          <span v-if="i !== crumb.length - 1" class="sep crumb-hide-sm">/</span>
        </template>
      </template>
      <span v-else class="now">home</span>
    </div>

    <span style="flex: 1" />

    <div class="pal" role="button" tabindex="0" @click="$emit('open-palette')" @keydown.enter="$emit('open-palette')">
      <span class="pal-icon">⌕</span>
      <span class="ph">jump anywhere</span>
      <span class="kbd">⌘</span><span class="kbd">K</span>
    </div>
    <button class="icon-btn pal-icon-btn" title="search" aria-label="search" @click="$emit('open-palette')">⌕</button>

    <span class="lh">
      <i />
      <span class="lh-host">127.0.0.1</span>
      <span class="lh-sep">·</span>
      <span class="lh-tag">no telemetry</span>
    </span>

    <button class="icon-btn chrome-help" title="help" aria-label="help">?</button>
    <button class="icon-btn chrome-menu" title="menu" aria-label="menu">⋯</button>
  </header>
</template>

<script setup lang="ts">
defineProps<{ crumb: string[]; hasSidebar: boolean }>()
defineEmits<{ (e: 'open-palette'): void; (e: 'toggle-sidebar'): void }>()
</script>
