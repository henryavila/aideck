# Briefing 3 — Consumer Page: Grid Layout

> Colar no chat do Claude Design. Assume que briefings 1-2 estao estabelecidos.

```
WHAT THIS SCREEN SERVES

A consumer page using the "grid" layout mode — explicit 12-column CSS grid with precise colStart, colSpan, and rowSpan positioning per widget. Used when widgets need spatial precision: a kanban board that fills most of the viewport, a tuned KPI dashboard, a Grafana-style panel arrangement.

This is the demo consumer's "Task Board" page — a single kanban board widget spanning the full grid.

PERSONA AND MOMENT

The developer navigated from Overview to the "Task Board" tab. They want a visual, column-based view of all tasks grouped by status. The kanban fills the page.

THE MANIFEST DECLARATION

  page:
    slug: board
    title: "Task Board"
    icon: mdi:view-column
    layout: grid
    columns: 12
    rowHeight: 48
    gap: 10
    widgets:
      - widget: kanban-board
        colStart: 1
        colSpan: 12
        rowSpan: 8
        source: tasks
        config:
          columns: [todo, in-progress, done]
          statusField: status

DEMO DATA (same 8 tasks as briefing 2)

  - T-001 Design API schema             → done,        [design, api]
  - T-002 Implement rate limiting       → in-progress, [backend, security]
  - T-003 Write integration tests       → todo,        [testing]
  - T-004 UI component library          → in-progress, [frontend, ui]
  - T-005 Push notification service     → todo,        [backend, mobile]
  - T-006 Migrate Postgres to BigQuery  → todo,        [data, migration]
  - T-007 OAuth2 provider setup         → done,        [auth, security]
  - T-008 Session token rotation        → done,        [auth, backend]

PAGE CHROME (same as briefing 2)

Page title row "aiDeck Demo · Task Board" + refresh/editor buttons. Tab bar below with Overview, Task Board (active), Analytics.

VISUAL REQUIREMENTS

The grid layout fills the page content area below the tab bar. CSS:
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 48px;
  gap: 10px;

Each widget on the grid uses inline style: grid-column: colStart / span colSpan; grid-row: span rowSpan;

In this example only one widget — the kanban — but show a faint debug indicator overlay (in the briefing only, not production) like "1·1 / 12·8" in the bottom-right corner of the widget to make the slot visible.

THE KANBAN WIDGET

Inside the canonical widget frame (1px --border-default, 8px radius, --bg-surface). Header: "issues · this sprint" (sans 12px / 600 / --fg-default) + meta "22 cards" (mono 10px / --fg-subtle).

Body uses a 3-column flex (1fr each, 8px gap, 8-10px padding around the columns). Each column:

- Background --bg-sunken, 1px --border-subtle, 6px radius, 8px padding
- Column header: row with name (mono 10px / uppercase / --tracking-wider / --fg-muted) on the left, count badge (mono 10px / --fg-default / tabular-nums) on the right
- Column header colors:
    "todo"        → header text --fg-muted, default neutral feel
    "in-progress" → header text --status-info (cyan); count badge can carry the info tint
    "done"        → header text --status-success
- Cards stacked vertically with 6px gap

Each card (a task):
- --bg-surface, 1px --border-default, 4px radius, 7-9px padding, --highlight-inset (1px subtle top shine)
- Optional 2px left edge in --status-info for in-progress cards (a "you are here" affordance)
- Top line: task id in monospace 9-10px / --fg-subtle (e.g., "T-002")
- Title: sans 11-12px / --fg-default, 1.4 line-height
- Tags row below (chips, mono 9px, transparent bg with tinted border using --chart-N colors, height 13-14px, padding 0 5px). Tags map onto chart colors for variety; status colors are reserved for status itself.

Expected column distribution:
- todo: T-003, T-005, T-006 (3)
- in-progress: T-002, T-004 (2)
- done: T-001, T-007, T-008 (3)

DIFFERENCE FROM SECTIONS LAYOUT

Sections flow content vertically in named sections. Grid is a single explicit grid where each widget has precise placement (colStart/colSpan/rowSpan). No section headers, no auto-flow. Think Grafana dashboard or Linear's tuned views.

For the briefing, include a secondary mock showing the SAME grid layout populated with multiple widgets at different spans — a 4-col stat tile, an 8-col chart, a 7-col table, a 5-col KV panel — so the pattern reads as "this is positioning, not a kanban-specific page".

INTERACTIONS

- Hover on a kanban card: subtle elevation change (--shadow-sm)
- Column counts update when data changes (SSE-driven, briefed later)
- Cards have focus-visible ring (--shadow-focus)

SCALE AND EDGE CASES

- A column with 0 cards: terse "// empty" muted note, no illustration
- A column with 10+ cards: vertical scroll within the column, not the page
- Grid layout with multiple widgets: each positioned by colStart/colSpan/rowSpan, no overlap
- Widget without explicit colStart: auto-placed by CSS grid

NON-NEGOTIABLE CONSTRAINTS

- Exact 12-column grid with configurable rowHeight and gap
- Widgets positioned by CSS grid (grid-column / grid-row)
- No drag-to-reposition
- Dark theme. Same canonical widget frame across all layouts
- Tab bar (Overview, Task Board active, Analytics) always visible
- Kanban cards are display-only (no drag-and-drop in v0.1)

OUT OF SCOPE

- No drag-and-drop for kanban cards
- No card detail modal on click
- No column reordering
```
