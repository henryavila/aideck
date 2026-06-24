// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { iconGlyph, isRenderableIcon, mdiClass } from '../../../src/client/utils/icon.js'

describe('mdiClass', () => {
  it('maps an mdi token to its webfont class', () => {
    expect(mdiClass('mdi:target')).toBe('mdi-target')
    expect(mdiClass('mdi:view-dashboard')).toBe('mdi-view-dashboard')
  })
  it('returns null for non-mdi icons', () => {
    expect(mdiClass('🎯')).toBeNull()
    expect(mdiClass('other:thing')).toBeNull()
    expect(mdiClass(undefined)).toBeNull()
  })
})

describe('iconGlyph', () => {
  it('renders a literal glyph/emoji as-is', () => {
    expect(iconGlyph('🎯')).toBe('🎯')
    expect(iconGlyph('◆')).toBe('◆')
  })

  it('degrades an icon-font token to the neutral fallback', () => {
    // iconGlyph is the non-font fallback; mdi tokens render via mdiClass instead.
    expect(iconGlyph('mdi:target')).toBe('◆')
  })

  it('falls back when no icon is supplied', () => {
    expect(iconGlyph(undefined)).toBe('◆')
  })
})

describe('isRenderableIcon', () => {
  it('is true for a literal glyph and for an mdi token, false otherwise', () => {
    expect(isRenderableIcon('🎯')).toBe(true)
    expect(isRenderableIcon('mdi:target')).toBe(true) // now rendered via the webfont
    expect(isRenderableIcon('other:thing')).toBe(false)
    expect(isRenderableIcon(undefined)).toBe(false)
  })
})
