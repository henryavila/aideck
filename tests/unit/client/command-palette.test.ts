// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import CommandPalette from '../../../src/client/components/CommandPalette.vue'
import { usePalette } from '../../../src/client/composables/usePalette.js'

vi.mock('../../../src/client/api.js', () => ({
  fetchConsumers: vi.fn(),
  fetchConsumerManifest: vi.fn(),
  fetchDataSource: vi.fn(),
}))

interface IndexEntry {
  kind: string
  name: string
  path: string
  to?: string
}

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push(path)
  return router
}

describe('CommandPalette record indexing', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(async () => {
    const api = await import('../../../src/client/api.js')
    vi.mocked(api.fetchConsumers).mockReset().mockResolvedValue([
      { id: 'alpha', title: 'Alpha', dataSourceCount: 2, pageCount: 1 },
    ])
    vi.mocked(api.fetchConsumerManifest).mockReset().mockResolvedValue({
      pages: [{ slug: 'overview', title: 'Overview' }],
      dataSources: [],
      commandPalette: {
        records: [
          { ref: 'plans', route: '/:consumerId/:slug' },
          { ref: 'tasks', route: '/:consumerId/:slug' },
        ],
      },
    })
    vi.mocked(api.fetchDataSource).mockReset()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    usePalette().close()
  })

  it('keeps the other record specs when one spec read rejects', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockImplementation((_consumerId, ref) =>
      ref === 'plans'
        ? Promise.reject(new Error('failed to parse data source "plans"'))
        : Promise.resolve([{ id: 't1', slug: 't1', title: 'Task One' }]),
    )

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    wrapper = mount(CommandPalette, { global: { plugins: [router] } })
    usePalette().open()
    await flushPromises()

    const entries = (wrapper.vm as unknown as { index: IndexEntry[] }).index
    const records = entries.filter((e) => e.kind === 'record')
    expect(records.map((e) => e.name)).toEqual(['Task One'])
    // The failed spec contributes nothing, the consumer's pages stay indexed.
    expect(entries.some((e) => e.kind === 'page' && e.name === 'Overview')).toBe(true)
    // The palette teleports its rows to <body>, so read them there.
    expect(document.body.textContent).toContain('Task One')
  })
})
