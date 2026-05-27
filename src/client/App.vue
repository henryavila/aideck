<template>
  <div class="demo-banner" v-if="isDemo">
    DEMO MODE — seeded fixtures, not your data.
  </div>
  <router-view />
</template>

<script setup lang="ts">
import { useDemoMode } from './composables/useDemoMode.js'
const { isDemo } = useDemoMode()
</script>

<style scoped>
.demo-banner {
  background: var(--color-warning);
  color: var(--color-bg-primary);
  text-align: center;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: 0.02em;
  border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 80%, black);
}
</style>
