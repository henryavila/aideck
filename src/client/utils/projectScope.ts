import type { ProjectSummary } from '../api.js'
import type { PageMeta } from '../composables/useActiveManifest.js'

interface ProjectScopeInput {
  queryProject?: unknown
  pathProjectId?: unknown
  routeParam?: unknown
  pageSlug?: string
  landingSlug?: string
  pages: Pick<PageMeta, 'slug' | 'showInNav'>[]
  projects: Pick<ProjectSummary, 'projectId'>[]
}

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function isScopedPage(input: ProjectScopeInput): boolean {
  if (!input.pageSlug || input.pageSlug === input.landingSlug) return false
  return input.pages.some((page) => page.slug === input.pageSlug && page.showInNav !== false)
}

function isRegisteredProject(input: ProjectScopeInput, projectId: string): boolean {
  return input.projects.length === 0 || input.projects.some((project) => project.projectId === projectId)
}

export function resolveSelectedProjectId(input: ProjectScopeInput): string | undefined {
  const queryProject = stringParam(input.queryProject)
  if (queryProject && isRegisteredProject(input, queryProject)) return queryProject

  const pathProjectId = stringParam(input.pathProjectId)
  if (pathProjectId && isRegisteredProject(input, pathProjectId)) return pathProjectId

  if (!isScopedPage(input)) return undefined

  const routeParam = stringParam(input.routeParam)
  if (routeParam && input.projects.some((project) => project.projectId === routeParam)) {
    return routeParam
  }

  return input.projects[0]?.projectId
}
