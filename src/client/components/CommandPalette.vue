<template>
  <Teleport to="body">
    <div v-if="isOpen" class="pal-overlay" @mousedown.self="close">
      <div class="pal-panel" @keydown="onKeyDown">
        <div class="pal-head">
          <span class="pal-lead">⌕</span>
          <input
            ref="inputEl"
            v-model="query"
            placeholder="jump to consumer, page, widget, file…"
            aria-label="command palette search"
          />
          <span class="pal-kbd">{{ query ? '↵' : 'Esc' }}</span>
        </div>

        <div class="pal-list">
          <template v-if="flat.length">
            <div v-for="g in visibleGroups" :key="g.key" class="pal-group">
              <div class="pal-group-h">
                <span>{{ g.label }}</span>
                <span v-if="g.key === 'pages' && currentConsumerId" class="pin">{{ currentConsumerId }} pinned</span>
              </div>
              <div
                v-for="row in g.rows"
                :key="row.uid"
                class="pal-row"
                :class="{ 'is-active': row.flatIdx === selectedIdx }"
                @mousedown.prevent="activate(row)"
                @mousemove="selectedIdx = row.flatIdx"
              >
                <span class="pal-icon">
                  <span v-if="row.kind === 'consumer'" class="dot" :style="{ background: row.accent }" />
                  <template v-else>{{ row.glyph }}</template>
                </span>
                <span class="pal-primary">
                  <span class="pal-name" v-html="row.nameHtml" />
                  <span class="pal-path" v-html="row.pathHtml" />
                </span>
                <span class="pal-tail">
                  <span v-for="(k, ki) in row.shortcut" :key="ki" class="pal-kbd">{{ k }}</span>
                  <span v-if="row.flatIdx === selectedIdx && !row.shortcut.length" class="pal-kbd">↵</span>
                </span>
              </div>
            </div>
          </template>
          <div v-else class="pal-empty">
            <span class="pe-note">// no match for "{{ query }}"</span>
            <span class="pe-hint">
              press <span class="kbd-i pal-kbd">⌘</span><span class="kbd-i pal-kbd">K</span> to clear
            </span>
          </div>
        </div>

        <div class="pal-foot">
          <span class="pf-item"><span class="pf-keys"><span class="pal-kbd">↑</span><span class="pal-kbd">↓</span></span><span>navigate</span></span>
          <span class="pf-sep">·</span>
          <span class="pf-item"><span class="pf-keys"><span class="pal-kbd">↵</span></span><span>open</span></span>
          <span class="pf-spacer" />
          <span class="pf-item"><span class="pf-keys"><span class="pal-kbd">Esc</span></span><span>close</span></span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePalette } from '../composables/usePalette.js'
import { useDrawer } from '../composables/useDrawer.js'
import { fetchConsumers, fetchConsumerManifest, type ConsumerSummary } from '../api.js'
import { chartColor } from '../utils/status.js'

type Kind = 'page' | 'consumer' | 'file' | 'command'

interface IndexEntry {
  kind: Kind
  name: string
  path: string
  glyph: string
  accent?: string
  consumer?: string
  to?: string
  run?: () => void
}

interface Row extends IndexEntry {
  uid: string
  flatIdx: number
  nameHtml: string
  pathHtml: string
  shortcut: string[]
}

const { isOpen, close } = usePalette()
const drawer = useDrawer()
const router = useRouter()
const route = useRoute()

const query = ref('')
const selectedIdx = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const index = ref<IndexEntry[]>([])
const built = ref(false)

const currentConsumerId = computed(() => route.params.consumerId as string | undefined)

const COMMANDS: IndexEntry[] = [
  { kind: 'command', name: 'Toggle sidebar', path: 'command', glyph: '⌘', run: () => drawer.toggle() },
  { kind: 'command', name: 'Copy current page URL', path: 'command', glyph: '⌘', run: copyUrl },
  { kind: 'command', name: 'Reload', path: 'command', glyph: '⌘', run: () => window.location.reload() },
]

function copyUrl(): void {
  if (navigator.clipboard && window.isSecureContext) {
    void navigator.clipboard.writeText(window.location.href)
  }
}

async function buildIndex(): Promise<void> {
  const entries: IndexEntry[] = []
  let consumers: ConsumerSummary[] = []
  try {
    consumers = await fetchConsumers()
  } catch {
    consumers = []
  }
  consumers.forEach((c, i) => {
    entries.push({
      kind: 'consumer',
      name: c.title,
      path: `${c.id} · ${c.dataSourceCount} sources`,
      glyph: '',
      accent: chartColor(i),
      consumer: c.id,
      to: `/${c.id}`,
    })
  })
  for (const c of consumers) {
    try {
      const m = await fetchConsumerManifest(c.id)
      const pages = (m.pages as { slug: string; title: string }[]) ?? []
      for (const p of pages) {
        entries.push({
          kind: 'page',
          name: p.title,
          path: `${c.id} / ${p.slug}`,
          glyph: '⌑',
          consumer: c.id,
          to: `/${c.id}/${p.slug}`,
        })
      }
      const sources = (m.dataSources as { ref?: string; id?: string }[]) ?? []
      for (const d of sources) {
        const ref = String(d.ref ?? d.id ?? '')
        if (!ref) continue
        entries.push({
          kind: 'file',
          name: ref,
          path: `~/.aideck/consumers/${c.id}/data/${ref}`,
          glyph: '≡',
          consumer: c.id,
          to: `/${c.id}`,
        })
      }
    } catch {
      // skip consumers whose manifest fails to load
    }
  }
  index.value = [...entries, ...COMMANDS]
  built.value = true
}

