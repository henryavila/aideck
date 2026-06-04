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

vi.mock('../../../src/client/api.js', () => ({
  fetchDataSource: vi.fn().mockResolvedValue([]),
}))

const ROW = {
  id: 'x', slug: 'x', title: 'Title', name: 'Name', label: 'Label',
  status: 'active', kind: 'started', value: 5, max: 10, count: 3,
  ts: '2026-01-01 10:00', date: '2026-01-01',
}

// statuses override exercises the useStatuses path; mode/bar exercises toneForValue.
const CASES: { name: string; component: Component; config?: Record<string, unknown> }[] = [
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
  { name: 'sparkline', component: SparklineWidget, config: { mode: 'bar', valueField: 'value', domain: [0, 10] } },
  { name: 'progress-bar', component: ProgressBarWidget },
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
        props: { source: [ROW], config: c.config ?? {}, consumerId: 'x' },
        global: { plugins: [router] },
      })
      expect(wrapper.exists()).toBe(true)
    })
  }
})
