<template>
  <WidgetFrame :title="title" :icon="icon" :meta="meta" body-class="tight">
    <div class="searchw">
      <span class="s-ico" aria-hidden="true">⌕</span>
      <input
        v-model="query"
        :placeholder="placeholder"
        type="search"
        aria-label="Search"
      />
      <button v-if="query" type="button" class="s-clear" @click="query = ''">✕</button>
    </div>

    <div v-if="chips.length > 0" class="filter-chips">
      <span
        v-for="(chip, i) in chips"
        :key="i"
        class="filter-chip"
        :class="chip.tone || 'info'"
      >
        <span class="fc-k">{{ chip.k }}:</span>
        <span>{{ chip.v }}</span>
        <span class="fc-x" role="button" @click="removeChip(i)">×</span>
      </span>
    </div>

    <div v-if="instant" class="search-results">
      <div v-if="filtered.length === 0" class="search-empty">// no results for "{{ query }}"</div>
      <div v-else class="lst">
        <div v-for="(row, i) in filtered" :key="i" class="lst-row">
          <span v-if="row.lead" class="l-lead">{{ row.lead }}</span>
          <span class="l-title">{{ row.title }}</span>
        </div>
      </div>
    </div>
  </WidgetFrame>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WidgetFrame from '../WidgetFrame.vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

interface Chip { k: string; v: string; tone?: string }
interface ResultRow { lead?: string; title: string }

const title = computed(() => props.config.title as string | undefined)
const icon = computed(() => (props.config.icon as string | undefined) ?? '⌕')
const placeholder = computed(() => String(props.config.placeholder ?? 'Search…'))
const filterField = computed(() => props.config.field as string | undefined)
const instant = computed(() => props.config.instant !== false)

const query = ref('')

const chips = ref<Chip[]>(
  Array.isArray(props.config.chips)
    ? (props.config.chips as Record<string, unknown>[]).map((c) => ({
        k: String(c.k ?? c.key ?? ''),
        v: String(c.v ?? c.value ?? ''),
        tone: c.tone != null ? String(c.tone) : undefined,
      }))
    : [],
)

function removeChip(i: number) {
  chips.value = chips.value.filter((_, j) => j !== i)
}

function matches(r: Record<string, unknown>, q: string): boolean {
  if (filterField.value) return String(r[filterField.value] ?? '').toLowerCase().includes(q)
  return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
}

const filtered = computed<ResultRow[]>(() => {
  const q = query.value.toLowerCase()
  const rows = q ? props.source.filter((r) => matches(r, q)) : props.source
  return rows.map((r) => ({
    lead: r.id != null ? String(r.id) : r.key != null ? String(r.key) : undefined,
    title: String(r.title ?? r.name ?? r.label ?? Object.values(r)[0] ?? ''),
  }))
})

const meta = computed(() => {
  if (props.config.meta) return String(props.config.meta)
  if (!instant.value) return undefined
  return `${filtered.value.length} of ${props.source.length}`
})
</script>
