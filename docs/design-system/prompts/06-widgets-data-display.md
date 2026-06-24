# Briefing 6 — Widget Group B: Data Tables & Lists

> Colar no chat do Claude Design. Component demo page para 5 widgets de exibicao de dados.

```
WHAT THIS BRIEFING SERVES

Component demo page for 5 data-display widgets. These are the workhorses of any consumer dashboard — they show collections of records in different formats. Every widget renders inside the canonical aiDeck widget frame.

THE 5 WIDGETS

1. TABLE WIDGET (table)

A data table with sortable columns, alternating-feel rows, sticky header.

Demo data (4 projects):
  id     | title                    | status | owner | startDate
  proj-1 | API Gateway Redesign     | active | Alice | 2026-04-01
  proj-2 | Mobile App v3            | active | Bob   | 2026-03-15
  proj-3 | Data Pipeline Migration  | paused | Carol | 2026-02-01
  proj-4 | Auth Service Rewrite     | done   | Dave  | 2026-01-10

Variations:
a) Full table: all columns, 4 rows — default auto-detected columns
b) Configured columns: only [title, status, owner] — subset via config
c) Wide table: 10+ columns with horizontal scroll and sticky first column
d) Empty table: 0 rows — "// no data" centered in body, "clear filter →" action

Anatomy:
- Sticky header row: --bg-canvas background, mono 10px / 500 / uppercase / --tracking-wide / --fg-subtle, 1px --border-subtle bottom border, 6-8px cell padding
- Data rows: --bg-surface, 1px --border-subtle bottom border between rows, hover bg --bg-elevated
- First-column id cells: mono 11px / --fg-subtle (let the eye scan IDs in monospace)
- Numeric cells: mono 11px / tabular-nums / right-aligned
- Status column values render as soft semantic chip (NOT just colored text)
- Null/undefined → "—" (em-dash, --fg-faint)
- Long text truncated with ellipsis, max-width per cell
- Object/array values rendered as compact JSON (mono 10px / --fg-muted)
- Sort caret on sortable headers: tiny ▴/▾ in mono 9px / --fg-subtle, becomes --status-info when active

2. LIST WIDGET (list)

A vertical list of items. Simpler than table — one or two fields per row, optional leading slot.

Demo data (8 tasks):
  - Design API schema (done)
  - Implement rate limiting (in-progress)
  - Write integration tests (todo)
  - UI component library (in-progress)
  - Push notification service (todo)
  - Migrate Postgres to BigQuery (todo)
  - OAuth2 provider setup (done)
  - Session token rotation (done)

Variations:
a) Basic list: titleField="title" — just titles
b) With trailing chip: title + status chip on the right (semantic color)
c) With leading mono left: monospace timestamp/date in fixed-width cell on the left
d) Three-column row: left (mono 11px / --fg-subtle, fixed 80-88px), middle (sans 12px / --fg-default, grow), right (chip)
e) Empty list: 0 items, terse note

Anatomy:
- Item row: flex, gap 8px, 5-6px vertical padding, 1px --border-subtle bottom between items (no border on last)
- Title: sans 12px / --fg-default, single line, ellipsis on overflow
- Subtitle (optional): mono 10-11px / --fg-muted below title
- Status chip variant uses the semantic chip atom
- Hover row: --bg-elevated, 3-4px radius

3. KEY-VALUE WIDGET (key-value)

Displays a single record (or a small set of fields) as key-value pairs. Used for detail views, metadata panels.

Demo data — one project:
  id: proj-1
  title: API Gateway Redesign
  status: active
  owner: Alice
  startDate: 2026-04-01

Variations:
a) Vertical pairs: each pair on its own row, key left and value right (justify-content: space-between)
b) Horizontal grid: 2-column grid of keys + values, denser
c) Subset: only [title, status, owner] via config.fields
d) With status color: status row value renders with semantic color or chip

Anatomy:
- Each row: flex space-between, 4-5px vertical padding, 1px --border-subtle bottom (none on last)
- Key: mono 11px / --fg-subtle / lowercase (or kept verbatim)
- Value: sans 11-12px / --fg-default, mono 11-12px for ids/paths/dates
- Status row: value rendered as soft chip OR colored text in the semantic hue

4. CARD WIDGET (card / card-grid)

Renders multiple records as cards in a responsive grid. Each card shows key fields of one record.

Demo data: the 4 projects as cards

Variations:
a) Basic cards: titleField="title", subtitleField="owner"
b) With fields: titleField + fields=["status", "startDate"]
c) Single card: 1 record — still renders as a card (not a key-value)
d) Many cards: 8 records — wraps into multiple rows

Anatomy:
- Each card: nested in the parent widget frame, uses a "sub-card" treatment: --bg-elevated background, 1px --border-default, 6px radius, 10-12px padding
- Title row: sans 12-13px / 600 / --fg-default
- Subtitle: mono 10-11px / --fg-muted below title
- Detail fields: small key-value rows under a 1px --border-subtle top border
- Card grid: CSS grid auto-fill minmax(200px, 1fr), 10-12px gap
- Hover: border becomes --border-bright

5. TAG CHIP WIDGET (tag-chip)

Renders unique values from an array field as outlined chips. Used for tag clouds, category displays. Tags are NOT semantic — variety reads as data variety.

Demo data: tags from all 8 tasks
  design (1), api (1), backend (3), security (2), testing (1),
  frontend (1), ui (1), mobile (1), data (1), migration (1), auth (2)

Variations:
a) All tags with counts: 11 unique tags as outlined chips with monospace count suffix
b) Without counts: just tag names
c) Few tags: 2-3 tags — doesn't look sparse (each chip can fill more horizontal space)
d) Many tags: 30+ tags — wraps gracefully

Anatomy:
- Square chips (--radius-sm), transparent background, 1px tinted border, color from --chart-1..8 rotating across the cloud
- Mono 10px / 500 text with "calt" 0
- Height ~18-20px, padding 0 7px
- Optional count suffix in mono 9px / --fg-subtle, separated by a tiny gap
- Wrap with 5-6px gap

SHARED VISUAL PROPERTIES

All 5 widgets render inside the canonical widget frame. Empty/loading/error states consistent with widget-frame spec.

DEMO PAGE LAYOUT

  ## Table
  [a · full] [b · configured] [c · wide-scroll] [d · empty]

  ## List
  [a · basic] [b · with-chip] [c · with-mono-left] [d · 3-column] [e · empty]

  ## Key-Value
  [a · vertical] [b · 2-col grid] [c · subset] [d · with-status]

  ## Card
  [a · basic] [b · with-fields] [c · single] [d · many]

  ## Tag Chip
  [a · all-with-counts] [b · no-counts] [c · few] [d · many]

NON-NEGOTIABLE

- Dark theme. Same canonical card frame across all widgets.
- Table is the most important widget — it must look polished. Sticky header, mono first-column ids, semantic status chips, readable at 12px body.
- Tag chips are display-only, NOT buttons. Use --radius-sm (square-ish) so they don't look like pills/CTAs.
- Status chips reuse the soft chip atom (--status-{kind}-bg + --status-{kind}-line + --status-{kind} text).
- Numeric cells use tabular-nums.
```
