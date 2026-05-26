import { ref, onMounted } from 'vue'
import { fetchConsumers, type ConsumerSummary } from '../api.js'

export function useConsumers() {
  const consumers = ref<ConsumerSummary[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  onMounted(async () => {
    try {
      consumers.value = await fetchConsumers()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  })

  return { consumers, loading, error }
}
