import { ref, watch, type Ref } from 'vue'
import { fetchDataSource } from '../api.js'

export interface DataSourceLoadError {
  code?: string
  message: string
  suggestion?: string
}

function toLoadError(error: unknown): DataSourceLoadError {
  const err = error as { code?: unknown; message?: unknown; suggestion?: unknown }
  return {
    ...(typeof err?.code === 'string' ? { code: err.code } : {}),
    message: typeof err?.message === 'string' ? err.message : 'Failed to load data source.',
    ...(typeof err?.suggestion === 'string' ? { suggestion: err.suggestion } : {}),
  }
}

export function useDataSource(consumerId: Ref<string>, dataSourceId: Ref<string>) {
  const records = ref<Record<string, unknown>[]>([])
  const loading = ref(false)
  const error = ref<DataSourceLoadError | null>(null)

  let loadSeq = 0

  async function load() {
    const seq = ++loadSeq
    loading.value = true
    try {
      const data = await fetchDataSource(consumerId.value, dataSourceId.value)
      if (seq !== loadSeq) return
      records.value = data
      error.value = null
    } catch (e) {
      if (seq !== loadSeq) return
      error.value = toLoadError(e)
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  watch([consumerId, dataSourceId], () => void load(), { immediate: true })

  return { records, loading, error, reload: load }
}
