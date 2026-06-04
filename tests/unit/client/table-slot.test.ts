// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import TableWidget from '../../../src/client/components/widgets/TableWidget.vue'

// The desktop `cell:` slot's child widget fetches data. We count those fetches
// to prove the desktop table (which holds the only slot) is NOT mounted while
// the mobile card layout is active — otherwise it fetches for invisible content.
vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([{ id: 'd1', title: 'Detail' }]),
}))

function makeRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push('/alpha/board')
  return router
}

const ROW = { id: 'r1', status: 'active' }
const SLOTS = { 'cell:status': [{ widget: 'table', source: { ref: 'detail' } }] }

function mountTable(router: ReturnType<typeof makeRouter>) {
  return mount(TableWidget, {
    props: { source: [ROW], config: {}, consumerId: 'alpha', slots: SLOTS, depth: 0 },
    global: { plugins: [router] },
  })
}

describe('TableWidget — cell slot does not mount in a hidden responsive layout', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('mounts the desktop table and fetches the cell slot once on the desktop layout', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    const router = makeRouter()
    await router.isReady()

    const wrapper = mountTable(router)
    await flushPromises()

    expect(wrapper.find('.tab-desktop').exists()).toBe(true)
    expect(wrapper.find('.tab-cards').exists()).toBe(false)
    expect(vi.mocked(fetchDataSource)).toHaveBeenCalledTimes(1)
  })

  it('does not mount the desktop table (nor fetch its slot) on the mobile layout', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 720px)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { fetchDataSource } = await import('../../../src/client/api.js')
    const router = makeRouter()
    await router.isReady()

    const wrapper = mountTable(router)
    await flushPromises()

    expect(wrapper.find('.tab-desktop').exists()).toBe(false)
    expect(wrapper.find('.tab-cards').exists()).toBe(true)
    expect(vi.mocked(fetchDataSource)).toHaveBeenCalledTimes(0)
  })
})
