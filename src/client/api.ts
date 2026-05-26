const BASE = ''  // Vite proxy handles /api → backend

export interface ConsumerSummary {
  id: string
  title: string
  icon?: string
  dataSourceCount: number
  pageCount: number
}

export async function fetchConsumers(): Promise<ConsumerSummary[]> {
  const res = await fetch(`${BASE}/api/consumers`)
  const data = await res.json()
  return data.consumers ?? []
}

export async function fetchConsumerManifest(consumerId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/api/consumers/${consumerId}`)
  if (!res.ok) throw new Error(`Consumer not found: ${consumerId}`)
  return res.json()
}

export async function fetchDataSource(consumerId: string, dataSourceId: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/api/consumers/${consumerId}/data/${dataSourceId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
}
