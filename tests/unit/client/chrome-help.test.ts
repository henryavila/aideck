// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChromeHeader from '../../../src/client/components/shell/ChromeHeader.vue'

const base = { crumb: ['alpha'], hasSidebar: true }

describe('ChromeHeader help button', () => {
  it('hides the ? button when no help page is declared (no inert button)', () => {
    const wrapper = mount(ChromeHeader, { props: { ...base, hasHelp: false } })
    expect(wrapper.find('.chrome-help').exists()).toBe(false)
  })

  it('shows the ? button and emits open-help on click when help exists', async () => {
    const wrapper = mount(ChromeHeader, { props: { ...base, hasHelp: true } })
    const btn = wrapper.find('.chrome-help')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(wrapper.emitted('open-help')).toHaveLength(1)
  })

  it('marks the button active (aria-pressed) when on the help page', () => {
    const wrapper = mount(ChromeHeader, { props: { ...base, hasHelp: true, helpActive: true } })
    const btn = wrapper.find('.chrome-help')
    expect(btn.classes()).toContain('on')
    expect(btn.attributes('aria-pressed')).toBe('true')
  })
})
