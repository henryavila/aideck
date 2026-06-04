// Semantic status vocabulary — maps a consumer status string onto one of the 5
// design-system status tones. The built-in map below is only a convenience
// DEFAULT seed: a consumer supplies its own vocabulary via a `statuses` config
// map (see `statusInfo`), so aiDeck core never privileges one domain's words.

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface StatusInfo {
  tone: Tone
  label: string
  glyph: string
}

// A consumer-supplied value -> partial status presentation. Threaded from a
// widget's `config.statuses`; each field overrides the built-in default.
export type StatusOverrides = Record<string, Partial<StatusInfo>>

const STATUS_MAP: Record<string, StatusInfo> = {
  active: { tone: 'info', label: 'active', glyph: '◉' },
  'in-progress': { tone: 'info', label: 'in-progress', glyph: '◉' },
  running: { tone: 'info', label: 'running', glyph: '◉' },
  done: { tone: 'success', label: 'done', glyph: '✓' },
  passed: { tone: 'success', label: 'passed', glyph: '✓' },
  healthy: { tone: 'success', label: 'healthy', glyph: '✓' },
  paused: { tone: 'warning', label: 'paused', glyph: '!' },
  blocked: { tone: 'warning', label: 'blocked', glyph: '!' },
  warning: { tone: 'warning', label: 'warning', glyph: '!' },
  todo: { tone: 'neutral', label: 'todo', glyph: '·' },
  pending: { tone: 'neutral', label: 'pending', glyph: '·' },
  idle: { tone: 'neutral', label: 'idle', glyph: '·' },
  failed: { tone: 'error', label: 'failed', glyph: '×' },
  error: { tone: 'error', label: 'error', glyph: '×' },
}

// Resolve a status value to its presentation. Resolution order:
//   1. the consumer's `statuses` override for that value (each field wins),
//   2. the built-in convenience map (default seed),
//   3. a neutral fallback that renders the raw value as-is.
// `statuses` is optional, so every existing single-arg call is unaffected.
export function statusInfo(s: string, statuses?: StatusOverrides): StatusInfo {
  const base: StatusInfo = STATUS_MAP[s] ?? { tone: 'neutral', label: s, glyph: '·' }
  const o = statuses?.[s]
  if (!o) return base
  return {
    tone: o.tone ?? base.tone,
    label: o.label ?? base.label,
    glyph: o.glyph ?? base.glyph,
  }
}

/** One ascending threshold band: a value at/above `at` maps onto `tone`. */
export interface ToneBand {
  at: number
  tone: Tone
}

/**
 * Map a numeric value onto a tone using ascending threshold bands: the tone of
 * the highest band whose `at` the value reaches, else `fallback`. Bands need not
 * be pre-sorted. Shared by the scalar meters (Sparkline / ProgressBar /
 * PhaseTimeline) that each used to hand-roll this loop with divergent cutoffs.
 */
export function toneForValue(value: number, bands: ToneBand[], fallback: Tone = 'neutral'): Tone {
  let tone: Tone = fallback
  for (const b of [...bands].sort((a, b) => a.at - b.at)) {
    if (value >= b.at) tone = b.tone
  }
  return tone
}

const CHART_HUES = 8

/** Rotating chart-palette color reference (`var(--chart-N)`), 1-indexed. */
export function chartColor(i: number): string {
  return `var(--chart-${(Math.abs(i) % CHART_HUES) + 1})`
}

/** Human relative time from a "YYYY-MM-DD HH:mm" or ISO timestamp. */
export function relTime(ts: string): string {
  const t = new Date(ts.replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return ts
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/** "2026-05-26 14:00" → "14:00" */
export function shortTime(ts: string): string {
  return ts.length >= 16 ? ts.slice(11, 16) : ts
}
