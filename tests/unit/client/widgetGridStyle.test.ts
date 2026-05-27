import { describe, it, expect } from 'vitest'
import { widgetGridStyle, isWidgetVisible } from '../../../src/client/utils/widgetGridStyle.js'

describe('widgetGridStyle', () => {
  it('returns empty object for a widget with no placement', () => {
    expect(widgetGridStyle({})).toEqual({})
  })

  it('applies colSpan as span', () => {
    expect(widgetGridStyle({ colSpan: 6 })).toEqual({ gridColumn: 'span 6' })
  })

  it('applies colStart with colSpan', () => {
    expect(widgetGridStyle({ colStart: 2, colSpan: 4 })).toEqual({
      gridColumn: '2 / span 4',
    })
  })

  it('applies colStart with default colSpan of 1', () => {
    expect(widgetGridStyle({ colStart: 3 })).toEqual({
      gridColumn: '3 / span 1',
    })
  })

  it('applies rowSpan', () => {
    expect(widgetGridStyle({ rowSpan: 3 })).toEqual({ gridRow: 'span 3' })
  })

  it('applies all placement fields together', () => {
    expect(widgetGridStyle({ colStart: 1, colSpan: 6, rowSpan: 2 })).toEqual({
      gridColumn: '1 / span 6',
      gridRow: 'span 2',
    })
  })

  describe('responsive overrides', () => {
    it('overrides colSpan at sm breakpoint', () => {
      const widget = {
        colSpan: 3,
        responsive: { sm: { colSpan: 12 } },
      }
      expect(widgetGridStyle(widget, 'sm')).toEqual({ gridColumn: 'span 12' })
    })

    it('uses base colSpan when breakpoint has no override', () => {
      const widget = {
        colSpan: 3,
        responsive: { sm: { colSpan: 12 } },
      }
      expect(widgetGridStyle(widget, 'lg')).toEqual({ gridColumn: 'span 3' })
    })

    it('overrides colStart at md breakpoint', () => {
      const widget = {
        colStart: 1,
        colSpan: 6,
        responsive: { md: { colStart: 3, colSpan: 4 } },
      }
      expect(widgetGridStyle(widget, 'md')).toEqual({
        gridColumn: '3 / span 4',
      })
    })

    it('overrides rowSpan at xl breakpoint', () => {
      const widget = {
        rowSpan: 2,
        responsive: { xl: { rowSpan: 4 } },
      }
      expect(widgetGridStyle(widget, 'xl')).toEqual({ gridRow: 'span 4' })
    })

    it('falls back to base when responsive exists but breakpoint key is missing', () => {
      const widget = {
        colSpan: 6,
        responsive: { sm: { colSpan: 12 } },
      }
      expect(widgetGridStyle(widget, 'xl')).toEqual({ gridColumn: 'span 6' })
    })

    it('falls back to base when no breakpoint is provided', () => {
      const widget = {
        colSpan: 6,
        responsive: { sm: { colSpan: 12 } },
      }
      expect(widgetGridStyle(widget)).toEqual({ gridColumn: 'span 6' })
    })

    it('overrides only colSpan, keeping base colStart', () => {
      const widget = {
        colStart: 2,
        colSpan: 6,
        responsive: { sm: { colSpan: 12 } },
      }
      expect(widgetGridStyle(widget, 'sm')).toEqual({
        gridColumn: '2 / span 12',
      })
    })

    it('overrides only colStart, keeping base colSpan', () => {
      const widget = {
        colStart: 1,
        colSpan: 6,
        responsive: { md: { colStart: 4 } },
      }
      expect(widgetGridStyle(widget, 'md')).toEqual({
        gridColumn: '4 / span 6',
      })
    })
  })
})

describe('isWidgetVisible', () => {
  it('returns true when no responsive config exists', () => {
    expect(isWidgetVisible({})).toBe(true)
    expect(isWidgetVisible({}, 'sm')).toBe(true)
  })

  it('returns true when breakpoint has no override', () => {
    const widget = { responsive: { sm: { visible: false } } }
    expect(isWidgetVisible(widget, 'lg')).toBe(true)
  })

  it('returns false when breakpoint sets visible to false', () => {
    const widget = { responsive: { sm: { visible: false } } }
    expect(isWidgetVisible(widget, 'sm')).toBe(false)
  })

  it('returns true when breakpoint sets visible to true', () => {
    const widget = { responsive: { sm: { visible: true } } }
    expect(isWidgetVisible(widget, 'sm')).toBe(true)
  })

  it('returns true when breakpoint override exists but visible is not set', () => {
    const widget = { responsive: { md: { colSpan: 6 } } }
    expect(isWidgetVisible(widget, 'md')).toBe(true)
  })

  it('returns true when no breakpoint is provided', () => {
    const widget = { responsive: { sm: { visible: false } } }
    expect(isWidgetVisible(widget)).toBe(true)
  })
})
