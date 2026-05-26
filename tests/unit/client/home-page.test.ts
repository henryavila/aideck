// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import HomePage from '../../../src/client/pages/HomePage.vue'

// Mock the composable so tests are synchronous and don't hit fetch
vi.mock('../../../src/client/composables/useConsumers.js', () => ({
  useConsumers: vi.fn(() => ({
    consumers: ref([
      { id: 'alpha', title: 'Alpha Consumer', dataSourceCount: 2, pageCount: 3 },
      { id: 'beta', title: 'Beta Consumer', icon: 'mdi:code', dataSourceCount: 1, pageCount: 1 },
    ]),
    loading: ref(false),
    error: ref(null),
  })),
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/:consumerId', component: { template: '<div />' } },
  ],
})

describe('HomePage', () => {
  it('renders consumer cards', async () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Alpha Consumer')
    expect(wrapper.text()).toContain('Beta Consumer')
    expect(wrapper.text()).toContain('2 consumers')
  })

  it('shows data source and page counts', async () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('2 data sources')
    expect(wrapper.text()).toContain('3 pages')
  })

  it('links to consumer page', async () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    const links = wrapper.findAll('a')
    const alphaLink = links.find(l => l.text().includes('Alpha Consumer'))
    expect(alphaLink?.attributes('href')).toBe('/alpha')
  })

  it('shows singular form for 1 consumer', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([{ id: 'solo', title: 'Solo Consumer', dataSourceCount: 1, pageCount: 1 }]),
      loading: ref(false),
      error: ref(null),
    })

    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('1 consumer')
    expect(wrapper.text()).not.toContain('1 consumers')
    expect(wrapper.text()).toContain('1 data source')
    expect(wrapper.text()).not.toContain('1 data sources')
    expect(wrapper.text()).toContain('1 page')
    expect(wrapper.text()).not.toContain('1 pages')
  })

  it('shows empty state when no consumers', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(false),
      error: ref(null),
    })

    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No consumers registered')
    expect(wrapper.text()).toContain('0 consumers')
  })

  it('shows loading state', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(true),
      error: ref(null),
    })

    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Loading consumers')
  })

  it('shows error state', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(false),
      error: ref('Network error'),
    })

    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
  })
})
