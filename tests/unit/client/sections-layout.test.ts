// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import SectionsLayout from '../../../src/client/layouts/SectionsLayout.vue'

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([]),
}))

function makeRouter(path: string) {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/:consumerId/:pageSlug', component: { template: '<div />' } },
    ],
  })
  router.push(path)
  return router
}

function makeSection(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Section',
    widgets: [{ widget: 'stat', source: { ref: 'tasks' } }],
    ...overrides,
  }
}

describe('SectionsLayout visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows all sections when visible is undefined', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection(), makeSection({ title: 'Second' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections).toHaveLength(2)
    sections.forEach(s => {
      expect(s.element.style.display).not.toBe('none')
    })
  })

  it('hides section when visible is false', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [
          makeSection({ visible: false, title: 'Hidden' }),
          makeSection({ title: 'Shown' }),
        ],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections).toHaveLength(2)
    expect(sections[0].element.style.display).toBe('none')
    expect(sections[1].element.style.display).not.toBe('none')
  })

  it('shows section when visible is true', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ visible: true })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections[0].element.style.display).not.toBe('none')
  })

  it('shows section when visible expression matches data', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'active', title: 'Active Task' },
      { id: '2', status: 'done', title: 'Done Task' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ visible: 'status=active' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(fetchDataSource).toHaveBeenCalledWith('alpha', 'tasks')
    const sections = wrapper.findAll('.section')
    expect(sections[0].element.style.display).not.toBe('none')
  })

  it('hides section when visible expression does not match any data', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([
      { id: '1', status: 'done', title: 'Done Task' },
      { id: '2', status: 'done', title: 'Another Done' },
    ])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ visible: 'status=active' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections[0].element.style.display).toBe('none')
  })

  it('shows section when visible is a string but first widget has no source', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [
          {
            title: 'No Source',
            visible: 'status=active',
            widgets: [{ widget: 'stat' }],
          },
        ],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections[0].element.style.display).not.toBe('none')
  })

  it('shows section when visible expression has invalid format (no equals sign)', async () => {
    const { fetchDataSource } = await import('../../../src/client/api.js')
    vi.mocked(fetchDataSource).mockResolvedValue([{ id: '1', status: 'active' }])

    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ visible: 'invalid-expression' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const sections = wrapper.findAll('.section')
    expect(sections[0].element.style.display).not.toBe('none')
  })
})

describe('SectionsLayout autoGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses auto-fill grid when autoGrid is true', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ autoGrid: true })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    expect(grid.element.style.gridTemplateColumns).toContain('auto-fill')
    expect(grid.element.style.gridTemplateColumns).toContain('280px')
  })

  it('uses custom minCardWidth for auto-fill grid', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ autoGrid: true, minCardWidth: '350px' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    expect(grid.element.style.gridTemplateColumns).toContain('350px')
  })

  it('applies maxWidth when maxColumns is set with autoGrid', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ autoGrid: true, maxColumns: 4, minCardWidth: '300px' })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    // JSDOM resolves calc() expressions, so just verify maxWidth is set
    expect(grid.element.style.maxWidth).toBeTruthy()
  })

  it('uses standard 12-column grid when autoGrid is not set', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection()],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    expect(grid.element.style.gridTemplateColumns).toBe('repeat(12, 1fr)')
  })

  it('applies fill-screen class when fillScreen is true', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection({ fillScreen: true })],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    expect(grid.classes()).toContain('sec-grid--fill-screen')
  })

  it('does not apply fill-screen class when fillScreen is not set', async () => {
    const router = makeRouter('/alpha/overview')
    await router.isReady()

    const wrapper = mount(SectionsLayout, {
      props: {
        sections: [makeSection()],
        consumerId: 'alpha',
      },
      global: { plugins: [router] },
    })
    await flushPromises()

    const grid = wrapper.find('.sec-grid')
    expect(grid.classes()).not.toContain('sec-grid--fill-screen')
  })
})
