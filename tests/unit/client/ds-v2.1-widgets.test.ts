// @vitest-environment jsdom
// DS v2.1 widget extension — success-gate behavior tests for the 6 net-new
// widgets (stepper, status-list, headline-banner, collection-grid,
// record-switcher, catalog) and the callout/progress-bar enhancements.
// Client code is not typechecked, so these assert real rendered DOM.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory, type Router } from 'vue-router'

import StepperWidget from '../../../src/client/components/widgets/StepperWidget.vue'
import StatusListWidget from '../../../src/client/components/widgets/StatusListWidget.vue'
import HeadlineBannerWidget from '../../../src/client/components/widgets/HeadlineBannerWidget.vue'
import CollectionGridWidget from '../../../src/client/components/widgets/CollectionGridWidget.vue'
import RecordSwitcherWidget from '../../../src/client/components/widgets/RecordSwitcherWidget.vue'
import CatalogWidget from '../../../src/client/components/widgets/CatalogWidget.vue'
import CalloutWidget from '../../../src/client/components/widgets/CalloutWidget.vue'
import ProgressBarWidget from '../../../src/client/components/widgets/ProgressBarWidget.vue'
import type { Component } from 'vue'

async function makeRouter(at = '/c/page'): Promise<Router> {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/:consumerId/:pageSlug', component: { template: '<div />' } },
      { path: '/:consumerId/:pageSlug/:detail', component: { template: '<div />' } },
    ],
  })
  router.push(at)
  await router.isReady()
  return router
}

async function mountW(
  component: Component,
  source: Record<string, unknown>[],
  config: Record<string, unknown> = {},
  at = '/c/page',
) {
  const router = await makeRouter(at)
  return mount(component, {
    props: { source, config, consumerId: 'c' },
    global: { plugins: [router] },
  })
}

describe('stepper', () => {
  const STEPS = [
    { id: 's1', label: 'One', status: 'done' },
    { id: 's2', label: 'Two', status: 'active', deps: ['s1'] },
    { id: 's3', label: 'Three', status: 'todo', deps: ['s2'] },
  ]

  it('horizontal: a pill per step, the success step tinted, currentId ringed', async () => {
    const w = await mountW(StepperWidget, STEPS, { currentId: 's2' })
    const pills = w.findAll('.stp-pill')
    expect(pills).toHaveLength(3)
    expect(pills.map((p) => p.text())).toEqual(['s1', 's2', 's3'])
    expect(pills[0].classes()).toContain('c-success')
    expect(pills[1].classes()).toContain('is-current')
  })

  it('vertical: renders dependency line from dependsOnField', async () => {
    const w = await mountW(StepperWidget, STEPS, { orientation: 'vertical', dependsOnField: 'deps' })
    expect(w.text()).toContain('depends on')
    expect(w.text()).toContain('s1')
  })

  it('dense: bare tone dots, no frame head', async () => {
    const w = await mountW(StepperWidget, STEPS, { variant: 'dense' })
    expect(w.findAll('.stp-dot')).toHaveLength(3)
    expect(w.find('.w-head').exists()).toBe(false)
  })

  it('empty source → frame empty state', async () => {
    const w = await mountW(StepperWidget, [], {})
    expect(w.find('.w-empty').exists()).toBe(true)
  })
})

describe('status-list', () => {
  const ITEMS = [
    { id: 'a', label: 'Alpha', status: 'done', kind: 'A' },
    { id: 'b', label: 'Beta', status: 'active', kind: 'B' },
    { id: 'c', label: 'Gamma', status: 'todo', kind: 'A' },
  ]

  it('groupBy renders sections in groupOrder with counts', async () => {
    const w = await mountW(StatusListWidget, ITEMS, { groupBy: 'kind', groupOrder: ['B', 'A'] })
    const labels = w.findAll('.sl-glabel').map((g) => g.text())
    expect(labels).toEqual(['B', 'A'])
    const counts = w.findAll('.sl-gcount').map((g) => g.text())
    expect(counts).toEqual(['1', '2'])
  })

  it('checklist renders ✓ / × / · marks per checkField', async () => {
    const items = [
      { label: 'ok crit', check: 'ok' },
      { label: 'no crit', check: 'no' },
      { label: 'idle crit', check: 'maybe' },
    ]
    const w = await mountW(StatusListWidget, items, { variant: 'checklist', checkField: 'check' })
    const marks = w.findAll('.sl-mark').map((m) => m.text())
    expect(marks).toEqual(['✓', '×', '·'])
  })

  it('annotation replaces the status chip on a row', async () => {
    const items = [{ label: 'A', status: 'active', annotation: '3 blocked' }]
    const w = await mountW(StatusListWidget, items, {})
    expect(w.find('.sl-annot').text()).toBe('3 blocked')
    expect(w.find('.sl-chip').exists()).toBe(false)
  })
})

