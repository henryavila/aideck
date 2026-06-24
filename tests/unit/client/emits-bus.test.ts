// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import WidgetRenderer from '../../../src/client/components/WidgetRenderer.vue'
import { PAGE_STATE_KEY, type PageState } from '../../../src/client/composables/usePageState.js'

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([]),
}))

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push(path)
  return router
}

describe('cross-widget emits/state bus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('a stepper select writes the configured page-state key', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'F0', label: 'Phase 0', status: 'done' },
      { id: 'F1', label: 'Phase 1', status: 'active', current: true },
    ])
    const pageState = ref<PageState>({})
    const router = makeRouter('/alpha/detail')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'stepper',
          source: { ref: 'phases' },
          // vertical layout is the selectable one (rows carry the @click handler)
          config: { selectable: true, currentField: 'current', orientation: 'vertical' },
          emits: { select: { set: 'selectedPhase' } },
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router], provide: { [PAGE_STATE_KEY as symbol]: pageState } },
    })
    await flushPromises()

    // the stepper defaults the bus to the current step on load
    expect(pageState.value.selectedPhase).toBe('F1')

    // selecting another step updates the bus
    const rows = wrapper.findAll('.stp-v-item')
    expect(rows.length).toBe(2)
    await rows.find((n) => n.text().includes('Phase 0'))!.trigger('click')
    await flushPromises()
    expect(pageState.value.selectedPhase).toBe('F0')
  })

  it('a dependent source re-scopes from page state ({ field, state })', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: 'i0', phaseId: 'F0', title: 'Init 0' },
      { id: 'i1', phaseId: 'F1', title: 'Init 1' },
    ])
    const pageState = ref<PageState>({ selectedPhase: 'F1' })
    const router = makeRouter('/alpha/detail')
    await router.isReady()

    const wrapper = mount(WidgetRenderer, {
      props: {
        binding: {
          widget: 'table',
          source: { ref: 'initiatives', param: { match: [{ field: 'phaseId', state: 'selectedPhase' }] } },
        },
        consumerId: 'alpha',
      },
      global: { plugins: [router], provide: { [PAGE_STATE_KEY as symbol]: pageState } },
    })
    await flushPromises()

    const vm = wrapper.vm as unknown as { sourceData: Record<string, unknown>[] }
    expect(vm.sourceData).toHaveLength(1)
    expect(vm.sourceData[0].id).toBe('i1')

    // changing the bus re-scopes reactively
    pageState.value = { selectedPhase: 'F0' }
    await flushPromises()
    expect(vm.sourceData[0].id).toBe('i0')

    // an unset key shows all records (graceful default)
    pageState.value = {}
    await flushPromises()
    expect(vm.sourceData).toHaveLength(2)
  })
})
