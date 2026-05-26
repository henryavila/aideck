<template>
  <nav class="breadcrumb-widget" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li v-for="(item, i) in items" :key="i" class="breadcrumb-item">
        <span v-if="i > 0" class="breadcrumb-sep" aria-hidden="true">›</span>
        <a v-if="item.href" :href="item.href" class="breadcrumb-link">{{ item.label }}</a>
        <span v-else class="breadcrumb-current">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: Record<string, unknown>[]
  config: Record<string, unknown>
}>()

interface BreadcrumbItem { label: string; href?: string }

const items = computed<BreadcrumbItem[]>(() => {
  const cfgItems = props.config.items
  if (Array.isArray(cfgItems)) return cfgItems as BreadcrumbItem[]
  return props.source.map(r => ({
    label: String(r.label ?? r.name ?? ''),
    href: r.href ? String(r.href) : undefined,
  }))
})
</script>

<style scoped>
.breadcrumb-widget {
  padding: var(--spacing-sm) var(--spacing-md);
  height: 100%;
  display: flex;
  align-items: center;
}

.breadcrumb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  gap: 4px;
}

.breadcrumb-sep {
  color: var(--color-text-muted);
}

.breadcrumb-link {
  color: var(--color-accent);
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-current {
  color: var(--color-text-primary);
  font-weight: 500;
}
</style>
