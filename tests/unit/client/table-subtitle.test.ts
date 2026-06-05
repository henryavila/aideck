// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import TableWidget from '../../../src/client/components/widgets/TableWidget.vue'

// config.subtitles folds a second field under a column's value as a muted line
// (title in front, summary beneath) instead of widening the table into its own
// column — the readability fix for the Foco "Agora" task table.
function makeRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [{ path: '/:consumerId/:pageSlug', component: { template: '<div />' } }],
  })
  router.push('/alpha/board')
  return router
}

const ROWS = [
  { id: 'T-1', title: 'Do the thing', summary: 'one-line what-it-does', status: 'active' },
  { id: 'T-2', title: 'No summary here', summary: '', status: 'pending' },
]

async function mountTable() {
  const router = makeRouter()
  await router.isReady()
  return mount(TableWidget, {
    props: {
      source: ROWS,
      config: { columns: ['id', 'title', 'status'], subtitles: { title: 'summary' } },
      consumerId: 'alpha',
      depth: 0,
    },
    global: { plugins: [router] },
  })
}

describe('TableWidget — config.subtitles folds a field under its column', () => {
  it('renders the column value as the primary line and the mapped field as a muted sub-line', async () => {
    const wrapper = await mountTable()
    await flushPromises()

    const primaries = wrapper.findAll('.cell-primary')
    const subs = wrapper.findAll('.cell-sub')

    // Row 1 has a summary → both lines render.
    expect(primaries[0].text()).toBe('Do the thing')
    expect(subs[0].text()).toBe('one-line what-it-does')
  })

  it('omits the sub-line (and renders plain) when the mapped field is empty', async () => {
    const wrapper = await mountTable()
    await flushPromises()

    // Only one row carries a summary → exactly one sub-line in the table.
    expect(wrapper.findAll('.cell-sub')).toHaveLength(1)
    // The summary-less row still shows its title text.
    expect(wrapper.text()).toContain('No summary here')
  })

  it('top-aligns a subtitled column (.has-sub) so the two-line cell reads cleanly', async () => {
    const wrapper = await mountTable()
    await flushPromises()
    expect(wrapper.find('td.has-sub').exists()).toBe(true)
  })
})
