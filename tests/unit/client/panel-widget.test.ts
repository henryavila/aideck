// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PanelWidget from '../../../src/client/components/widgets/PanelWidget.vue'

// A framed, boxless single-record panel: frame header (config.title) + a
// prominent line (titleField) + a muted line (bodyField), rendered directly in
// the frame body — the "Fase atual" panel that sits beside progress-bar.
const REC = [
  { id: 'i-1', title: 'Redesign the orchestrator', summary: 'one-line muted body', status: 'active' },
]

function mountPanel(config: Record<string, unknown>, source = REC) {
  return mount(PanelWidget, { props: { source, config, consumerId: 'alpha', depth: 0 } })
}

const PHASE_CONFIG = { title: 'Fase atual', titleField: 'title', bodyField: 'summary' }

describe('PanelWidget — labeled boxless single-record panel', () => {
  it('renders config.title as the frame header label', () => {
    const w = mountPanel(PHASE_CONFIG)
    expect(w.find('.w-head').exists()).toBe(true)
    expect(w.find('.w-title').text()).toContain('Fase atual')
  })

  it('renders titleField as the prominent line and bodyField as the muted line', () => {
    const w = mountPanel(PHASE_CONFIG)
    expect(w.find('.panel-title').text()).toBe('Redesign the orchestrator')
    expect(w.find('.panel-sub').text()).toBe('one-line muted body')
  })

  // MUST-FIX regression: config.title is the header ONLY. It must not feed the
  // prominent line, or "Fase atual" duplicates and swallows record[titleField].
  it('does not let config.title leak into the prominent title line', () => {
    const w = mountPanel(PHASE_CONFIG)
    expect(w.find('.w-title').text()).toContain('Fase atual') // header
    expect(w.find('.panel-title').text()).toBe('Redesign the orchestrator')
    expect(w.find('.panel-title').text()).not.toBe('Fase atual')
  })

  it('renders boxless — no .callout / .subcard bordered box, framed .w (not a card grid)', () => {
    const w = mountPanel(PHASE_CONFIG)
    expect(w.find('.callout').exists()).toBe(false)
    expect(w.find('.subcard').exists()).toBe(false)
    // Framed .w chrome gives the equal-height grid stretch; not a min-width card grid.
    expect(w.find('.w').exists()).toBe(true)
    expect(w.find('.cards-grid').exists()).toBe(false)
  })

  it('falls back to the frame empty state when neither field resolves', () => {
    const w = mountPanel(PHASE_CONFIG, [{ id: 'x' }])
    expect(w.find('.panel-body').exists()).toBe(false)
    expect(w.find('.w-empty').exists()).toBe(true)
    // The header label still renders even when the body is empty.
    expect(w.find('.w-title').text()).toContain('Fase atual')
  })

  it('still renders a title-only panel when the body field is unresolved', () => {
    const w = mountPanel(PHASE_CONFIG, [{ id: 'i', title: 'Only a title' }])
    expect(w.find('.panel-title').text()).toBe('Only a title')
    expect(w.find('.panel-sub').exists()).toBe(false)
  })

  it('still renders a body-only panel when the title field is unresolved', () => {
    const w = mountPanel(PHASE_CONFIG, [{ id: 'i', summary: 'just a summary' }])
    expect(w.find('.panel-sub').text()).toBe('just a summary')
    expect(w.find('.panel-title').exists()).toBe(false)
  })
})
