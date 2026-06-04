// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { toneForValue, type ToneBand } from '../../../src/client/utils/status.js'
import { useStatuses } from '../../../src/client/composables/useStatuses.js'

describe('toneForValue', () => {
  // Bands lifted from the three widgets that used to hand-roll the loop.
  const PBAR: ToneBand[] = [
    { at: 30, tone: 'warning' },
    { at: 50, tone: 'info' },
    { at: 90, tone: 'success' },
  ]
  const PHASE: ToneBand[] = [
    { at: 1, tone: 'warning' },
    { at: 50, tone: 'info' },
    { at: 100, tone: 'success' },
  ]
  const SPARK: ToneBand[] = [
    { at: 0, tone: 'neutral' },
    { at: 0.2, tone: 'warning' },
    { at: 0.4, tone: 'info' },
    { at: 0.6, tone: 'success' },
  ]

  it('reproduces ProgressBar TONE_FOR_PCT (fallback error)', () => {
    expect(toneForValue(95, PBAR, 'error')).toBe('success')
    expect(toneForValue(90, PBAR, 'error')).toBe('success')
    expect(toneForValue(70, PBAR, 'error')).toBe('info')
    expect(toneForValue(40, PBAR, 'error')).toBe('warning')
    expect(toneForValue(10, PBAR, 'error')).toBe('error')
  })

  it('reproduces PhaseTimeline toneForPct (fallback neutral)', () => {
    expect(toneForValue(100, PHASE, 'neutral')).toBe('success')
    expect(toneForValue(60, PHASE, 'neutral')).toBe('info')
    expect(toneForValue(5, PHASE, 'neutral')).toBe('warning')
    expect(toneForValue(0, PHASE, 'neutral')).toBe('neutral')
  })

  it('reproduces Sparkline default bands (normalized 0..1)', () => {
    expect(toneForValue(0.7, SPARK)).toBe('success')
    expect(toneForValue(0.5, SPARK)).toBe('info')
    expect(toneForValue(0.3, SPARK)).toBe('warning')
    expect(toneForValue(0.1, SPARK)).toBe('neutral')
    expect(toneForValue(0, SPARK)).toBe('neutral')
  })

  it('does not require pre-sorted bands and falls back when below every band', () => {
    const unsorted: ToneBand[] = [
      { at: 90, tone: 'success' },
      { at: 30, tone: 'warning' },
      { at: 50, tone: 'info' },
    ]
    expect(toneForValue(95, unsorted, 'error')).toBe('success')
    expect(toneForValue(40, unsorted, 'error')).toBe('warning')
    expect(toneForValue(0, [], 'neutral')).toBe('neutral')
  })

  it('defaults the fallback to neutral', () => {
    expect(toneForValue(-1, [{ at: 0, tone: 'success' }])).toBe('neutral')
  })
})

describe('useStatuses', () => {
  it('reads config.statuses reactively', () => {
    const overrides = { done: { tone: 'success' as const } }
    expect(useStatuses({ config: { statuses: overrides } }).value).toEqual(overrides)
  })

  it('is undefined when config has no statuses map', () => {
    expect(useStatuses({ config: {} }).value).toBeUndefined()
  })
})
