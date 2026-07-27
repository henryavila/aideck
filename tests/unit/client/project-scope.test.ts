import { describe, expect, it } from 'vitest'
import { resolveSelectedProjectId } from '../../../src/client/utils/projectScope.js'

const pages = [
  { slug: 'landing', showInNav: true },
  { slug: 'work', showInNav: true },
  { slug: 'detail', showInNav: true },
  { slug: 'hidden', showInNav: false }
]

const projects = [
  { projectId: 'web' },
  { projectId: 'api' },
  { projectId: 'mobile' }
]

describe('resolveSelectedProjectId', () => {
  it('prefers the explicit query scope', () => {
    expect(
      resolveSelectedProjectId({
        queryProject: 'mobile',
        pathProjectId: 'api',
        routeParam: 'web',
        pageSlug: 'work',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBe('mobile')
  })

  it('ignores a stale query scope that is no longer registered', () => {
    expect(
      resolveSelectedProjectId({
        queryProject: 'plan-dependencies',
        pageSlug: 'work',
        landingSlug: 'landing',
        pages,
        projects: [{ projectId: 'atomic-skills' }]
      })
    ).toBe('atomic-skills')
  })

  it('uses the named path scope when there is no query scope', () => {
    expect(
      resolveSelectedProjectId({
        pathProjectId: 'api',
        routeParam: 'web',
        pageSlug: 'work',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBe('api')
  })

  it('uses a generic route segment when it matches a registered project on a scoped page', () => {
    expect(
      resolveSelectedProjectId({
        routeParam: 'api',
        pageSlug: 'work',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBe('api')
  })

  it('falls back to the first registered project on a scoped page without an explicit scope', () => {
    expect(
      resolveSelectedProjectId({
        pageSlug: 'detail',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBe('web')
  })

  it('does not select a project on the landing or hidden pages', () => {
    expect(
      resolveSelectedProjectId({
        routeParam: 'api',
        pageSlug: 'landing',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBeUndefined()

    expect(
      resolveSelectedProjectId({
        routeParam: 'api',
        pageSlug: 'hidden',
        landingSlug: 'landing',
        pages,
        projects
      })
    ).toBeUndefined()
  })
})
