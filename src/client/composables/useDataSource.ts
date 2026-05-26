import { ref, watch, type Ref } from 'vue'
import { fetchDataSource } from '../api.js'

export function useDataSource(consumerId: Ref<string>, dataSourceId: Ref<string>) {
  const records = ref<Record<string, unknown>[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      records.value = await fetchDataSource(consumerId.value, dataSourceId.value)
    } finally {
      loading.value = false
    }
  }

  watch([consumerId, dataSourceId], load, { immediate: true })

  return { records, loading, reload: load }
}
