// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import ConsumerPage from '../../../src/client/pages/ConsumerPage.vue'

// Mock the API module
vi.mock('../../../src/client/api.js', () => ({
  fetchConsumerManifest: vi.fn(),
  fetchConsumers: vi.fn().mockResolvedValue([]),
  fetchDataSource: vi.fn().mockResolvedValue([]),
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
  })

  it('shows loading state before manifest resolves', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    // Never resolves during this test
    vi.mocked(fetchConsumerManifest).mockReturnValue(new Promise(() => {}))

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })

    expect(wrapper.text()).toContain('Loading consumer')
  })

  it('renders sections-layout page for a sections manifest', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        {
          slug: 'overview',
          title: 'Overview',
          layout: 'sections',
          default: true,
          sections: [],
        },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    // SectionsLayout should be rendered (no "Loading consumer" / "Page not found")
    expect(wrapper.text()).not.toContain('Loading consumer')
    expect(wrapper.text()).not.toContain('Page not found')
    // No nav tabs for single-page manifest
    expect(wrapper.find('.consumer-nav').exists()).toBe(false)
  })

  it('renders navigation tabs when there are multiple pages', async () => {
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

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    const nav = wrapper.find('.consumer-nav')
    expect(nav.exists()).toBe(true)
    expect(nav.text()).toContain('Overview')
    expect(nav.text()).toContain('Metrics')
  })

  it('renders grid-layout page', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        {
          slug: 'grid-view',
          title: 'Grid',
          layout: 'grid',
          default: true,
          widgets: [],
        },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading consumer')
    expect(wrapper.text()).not.toContain('Page not found')
  })

  it('renders single-layout page', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockResolvedValue({
      id: 'alpha',
      schemaVersion: '0.1',
      pages: [
        {
          slug: 'focus',
          title: 'Focus',
          layout: 'single',
          default: true,
          widget: 'markdown',
        },
      ],
    })

    const router = makeRouter('/alpha')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Loading consumer')
    expect(wrapper.text()).not.toContain('Page not found')
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

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Page not found')
  })

  it('shows loading when manifest fetch fails', async () => {
    const { fetchConsumerManifest } = await import('../../../src/client/api.js')
    vi.mocked(fetchConsumerManifest).mockRejectedValue(new Error('Consumer not found: missing'))

    const router = makeRouter('/missing')
    await router.isReady()

    const wrapper = mount(ConsumerPage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    // manifest becomes null on error → shows "Loading consumer..." (v-else fallback)
    expect(wrapper.text()).toContain('Loading consumer')
  })
})
