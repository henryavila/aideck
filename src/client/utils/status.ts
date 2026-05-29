// Semantic status vocabulary — maps arbitrary consumer status strings onto
// the 5 design-system status tones. Ported from the design handoff (data.jsx).

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface StatusInfo {
  tone: Tone
  label: string
  glyph: string
}

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

export function statusInfo(s: string): StatusInfo {
  return STATUS_MAP[s] ?? { tone: 'neutral', label: s, glyph: '·' }
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
