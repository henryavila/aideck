<template>
  <div class="catalog">
    <!-- TOOLBAR -->
    <div class="cat-toolbar">
      <div class="cat-search">
        <span class="cs-ico" aria-hidden="true">⌕</span>
        <input
          v-model="query"
          type="search"
          placeholder="search catalog…"
          aria-label="Search catalog"
        />
        <button v-if="query" type="button" class="cs-clear" @click="query = ''">✕</button>
      </div>
      <div v-if="allFacets.length > 0" class="cat-facets">
        <button
          v-for="f in allFacets"
          :key="f"
          type="button"
          class="facet-chip"
          :class="{ active: activeFacets.has(f) }"
          @click="toggleFacet(f)"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <!-- MASTER / DETAIL -->
    <div class="cat-grid">
      <!-- MASTER -->
      <div class="cat-master">
        <div v-if="filtered.length === 0" class="cat-empty">// nothing — clear the filter</div>
        <button
          v-for="rec in filtered"
          :key="rec.id"
          type="button"
          class="master-row"
          :class="{ sel: rec.id === selectedId }"
          @click="selectedId = rec.id"
        >
          <span class="mr-icon">{{ rec.icon }}</span>
          <span class="mr-id">{{ rec.id }}</span>
          <span class="mr-line">{{ rec.oneLiner }}</span>
          <span v-if="rec.subCount > 0" class="mr-badge">{{ rec.subCount }}</span>
        </button>
      </div>

      <!-- DETAIL -->
      <div class="cat-detail">
        <div v-if="!selected" class="cat-empty">// no record selected</div>
        <template v-else>
          <!-- header -->
          <div class="dt-header">
            <span class="dh-icon">{{ selected.icon }}</span>
            <span class="dh-id">{{ selected.id }}</span>
            <span v-if="selected.facets.length > 0" class="dh-facets">
              {{ selected.facets.join(' · ') }}
            </span>
          </div>

          <!-- summary -->
          <section v-if="selected.summary" class="dt-section">
            <div class="sec-head">summary</div>
            <p class="sec-summary">{{ selected.summary }}</p>
          </section>

          <!-- examples -->
          <section v-if="selected.examples.length > 0" class="dt-section">
            <div class="sec-head">examples</div>
            <pre v-for="(ex, i) in selected.examples" :key="i" class="code-block">{{ ex }}</pre>
          </section>

          <!-- pros / cons -->
          <section
            v-if="selected.pros.length > 0 || selected.cons.length > 0"
            class="dt-section"
          >
            <div class="sec-head">pros · cons</div>
            <div class="proscons">
              <ul class="pc-col">
                <li v-for="(p, i) in selected.pros" :key="i" class="pc-item">
                  <span class="pc-mark ok">✓</span>{{ p }}
                </li>
              </ul>
              <ul class="pc-col">
                <li v-for="(c, i) in selected.cons" :key="i" class="pc-item">
                  <span class="pc-mark no">×</span>{{ c }}
                </li>
              </ul>
            </div>
          </section>

          <!-- sub-items (grouped) -->
          <section v-if="selected.subItems.length > 0" class="dt-section">
            <div class="sec-head">items</div>
            <div v-for="grp in subItemGroups" :key="grp.group" class="sub-group">
              <div v-if="grp.group" class="sg-head">{{ grp.group }}</div>
              <div v-for="(it, i) in grp.items" :key="i" class="sub-row">
                <span class="sub-name">{{ it.name }}</span>
                <span v-if="it.description" class="sub-desc">— {{ it.description }}</span>
              </div>
            </div>
          </section>

          <!-- fields table -->
          <section v-if="selected.fields.length > 0" class="dt-section">
            <div class="sec-head">fields</div>
            <table class="field-table">
              <thead>
                <tr>
                  <th>arg</th>
                  <th>kind</th>
                  <th>req</th>
                  <th>description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(fld, i) in selected.fields" :key="i">
                  <td class="ft-name">{{ fld.name }}</td>
                  <td class="ft-kind">{{ fld.kind }}</td>
                  <td class="ft-req" :class="{ on: fld.required }">{{ fld.required ? '✓' : '·' }}</td>
                  <td class="ft-desc">{{ fld.description }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- deps / outputs -->
          <section
            v-if="hasDepsSection"
            class="dt-section"
          >
            <div class="sec-head">deps · outputs</div>
            <div class="chip-row">
              <template v-if="selected.deps.length > 0">
                <span v-for="(d, i) in selected.deps" :key="'d' + i" class="io-chip dep">↳ {{ d }}</span>
              </template>
              <span v-else class="io-chip none">none</span>
              <span v-for="(o, i) in selected.outputs" :key="'o' + i" class="io-chip out">→ {{ o }}</span>
            </div>
          </section>

          <!-- refs (navigable graph) -->
          <section v-if="selected.refs.length > 0" class="dt-section">
            <div class="sec-head">refs</div>
            <div class="chip-row">
              <button
                v-for="(r, i) in selected.refs"
                :key="i"
                type="button"
                class="ref-chip"
                @click="navigateRef(r)"
              >
                {{ r }}
              </button>
            </div>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
  slots?: Record<string, unknown[]>
  depth?: number
}>()

