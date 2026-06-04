// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import KanbanBoardWidget from '../../../src/client/components/widgets/KanbanBoardWidget.vue'

// The card slot's child widget fetches data; we count those fetches to prove the
// slot mounts exactly once — not once per (desktop + mobile) layout.
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

// status matches the default-active column ('in-progress'), so the card shows in
// BOTH the desktop column grid and the mobile active-column list pre-fix.
const CARD = { id: 'T-1', title: 'Task One', status: 'in-progress' }
const SLOTS = { card: [{ widget: 'table', source: { ref: 'detail' } }] }

function mountKanban(router: ReturnType<typeof makeRouter>) {
  return mount(KanbanBoardWidget, {
    props: { source: [CARD], config: {}, consumerId: 'alpha', slots: SLOTS, depth: 0 },
    global: { plugins: [router] },
  })
}

describe('KanbanBoardWidget — card slot is not duplicated across layouts', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('renders one card and fetches the slot once on the desktop layout', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    const router = makeRouter()
    await router.isReady()

    const wrapper = mountKanban(router)
    await flushPromises()

    expect(wrapper.findAll('.kb-card')).toHaveLength(1)
    expect(vi.mocked(fetchDataSource)).toHaveBeenCalledTimes(1)
  })

  it('renders one card and fetches the slot once on the mobile layout', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(max-width: 720px)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const { fetchDataSource } = await import('../../../src/client/api.js')
    const router = makeRouter()
    await router.isReady()

    const wrapper = mountKanban(router)
    await flushPromises()

    expect(wrapper.findAll('.kb-card')).toHaveLength(1)
    expect(vi.mocked(fetchDataSource)).toHaveBeenCalledTimes(1)
  })
})
