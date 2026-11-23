// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { nextTick, ref } from 'vue'
import { messages, activeLocale, useT } from '../../../src/client/i18n.js'
import { useActiveManifest, __resetActiveManifest } from '../../../src/client/composables/useActiveManifest.js'
import { fetchConsumerManifest } from '../../../src/client/api.js'
import WidgetFrame from '../../../src/client/components/WidgetFrame.vue'
import ProgressBarWidget from '../../../src/client/components/widgets/ProgressBarWidget.vue'
import TableWidget from '../../../src/client/components/widgets/TableWidget.vue'
import StatusBar from '../../../src/client/components/shell/StatusBar.vue'

vi.mock('../../../src/client/api.js', () => ({
  fetchConsumerManifest: vi.fn(),
  fetchDataSource: vi.fn().mockResolvedValue([]),
  fetchDataSourceAllProjects: vi.fn().mockResolvedValue([]),
}))

beforeEach(() => {
  activeLocale.value = 'en'
  __resetActiveManifest()
  vi.mocked(fetchConsumerManifest).mockReset()
})

afterEach(() => {
  activeLocale.value = 'en'
  __resetActiveManifest()
  vi.mocked(fetchConsumerManifest).mockReset()
})

function mountFrame(props: Record<string, unknown>) {
  return mount(WidgetFrame, {
    props: { title: 'widget', ...props },
    slots: { default: '<span>body</span>' },
  })
}

function mountProgress(source: Record<string, unknown>[], config: Record<string, unknown> = {}) {
  return mount(ProgressBarWidget, { props: { source, config } })
}

async function mountTable(
  source: Record<string, unknown>[],
  config: Record<string, unknown> = {},
) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push('/alpha/board')
  await router.isReady()
  return mount(TableWidget, {
    props: { source, config, consumerId: 'alpha', depth: 0 },
    global: { plugins: [router] },
  })
}

const STACKED = [
  { name: 'A', value: 1, max: 4 },
  { name: 'B', value: 2, max: 4 },
]

describe('i18n message table', () => {
  it('has the same keys in en and pt-BR', () => {
    expect(Object.keys(messages['pt-BR']).sort()).toEqual(Object.keys(messages.en).sort())
  })

  it('defaults to en and interpolates params', () => {
    const { t } = useT()
    expect(t('frame.live')).toBe('live')
    expect(t('rows.other', { count: 3 })).toBe('3 rows')
    activeLocale.value = 'pt-BR'
    expect(t('rows.other', { count: 3 })).toBe('3 linhas')
  })

  it('updates mounted labels when the locale changes', async () => {
    const wrapper = mountProgress(STACKED)
    expect(wrapper.find('.w-meta').text()).toContain('2 rows')
    activeLocale.value = 'pt-BR'
    await nextTick()
    expect(wrapper.find('.w-meta').text()).toContain('2 linhas')
  })
})

describe('WidgetFrame labels', () => {
  it('renders English labels by default', () => {
    expect(mountFrame({ live: true }).find('.live-text').text()).toBe('live')
    expect(mountFrame({ state: 'disconnected' }).find('.stale').text()).toBe('stale')
    const errored = mountFrame({ state: 'error', error: {} })
    expect(errored.find('.retry').text()).toBe('× retry')
    expect(errored.find('.err-1').text()).toBe('Failed to load.')
    expect(mountFrame({ state: 'empty' }).find('.we-note').text()).toBe('// no data')
  })

  it('renders Portuguese labels with activeLocale = pt-BR', () => {
    activeLocale.value = 'pt-BR'
    expect(mountFrame({ live: true }).find('.live-text').text()).toBe('ao vivo')
    expect(mountFrame({ state: 'disconnected' }).find('.stale').text()).toBe('desatualizado')
    const errored = mountFrame({ state: 'error', error: {} })
    expect(errored.find('.retry').text()).toBe('× tentar de novo')
    expect(errored.find('.err-1').text()).toBe('Falha ao carregar.')
    expect(mountFrame({ state: 'empty' }).find('.we-note').text()).toBe('// sem dados')
  })

  it('keeps a consumer-set emptyNote as written', () => {
    activeLocale.value = 'pt-BR'
    expect(mountFrame({ state: 'empty', emptyNote: 'nada por aqui' }).find('.we-note').text()).toBe(
      '// nada por aqui',
    )
  })
})

