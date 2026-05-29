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
  it('renders one consumer card per consumer', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Alpha Consumer')
    expect(wrapper.text()).toContain('Beta Consumer')
    expect(wrapper.findAll('.cc')).toHaveLength(2)
    expect(wrapper.text()).toContain('2 registered')
  })

  it('shows data source and page counts on each card', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    const alpha = wrapper.findAll('.cc').find((c) => c.text().includes('Alpha Consumer'))
    expect(alpha).toBeTruthy()
    expect(alpha!.text()).toContain('pages')
    expect(alpha!.text()).toContain('3')
    expect(alpha!.text()).toContain('data sources')
    expect(alpha!.text()).toContain('2')
  })

  it('links each card to its consumer page', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    const links = wrapper.findAll('a')
    const alphaLink = links.find((l) => l.text().includes('Alpha Consumer'))
    expect(alphaLink?.attributes('href')).toBe('/alpha')
  })

  it('shows the registered meta for a single consumer', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([{ id: 'solo', title: 'Solo Consumer', dataSourceCount: 1, pageCount: 1 }]),
      loading: ref(false),
      error: ref(null),
    })

    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('1 registered')
    expect(wrapper.findAll('.cc')).toHaveLength(1)
  })

  it('shows empty state when no consumers', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(false),
      error: ref(null),
    })

    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('no consumers registered')
    expect(wrapper.find('.empty-wrap').exists()).toBe(true)
  })

  it('shows loading skeleton', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(true),
      error: ref(null),
    })

    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.page-state.is-loading').exists()).toBe(true)
  })

  it('shows error state', async () => {
    const { useConsumers } = await import('../../../src/client/composables/useConsumers.js')
    vi.mocked(useConsumers).mockReturnValueOnce({
      consumers: ref([]),
      loading: ref(false),
      error: ref('Network error'),
    })

    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
  })
})
