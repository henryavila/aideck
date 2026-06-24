// @vitest-environment jsdom
// Smoke test: client code is NOT typechecked by any script (both tsconfigs
// exclude src/client), and vite build only validates compilation — not runtime
// mount. This mounts every widget touched by the useStatuses/toneForValue
// refactor with a representative row to catch runtime reference errors.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import type { Component } from 'vue'

import AccordionWidget from '../../../src/client/components/widgets/AccordionWidget.vue'
import BadgeWidget from '../../../src/client/components/widgets/BadgeWidget.vue'
import CardWidget from '../../../src/client/components/widgets/CardWidget.vue'
import KanbanBoardWidget from '../../../src/client/components/widgets/KanbanBoardWidget.vue'
import KeyValueWidget from '../../../src/client/components/widgets/KeyValueWidget.vue'
import ListWidget from '../../../src/client/components/widgets/ListWidget.vue'
import PhaseTimelineWidget from '../../../src/client/components/widgets/PhaseTimelineWidget.vue'
import TableWidget from '../../../src/client/components/widgets/TableWidget.vue'
import TimelineWidget from '../../../src/client/components/widgets/TimelineWidget.vue'
import TreeViewWidget from '../../../src/client/components/widgets/TreeViewWidget.vue'
import SparklineWidget from '../../../src/client/components/widgets/SparklineWidget.vue'
import ProgressBarWidget from '../../../src/client/components/widgets/ProgressBarWidget.vue'
import StepperWidget from '../../../src/client/components/widgets/StepperWidget.vue'
import StatusListWidget from '../../../src/client/components/widgets/StatusListWidget.vue'
import HeadlineBannerWidget from '../../../src/client/components/widgets/HeadlineBannerWidget.vue'
import CollectionGridWidget from '../../../src/client/components/widgets/CollectionGridWidget.vue'
import RecordSwitcherWidget from '../../../src/client/components/widgets/RecordSwitcherWidget.vue'
import CatalogWidget from '../../../src/client/components/widgets/CatalogWidget.vue'

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([]),
}))

const ROW = {
  id: 'x', slug: 'x', title: 'Title', name: 'Name', label: 'Label',
  status: 'active', kind: 'started', value: 5, max: 10, count: 3,
  ts: '2026-01-01 10:00', date: '2026-01-01',
}

// statuses override exercises the useStatuses path; mode/bar exercises toneForValue.
const CASES: { name: string; component: Component; config?: Record<string, unknown>; source?: Record<string, unknown>[] }[] = [
  { name: 'accordion', component: AccordionWidget, config: { statuses: { active: { tone: 'info' } } } },
  { name: 'badge', component: BadgeWidget, config: { statuses: { active: { tone: 'success' } } } },
  { name: 'card', component: CardWidget },
  { name: 'kanban-board', component: KanbanBoardWidget, config: { columns: ['active'] } },
  { name: 'key-value', component: KeyValueWidget },
  { name: 'list', component: ListWidget },
  { name: 'phase-timeline', component: PhaseTimelineWidget, config: { meters: [{ label: 'tasks', valueField: 'value', maxField: 'max' }] } },
  { name: 'table', component: TableWidget },
  { name: 'timeline', component: TimelineWidget },
  { name: 'tree-view', component: TreeViewWidget },
  { name: 'tree-view (fork)', component: TreeViewWidget,
    source: [{ id: 'plan-fork', label: 'plan-fork', slug: 'plan-fork', status: 'active', kind: 'spawned-plan', mode: 'pause' }],
    config: { linkTo: 'plan/:slug', modeField: 'mode', kindField: 'kind' } },
  { name: 'sparkline', component: SparklineWidget, config: { mode: 'bar', valueField: 'value', domain: [0, 10] } },
  { name: 'progress-bar', component: ProgressBarWidget },
  // DS v2.1 widget extension.
  { name: 'stepper (horizontal)', component: StepperWidget, config: { currentId: 'x', statuses: { active: { tone: 'info' } } } },
  { name: 'stepper (vertical)', component: StepperWidget, config: { orientation: 'vertical', selectable: true, linkTo: '/x/:slug' } },
  { name: 'stepper (dense)', component: StepperWidget, config: { variant: 'dense' } },
  { name: 'status-list', component: StatusListWidget },
  { name: 'status-list (groupBy)', component: StatusListWidget, config: { groupBy: 'kind', groupOrder: ['started'] } },
  { name: 'status-list (checklist)', component: StatusListWidget, config: { variant: 'checklist', checkField: 'check' } },
  { name: 'headline-banner', component: HeadlineBannerWidget, config: { count: 7, title: 'Records', tone: 'info' } },
  { name: 'collection-grid', component: CollectionGridWidget, config: { titleField: 'title', attention: { when: 'count', gt: 1, tone: 'error' }, live: { when: 'status' } } },
  { name: 'record-switcher', component: RecordSwitcherWidget, config: { linkTo: '/x/:slug' } },
  { name: 'catalog', component: CatalogWidget },
]

function makeRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push('/x/p')
  return router
}

describe('refactored widgets mount without runtime errors', () => {
  beforeEach(() => vi.clearAllMocks())

  for (const c of CASES) {
    it(`mounts ${c.name}`, async () => {
      const router = makeRouter()
      await router.isReady()
      const wrapper = mount(c.component, {
        props: { source: c.source ?? [ROW], config: c.config ?? {}, consumerId: 'x' },
        global: { plugins: [router] },
      })
      expect(wrapper.exists()).toBe(true)
    })
  }
})
