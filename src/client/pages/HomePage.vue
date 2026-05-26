<template>
  <div class="home">
    <header class="home-header">
      <h1>aiDeck</h1>
      <p class="subtitle">{{ consumers.length }} consumer{{ consumers.length !== 1 ? 's' : '' }} registered</p>
    </header>

    <div v-if="loading" class="loading">Loading consumers...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="consumers.length === 0" class="empty">
      No consumers registered. Run <code>aideck init-consumer</code> to create one.
    </div>

    <div v-else class="consumer-grid">
      <router-link
        v-for="c in consumers"
        :key="c.id"
        :to="`/${c.id}`"
        class="consumer-card"
      >
        <div class="card-icon" v-if="c.icon">{{ c.icon }}</div>
        <h2 class="card-title">{{ c.title }}</h2>
        <div class="card-meta">
          <span>{{ c.dataSourceCount }} data source{{ c.dataSourceCount !== 1 ? 's' : '' }}</span>
          <span>{{ c.pageCount }} page{{ c.pageCount !== 1 ? 's' : '' }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConsumers } from '../composables/useConsumers.js'
const { consumers, loading, error } = useConsumers()
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.home-header {
  margin-bottom: var(--spacing-xl);
}

.home-header h1 {
  font-size: var(--font-size-2xl);
  font-weight: 600;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.consumer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.consumer-card {
  display: block;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: border-color 0.15s, background 0.15s;
  color: inherit;
  text-decoration: none;
}

.consumer-card:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-tertiary);
  text-decoration: none;
}

.card-icon {
  font-size: 1.5rem;
  margin-bottom: var(--spacing-sm);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.card-meta {
  display: flex;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.loading, .error, .empty {
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--spacing-xl);
}

.error {
  color: var(--color-danger);
}

code {
  font-family: var(--font-mono);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
</style>
