import { ref, onMounted } from 'vue'
import { fetchHealth } from '../api.js'

const isDemo = ref(false)
const loaded = ref(false)

export function useDemoMode() {
  onMounted(async () => {
    if (loaded.value) return
    try {
      const health = await fetchHealth()
      isDemo.value = health.demo
    } catch {
      // Health fetch failure is non-fatal for the banner
    } finally {
      loaded.value = true
    }
  })

  return { isDemo }
}
