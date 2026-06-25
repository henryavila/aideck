// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { defineComponent, h, inject, type Ref } from 'vue'
import ConsumerPage from '../../../src/client/pages/ConsumerPage.vue'
import { __resetActiveManifest } from '../../../src/client/composables/useActiveManifest.js'
import { PROJECT_ID_KEY } from '../../../src/client/composables/useProjectScope.js'

// Mock the API module
vi.mock('../../../src/client/api.js', () => ({
  fetchConsumerManifest: vi.fn(),
  fetchConsumers: vi.fn().mockResolvedValue([]),
  fetchDataSource: vi.fn().mockResolvedValue([]),
  fetchProjects: vi.fn().mockResolvedValue([]),
}))

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/:consumerId', component: ConsumerPage },
      { path: '/:consumerId/:pageSlug', component: ConsumerPage },
    ],
  })
  router.push(path)
  return router
}

describe('ConsumerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetActiveManifest()
  })

  it('shows loading skeleton before manifest resolves', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    // Never resolves during this test
    vi.mocked(fetchConsumerManifest).mockReturnValue(new Promise(() => {}))

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })

    expect(wrapper.find('.page-state.is-loading').exists()).toBe(true)
  })

  it('renders sections-layout page for a sections manifest', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        { slug: 'overview', title: 'Overview', layout: 'sections', default: true, sections: [] },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Page not found')
    expect(wrapper.find('.page-state.is-loading').exists()).toBe(false)
    // No tab bar for a single-page manifest
    expect(wrapper.find('.tabs-bar').exists()).toBe(false)
  })

  it('renders a tab bar when there are multiple pages', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        { slug: 'overview', title: 'Overview', layout: 'sections', default: true, sections: [] },
        { slug: 'metrics', title: 'Metrics', layout: 'sections', sections: [] },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    const tabs = wrapper.find('.tabs-bar')
    expect(tabs.exists()).toBe(true)
    expect(tabs.text()).toContain('Overview')
    expect(tabs.text()).toContain('Metrics')
  })

  it('omits a showInNav:false page from the tab bar but keeps the visible ones', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        { slug: 'overview', title: 'Overview', layout: 'sections', default: true, sections: [] },
        { slug: 'metrics', title: 'Metrics', layout: 'sections', sections: [] },
        { slug: 'aux', title: 'Aux', layout: 'sections', showInNav: false, sections: [] },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    const tabs = wrapper.find('.tabs-bar')
    expect(tabs.exists()).toBe(true)
    expect(tabs.text()).toContain('Overview')
    expect(tabs.text()).toContain('Metrics')
    expect(tabs.text()).not.toContain('Aux')
  })

  it('keeps a showInNav:false page reachable by direct route', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        { slug: 'overview', title: 'Overview', layout: 'sections', default: true, sections: [] },
        { slug: 'aux', title: 'Aux', layout: 'sections', showInNav: false, sections: [] },
      ],
    })

    const router = makeRouter('/alpha/aux')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    // hidden-from-nav but still routable: the page resolves and renders.
    expect(wrapper.text()).not.toContain('Page not found')
    expect(wrapper.find('.page-state.is-loading').exists()).toBe(false)
    expect(wrapper.find('.pt-page').text()).toBe('Aux')
  })

  it('renders grid-layout page', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [{ slug: 'grid-view', title: 'Grid', layout: 'grid', default: true, widgets: [] }],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.page-state.is-loading').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Page not found')
    expect(wrapper.find('.grid-layout').exists()).toBe(true)
  })

  it('renders single-layout page', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [{ slug: 'focus', title: 'Focus', layout: 'single', default: true, widget: 'markdown' }],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.page-state.is-loading').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Page not found')
    expect(wrapper.find('.single-layout').exists()).toBe(true)
  })

  it('shows Page not found when pageSlug does not match', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        { slug: 'overview', title: 'Overview', layout: 'sections', default: true, sections: [] },
      ],
    })

    const router = makeRouter('/alpha/nonexistent')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Page not found')
  })

  it('falls back to the loading skeleton when manifest fetch fails', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockRejectedValue(new Error('Consumer not found: missing'))

    const router = makeRouter('/missing')
    await router.isReady()

    const wrapper = mount(ConsumerPage, { global: { plugins: [router] } })
    await flushPromises()

    // manifest becomes null on error → loading-skeleton fallback (cannot
    // distinguish initial load from fetch failure with the summary API)
    expect(wrapper.find('.page-state.is-loading').exists()).toBe(true)
  })

  it('renders global landing with only the page title, not the consumer title', async () => {
    const { fetchConsumerManifest, fetchProjects } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'atomic-skills',
      schemaVersion: '0.1',
      title: 'Atomic Skills',
      nav: { style: 'projects', landingPage: 'panorama' },
      dataSources: [{ id: 'projects', root: 'project' }],
      pages: [
        { slug: 'panorama', title: 'Panorama', layout: 'sections', default: true, sections: [] },
      ],
    })
    vi.mocked(fetchProjects).mockResolvedValue([
      { projectId: 'atomic-skills', rootDir: '/repos/atomic-skills' },
    ])

    const router = makeRouter('/placeholder')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      props: { consumerId: 'atomic-skills', pageSlug: 'panorama', globalLanding: true },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Panorama')
    expect(wrapper.find('h1').text()).not.toContain('Atomic Skills')
  })

  it('does not provide a selected project on the global landing', async () => {
    const { fetchConsumerManifest, fetchProjects } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'atomic-skills',
      schemaVersion: '0.1',
      title: 'Atomic Skills',
      nav: { style: 'projects', landingPage: 'panorama' },
      dataSources: [{ id: 'projects', root: 'project' }],
      pages: [
        { slug: 'panorama', title: 'Panorama', layout: 'sections', default: true, sections: [] },
      ],
    })
    vi.mocked(fetchProjects).mockResolvedValue([
      { projectId: 'atomic-skills', rootDir: '/repos/atomic-skills' },
    ])
    const ScopeProbe = defineComponent({
      name: 'SectionsLayout',
      setup() {
        const projectId = inject(PROJECT_ID_KEY) as Ref<string | undefined>
        return () => h('div', { class: 'scope-probe' }, projectId?.value ?? 'none')
      },
    })

    const router = makeRouter('/placeholder')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      props: { consumerId: 'atomic-skills', pageSlug: 'panorama', globalLanding: true },
      global: {
        plugins: [router],
        stubs: { SectionsLayout: ScopeProbe },
      },
    })
    await flushPromises()

    expect(wrapper.find('.scope-probe').text()).toBe('none')
  })
})
