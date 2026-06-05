// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import WidgetRenderer from '../../../src/client/components/WidgetRenderer.vue'
import { PROJECT_ID_KEY } from '../../../src/client/composables/useProjectScope.js'

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([]),
}))

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/:consumerId/:pageSlug', component: { template: '<div />' } },
      { path: '/:consumerId/:pageSlug/:routeParam', component: { template: '<div />' } },
    ],
  })
  router.push(path)
  return router
}

describe('WidgetRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders unknown widget message for unrecognized widget type', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'nonexistent-widget' },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })

    expect(wrapper.text()).toContain('Unknown widget: nonexistent-widget')
  })

  it('fetches data source when source.ref is provided', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'task-1', slug: 'task-1', title: 'Task One' },
      { id: 'task-2', slug: 'task-2', title: 'Task Two' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'tasks' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    // 3rd arg is the injected projectId (undefined here — no project scope provided)
    expect(fetchDataSource).toHaveBeenCalledWith('alpha', 'tasks', undefined)
    // All records should be passed (no filter, no param)
    expect((wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData).toHaveLength(2)
  })

  it('passes the injected projectId to fetchDataSource (project-scoped read)', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([])

    const router = makeRouter('/atomic-skills/overview')
    await router.isReady()

    mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans' } },
        consumerId: 'atomic-skills',
      },
      global: {
        plugins: [router],
        provide: { [PROJECT_ID_KEY as symbol]: ref('proj-a') },
      },
    })
    await flushPromises()

    expect(fetchDataSource).toHaveBeenCalledWith('atomic-skills', 'plans', 'proj-a')
  })

  it('applies static filter on source records', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'task-1', status: 'open', title: 'Task One' },
      { id: 'task-2', status: 'closed', title: 'Task Two' },
      { id: 'task-3', status: 'open', title: 'Task Three' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'tasks', filter: { status: 'open' } } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(2)
    expect(data.every(r => r.status === 'open')).toBe(true)
  })

  it('filters records by route param matching record slug', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'plan-1', slug: 'my-plan', title: 'My Plan' },
      { id: 'plan-2', slug: 'other-plan', title: 'Other Plan' },
    ])

    const router = makeRouter('/alpha/detail/my-plan')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans', param: 'routeParam' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(1)
    expect(data[0].slug).toBe('my-plan')
  })

  it('filters records by route param matching record id', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'plan-abc', title: 'Plan ABC' },
      { id: 'plan-xyz', title: 'Plan XYZ' },
    ])

    const router = makeRouter('/alpha/detail/plan-abc')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans', param: 'routeParam' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('plan-abc')
  })

  it('applies both static filter and route param filter together', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'task-1', slug: 'task-1', status: 'open', title: 'Task One' },
      { id: 'task-1', slug: 'task-1', status: 'closed', title: 'Task One Closed' },
      { id: 'task-2', slug: 'task-2', status: 'open', title: 'Task Two' },
    ])

    const router = makeRouter('/alpha/detail/task-1')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks', filter: { status: 'open' }, param: 'routeParam' },
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(1)
    expect(data[0].slug).toBe('task-1')
    expect(data[0].status).toBe('open')
  })

  it('returns all records when param is declared but route has no matching param', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'plan-1', slug: 'a', title: 'A' },
      { id: 'plan-2', slug: 'b', title: 'B' },
    ])

    // Route without the :routeParam segment
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans', param: 'routeParam' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    // No routeParam in the URL, so param filter is skipped
    expect(data).toHaveLength(2)
  })

  it('groups records by repeat field and renders one instance per group', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'Task A' },
      { id: '2', status: 'closed', title: 'Task B' },
      { id: '3', status: 'open', title: 'Task C' },
      { id: '4', status: 'in-progress', title: 'Task D' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks' },
          repeat: 'status',
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const groups = (wrapper.vm as unknown as { repeatGroups: { key: string; records: Record<string, unknown>[] }[] }).repeatGroups
    expect(groups).toHaveLength(3)
    expect(groups.map(g => g.key).sort()).toEqual(['closed', 'in-progress', 'open'])

    const openGroup = groups.find(g => g.key === 'open')!
    expect(openGroup.records).toHaveLength(2)

    const closedGroup = groups.find(g => g.key === 'closed')!
    expect(closedGroup.records).toHaveLength(1)
  })

  it('renders repeat container with grid layout for horizontal direction', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'Task A' },
      { id: '2', status: 'closed', title: 'Task B' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks' },
          repeat: 'status',
          repeatDirection: 'horizontal' as const,
          maxRepeatColumns: 2,
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const container = wrapper.find('.repeat-container')
    expect(container.exists()).toBe(true)
    expect(container.element.style.display).toBe('grid')
    expect(container.element.style.gridTemplateColumns).toBe('repeat(2, 1fr)')
  })

  it('renders repeat container with flex column for vertical direction', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'Task A' },
      { id: '2', status: 'closed', title: 'Task B' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks' },
          repeat: 'status',
          repeatDirection: 'vertical' as const,
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const container = wrapper.find('.repeat-container')
    expect(container.exists()).toBe(true)
    expect(container.element.style.flexDirection).toBe('column')
  })

  it('renders repeat labels for each unique value', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'Task A' },
      { id: '2', status: 'closed', title: 'Task B' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks' },
          repeat: 'status',
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const labels = wrapper.findAll('.repeat-label')
    expect(labels).toHaveLength(2)
    // Raw grouping keys are humanized for display (§2c): 'open' -> 'Open'.
    const labelTexts = labels.map(l => l.text()).sort()
    expect(labelTexts).toEqual(['Closed', 'Open'])
  })

  it('does not render repeat container when repeat is not set', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'Task A' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'tasks' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.find('.repeat-container').exists()).toBe(false)
  })

  it('applies maxRepeatColumns default of 3 when not specified', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'open', title: 'A' },
      { id: '2', status: 'closed', title: 'B' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'tasks' },
          repeat: 'status',
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const container = wrapper.find('.repeat-container')
    expect(container.element.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
  })

  // ─── §2c composite param + §2b composition ──────────────────────────────

  it('filters by a composite { match: [projectId, slug] } param (projectId-scoped)', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { projectId: 'proj-a', slug: 'my-plan', title: 'A/my-plan' },
      { projectId: 'proj-b', slug: 'my-plan', title: 'B/my-plan' }, // same slug, other project
      { projectId: 'proj-a', slug: 'other', title: 'A/other' },
    ])

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/:consumerId/:pageSlug/:projectId/:slug', component: { template: '<div />' } }],
    })
    router.push('/alpha/plan/proj-a/my-plan')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans', param: { match: ['projectId', 'slug'] } } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ projectId: 'proj-a', slug: 'my-plan' })
  })

  it('matches a { field, param } entry mapping a record field to a differently-named route param', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { slug: 'f0-setup', planSlug: 'my-plan', projectId: 'proj-a' },
      { slug: 'f1-build', planSlug: 'my-plan', projectId: 'proj-a' },
      { slug: 'f0-other', planSlug: 'other-plan', projectId: 'proj-a' }, // different plan
    ])

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/:consumerId/:pageSlug/:projectId/:slug', component: { template: '<div />' } }],
    })
    router.push('/alpha/plan/proj-a/my-plan') // :slug = the PLAN slug
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          // filter initiatives to this plan: record.planSlug === route.slug
          source: { ref: 'initiatives', param: { match: [{ field: 'projectId', param: 'projectId' }, { field: 'planSlug', param: 'slug' }] } },
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(2)
    expect(data.every(r => r.planSlug === 'my-plan')).toBe(true)
  })

  it('re-filters when a sibling drill-down route param changes on the same instance', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'plan-1', slug: 'my-plan', title: 'My Plan' },
      { id: 'plan-2', slug: 'other-plan', title: 'Other Plan' },
    ])

    const router = makeRouter('/alpha/detail/my-plan')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'plans', param: 'routeParam' } },
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const vm = wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }
    expect(vm.sourceData).toHaveLength(1)
    expect(vm.sourceData[0].slug).toBe('my-plan')

    // Sibling drill-down: same component instance, only :routeParam changes. The
    // route param is read after the fetch await, so it must still be a tracked
    // watchEffect dependency for the widget to re-filter.
    await router.push('/alpha/detail/other-plan')
    await flushPromises()

    expect(vm.sourceData).toHaveLength(1)
    expect(vm.sourceData[0].slug).toBe('other-plan')
  })

  it('renders a source-less child against the parent record (composition mode 1)', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table' }, // no source.ref
        consumerId: 'alpha',
        parentRecord: { id: 'p1', title: 'Parent' },
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(fetchDataSource).not.toHaveBeenCalled()
    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toEqual([{ id: 'p1', title: 'Parent' }])
  })

  it('resolves $parent.<field> tokens in source.filter against the parent record (mode 2)', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { taskId: 'T-1', date: 'd1' },
      { taskId: 'T-2', date: 'd2' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'activity', filter: { taskId: '$parent.id' } } },
        consumerId: 'alpha',
        parentRecord: { id: 'T-1' },
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const data = (wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }).sourceData
    expect(data).toHaveLength(1)
    expect(data[0].taskId).toBe('T-1')
  })
})