describe('headline-banner', () => {
  const RECS = [
    { status: 'done' },
    { status: 'active' },
    { status: 'todo', active: false },
  ]

  it('count falls back to source length, one lane per record', async () => {
    const w = await mountW(HeadlineBannerWidget, RECS, { title: 'Records' })
    expect(w.find('.hb-count').text()).toBe('3')
    expect(w.findAll('.hb-lane')).toHaveLength(3)
  })

  it('explicit count wins; inactive lane is faded', async () => {
    const w = await mountW(HeadlineBannerWidget, RECS, { count: 7 })
    expect(w.find('.hb-count').text()).toBe('7')
    expect(w.findAll('.hb-lane').filter((l) => l.classes().includes('is-off'))).toHaveLength(1)
  })
})

describe('collection-grid', () => {
  const RECS = [
    { title: 'A', count: 9 },
    { title: 'B', count: 1 },
  ]

  it('auto-fit grid, one card per record', async () => {
    const w = await mountW(CollectionGridWidget, RECS, { titleField: 'title' })
    expect(w.findAll('.rcard')).toHaveLength(2)
    expect(w.find('.cgrid').attributes('style')).toContain('auto-fit')
  })

  it('attention border applies only when the predicate holds', async () => {
    const w = await mountW(CollectionGridWidget, RECS, {
      titleField: 'title',
      attention: { when: 'count', gt: 5, tone: 'error' },
    })
    const cards = w.findAll('.rcard')
    expect(cards[0].classes()).toContain('attn')
    expect(cards[1].classes()).not.toContain('attn')
  })
})

describe('record-switcher', () => {
  const RECS = [
    { id: 'a', slug: 'a', title: 'Alpha', status: 'active' },
    { id: 'b', slug: 'b', title: 'Beta', status: 'todo' },
  ]

  it('trigger shows the current record (matched by route), dropdown marks it', async () => {
    // resolveRowLink(':slug', recA, 'c') === '/c/a' === route.path → current = Alpha
    const w = await mountW(RecordSwitcherWidget, RECS, { linkTo: ':slug' }, '/c/a')
    expect(w.find('.rs-title').text()).toBe('Alpha')
    await w.find('.rs-trigger').trigger('click')
    const rows = w.findAll('.rs-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].classes()).toContain('on')
    expect(rows[0].find('.rs-check').exists()).toBe(true)
  })

  it('empty source renders nothing actionable', async () => {
    const w = await mountW(RecordSwitcherWidget, [], { linkTo: ':slug' })
    expect(w.find('.rs-trigger').exists()).toBe(false)
  })
})

describe('catalog', () => {
  const RECS = [
    { id: 'alpha', oneLiner: 'first tool', summary: 'does A', facets: ['read'], refs: ['beta'] },
    { id: 'beta', oneLiner: 'second tool', summary: 'does B', facets: ['write'] },
  ]

  it('search filters the master list', async () => {
    const w = await mountW(CatalogWidget, RECS, {})
    expect(w.findAll('.master-row')).toHaveLength(2)
    await w.find('.cat-search input').setValue('second')
    const rows = w.findAll('.master-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('beta')
  })

  it('facet chips AND-filter the list', async () => {
    const w = await mountW(CatalogWidget, RECS, {})
    const chip = w.findAll('.facet-chip').find((c) => c.text() === 'read')
    expect(chip).toBeTruthy()
    await chip!.trigger('click')
    const rows = w.findAll('.master-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('alpha')
  })

  it('a ref chip navigates the detail selection (the graph)', async () => {
    const w = await mountW(CatalogWidget, RECS, {})
    // default selection is the first record; its refs include "beta".
    expect(w.find('.dh-id').text()).toBe('alpha')
    const ref = w.findAll('.io-chip, .ref-chip, .dt-section .chip-row span').find((s) => s.text().includes('beta'))
    expect(ref).toBeTruthy()
    await ref!.trigger('click')
    expect(w.find('.dh-id').text()).toBe('beta')
  })
})

describe('callout enhancement', () => {
  it('renders an uppercase eyebrow and honors a direct tone (incl. neutral)', async () => {
    const w = await mountW(CalloutWidget, [], { eyebrow: 'Note', body: 'hi', tone: 'neutral' })
    expect(w.find('.co-eyebrow').text()).toBe('Note')
    expect(w.find('.callout').classes()).toContain('c-neutral')
  })

  it('tone override beats the variant→tone mapping', async () => {
    const w = await mountW(CalloutWidget, [], { body: 'hi', variant: 'error', tone: 'success' })
    expect(w.find('.callout').classes()).toContain('c-success')
  })
})

describe('progress-bar enhancement', () => {
  const ROW = [{ name: 'P', value: 2, max: 4 }]

  it('valueText overrides the computed fraction', async () => {
    const w = await mountW(ProgressBarWidget, ROW, { valueText: '5/12' })
    expect(w.find('.frac').text()).toBe('5/12')
  })

  it('segmented renders max discrete cells with value filled', async () => {
    const w = await mountW(ProgressBarWidget, ROW, { segmented: true })
    const cells = w.findAll('.pbar-seg i')
    expect(cells).toHaveLength(4)
    expect(cells.filter((c) => c.classes().includes('on'))).toHaveLength(2)
  })

  it('caption renders below the bar; forced tone colors the fill', async () => {
    const w = await mountW(ProgressBarWidget, ROW, { caption: 'note', tone: 'warning' })
    expect(w.find('.pbar-caption').text()).toBe('note')
    expect(w.find('.pbar-track').classes()).toContain('c-warning')
  })
})
