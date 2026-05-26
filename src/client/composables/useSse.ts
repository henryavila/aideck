import { ref, onMounted, onUnmounted } from 'vue'

export interface SseEvent {
  kind: string
  consumer?: string
  payload?: unknown
}

export function useSse(consumerFilter?: string) {
  const lastEvent = ref<SseEvent | null>(null)
  const connected = ref(false)
  let source: EventSource | null = null

  onMounted(() => {
    const url = consumerFilter ? `/sse?consumer=${consumerFilter}` : '/sse'
    source = new EventSource(url)
    source.onopen = () => { connected.value = true }
    source.onmessage = (e) => {
      try { lastEvent.value = JSON.parse(e.data) } catch {}
    }
    source.onerror = () => { connected.value = false }
  })

  onUnmounted(() => {
    source?.close()
    source = null
  })

  return { lastEvent, connected }
}