// ── fuzzy subsequence match with a tight-cluster span limit ──
interface Match { score: number; indices: number[] }
function fuzzy(queryStr: string, text: string): Match | null {
  if (!queryStr) return { score: 0, indices: [] }
  const q = queryStr.toLowerCase()
  const t = text.toLowerCase()
  const maxSpan = Math.max(q.length + 6, q.length * 4)
  let qi = 0
  const indices: number[] = []
  let first = -1
  let prev = -2
  let bonus = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (first === -1) first = i
      if (i === prev + 1) bonus += 5
      const boundary = i === 0 || /[\s/_\-.]/.test(t[i - 1])
      if (boundary) bonus += 6
      indices.push(i)
      prev = i
      qi++
    }
  }
  if (qi !== q.length) return null
  const span = indices[indices.length - 1] - indices[0] + 1
  if (span > maxSpan) return null
  return { score: first * 2 - bonus + span, indices }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function highlight(text: string, indices: number[]): string {
  if (!indices.length) return escapeHtml(text)
  const set = new Set(indices)
  let out = ''
  let buf = ''
  let inMark = false
  const flush = (): void => {
    if (!buf) return
    out += inMark ? `<mark>${escapeHtml(buf)}</mark>` : escapeHtml(buf)
    buf = ''
  }
  for (let i = 0; i < text.length; i++) {
    const m = set.has(i)
    if (m !== inMark) {
      flush()
      inMark = m
    }
    buf += text[i]
  }
  flush()
  return out
}

const GROUPS: { key: Kind; label: string; cap: (q: boolean) => number }[] = [
  { key: 'page', label: 'Pages', cap: (q) => (q ? 8 : 6) },
  { key: 'consumer', label: 'Consumers', cap: (q) => (q ? 8 : 4) },
  { key: 'file', label: 'Files', cap: (q) => (q ? 8 : 4) },
  { key: 'command', label: 'Commands', cap: (q) => (q ? 8 : 6) },
]

const visibleGroups = computed(() => {
  const q = query.value.trim()
  const hasQuery = q.length > 0
  let flatIdx = 0
  const out: { key: Kind; label: string; rows: Row[] }[] = []
  for (const g of GROUPS) {
    const matched: { e: IndexEntry; m: Match; nameIdx: number[] }[] = []
    for (const e of index.value) {
      if (e.kind !== g.key) continue
      if (!hasQuery) {
        matched.push({ e, m: { score: 0, indices: [] }, nameIdx: [] })
        continue
      }
      const nameM = fuzzy(q, e.name)
      const pathM = fuzzy(q, e.path)
      const best = nameM && (!pathM || nameM.score <= pathM.score) ? nameM : pathM
      if (!best) continue
      let score = best.score
      if (nameM && (!pathM || nameM.score <= pathM.score)) score -= 6
      if (e.consumer && e.consumer === currentConsumerId.value) score -= 8
      matched.push({ e, m: { score, indices: best.indices }, nameIdx: nameM?.indices ?? [] })
    }
    // current-consumer pages float to the top when idle
    if (!hasQuery && g.key === 'page') {
      matched.sort((a, b) => {
        const ac = a.e.consumer === currentConsumerId.value ? 0 : 1
        const bc = b.e.consumer === currentConsumerId.value ? 0 : 1
        return ac - bc
      })
    } else if (hasQuery) {
      matched.sort((a, b) => a.m.score - b.m.score)
    }
    const rows: Row[] = matched.slice(0, g.cap(hasQuery)).map((x, i) => {
      const pathIdx = hasQuery ? fuzzy(q, x.e.path)?.indices ?? [] : []
      return {
        ...x.e,
        uid: `${x.e.kind}:${x.e.to ?? x.e.name}:${i}`,
        flatIdx: flatIdx++,
        nameHtml: highlight(x.e.name, x.nameIdx),
        pathHtml: highlight(x.e.path, pathIdx),
        shortcut: g.key === 'page' && i < 9 ? ['⌘', String(i + 1)] : [],
      }
    })
    if (rows.length) out.push({ key: g.key, label: g.label, rows })
  }
  return out
})

const flat = computed<Row[]>(() => visibleGroups.value.flatMap((g) => g.rows))

function activate(row: Row): void {
  if (row.run) row.run()
  else if (row.to) void router.push(row.to)
  close()
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIdx.value = Math.min(flat.value.length - 1, selectedIdx.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIdx.value = Math.max(0, selectedIdx.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const row = flat.value[selectedIdx.value]
    if (row) activate(row)
  } else if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
    e.preventDefault()
    const pages = flat.value.filter((r) => r.kind === 'page')
    const target = pages[Number(e.key) - 1]
    if (target) activate(target)
  }
}

watch(isOpen, async (open) => {
  if (!open) return
  query.value = ''
  selectedIdx.value = 0
  if (!built.value) await buildIndex()
  await nextTick()
  inputEl.value?.focus()
})

watch(query, () => {
  selectedIdx.value = 0
})
</script>
