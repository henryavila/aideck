import { ref, watch, type Ref } from 'vue'
import { fetchProjects, type ProjectSummary } from '../api.js'

/**
 * Registered projects (project-registry) for the active consumer, refetched when
 * the consumer changes. Gated by `enabled` so the project-centric shell
 * (nav.style:'projects') is the only thing that pays for the fetch — a tabs/
 * sidebar consumer never hits the endpoint. Generic: the registry is an aiDeck
 * primitive, independent of any consumer's domain.
 */
export function useProjects(consumerId: Ref<string | undefined>, enabled: Ref<boolean>) {
  const projects = ref<ProjectSummary[]>([])

  watch(
    [consumerId, enabled] as const,
    async ([id, on]) => {
      if (!id || !on) {
        projects.value = []
        return
      }
      projects.value = await fetchProjects(id)
    },
    { immediate: true }
  )

  return { projects }
}
