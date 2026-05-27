<template>
  <div class="table-widget">
    <div v-if="source.length === 0" class="empty">No data</div>
    <table v-else>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in source"
          :key="i"
          :class="{ 'table-row-link': !!linkTo }"
          :role="linkTo ? 'link' : undefined"
          :tabindex="linkTo ? 0 : undefined"
          @click="linkTo && navigate()"
          @keydown.enter="linkTo && navigate()"
        >
          <td v-for="col in columns" :key="col">{{ formatCell(row[col]) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
  consumerId?: string
}>()

const router = useRouter()
const linkTo = computed(() => props.config.linkTo as string | undefined)

function navigate(): void {
  if (linkTo.value && props.consumerId) {
    router.push('/' + props.consumerId + '/' + linkTo.value)
  }
}

const SKIP_KEYS = new Set(['_body', '_file'])

const columns = computed<string[]>(() => {
  if (Array.isArray(props.config.columns) && props.config.columns.length > 0) {
    return props.config.columns as string[]
  }
  if (props.source.length === 0) return []
  return Object.keys(props.source[0]).filter(k => !SKIP_KEYS.has(k))
})

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
</script>

<style scoped>
.table-widget {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.empty {
  padding: var(--spacing-md);
  color: var(--color-text-muted);
  text-align: center;
  font-size: var(--font-size-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

th {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-weight: 600;
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

td {
  color: var(--color-text-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border-muted);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tbody tr:nth-child(even) td {
  background: var(--color-bg-tertiary);
}

tbody tr:hover td {
  background: var(--color-bg-hover);
}

.table-row-link {
  cursor: pointer;
}

.table-row-link:focus-visible td {
  outline: 2px solid var(--color-accent, #4f8ff7);
  outline-offset: -2px;
}
</style>
