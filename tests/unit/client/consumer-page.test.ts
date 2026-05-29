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
})
