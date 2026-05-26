export function widgetGridStyle(widget: {
  colSpan?: number
  colStart?: number
  rowSpan?: number
}): Record<string, string> {
  const style: Record<string, string> = {}
  if (widget.colStart) {
    style.gridColumn = `${widget.colStart} / span ${widget.colSpan ?? 1}`
  } else if (widget.colSpan) {
    style.gridColumn = `span ${widget.colSpan}`
  }
  if (widget.rowSpan) style.gridRow = `span ${widget.rowSpan}`
  return style
}
