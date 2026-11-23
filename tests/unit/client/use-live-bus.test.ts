// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import type WidgetRendererType from '../../../src/client/components/WidgetRenderer.vue'

// The composable keeps a module-level EventSource singleton, so every test
// resets the module registry and re-imports it to get a clean connection.
class FakeEventSource {
  static instances: FakeEventSource[] = []

  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  private listeners = new Map<string, ((e: MessageEvent) => void)[]>()

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: (e: MessageEvent) => void): void {
    const existing = this.listeners.get(type) ?? []
    existing.push(listener)
    this.listeners.set(type, existing)
  }

  removeEventListener(type: string, listener: (e: MessageEvent) => void): void {
    const existing = this.listeners.get(type)
    if (!existing) return
    this.listeners.set(type, existing.filter((l) => l !== listener))
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0
  }

  emit(type: string, raw: string): void {
    const event = { type, data: raw } as MessageEvent
    for (const listener of this.listeners.get(type) ?? []) listener(event)
    if (type === 'message') this.onmessage?.(event)
    if (type === 'error') this.onerror?.(event)
    if (type === 'open') this.onopen?.(event)
  }

  close(): void {}
}

const mocks = vi.hoisted(() => ({
  fetchDataSource: vi.fn(),
  fetchDataSourceAllProjects: vi.fn(),
}))

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: mocks.fetchDataSource,
  fetchDataSourceAllProjects: mocks.fetchDataSourceAllProjects,
}))

async function loadBus() {
  vi.resetModules()
  const mod = await import('../../../src/client/composables/useLiveBus.js')
  const bus = mod.useLiveBus()
  const source = FakeEventSource.instances.at(-1)
  if (!source) throw new Error('useLiveBus did not open an EventSource')
  return { bus, source }
}

describe('useLiveBus', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates lastEvent from a named data_changed event', async () => {
    const { bus, source } = await loadBus()

    source.emit('data_changed', JSON.stringify({ kind: 'data_changed', consumer: 'alpha', payload: { file: 'a.md' } }))

    expect(bus.lastEvent.value).toEqual({
      kind: 'data_changed',
      consumer: 'alpha',
      payload: { file: 'a.md' },
    })
  })

  it('updates lastEvent from a named consumer_manifest_changed event', async () => {
    const { bus, source } = await loadBus()

    source.emit('consumer_manifest_changed', JSON.stringify({ kind: 'consumer_manifest_changed', consumer: 'alpha', changeType: 'change' }))

    expect(bus.lastEvent.value).toEqual({
      kind: 'consumer_manifest_changed',
      consumer: 'alpha',
      changeType: 'change',
    })
  })

  it('ignores malformed JSON and keeps the previous lastEvent', async () => {
    const { bus, source } = await loadBus()

    source.emit('data_changed', JSON.stringify({ kind: 'data_changed', consumer: 'alpha' }))
    expect(bus.lastEvent.value).toEqual({ kind: 'data_changed', consumer: 'alpha' })

    expect(() => source.emit('data_changed', '{not json')).not.toThrow()
    expect(bus.lastEvent.value).toEqual({ kind: 'data_changed', consumer: 'alpha' })
  })

  it('does not register listeners for health-tick or error', async () => {
    const { bus, source } = await loadBus()

    expect(source.listenerCount('health-tick')).toBe(0)
    // EventSource fires `error` itself on connection failure; its object has no
    // `data`, so a named listener would break parsing.
    expect(source.listenerCount('error')).toBe(0)

    expect(() => {
      source.emit('health-tick', JSON.stringify({ kind: 'health-tick', uptimeMs: 1 }))
      source.emit('error', '')
    }).not.toThrow()
    expect(bus.lastEvent.value).toBeNull()
  })
})

describe('WidgetRenderer live refresh', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
    mocks.fetchDataSource.mockReset()
    mocks.fetchDataSourceAllProjects.mockReset()
    // Fresh WidgetRenderer + useLiveBus module (and thus a fresh singleton).
    vi.resetModules()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  async function mountWidget(consumerId: string) {
    const { default: WidgetRenderer } = (await import(
      '../../../src/client/components/WidgetRenderer.vue'
    )) as { default: typeof WidgetRendererType }
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
    })
    router.push(`/${consumerId}/overview`)
    await router.isReady()
    wrapper = mount(WidgetRenderer, {
      props: {
        binding: { widget: 'table', source: { ref: 'tasks' } },
        consumerId,
      },
      global: { plugins: [router] },
    })
    await flushPromises()
  }

  it('re-fetches when data_changed arrives for its own consumer', async () => {
    mocks.fetchDataSource.mockResolvedValue([{ id: 'a', title: 'first' }])
    await mountWidget('alpha')

    expect(mocks.fetchDataSource).toHaveBeenCalledTimes(1)

    mocks.fetchDataSource.mockResolvedValue([{ id: 'b', title: 'second' }])
    const source = FakeEventSource.instances.at(-1)
    if (!source) throw new Error('useLiveBus did not open an EventSource')

    source.emit('data_changed', JSON.stringify({ kind: 'data_changed', consumer: 'alpha', payload: { file: 'tasks.md' } }))
    await flushPromises()

    expect(mocks.fetchDataSource).toHaveBeenCalledTimes(2)
    const vm = wrapper!.vm as unknown as { sourceData: Record<string, unknown>[] }
    expect(vm.sourceData).toEqual([{ id: 'b', title: 'second' }])
  }, 30_000)

  it('does not re-fetch for a data_changed event of another consumer', async () => {
    mocks.fetchDataSource.mockResolvedValue([{ id: 'a', title: 'first' }])
    await mountWidget('alpha')

    expect(mocks.fetchDataSource).toHaveBeenCalledTimes(1)

    const source = FakeEventSource.instances.at(-1)
    if (!source) throw new Error('useLiveBus did not open an EventSource')

    source.emit('data_changed', JSON.stringify({ kind: 'data_changed', consumer: 'beta', payload: { file: 'tasks.md' } }))
    await flushPromises()

    expect(mocks.fetchDataSource).toHaveBeenCalledTimes(1)
    const vm = wrapper!.vm as unknown as { sourceData: Record<string, unknown>[] }
    expect(vm.sourceData).toEqual([{ id: 'a', title: 'first' }])
  }, 30_000)
})
