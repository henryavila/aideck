// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import WidgetRenderer from '../../../src/client/components/WidgetRenderer.vue'

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

async function mountRepeat(
  binding: Record<string, unknown>,
  records: Record<string, unknown>[],
) {
  const { fetchDataSource } = await import('../../../src/client/api.js')
  vi.mocked(fetchDataSource).mockResolvedValue(records)
  const router = makeRouter('/alpha/overview')
  await router.isReady()
  const wrapper = mount(WidgetRenderer, {
    props: { binding: { widget: 'table', source: { ref: 'items' }, ...binding }, consumerId: 'alpha' },
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

const labelTexts = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.repeat-label').map(l => l.text()).sort()

describe('WidgetRenderer repeat group labels', () => {
  beforeEach(() => vi.clearAllMocks())

  // ─── §2a repeatLabelField ────────────────────────────────────────────────

  it('renders the sibling repeatLabelField value verbatim (not capitalized)', async () => {
    const wrapper = await mountRepeat(
      { repeat: 'parentPlan', repeatLabelField: 'parentPlanTitle' },
      [
        { id: '1', parentPlan: 'plan-a', parentPlanTitle: 'iOS App Revamp' },
        { id: '2', parentPlan: 'plan-a', parentPlanTitle: 'iOS App Revamp' },
        { id: '3', parentPlan: 'plan-b', parentPlanTitle: 'API Gateway' },
      ],
    )
    // Verbatim: case from the consumer is preserved (would be mangled by capitalize).
    expect(labelTexts(wrapper)).toEqual(['API Gateway', 'iOS App Revamp'])
  })

  it('falls back to the humanized grouping key when repeatLabelField is unset', async () => {
    const wrapper = await mountRepeat({ repeat: 'parentPlan' }, [
      { id: '1', parentPlan: 'project-orchestrator-redesign' },
      { id: '2', parentPlan: 'another-plan-here' },
    ])
    expect(labelTexts(wrapper)).toEqual(['Another Plan Here', 'Project Orchestrator Redesign'])
  })

  it('falls back to the humanized key when the repeatLabelField value is empty', async () => {
    const wrapper = await mountRepeat(
      { repeat: 'parentPlan', repeatLabelField: 'parentPlanTitle' },
      [
        { id: '1', parentPlan: 'plan-a', parentPlanTitle: '' },
        { id: '2', parentPlan: 'plan-b', parentPlanTitle: '' },
      ],
    )
    expect(labelTexts(wrapper)).toEqual(['Plan A', 'Plan B'])
  })

  // ─── §2b repeatLabel visibility ──────────────────────────────────────────

  it("'auto' (default) hides the header for a single group", async () => {
    const wrapper = await mountRepeat({ repeat: 'status' }, [
      { id: '1', status: 'open' },
      { id: '2', status: 'open' },
    ])
    expect(wrapper.find('.repeat-container').exists()).toBe(true)
    expect(wrapper.findAll('.repeat-label')).toHaveLength(0)
  })

  it("'auto' (default) shows the header for two or more groups", async () => {
    const wrapper = await mountRepeat({ repeat: 'status' }, [
      { id: '1', status: 'open' },
      { id: '2', status: 'closed' },
    ])
    expect(wrapper.findAll('.repeat-label')).toHaveLength(2)
  })

  it("'always' shows the header even for a single group", async () => {
    const wrapper = await mountRepeat({ repeat: 'status', repeatLabel: 'always' }, [
      { id: '1', status: 'open' },
      { id: '2', status: 'open' },
    ])
    const labels = wrapper.findAll('.repeat-label')
    expect(labels).toHaveLength(1)
    expect(labels[0].text()).toBe('Open')
  })

  it("'never' hides the header even with multiple groups", async () => {
    const wrapper = await mountRepeat({ repeat: 'status', repeatLabel: 'never' }, [
      { id: '1', status: 'open' },
      { id: '2', status: 'closed' },
    ])
    expect(wrapper.findAll('.repeat-label')).toHaveLength(0)
  })

  // ─── §2c humanize the raw key ────────────────────────────────────────────

  it('humanizes a slug key (spaces + title-case, never hyphen-mangled)', async () => {
    const wrapper = await mountRepeat({ repeat: 'parentPlan' }, [
      { id: '1', parentPlan: 'project-orchestrator-redesign' },
      { id: '2', parentPlan: 'foco' },
    ])
    const texts = labelTexts(wrapper)
    expect(texts).toContain('Project Orchestrator Redesign')
    expect(texts).not.toContain('Project-Orchestrator-Redesign')
  })

  // ─── backward-compat ─────────────────────────────────────────────────────

  it('a repeat-only binding still groups correctly', async () => {
    const wrapper = await mountRepeat({ repeat: 'status' }, [
      { id: '1', status: 'open' },
      { id: '2', status: 'closed' },
      { id: '3', status: 'open' },
    ])
    const groups = (wrapper.vm as unknown as { repeatGroups: { key: string; records: unknown[] }[] }).repeatGroups
    expect(groups.map(g => g.key).sort()).toEqual(['closed', 'open'])
    expect(groups.find(g => g.key === 'open')!.records).toHaveLength(2)
  })
})
