// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownWidget from '../../../src/client/components/widgets/MarkdownWidget.vue'

function render(md: string) {
  return mount(MarkdownWidget, { props: { source: [], config: { content: md } } })
}

describe('MarkdownWidget link sanitization (XSS via v-html)', () => {
  it('neutralizes javascript: scheme in links', () => {
    const w = render('[click](javascript:alert(1))')
    const a = w.find('a')
    expect(a.exists()).toBe(true)
    expect(a.attributes('href')).toBe('#')
    expect(w.html()).not.toContain('javascript:')
  })

  it('prevents attribute breakout via a quote in the URL', () => {
    const w = render('[x](https://evil.test" onmouseover="alert(1))')
    const a = w.find('a')
    expect(a.exists()).toBe(true)
    // The injected quote must be escaped, so no extra attribute is parsed.
    expect(a.attributes('onmouseover')).toBeUndefined()
  })

  it('keeps safe http(s) links and sets rel=noopener noreferrer', () => {
    const w = render('[ok](https://example.com)')
    const a = w.find('a')
    expect(a.attributes('href')).toBe('https://example.com')
    expect(a.attributes('rel')).toContain('noopener')
    expect(a.attributes('rel')).toContain('noreferrer')
  })
})