// --- coercion helpers (no `any`) ---
function str(v: unknown): string {
  return v == null ? '' : String(v)
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str) : []
}
function recArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? (v.filter((x) => x != null && typeof x === 'object') as Record<string, unknown>[])
    : []
}
function cfg(key: string, def: string): string {
  return str(props.config[key] || def)
}

// --- config field names (agnostic, neutral defaults) ---
const idField = cfg('idField', 'id')
const iconField = cfg('iconField', 'icon')
const oneLinerField = cfg('oneLinerField', 'oneLiner')
const summaryField = cfg('summaryField', 'summary')
const facetsField = cfg('facetsField', 'facets')
const examplesField = cfg('examplesField', 'examples')
const prosField = cfg('prosField', 'pros')
const consField = cfg('consField', 'cons')
const subItemsField = cfg('subItemsField', 'subItems')
const subItemNameField = cfg('subItemNameField', 'name')
const subItemDescField = cfg('subItemDescField', 'description')
const subItemGroupField = cfg('subItemGroupField', 'group')
const fieldsField = cfg('fieldsField', 'fields')
const depsField = cfg('depsField', 'deps')
const outputsField = cfg('outputsField', 'outputs')
const refsField = cfg('refsField', 'refs')

interface SubItem {
  name: string
  description: string
  group: string
}
interface FieldRow {
  name: string
  kind: string
  required: boolean
  description: string
}
interface CatalogRecord {
  id: string
  icon: string
  oneLiner: string
  summary: string
  facets: string[]
  examples: string[]
  pros: string[]
  cons: string[]
  subItems: SubItem[]
  fields: FieldRow[]
  deps: string[]
  outputs: string[]
  refs: string[]
  subCount: number
  haystack: string
}

function toRecord(r: Record<string, unknown>): CatalogRecord {
  const facets = strArray(r[facetsField])
  const examples = strArray(r[examplesField])
  const pros = strArray(r[prosField])
  const cons = strArray(r[consField])
  const refs = strArray(r[refsField])
  const deps = strArray(r[depsField])
  const outputs = strArray(r[outputsField])
  const summary = str(r[summaryField])
  const oneLiner = str(r[oneLinerField])
  const id = str(r[idField])
  const subItems: SubItem[] = recArray(r[subItemsField]).map((s) => ({
    name: str(s[subItemNameField]),
    description: str(s[subItemDescField]),
    group: str(s[subItemGroupField]),
  }))
  const fields: FieldRow[] = recArray(r[fieldsField]).map((f) => ({
    name: str(f.name),
    kind: str(f.kind),
    required: f.required === true,
    description: str(f.description),
  }))
  return {
    id,
    icon: str(r[iconField]),
    oneLiner,
    summary,
    facets,
    examples,
    pros,
    cons,
    subItems,
    fields,
    deps,
    outputs,
    refs,
    subCount: subItems.length,
    haystack: [id, oneLiner, summary, ...facets].join(' ').toLowerCase(),
  }
}

const records = computed<CatalogRecord[]>(() => props.source.map(toRecord))

const allFacets = computed<string[]>(() => {
  const seen = new Set<string>()
  for (const rec of records.value) for (const f of rec.facets) seen.add(f)
  return [...seen]
})

// --- local state ---
const selectedId = ref<string>(records.value[0]?.id ?? '')
const query = ref('')
const activeFacets = ref<Set<string>>(new Set())

function toggleFacet(f: string): void {
  const next = new Set(activeFacets.value)
  if (next.has(f)) next.delete(f)
  else next.add(f)
  activeFacets.value = next
}

const filtered = computed<CatalogRecord[]>(() => {
  const q = query.value.trim().toLowerCase()
  const facets = activeFacets.value
  return records.value.filter((rec) => {
    if (q && !rec.haystack.includes(q)) return false
    for (const f of facets) if (!rec.facets.includes(f)) return false
    return true
  })
})

const selected = computed<CatalogRecord | undefined>(() =>
  records.value.find((rec) => rec.id === selectedId.value),
)

const subItemGroups = computed(() => {
  const rec = selected.value
  if (!rec) return []
  const order: string[] = []
  const map = new Map<string, SubItem[]>()
  for (const it of rec.subItems) {
    const g = it.group
    if (!map.has(g)) {
      map.set(g, [])
      order.push(g)
    }
    map.get(g)!.push(it)
  }
  return order.map((group) => ({ group, items: map.get(group)! }))
})

const hasDepsSection = computed(() => {
  const rec = selected.value
  if (!rec) return false
  return rec.deps.length > 0 || rec.outputs.length > 0
})

function navigateRef(refId: string): void {
  const target = records.value.find((rec) => rec.id === refId)
  if (!target) return
  query.value = ''
  activeFacets.value = new Set()
  selectedId.value = target.id
}
</script>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface);
  color: var(--fg-default);
  font-family: var(--font-sans);
}

