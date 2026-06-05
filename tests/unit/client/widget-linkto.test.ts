// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory, type Router } from 'vue-router'
import CalloutWidget from '../../../src/client/components/widgets/CalloutWidget.vue'
import PanelWidget from '../../../src/client/components/widgets/PanelWidget.vue'
import PhaseTimelineWidget from '../../../src/client/components/widgets/PhaseTimelineWidget.vue'
import KanbanBoardWidget from '../../../src/client/components/widgets/KanbanBoardWidget.vue'

// §2c per-record drill-down for the framed/composed widgets (callout, panel,
// phase-timeline, kanban). The link mechanism is the SAME generic resolveRowLink
// used by table/card: `:tokens` are interpolated from the bound record and the
// path is anchored under the consumer. The widgets bake in NO domain meaning —
// the consumer manifest owns the route shape (`phase/:projectId/:slug`).

function makeRouter(): Router {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  router.push('/alpha/board')
  return router
}

function mountWith(component: unknown, props: Record<string, unknown>) {
  return mount(component as never, { props, global: { plugins: [makeRouter()] } })
}

const PHASE_ROW = { projectId: 'acme', slug: 'acme-f0-bootstrap', title: 'Bootstrap', summary: 'set up', status: 'active' }

describe('CalloutWidget — token-interpolated drill-down link', () => {
  it('resolves :tokens from the bound record (was tokenless before)', () => {
    const w = mountWith(CalloutWidget, {
      source: [{ projectId: 'acme', planSlug: 'acme-api', planTitle: 'Acme API' }],
      config: { title: 'Plano em foco', bodyField: 'planTitle', linkTo: 'plan/:projectId/:planSlug' },
      consumerId: 'alpha',
      depth: 0,
    })
    const a = w.find('.co-action')
    expect(a.exists()).toBe(true)
    expect(a.attributes('href')).toContain('/alpha/plan/acme/acme-api')
  })

  it('renders no action link when linkTo is absent', () => {
    const w = mountWith(CalloutWidget, {
      source: [{ projectId: 'acme', planTitle: 'Acme API' }],
      config: { title: 'Plano em foco', bodyField: 'planTitle' },
      consumerId: 'alpha',
      depth: 0,
    })
    expect(w.find('.co-action').exists()).toBe(false)
  })
})

describe('PanelWidget — title-as-link drill-down', () => {
  it('renders the prominent title as a token-resolved link', () => {
    const w = mountWith(PanelWidget, {
      source: [PHASE_ROW],
      config: { title: 'Fase atual', titleField: 'title', bodyField: 'summary', linkTo: 'phase/:projectId/:slug' },
      consumerId: 'alpha',
      depth: 0,
    })
    const a = w.find('.panel-link')
    expect(a.exists()).toBe(true)
    expect(a.text()).toBe('Bootstrap')
    expect(a.attributes('href')).toContain('/alpha/phase/acme/acme-f0-bootstrap')
  })

  it('renders the title as plain text when linkTo is absent', () => {
    const w = mountWith(PanelWidget, {
      source: [PHASE_ROW],
      config: { title: 'Fase atual', titleField: 'title', bodyField: 'summary' },
      consumerId: 'alpha',
      depth: 0,
    })
    expect(w.find('.panel-link').exists()).toBe(false)
    expect(w.find('.panel-title').text()).toBe('Bootstrap')
  })
})

describe('PhaseTimelineWidget — per-node title link', () => {
  it('links each step title to its row-scoped detail route', () => {
    const w = mountWith(PhaseTimelineWidget, {
      source: [PHASE_ROW],
      config: { idField: 'id', titleField: 'title', statusField: 'status', linkTo: 'phase/:projectId/:slug' },
      consumerId: 'alpha',
      depth: 0,
    })
    const a = w.find('.ptl-title-link')
    expect(a.exists()).toBe(true)
    expect(a.text()).toBe('Bootstrap')
    expect(a.attributes('href')).toContain('/alpha/phase/acme/acme-f0-bootstrap')
  })

  it('renders step titles as plain text when linkTo is absent', () => {
    const w = mountWith(PhaseTimelineWidget, {
      source: [PHASE_ROW],
      config: { idField: 'id', titleField: 'title', statusField: 'status' },
      consumerId: 'alpha',
      depth: 0,
    })
    expect(w.find('.ptl-title-link').exists()).toBe(false)
    expect(w.find('.ptl-title').text()).toBe('Bootstrap')
  })
})

describe('KanbanBoardWidget — per-card title link', () => {
  it('links each card title to its row-scoped detail route', () => {
    const w = mountWith(KanbanBoardWidget, {
      source: [PHASE_ROW],
      config: {
        columns: ['active'],
        statusField: 'status',
        idField: 'slug',
        titleField: 'title',
        linkTo: 'phase/:projectId/:slug',
      },
      consumerId: 'alpha',
      depth: 0,
    })
    const a = w.find('.kb-title-link')
    expect(a.exists()).toBe(true)
    expect(a.text()).toBe('Bootstrap')
    expect(a.attributes('href')).toContain('/alpha/phase/acme/acme-f0-bootstrap')
  })

  it('renders card titles as plain text when linkTo is absent', () => {
    const w = mountWith(KanbanBoardWidget, {
      source: [PHASE_ROW],
      config: { columns: ['active'], statusField: 'status', idField: 'slug', titleField: 'title' },
      consumerId: 'alpha',
      depth: 0,
    })
    expect(w.find('.kb-title-link').exists()).toBe(false)
    expect(w.find('.ti').text()).toBe('Bootstrap')
  })
})
