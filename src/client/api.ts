const BASE = ''  // Vite proxy handles /api → backend

export interface HealthResponse {
  demo: boolean
  status: string
  version: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/api/health`)
  const data = await res.json()
  return { demo: data.demo ?? false, status: data.status, version: data.version }
}

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
  const data = await res.json()
  // The API wraps the manifest as { manifest: {...} }; unwrap it. Fall back to
  // the raw body if already unwrapped (keeps mocked unit tests working).
  return (data.manifest ?? data) as Record<string, unknown>
}

export interface ProjectSummary {
  projectId: string
  rootDir: string
  registeredAt?: string
}

/** Registered projects available to a consumer that has root:'project' dataSources. */
export async function fetchProjects(consumerId: string): Promise<ProjectSummary[]> {
  const res = await fetch(`${BASE}/api/consumers/${consumerId}/projects`)
  if (!res.ok) return []
  const data = await res.json()
  return data.projects ?? []
}

export async function fetchDataSource(
  consumerId: string,
  dataSourceId: string,
  projectId?: string
): Promise<Record<string, unknown>[]> {
  // When a projectId is selected, read the project-scoped endpoint (root:'project'
  // dataSources resolve against the registered repo's tree). Otherwise the
  // consumer-dir endpoint.
  const url = projectId
    ? `${BASE}/api/consumers/${consumerId}/projects/${projectId}/data/${dataSourceId}`
    : `${BASE}/api/consumers/${consumerId}/data/${dataSourceId}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
}
