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

function handleEvent(e: MessageEvent): void {
  try {
    lastEvent.value = JSON.parse(e.data) as LiveEvent
  } catch {
    // ignore malformed event payloads
  }
}

function ensure(): void {
  if (source || typeof EventSource === 'undefined') return // SSR / test (jsdom has no EventSource)
  source = new EventSource('/sse')
  source.onopen = () => {
    connected.value = true
  }
  source.onmessage = handleEvent
  // The server names each SSE message after its kind (`event: data_changed`),
  // so `onmessage` only sees unnamed messages. Subscribe to the kinds that
  // carry data; `error` is deliberately absent because EventSource fires it on
  // connection failure (no `data`), and `health-tick` must not force a refetch.
  source.addEventListener('data_changed', handleEvent)
  source.addEventListener('consumer_manifest_changed', handleEvent)
  source.onerror = () => {
    connected.value = false
  }
}

export function useLiveBus() {
  ensure()
  return { lastEvent, connected }
}
