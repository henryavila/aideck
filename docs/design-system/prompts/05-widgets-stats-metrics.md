# Briefing 5 — Widget Group A: Stats & Metrics

> Colar no chat do Claude Design. Este briefing e um COMPONENT DEMO PAGE — uma pagina que renderiza todos os widgets deste grupo com dados reais, para validacao visual e documentacao.

```
WHAT THIS BRIEFING SERVES

A component demo page showing 4 widgets from the Stats & Metrics group, each in multiple configurations, with real data. This page serves as visual validation and as documentation for consumer authors who want to know what each widget looks like.

Design this as a single scrollable page with a section header per widget, followed by 3-4 variations of that widget with different configurations. Every widget renders inside the canonical aiDeck widget frame (1px --border-default, 8px radius, --bg-surface, --shadow-ambient, optional header with title + meta).

THE 4 WIDGETS

1. STAT WIDGET (stat)

The simplest widget: a large number with a label. Used for KPI/metric counters.

Variations to show:
a) Basic count: value="4", label="Total Projects" — sans 30-32px / 600 / --tracking-tight / tabular-nums / --fg-default
b) Colored count: value="2", label="Active", color=--status-info (cyan)
c) Colored count: value="3", label="Tasks Done", color=--status-success (emerald)
d) Large value: value="1,247,381", label="Lines of Code" — tabular-nums keeps thousands aligned

Anatomy:
- Optional label as uppercase eyebrow above (mono 10px / --tracking-wider / --fg-subtle)
- Big number (sans 30-32px / 600 / tabular-nums)
- Optional delta below (mono 10-11px): "↑ 12.4%" in --status-success, "↓ 0.4 ms" in --status-error
- Centered vertically and horizontally in its body
- No icon, no sparkline by default

2. GAUGE WIDGET (gauge)

A semicircular arc showing a value relative to a maximum. Used for progress metrics, health scores.

Variations to show:
a) Low value: value=2, max=5, label="Avg Priority" — 40% fill, --chart-4 (amber)
b) Mid value: value=65, max=100, label="Coverage %" — 65% fill, --chart-2 (emerald)
c) High value: value=92, max=100, label="Uptime %" — 92% fill, --status-success
d) Critical: value=4.8, max=5, label="Load Avg" — 96% fill, --status-error

Anatomy:
- Semicircular arc (path d="M 16 96 A 84 84 0 0 1 184 96", 264px length, 12-14px stroke, round caps)
- Track: --bg-elevated. Fill: configurable color (defaults --chart-2)
- Center text: value (sans 24-28px / 600 / tabular-nums / --fg-default)
- Sub-text below center: optional "X of Y" (mono 10px / --fg-muted / 0.05em letter-spacing)
- Optional color transitions: green → amber → red thresholds, OR a single static color from config
- SVG only (no canvas, no charting lib)

3. PROGRESS BAR WIDGET (progress-bar)

A horizontal bar showing completion. Simpler than gauge, inline-friendly.

Variations to show:
a) 0%: value=0, max=8, label="Tasks Completed" — empty bar
b) 37%: value=3, max=8 — partial fill in --status-info
c) 100%: value=8, max=8 — full bar in --status-success
d) With percentage text: value=65, max=100, label="Test Coverage" — "65%" shown beside or inside the bar
e) STACKED variant: multi-row progress (e.g., 5 packages, each its own bar with name + fraction)

Anatomy:
- Track: 6-8px height, --bg-elevated, 3-4px radius, overflow hidden
- Fill: configurable color, transitions on value change (200ms ease-out)
- Label and fraction sit ABOVE the track on the same row: label left (sans 12px / --fg-default), fraction right (mono 11px / --fg-muted / tabular-nums, e.g., "3 / 8")
- Compact: each bar row ~22-28px total height

4. BADGE WIDGET (badge)

Renders distinct values from a data field as colored pills with counts. Used for status distribution, category breakdown.

Demo data: task statuses
  - done: 3
  - in-progress: 2
  - todo: 3

Variations to show:
a) Status distribution: field="status" — 3 soft pills, semantic colors (done=success, in-progress=info, todo=neutral)
b) Priority distribution: field="priority" — 4 pills (2, 3, 4, 5) — uses --chart-N rotation since priority is not semantic
c) Single badge: just one status value rendered as a single inline chip
d) With glyph prefix: each pill starts with a Unicode glyph (✓ done · ◉ in-progress · · todo)

Anatomy:
- Each pill: height 18-22px, padding 0 8px, --radius-pill (999px), 1px tinted border, soft tinted background, semantic-color text
- Optional 5px dot left of label (color matching text)
- Count suffix as monospace 10px / 500 / --fg-default (so it reads as data, not decoration)
- Pills wrap to next line at narrow widths

SHARED VISUAL PROPERTIES

All 4 widgets render inside the canonical widget frame:
- Header (optional): title slot left (sans 12px / 600 / --fg-default), meta slot right (mono 10px / uppercase / --tracking-wide / --fg-subtle)
- Body: padding 10-14px, content vertically centered for stat/gauge
- Empty state: terse mono note "// no data" in --fg-subtle, centered
- Loading state: .skeleton placeholder shaped like the widget content (number-shaped for stat, arc for gauge, full-width bar for progress, pill row for badge)
- Error state: coral border (--status-error-line), header bg tinted, structured suggestion in the body

DEMO PAGE LAYOUT

Render variations in a 4-column responsive grid (auto-fill, minmax(220px, 1fr)) with a section header above each widget group:

  ## Stat
  [a · basic] [b · info] [c · success] [d · large]

  ## Gauge
  [a · low] [b · mid] [c · high] [d · critical]

  ## Progress Bar
  [a · 0%] [b · 37%] [c · 100%] [d · with-text] [e · stacked spans full width]

  ## Badge
  [a · status] [b · priority] [c · single] [d · with-glyph]

NON-NEGOTIABLE

- Dark theme only.
- All widgets use the same card frame — no decorative variations.
- Colors are semantic for status fields; chart palette (--chart-1..8) for non-semantic categories (priority, tags).
- Gauge and progress bar are pure SVG/CSS (no canvas, no external charting lib for these simple widgets).
- All numerics use tabular-nums.
- No animation on initial render (developer audience).
```
