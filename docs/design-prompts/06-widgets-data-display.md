# Briefing 6 — Widget Group B: Data Tables & Lists

> Colar no chat do Claude Design. Component demo page para 5 widgets de exibicao de dados.

```
WHAT THIS BRIEFING SERVES

Component demo page for 5 data-display widgets. These are the workhorses of any consumer dashboard — they show collections of records in different formats.

THE 5 WIDGETS

1. TABLE WIDGET (table)

A data table with sortable columns, alternating row colors, sticky header.

Demo data: the 4 projects
  id       | title                    | status  | owner | startDate
  proj-1   | API Gateway Redesign     | active  | Alice | 2026-04-01
  proj-2   | Mobile App v3            | active  | Bob   | 2026-03-15
  proj-3   | Data Pipeline Migration  | paused  | Carol | 2026-02-01
  proj-4   | Auth Service Rewrite     | done    | Dave  | 2026-01-10

Variations:
a) Full table: all columns, 4 rows — default auto-detected columns
b) Configured columns: only [title, status, owner] — subset via config
c) Wide table: 10+ columns — horizontal scroll with sticky first column
d) Empty table: 0 rows — "No data" centered

Anatomy:
- Sticky header row with column names, muted text, uppercase, small font
- Data rows with alternating bg (surface/tertiary)
- Hover highlight per row
- Status column values use semantic colors inline (text color or small dot)
- Null/undefined values render as "—"
- Long text truncated with ellipsis, max-width per cell
- Object/array values rendered as JSON string

2. LIST WIDGET (list)

A vertical list of items. Simpler than table — one or two fields per row, no columns.

Demo data: the 8 tasks as a simple list
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
b) With subtitle: titleField="title", subtitleField="status" — title + status below
c) With icon: titleField="title", icon by status — colored dot before each item
d) Empty list: 0 items

Anatomy:
- Each item: a horizontal row with optional icon/dot, title text, optional subtitle
- Items separated by subtle border or spacing
- Hover highlight
- Compact vertical rhythm (each item ~32-40px height)

3. KEY-VALUE WIDGET (key-value)

Displays a single record as key-value pairs. Used for detail views, metadata panels.

Demo data: one project record
  id: proj-1
  title: API Gateway Redesign
  status: active
  owner: Alice
  startDate: 2026-04-01

Variations:
a) Vertical pairs: each key-value on its own line — key in muted, value in primary
b) Horizontal pairs: key and value side by side in 2 columns
c) Subset: only [title, status, owner] — via config.fields
d) With status color: status value rendered with semantic color

Anatomy:
- Key: small font, muted color, optionally uppercase
- Value: normal font, primary color
- Pairs separated by spacing or subtle divider
- Compact: fits in a small card (colSpan: 3-4)

4. CARD WIDGET (card / card-grid)

Renders multiple records as cards in a responsive grid. Each card shows key fields of one record.

Demo data: the 4 projects as cards

Variations:
a) Basic cards: titleField="title", subtitleField="owner" — title + owner per card
b) With fields: titleField="title", fields=["status", "startDate"] — title + 2 detail rows
c) Single card: 1 record — still renders as a card, not a key-value
d) Many cards: 8 records — wraps into multiple rows

Anatomy:
- Card: surface background, border, radius, padding
- Title: bold, primary color
- Subtitle: muted, below title
- Detail fields: key-value pairs below a subtle top border
- Cards in a responsive grid: auto-fill, minmax(200px, 1fr)
- Hover: subtle border accent

5. TAG CHIP WIDGET (tag-chip)

Renders unique values from an array field as colored chips. Used for tag clouds, category displays.

Demo data: tags from all 8 tasks
  design: 1, api: 1, backend: 3, security: 2, testing: 1,
  frontend: 1, ui: 1, mobile: 1, data: 1, migration: 1, auth: 2

Variations:
a) All tags: field="tags" — 11 unique tags as chips with counts
b) Without counts: just the tag names as pills
c) Few tags: 2-3 tags — doesn't look sparse

Anatomy:
- Horizontal wrapping row of pill-shaped chips
- Each chip: subtle background tint, text color, optional count suffix
- Colors: rotate through a palette for variety (no semantic meaning for tags)
- Compact: fits in small cards or inline

SHARED VISUAL PROPERTIES

All 5 widgets:
- Standard widget card frame
- Empty state: "No data"
- Loading skeleton matching widget shape
- Consistent typography: table headers match list labels match key-value keys

DEMO PAGE LAYOUT

  ## Table
  [full] [configured] [wide-scroll] [empty]

  ## List
  [basic] [with-subtitle] [with-icon] [empty]

  ## Key-Value
  [vertical] [horizontal] [subset] [colored-status]

  ## Card
  [basic] [with-fields] [single] [many]

  ## Tag Chip
  [all-tags] [no-counts] [few-tags]

NON-NEGOTIABLE

- Dark theme. Same card frame across all widgets.
- Table is the most important widget — it must look polished. Sticky header, good contrast, readable at 12-14px font.
- Tags/chips should NOT look like buttons — they are display-only, not interactive.
```
