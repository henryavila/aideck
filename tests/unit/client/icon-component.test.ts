// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Icon from '../../../src/client/components/shell/Icon.vue'

describe('Icon component', () => {
  it('renders an mdi token as a webfont <i> element', () => {
    const wrapper = mount(Icon, { props: { icon: 'mdi:target' } })
    const i = wrapper.find('i.mdi')
    expect(i.exists()).toBe(true)
    expect(i.classes()).toContain('mdi-target')
    expect(wrapper.find('.icon-glyph').exists()).toBe(false)
  })

  it('renders a literal glyph/emoji as text', () => {
    const wrapper = mount(Icon, { props: { icon: '🎯' } })
    expect(wrapper.find('i.mdi').exists()).toBe(false)
    expect(wrapper.find('.icon-glyph').text()).toBe('🎯')
  })

  it('falls back to ◆ for a non-mdi token or no icon', () => {
    expect(mount(Icon, { props: { icon: 'other:x' } }).find('.icon-glyph').text()).toBe('◆')
    expect(mount(Icon, { props: {} }).find('.icon-glyph').text()).toBe('◆')
  })
})
