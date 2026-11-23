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

export interface DataSourceErrorOptions {
  code?: string
  suggestion?: string
}

/** A failed data-source read, carrying the server's ErrorResponse fields. */
export class DataSourceError extends Error {
  readonly code?: string
  readonly suggestion?: string

  constructor(message: string, options: DataSourceErrorOptions = {}) {
    super(message)
    this.name = 'DataSourceError'
    this.code = options.code
    this.suggestion = options.suggestion
  }
}

async function readDataSourceError(res: Response): Promise<DataSourceError> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    return new DataSourceError(`Failed to load data source (HTTP ${res.status}).`)
  }

  const error =
    body && typeof body === 'object' && 'error' in body
      ? (body as { error?: unknown }).error
      : undefined
  if (!error || typeof error !== 'object') {
    return new DataSourceError(`Failed to load data source (HTTP ${res.status}).`)
  }

  const { code, message, suggestion } = error as Record<string, unknown>
  return new DataSourceError(
    typeof message === 'string' ? message : `Failed to load data source (HTTP ${res.status}).`,
    {
      code: typeof code === 'string' ? code : undefined,
      suggestion: typeof suggestion === 'string' ? suggestion : undefined,
    },
  )
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
  if (!res.ok) throw await readDataSourceError(res)
  const data = await res.json()
  return data.records ?? []
}

/**
 * Read a project-scoped dataSource across ALL registered projects at once. Each
 * record is tagged with its `projectId`. Powers cross-project overview pages
 * (a Panorama) — the opposite of the per-project scoped read above.
 */
export async function fetchDataSourceAllProjects(
  consumerId: string,
  dataSourceId: string
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/api/consumers/${consumerId}/all-projects/data/${dataSourceId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.records ?? []
}