describe('ProgressBarWidget labels', () => {
  it('renders English labels by default', () => {
    const wrapper = mountProgress(STACKED)
    expect(wrapper.find('.w-meta').text()).toContain('2 rows')
    expect(wrapper.find('.pbar-stack-foot').text()).toContain('weighted avg')
    expect(wrapper.find('.pbar-stack-foot').text()).toContain('2 of 2 items')
    expect(wrapper.find('.pbar .name').text()).toBe('A')
    expect(mountProgress([]).find('.we-note').text()).toBe('// no rows to chart')
  })

  it('renders Portuguese labels with activeLocale = pt-BR', () => {
    activeLocale.value = 'pt-BR'
    const wrapper = mountProgress(STACKED)
    expect(wrapper.find('.w-meta').text()).toContain('2 linhas')
    expect(wrapper.find('.pbar-stack-foot').text()).toContain('média ponderada')
    expect(wrapper.find('.pbar-stack-foot').text()).toContain('2 de 2 itens')
    expect(mountProgress([]).find('.we-note').text()).toBe('// sem linhas para exibir')
  })

  it('uses the Portuguese default label and singular row count', async () => {
    activeLocale.value = 'pt-BR'
    expect(mountProgress([{ value: 1, max: 4 }]).find('.pbar .name').text()).toBe('Progresso')
    const table = await mountTable([{ id: 'T-1' }])
    expect(table.find('.w-meta').text()).toContain('1 linha')
  })

  it('keeps a consumer-set unit as written', () => {
    activeLocale.value = 'pt-BR'
    const wrapper = mountProgress(STACKED, { unit: 'tarefas' })
    expect(wrapper.find('.pbar-stack-foot').text()).toContain('2 de 2 tarefas')
  })
})

describe('TableWidget labels', () => {
  const ROWS = [
    { id: 'T-1', title: 'One' },
    { id: 'T-2', title: 'Two' },
  ]

  it('renders English labels by default', async () => {
    expect((await mountTable(ROWS)).find('.w-meta').text()).toContain('2 rows')
    expect((await mountTable(ROWS, { sourceRef: 'tasks' })).find('.w-meta').text()).toBe(
      'source · tasks · 2 rows',
    )
    expect((await mountTable([])).find('.we-note').text()).toBe('// 0 rows')
    expect((await mountTable([{ id: 'T-1' }])).find('.w-meta').text()).toContain('1 rows')
  })

  it('renders Portuguese labels with activeLocale = pt-BR', async () => {
    activeLocale.value = 'pt-BR'
    expect((await mountTable(ROWS)).find('.w-meta').text()).toContain('2 linhas')
    expect((await mountTable(ROWS, { sourceRef: 'tasks' })).find('.w-meta').text()).toBe(
      'fonte · tasks · 2 linhas',
    )
    expect((await mountTable([])).find('.we-note').text()).toBe('// 0 linhas')
    expect((await mountTable([{ id: 'T-1' }])).find('.w-meta').text()).toContain('1 linha')
  })

  it('keeps a consumer-set emptyNote as written', async () => {
    activeLocale.value = 'pt-BR'
    expect((await mountTable([], { emptyNote: 'ainda vazio' })).find('.we-note').text()).toBe(
      '// ainda vazio',
    )
  })
})

describe('connection indicator labels', () => {
  function mountStatus(connected: boolean) {
    return mount(StatusBar, { props: { consumerCount: 1, connected, version: '0.0.1' } })
  }

  it('renders English by default', () => {
    expect(mountStatus(true).text()).toContain('live')
    expect(mountStatus(false).text()).toContain('offline')
  })

  it('renders Portuguese with activeLocale = pt-BR', () => {
    activeLocale.value = 'pt-BR'
    expect(mountStatus(true).text()).toContain('conectado')
    expect(mountStatus(false).text()).toContain('desconectado')
  })
})

describe('useActiveManifest locale', () => {
  it('applies locale from the loaded manifest', async () => {
    vi.mocked(fetchConsumerManifest).mockResolvedValue({ locale: 'pt-BR' })
    const consumerId = ref<string | undefined>('alpha')
    useActiveManifest(consumerId)
    await flushPromises()
    expect(activeLocale.value).toBe('pt-BR')
  })

  it('returns to en when the manifest has no locale', async () => {
    vi.mocked(fetchConsumerManifest).mockResolvedValue({ title: 'Alpha' })
    const consumerId = ref<string | undefined>('alpha')
    useActiveManifest(consumerId)
    await flushPromises()
    expect(activeLocale.value).toBe('en')
  })

  it('returns to en when no manifest is active', async () => {
    vi.mocked(fetchConsumerManifest).mockResolvedValue({ locale: 'pt-BR' })
    const consumerId = ref<string | undefined>('alpha')
    useActiveManifest(consumerId)
    await flushPromises()
    expect(activeLocale.value).toBe('pt-BR')

    consumerId.value = undefined
    await flushPromises()
    expect(activeLocale.value).toBe('en')
  })
})
