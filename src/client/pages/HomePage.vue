<template>
  <div class="home-view">
    <div class="home-head">
      <div>
        <div class="eyebrow">consumers</div>
        <h1>Registered runtimes</h1>
      </div>
      <div v-if="!loading && !error && consumers.length" class="meta">
        <span>{{ consumers.length }} registered</span>
        <span style="color: var(--fg-faint); margin: 0 6px">·</span>
        <span class="ok">{{ consumers.length }} healthy</span>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="reload"><span class="gly">↻</span>refresh</button>
      </div>
    </div>

    <div v-if="loading" class="page-state is-loading">
      <div class="skel-stack">
        <span class="skel-block" />
        <span class="skel-block" />
      </div>
    </div>

    <div v-else-if="error" class="page-error">
      <div class="pe-head"><span class="pe-x">×</span><span>failed to load consumers</span></div>
      <div class="pe-msg">{{ error }}</div>
    </div>

    <div v-else-if="!consumers.length" class="home-empty">
      <div class="empty-wrap">
        <div class="empty-note">// no consumers registered</div>
        <div class="empty-msg">
          Drop a <span class="em-path">manifest.yaml</span> into
          <span class="em-path">~/.aideck/consumers/</span> to begin.
        </div>
        <div class="empty-cmd">
          <span class="prompt">$</span>
          <span>aideck</span>
          <span style="color: var(--fg-muted)">init-consumer</span>
          <span class="arg">my-tool</span>
        </div>
        <div class="empty-hint">aideck watches the directory; new consumers appear within seconds.</div>
      </div>
    </div>

    <div v-else class="consumer-grid">
      <router-link
        v-for="(c, i) in consumers"
        :key="c.id"
        :to="`/${c.id}`"
        class="cc"
        :class="`tone-${(i % 4) + 1}`"
      >
        <div class="cc-head">
          <span class="cc-ico">{{ iconGlyph(c.icon) }}</span>
          <div class="cc-title">
            <span class="cc-name">{{ c.title }}</span>
            <span class="cc-id">id · {{ c.id }}</span>
          </div>
          <span class="pill success"><span class="dot" />ready</span>
        </div>
        <div class="cc-divide" />
        <div class="cc-meta">
          <div class="cc-kv">
            <span class="k">pages</span>
            <span class="v">{{ c.pageCount }}</span>
          </div>
          <div class="cc-kv">
            <span class="k">data sources</span>
            <span class="v">{{ c.dataSourceCount }}</span>
          </div>
        </div>
        <div class="cc-filler" />
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConsumers } from '../composables/useConsumers.js'

const { consumers, loading, error } = useConsumers()

function reload(): void {
  window.location.reload()
}

// Manifests may declare an icon as a glyph/emoji or an icon-font token
// ("mdi:rocket"). We only render literal glyphs; tokens fall back.
function iconGlyph(icon?: string): string {
  if (!icon) return '◆'
  return icon.includes(':') ? '◆' : icon
}
</script>

<style scoped>
.home-empty {
  position: relative;
  min-height: 360px;
}
</style>
