// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import HomePage from '../../../src/client/pages/HomePage.vue'
import { useConsumers } from '../../../src/client/composables/useConsumers.js'

vi.mock('../../../src/client/pages/ConsumerPage.vue', () => ({
  default: {
    props: {
      consumerId: String,
      pageSlug: String,
      globalLanding: Boolean,
    },
    template: `
      <div
        class="mock-consumer-page"
        :data-consumer-id="consumerId"
        :data-page-slug="pageSlug"
        :data-global-landing="String(globalLanding)"
      >Panorama</div>
    `,
  },
}))

// Mock the composable so tests are synchronous and don't hit fetch
vi.mock('../../../src/client/composables/useConsumers.js', () => ({
  useConsumers: vi.fn(),
}))

const defaultConsumers = [
  { id: 'dispatch-test', title: 'Dispatch Test', landingPage: 'home', dataSourceCount: 1, pageCount: 1 },
  {
    id: 'atomic-skills',
    title: 'Atomic Skills',
    landingPage: 'panorama',
    navStyle: 'projects',
    dataSourceCount: 14,
    pageCount: 6,
  },
]

function state(consumers = defaultConsumers, loading = false, error: string | null = null) {
  return {
    consumers: ref(consumers),
    loading: ref(loading),
    error: ref(error),
  }
}

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/:consumerId', component: { template: '<div />' } },
      { path: '/:consumerId/:pageSlug', component: { template: '<div />' } },
    ],
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(useConsumers).mockReturnValue(state())
  })

  it('renders the project-centric landing at root without changing the URL', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    const page = wrapper.find('.mock-consumer-page')
    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(page.attributes('data-consumer-id')).toBe('atomic-skills')
    expect(page.attributes('data-page-slug')).toBe('panorama')
    expect(page.attributes('data-global-landing')).toBe('true')
    expect(wrapper.text()).not.toContain('Registered runtimes')
    expect(wrapper.findAll('.cc')).toHaveLength(0)
  })

  it('falls back to the registered runtimes list when no project-centric consumer is registered', async () => {
    vi.mocked(useConsumers).mockReturnValueOnce(
      state([{ id: 'solo', title: 'Solo Consumer', landingPage: 'home', dataSourceCount: 1, pageCount: 1 }])
    )
    const router = makeRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('.mock-consumer-page').exists()).toBe(false)
    expect(wrapper.findAll('.cc')).toHaveLength(1)
    expect(wrapper.find('.cc').attributes('href')).toBe('/solo/home')
  })

  it('shows empty state when no consumers', async () => {
    vi.mocked(useConsumers).mockReturnValueOnce(state([]))

    const router = makeRouter()
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('no consumers registered')
    expect(wrapper.find('.empty-wrap').exists()).toBe(true)
  })

  it('shows loading skeleton', async () => {
    vi.mocked(useConsumers).mockReturnValueOnce(state([], true))

    const router = makeRouter()
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.find('.page-state.is-loading').exists()).toBe(true)
  })

  it('shows error state', async () => {
    vi.mocked(useConsumers).mockReturnValueOnce(state([], false, 'Network error'))

    const router = makeRouter()
    const wrapper = mount(HomePage, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
  })
})
