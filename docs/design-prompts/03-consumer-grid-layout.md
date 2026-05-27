# Briefing 3 — Consumer Page: Grid Layout

> Colar no chat do Claude Design. Assume que briefings 1-2 estao estabelecidos.

```
WHAT THIS SCREEN SERVES

A consumer page using the "grid" layout mode — explicit 12-column grid with precise colStart, colSpan, and rowSpan positioning. Used when widgets need precise spatial arrangement, like a kanban board that fills most of the viewport.

This is the demo consumer's "Task Board" page — a single kanban board widget spanning the full grid.

PERSONA AND MOMENT

The developer navigated from Overview to the "Task Board" tab. They want a visual, column-based view of all tasks grouped by status. The kanban board fills the page.

THE MANIFEST DECLARATION

  page:
    slug: board
    title: "Task Board"
    icon: mdi:view-column
    layout: grid
    columns: 12
    rowHeight: 48
    gap: 12
    widgets:
      - widget: kanban-board
        colStart: 1
        colSpan: 12
        rowSpan: 8
        source: tasks
        config:
          columns: [todo, in-progress, done]
          statusField: status

DEMO DATA (same tasks as briefing 2)

  - T-001 Design API schema → done, [design, api]
  - T-002 Implement rate limiting → in-progress, [backend, security]
  - T-003 Write integration tests → todo, [testing]
  - T-004 UI component library → in-progress, [frontend, ui]
  - T-005 Push notification service → todo, [backend, mobile]
  - T-006 Migrate Postgres to BigQuery → todo, [data, migration]
  - T-007 OAuth2 provider setup → done, [auth, security]
  - T-008 Session token rotation → done, [auth, backend]

VISUAL REQUIREMENTS

The grid layout fills the page content area (below the tab bar). The kanban board has 3 columns:

Column "todo" (3 cards): T-003, T-005, T-006
Column "in-progress" (2 cards): T-002, T-004
Column "done" (3 cards): T-001, T-007, T-008

Each column has:
- A header with the column name and a count badge (e.g., "todo 3")
- Cards stacked vertically with gap
- Each card shows: task title, tags as small chips

Column header styling:
- "todo" → neutral/gray
- "in-progress" → cyan/accent
- "done" → green/success

Card styling: surface-level background, subtle border, compact padding. Tags render as small inline chips with muted colors.

The grid layout itself is a CSS grid with explicit row heights (48px per grid row). The kanban widget spans all 12 columns and 8 rows (384px height). The grid shows its structure: if there were multiple widgets, each would snap to specific grid cells.

INTERACTIONS

- Hover on a kanban card: subtle elevation change.
- Column counts update when data changes (SSE).

SCALE AND EDGE CASES

- A column with 0 cards: show "Empty" placeholder text in muted color.
- A column with 10+ cards: vertical scroll within the column, not the page.
- Grid layout with multiple widgets: each positioned by colStart/colSpan/rowSpan, no overlap.
- Grid with a widget that doesn't specify colStart: auto-placed by CSS grid.

DIFFERENCE FROM SECTIONS LAYOUT

Sections layout flows content vertically in named sections. Grid layout is a single explicit grid where each widget has precise placement coordinates. No section headers, no flowing behavior. Think "Grafana dashboard panel" positioning.

NON-NEGOTIABLE CONSTRAINTS

- Exact 12-column grid with configurable rowHeight and gap.
- Widgets positioned by colStart/colSpan/rowSpan CSS grid properties.
- No drag-to-reposition.
- Dark theme. Same widget card frame as sections layout.
- Tab bar (Overview, Task Board active, Analytics) is always visible.

OUT OF SCOPE

- No drag-and-drop for kanban cards.
- No card detail modal on click.
- No column reordering.
```
