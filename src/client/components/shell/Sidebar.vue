<template>
  <aside class="side">
    <div class="side-mobile-head">
      <span class="side-mobile-title">consumers</span>
      <button class="icon-btn" title="close" aria-label="close sidebar" @click="$emit('close')">×</button>
    </div>

    <div class="grp">
      <span>consumers</span>
      <span class="count">{{ consumers.length }}</span>
    </div>
    <router-link
      v-for="(c, i) in consumers"
      :key="c.id"
      :to="`/${c.id}`"
      class="consumer-row"
      :class="{ on: c.id === currentId }"
      :title="c.id"
      @click="$emit('close')"
    >
      <span class="dot" :style="{ background: chartColor(i) }" />
      <span class="name">{{ c.title }}</span>
      <span class="ct">{{ c.dataSourceCount }}</span>
    </router-link>

    <div class="grp" style="margin-top: 12px"><span>data sources</span></div>
    <div class="fs-tree">
      <div class="fs-row"><span class="fs-name fs-root">~/.aideck/</span></div>
      <div class="fs-row lvl-2"><span class="fs-name fs-root">consumers/</span></div>
      <div
        v-for="(c, i) in consumers"
        :key="c.id"
        class="fs-row lvl-3"
        :class="dirClass(i)"
      >
        <span class="fs-name">{{ c.id }}/</span>
        <span class="fs-meta">{{ c.dataSourceCount }} srcs</span>
      </div>
    </div>

    <div class="side-foot">
      <span style="flex: 1">collapse</span>
      <span class="kbd">⌘</span><span class="kbd">B</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ConsumerSummary } from '../../api.js'
import { chartColor } from '../../utils/status.js'

defineProps<{ consumers: ConsumerSummary[]; currentId?: string }>()
defineEmits<{ (e: 'close'): void }>()

function dirClass(i: number): string {
  const n = (i % 4) + 1
  return n === 1 ? 'dir' : `dir-${n}`
}
</script>
