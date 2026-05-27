# Briefing 7 — Widget Group C: Charts & Visualization

> Colar no chat do Claude Design. Component demo page para 3 widgets de graficos.

```
WHAT THIS BRIEFING SERVES

Component demo page for 3 chart/visualization widgets. These render data as visual charts — they need more visual design attention than text-based widgets.

THE 3 WIDGETS

1. BAR CHART WIDGET (bar-chart)

Vertical or horizontal bar chart for categorical data comparison.

Demo data: tasks grouped by priority
  Priority 2: 1 task (T-003)
  Priority 3: 3 tasks (T-001, T-004, T-008)
  Priority 4: 2 tasks (T-002, T-006)
  Priority 5: 2 tasks (T-005, T-007)

Variations:
a) Vertical bars: labelField="priority", valueField="count" — 4 bars
b) Horizontal bars: same data, horizontal orientation
c) Colored by value: bars colored by a gradient (low=green, high=red) based on value
d) Single bar: 1 category — doesn't look broken

Anatomy:
- Axis labels in muted text (sm font)
- Bars with rounded top corners, accent color fill
- Value label on top of or inside each bar
- Grid lines: very subtle (border-subtle color), horizontal only
- Y-axis (or X for horizontal): auto-scaled, nice round numbers
- Background: transparent (card background shows through)
- Tooltip on hover: shows exact value

Chart sizing:
- Fills the widget card area
- Minimum usable height: ~200px
- Bars have consistent width with gap between

2. LINE CHART WIDGET (line-chart)

Line chart for time-series or sequential data.

Demo data: task completion over time (derived from events)
  Day 1 (May 25): 2 tasks done (T-007, T-008)
  Day 2 (May 26): 1 task done (T-001)
  Running total: [0, 2, 3]

Variations:
a) Single line: completed tasks over time — 3 data points
b) Multi-line: 2 series (done vs started) over time — 2 lines with legend
c) Area fill: single line with gradient fill below
d) Many points: 30 data points — smooth curve, readable at density

Anatomy:
- X-axis: time labels (dates or relative)
- Y-axis: numeric values, auto-scaled
- Line: 2px stroke, accent color, with data point dots (4px circles)
- Area fill: gradient from line color at 30% opacity to transparent
- Grid lines: subtle horizontal lines
- Legend (multi-line): small color squares + series name, positioned top-right
- Tooltip on hover: shows value at nearest point
- Smooth curve interpolation (bezier, not jagged line segments)

3. GRAPH/DAG WIDGET (graph-dag)

Renders a directed acyclic graph using Mermaid. Used for dependency graphs, flow charts, phase relationships.

Demo data: project dependency graph
  proj-4 (Auth Rewrite) → proj-1 (API Gateway) → proj-2 (Mobile App)
  proj-3 (Data Pipeline) → proj-1 (API Gateway)

Mermaid source:
  graph TD
    proj-4["Auth Service Rewrite ✓"]:::done --> proj-1["API Gateway Redesign ◉"]:::active
    proj-3["Data Pipeline Migration ·"]:::paused --> proj-1
    proj-1 --> proj-2["Mobile App v3 ◉"]:::active

Variations:
a) Small graph: 4 nodes, 3 edges — the demo above
b) Linear chain: A → B → C → D — simple sequence
c) Wide graph: fan-out from one node to 5 children

Anatomy:
- Mermaid renders inside the widget card
- Node styling: use the dark theme colors (surface bg, border, accent for active)
- Edge styling: subtle arrows, muted color
- Status-based node colors: done=green border, active=cyan border, pending=gray, paused=amber
- The graph auto-fits to the card size
- Overflow: pan/scroll if graph exceeds card bounds

SHARED VISUAL PROPERTIES

All 3 widgets:
- Standard widget card frame
- Empty state: "No data to chart"
- Charts use the same color palette for consistency (accent-cyan as primary, with 5-6 secondary hues for multi-series)
- Chart backgrounds are transparent — the card frame provides the background
- Tooltips: elevated surface bg, small text, appears on hover with pointer
- No animation on initial render (developer audience, not marketing page)

Chart color palette (for multi-series):
  Series 1: #58a6ff (cyan)
  Series 2: #56d364 (green)
  Series 3: #d29922 (amber)
  Series 4: #f85149 (red)
  Series 5: #a371f7 (purple)
  Series 6: #db61a2 (magenta)

DEMO PAGE LAYOUT

  ## Bar Chart
  [vertical] [horizontal] [colored] [single]

  ## Line Chart
  [single-line] [multi-line] [area-fill] [many-points]

  ## Graph/DAG
  [small] [linear] [wide]

IMPLEMENTATION NOTE

Bar Chart and Line Chart should be pure SVG (no external charting library in v0.1). Keep them simple — 5-6 data points max in typical usage. The Graph/DAG widget uses Mermaid (lazy-loaded).

NON-NEGOTIABLE

- Dark theme. Chart elements must have sufficient contrast against --bg-surface.
- SVG charts, not canvas (accessibility: screen readers can traverse SVG).
- Mermaid for graph-dag only — it is lazy-loaded, not bundled.
- Tooltips must not overflow the card bounds.
```