/* ---- toolbar ---- */
.cat-toolbar {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-default);
}
.cat-search {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--bg-sunken);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
}
.cs-ico {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--fg-subtle);
  font-size: 13px;
}
.cat-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fg-default);
  font-family: var(--font-sans);
  font-size: 13px;
}
.cat-search input::placeholder {
  color: var(--fg-subtle);
}
.cs-clear {
  background: none;
  border: none;
  color: var(--fg-subtle);
  cursor: pointer;
  font-size: 11px;
  padding: 0 var(--space-2);
}
.cs-clear:hover {
  color: var(--fg-default);
}
.cat-facets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.facet-chip {
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  cursor: pointer;
  color: var(--fg-muted);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}
.facet-chip:hover {
  color: var(--fg-default);
}
.facet-chip.active {
  color: var(--status-info);
  background: var(--status-info-bg);
  border-color: var(--status-info-line);
}

/* ---- master / detail grid ---- */
.cat-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
}
.cat-master {
  overflow-y: auto;
  border-right: 1px solid var(--border-default);
  padding: var(--space-3) 0;
}
.cat-detail {
  overflow-y: auto;
  padding: var(--space-6) var(--space-8);
}

.cat-empty {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  color: var(--fg-subtle);
  padding: var(--space-6);
}

/* ---- master rows ---- */
.master-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  padding: var(--space-3) var(--space-5);
  cursor: pointer;
  color: var(--fg-default);
}
.master-row:hover {
  background: var(--bg-elevated);
}
.master-row.sel {
  background: var(--bg-overlay);
  box-shadow: inset 2px 0 0 var(--status-info);
}
.mr-icon {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--chart-1);
  font-size: 12px;
}
.mr-id {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  color: var(--fg-default);
}
.mr-line {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mr-badge {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 9px;
  color: var(--fg-subtle);
  background: var(--bg-sunken);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0 4px;
  line-height: 14px;
}

/* ---- detail ---- */
.dt-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding-bottom: var(--space-5);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}
.dh-icon {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--chart-1);
  font-size: 15px;
}
.dh-id {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 14px;
  color: var(--fg-default);
}
.dh-facets {
  margin-left: auto;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  color: var(--fg-subtle);
}

.dt-section {
  margin-bottom: var(--space-8);
}
.sec-head {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
  margin-bottom: 7px;
}
.sec-summary {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.55;
  color: var(--fg-default);
}

/* ---- code blocks ---- */
.code-block {
  margin: 0 0 var(--space-3) 0;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  color: var(--fg-default);
  background: var(--bg-sunken);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  white-space: pre;
  overflow-x: auto;
}
.code-block:last-child {
  margin-bottom: 0;
}

/* ---- pros / cons ---- */
.proscons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}
.pc-col {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.pc-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 1.45;
  color: var(--fg-default);
}
.pc-mark {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  flex: none;
}
.pc-mark.ok {
  color: var(--status-success);
}
.pc-mark.no {
  color: var(--status-error);
}

/* ---- sub-items ---- */
.sub-group {
  margin-bottom: var(--space-5);
}
.sub-group:last-child {
  margin-bottom: 0;
}
.sg-head {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
  margin-bottom: var(--space-3);
}
.sub-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: 12px;
  line-height: 1.45;
}
.sub-name {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 11px;
  color: var(--status-info);
  flex: none;
}
.sub-desc {
  font-family: var(--font-sans);
  color: var(--fg-muted);
}

/* ---- fields table ---- */
.field-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.field-table th {
  text-align: left;
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-subtle);
  font-weight: 400;
  padding: var(--space-2) var(--space-4) var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.field-table td {
  padding: var(--space-3) var(--space-4) var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}
.field-table tr:last-child td {
  border-bottom: none;
}
.ft-name {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--fg-default);
  white-space: nowrap;
}
.ft-kind {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--fg-muted);
  white-space: nowrap;
}
.ft-req {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  color: var(--fg-subtle);
  text-align: center;
}
.ft-req.on {
  color: var(--status-success);
}
.ft-desc {
  font-family: var(--font-sans);
  color: var(--fg-muted);
  width: 100%;
}

/* ---- chips: deps / outputs ---- */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.io-chip {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  border-radius: var(--radius-pill);
  padding: 3px 9px;
  border: 1px solid var(--border-default);
  background: var(--bg-elevated);
}
.io-chip.dep {
  color: var(--fg-muted);
}
.io-chip.out {
  color: var(--status-info);
  background: var(--status-info-bg);
  border-color: var(--status-info-line);
}
.io-chip.none {
  color: var(--fg-subtle);
  opacity: 0.6;
}

/* ---- refs (navigable) ---- */
.ref-chip {
  font-family: var(--font-mono);
  font-feature-settings: 'calt' 0;
  font-size: 10px;
  color: var(--accent-link);
  background: color-mix(in srgb, var(--status-info) 8%, var(--bg-elevated));
  border: 1px solid var(--status-info-line);
  border-radius: var(--radius-pill);
  padding: 3px 9px;
  cursor: pointer;
}
.ref-chip:hover {
  background: var(--status-info-bg);
}
</style>
