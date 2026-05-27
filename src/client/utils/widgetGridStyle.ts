import type { Breakpoint } from '../composables/useBreakpoint.js'

interface ResponsiveOverride {
  colSpan?: number
  colStart?: number
  rowSpan?: number
  visible?: boolean
}

interface WidgetPlacement {
  colSpan?: number
  colStart?: number
  rowSpan?: number
  responsive?: Partial<Record<Breakpoint, ResponsiveOverride>>
}

export function widgetGridStyle(
  widget: WidgetPlacement,
  breakpoint?: Breakpoint
): Record<string, string> {
  const override = breakpoint ? widget.responsive?.[breakpoint] : undefined

  const colSpan = override?.colSpan ?? widget.colSpan
  const colStart = override?.colStart ?? widget.colStart
  const rowSpan = override?.rowSpan ?? widget.rowSpan

  const style: Record<string, string> = {}
  if (colStart) {
    style.gridColumn = `${colStart} / span ${colSpan ?? 1}`
  } else if (colSpan) {
    style.gridColumn = `span ${colSpan}`
  }
  if (rowSpan) style.gridRow = `span ${rowSpan}`
  return style
}

export function isWidgetVisible(
  widget: WidgetPlacement,
  breakpoint?: Breakpoint
): boolean {
  if (!breakpoint) return true
  const override = widget.responsive?.[breakpoint]
  return override?.visible !== false
}
