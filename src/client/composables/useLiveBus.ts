import { ref } from 'vue'

// Single shared SSE connection for the whole app. Widgets and the status bar
// subscribe to the same stream instead of each opening its own EventSource.

export interface LiveEvent {
  kind: string
  consumer?: string
  payload?: unknown
}

const lastEvent = ref<LiveEvent | null>(null)
const connected = ref(false)
let source: EventSource | null = null

function ensure(): void {
  if (source || typeof EventSource === 'undefined') return // SSR / test (jsdom has no EventSource)
  source = new EventSource('/sse')
  source.onopen = () => {
    connected.value = true
  }
  source.onmessage = (e) => {
    try {
      lastEvent.value = JSON.parse(e.data) as LiveEvent
    } catch {
      // ignore malformed event payloads
    }
  }
  source.onerror = () => {
    connected.value = false
  }
}

export function useLiveBus() {
  ensure()
  return { lastEvent, connected }
}
