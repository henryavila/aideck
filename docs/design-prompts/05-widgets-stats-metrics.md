# Briefing 5 — Widget Group A: Stats & Metrics

> Colar no chat do Claude Design. Este briefing e um COMPONENT DEMO PAGE — uma pagina que renderiza todos os widgets deste grupo com dados reais, para validacao visual e documentacao.

```
WHAT THIS BRIEFING SERVES

A component demo page showing 4 widgets from the Stats & Metrics group, each in multiple configurations, with real data. This page serves as visual validation and as documentation for consumer authors who want to know what each widget looks like.

Design this as a single scrollable page with a clear header per widget, followed by 2-3 variations of that widget with different configurations.

THE 4 WIDGETS

1. STAT WIDGET (stat)

The simplest widget: a large number with a label below. Used for KPI/metric counters.

Variations to show:
a) Basic count: value="4", label="Total Projects" — plain text, default color
b) Colored count: value="2", label="Active", color=cyan (accent)
c) Colored count: value="3", label="Tasks Done", color=green (success)
d) Large value: value="1,247", label="Lines of Code" — test large numbers

Anatomy:
- Large number (2xl font, bold, primary color or custom color)
- Small label below (sm font, muted color)
- Centered vertically and horizontally in its card
- No icon, no sparkline, no trend indicator

2. GAUGE WIDGET (gauge)

A visual indicator showing a single value relative to a maximum. Used for progress metrics, health scores, completion percentages.

Variations to show:
a) Low value: value=2, max=5, label="Avg Priority" — 40% fill
b) Mid value: value=65, max=100, label="Coverage %" — 65% fill, amber color
c) High value: value=92, max=100, label="Uptime %" — 92% fill, green color
d) Over threshold: value=4.8, max=5, label="Critical" — 96% fill, red color

Anatomy:
- A circular or semi-circular gauge (developer preference: not a full pie, more like a speedometer arc)
- The current value displayed prominently in the center
- The label below
- Color transitions: green (good) → amber (warning) → red (critical) based on configurable thresholds, OR a single color passed by config

3. PROGRESS BAR WIDGET (progress-bar)

A horizontal bar showing completion progress. Simpler than gauge, inline-friendly.

Variations to show:
a) 0%: value=0, max=8, label="Tasks Completed" — empty bar
b) 37%: value=3, max=8, label="Tasks Completed" — partial fill
c) 100%: value=8, max=8, label="All Tasks Done" — full bar, green
d) With percentage text: value=65, max=100, label="Test Coverage" — "65%" shown on the bar

Anatomy:
- Horizontal bar with background track (bg-elevated) and fill (accent color)
- Label to the left or above
- Optional: value text inside or beside the bar
- Height: compact (8-12px bar), fits in tight layouts

4. BADGE WIDGET (badge)

Renders distinct values from a data field as colored pills/chips with counts. Used for status distribution, category breakdown.

Demo data: task statuses from the demo consumer
  - done: 3 (green)
  - in-progress: 2 (cyan)
  - todo: 3 (amber or neutral)

Variations to show:
a) Status distribution: field="status" from tasks — shows 3 badges with counts
b) Priority distribution: field="priority" from tasks — shows values 2,3,4,5 with counts
c) Single badge: just one status value — renders as a single inline chip

Anatomy:
- Horizontal row of pill-shaped badges
- Each pill: background tinted with the semantic color, white text, count appended (e.g., "done 3")
- If no color mapping exists for a value, use a neutral gray
- Wraps to next line if too many badges

SHARED VISUAL PROPERTIES

All 4 widgets:
- Render inside the standard widget card frame (surface background, border, radius, consistent padding)
- Have an empty state: "No data" centered in muted text
- Have a loading state: shimmer/skeleton matching the widget's shape
- Support a widget title slot (optional, from section.title or explicit)

DEMO PAGE LAYOUT

Render all variations in a 2-column grid, one widget per cell, with a section header above each widget group:

  ## Stat
  [basic] [colored] [colored] [large]

  ## Gauge
  [low] [mid] [high] [critical]

  ## Progress Bar
  [0%] [37%] [100%] [with-text]

  ## Badge
  [status] [priority] [single]

NON-NEGOTIABLE

- Dark theme only.
- All widgets use the same card frame.
- Colors are semantic: success=green, accent=cyan, warning=amber, danger=red.
- Gauge and progress bar must be SVG or CSS (no canvas, no external charting lib for these simple widgets).
```
