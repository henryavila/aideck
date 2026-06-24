# Briefing 7 — Widget Group C: Charts & Visualization

> Colar no chat do Claude Design. Component demo page para 3 widgets de graficos.

```
WHAT THIS BRIEFING SERVES

Component demo page for 3 chart/visualization widgets. These render data as visual charts — they need more visual design attention than text-based widgets. Every widget renders inside the canonical aiDeck widget frame.

THE 3 WIDGETS

1. BAR CHART WIDGET (bar-chart)

Vertical or horizontal bar chart for categorical data.

Demo data: tasks grouped by priority
  Priority 2: 1 task
  Priority 3: 3 tasks
  Priority 4: 2 tasks
  Priority 5: 2 tasks

Variations:
a) Vertical bars: 4 bars, one color (--chart-1)
b) Horizontal bars: same data, rotated 90° — each bar with label on the left
c) Multi-series stacked or grouped: tokens (read/write/bash/grep) per day — uses --chart-1, -2, -3, -4 in order
d) Single bar: 1 category — does not look broken (bar has a max-width)

Anatomy:
- Axis labels: mono 9-10px / --fg-muted, "calt" 0
- Bars: --radius-xs to --radius-sm top corners, fill colored, minimum bar height 2px so 0 values are still legible
- Subtle horizontal gridlines (--border-subtle), 3 lines max (25%/50%/75%)
- No vertical gridlines
- Background transparent — widget frame provides the bg
- Tooltip on hover: --bg-elevated background, 1px --border-default, mono 11px text, value shown
- Y-axis scale: auto, rounded to nearest sensible step
- Bar spacing: ~4-8px gap between bars
- Minimum usable height: ~110-140px

2. LINE CHART WIDGET (line-chart)

Line chart for time-series or sequential data.

Demo data: task completion over time (running totals)
  May 25: 2 done
  May 26: 3 done
  (extend with 5-7 more points to make a decent line)

Variations:
a) Single line: one series, ~7 points, --chart-1 stroke
b) Multi-line: 2-4 series with legend at bottom (small color swatch + series name)
c) Area fill: single line with gradient under it (line color at 22% → transparent at 100%)
d) Stacked area: 3-4 series stacked, each fill at 18% opacity

Anatomy:
- X-axis: implicit (no tick labels in dense widgets) or sparse labels in mono 9px
- Y-axis: auto-scaled, 3 horizontal gridlines max
- Line: 1.6-2px stroke, line-cap round, line-join round
- Data points: optional small dots (3-4px circles in the line color)
- Area fill: gradient from line color at 18-25% opacity to transparent
- Multi-series legend: small horizontal flex below the chart, each entry = 10px×2px swatch + 10px mono label
- Tooltip on hover (optional in v0.1): elevated background card showing all series values at the hover position
- Background transparent — the widget frame provides the bg
- Use the CHART PALETTE in order:
    Series 1 → --chart-1 (#5fb1ff azure)
    Series 2 → --chart-2 (#4cc28e emerald)
    Series 3 → --chart-3 (#e668a8 magenta)
    Series 4 → --chart-4 (#e0a44a amber)
    Series 5 → --chart-5 (#8b5cf6 violet)
    Series 6 → --chart-6 (#2dd4bf teal)
    Series 7 → --chart-7 (#f0c757 gold)
    Series 8 → --chart-8 (#f87171 coral, reserved for last)
- Null data points: skip (don't connect across gaps)
- Stroke uses the chart-N hex, not a transparent variant

3. GRAPH/DAG WIDGET (graph-dag)

Renders a directed acyclic graph using Mermaid (lazy-loaded). Used for dependency graphs, pipeline flows, phase relationships.

Demo data: project dependency graph
  Auth Rewrite (done) → API Gateway (active) → Mobile App (active)
  Data Pipeline (paused) → API Gateway

Mermaid source:
  graph TD
    proj4["Auth Service Rewrite"]:::done --> proj1["API Gateway Redesign"]:::active
    proj3["Data Pipeline Migration"]:::paused --> proj1
    proj1 --> proj2["Mobile App v3"]:::active

Variations:
a) Small graph: the demo above (4 nodes, 3 edges)
b) Linear chain: A → B → C → D
c) Wide graph: 1 → fan-out to 5 children
d) Pipeline DAG: build pipeline with parallel + sequential steps (status: ok/active/err/queued)

Anatomy:
- Nodes use rounded rectangles (6-8px radius), 1.2px stroke, semantic fills:
    done    → fill --status-success-bg, stroke --status-success-line
    active  → fill --status-info-bg,    stroke --status-info-line
    paused  → fill --status-warning-bg, stroke --status-warning-line
    error   → fill --status-error-bg,   stroke --status-error-line
    queued  → fill --bg-surface,        stroke --border-default
- Node label: sans 13-14px / 500 / --fg-default
- Node sub-label (optional): mono 10-11px / --fg-muted
- Edges: 1.4px stroke --border-bright, line-cap round, with arrow marker at the end
- The graph auto-fits to the widget body (preserveAspectRatio "xMidYMid meet")
- Optional legend at the bottom: small color swatch + label in mono 9px for each status used in the graph
- Overflow: pan/scroll if graph exceeds card bounds (Mermaid handles)

SHARED VISUAL PROPERTIES

All 3 widgets:
- Canonical widget frame
- Empty state: "// no data to chart" mono note
- Loading state: skeleton placeholder shaped like the chart area
- Background transparent inside the body
- No entrance animation on initial render — values appear instantly
- Hover tooltips use --bg-elevated background with 1px --border-default and --shadow-md
- Tooltips never overflow the card bounds (offset toward the center if near an edge)

DEMO PAGE LAYOUT

  ## Bar Chart
  [a · vertical] [b · horizontal] [c · multi-series] [d · single]

  ## Line Chart
  [a · single] [b · multi] [c · area-fill] [d · stacked]

  ## Graph / DAG
  [a · small] [b · linear] [c · wide] [d · pipeline DAG]

IMPLEMENTATION NOTE

Bar Chart and Line Chart are pure SVG (no external charting library in v0.1). Keep them simple — typical usage is 5-10 data points / 1-4 series. The Graph/DAG widget uses Mermaid, lazy-loaded only when rendered (not bundled with the main app).

NON-NEGOTIABLE

- Dark theme. Chart elements must have sufficient contrast against --bg-surface.
- SVG charts only — never canvas (accessibility: SVG is traversable by screen readers).
- Mermaid for graph-dag only, lazy-loaded.
- Tooltips must not overflow the widget card bounds.
- Use the CHART PALETTE in order — series 1 is --chart-1, series 2 is --chart-2, etc.
- Semantic colors (--status-*) are reserved for STATUS, not arbitrary series. A multi-series line chart uses --chart-*, not --status-*.
```
