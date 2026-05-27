# Briefing 9 — Widget Group E: Activity & Navigation

> Colar no chat do Claude Design. Component demo page para 8 widgets de atividade e navegacao.

```
WHAT THIS BRIEFING SERVES

Component demo page for 8 widgets covering activity feeds, navigation, and specialized interactions. These are the most visually complex widgets in the library.

THE 8 WIDGETS

1. KANBAN BOARD WIDGET (kanban-board)

Column-based board for status-grouped items. Already shown in briefing 3 (grid layout), but this demo shows additional variations.

Demo data: 8 tasks grouped by status (todo/in-progress/done)

Variations:
a) 3 columns: todo (3), in-progress (2), done (3) — standard
b) 4 columns: add "blocked" column with 0 items — handles empty column
c) Compact cards: only title, no tags — minimal card variant
d) Rich cards: title + tags + priority + owner — full detail variant

Anatomy:
- Columns: equal width, horizontal flex layout
- Column header: name + count badge, surface-bg header row
- Cards: stacked vertically, compact padding
- Card content: title (bold), optional tags (chips), optional fields (muted text)
- Empty column: "Empty" centered, muted
- Column overflow: vertical scroll within column

2. TIMELINE WIDGET (timeline)

Vertical chronological feed of events. Used for activity history, audit logs.

Demo data: 6 events
  2026-05-26 14:00 — Task T-001 marked done — Design approved by team (Alice)
  2026-05-26 13:30 — Task T-002 started — Rate limiting implementation began (Alice)
  2026-05-26 12:00 — Project proj-3 paused — Waiting for BigQuery quota approval (Carol)
  2026-05-25 16:00 — Task T-007 marked done — OAuth2 provider tested and deployed (Dave)
  2026-05-25 14:00 — Task T-008 marked done — Token rotation with 24h TTL (Dave)
  2026-05-25 10:00 — Task T-004 started — Component library scaffold with Storybook (Bob)

Variations:
a) Standard: all 6 events with timestamp, title, detail, actor
b) Compact: timestamp + title only, no detail text
c) Grouped by day: events grouped under date headers (May 26, May 25)
d) Single event: 1 event — doesn't look broken

Anatomy:
- Vertical line (timeline spine) on the left, subtle color (border-default)
- Each event: a dot on the spine + content block to the right
- Dot color: can match event type (done=green, started=cyan, paused=amber)
- Timestamp: small muted text, relative ("2 hours ago") or absolute
- Title: primary text, one line
- Detail: muted text below title, optional
- Actor: small chip or text after timestamp
- Events flow top (newest) to bottom (oldest)

3. LOG FEED WIDGET (log-feed)

Compact scrolling log of messages. Like a terminal output or audit log. Denser than timeline.

Demo data: same 6 events, but rendered as one-line log entries

Variations:
a) Standard: timestamp + message per line — monospace feel
b) Colored by level: info=muted, warn=amber, error=red
c) Auto-scroll: new entries appear at bottom, auto-scrolls to latest
d) Many entries: 50+ lines — vertical scroll

Anatomy:
- Monospace or small font
- Each line: [timestamp] message — one line per entry
- No decorative elements (no dots, no spine, no cards)
- Background: slightly elevated from card (like a terminal window)
- Timestamps: muted color, fixed width for alignment
- Messages: primary color
- Scroll: vertical, with auto-scroll-to-bottom behavior
- Compact: each line ~24px height

4. TREE VIEW WIDGET (tree-view)

Hierarchical tree with expand/collapse. Already shown in briefing 4 (single layout).

Demo data: projects → tasks hierarchy (4 projects with 8 tasks)

Variations:
a) Default expanded to depth 2: all project nodes expanded, tasks visible
b) Collapsed: only top-level project nodes visible
c) Deep tree: 3 levels deep (category → project → task)
d) With badges: each node shows status badge beside title

Anatomy:
- Indentation per level (16-24px per depth)
- Expand/collapse toggle: chevron or +/- icon
- Node icon: folder for parents, file/dot for leaves
- Node text: primary color, with optional badge
- Connecting lines: subtle vertical + horizontal lines (box-drawing style) or indentation only
- Selected/focused node: accent background highlight

5. BREADCRUMB WIDGET (breadcrumb)

Horizontal path showing navigation hierarchy. Used at the top of detail pages.

Demo data:
  Home > aiDeck Demo > Overview

Variations:
a) 3 levels: Home > aiDeck Demo > Overview — standard
b) 2 levels: Home > aiDeck Demo — consumer landing
c) 4 levels: Home > Consumer > Page > Detail — deep navigation
d) Truncated: very long labels — ellipsis on middle segments

Anatomy:
- Horizontal row of text segments separated by chevrons (>) or slashes (/)
- Current (last) segment: primary color, not clickable
- Previous segments: muted color, underline on hover, clickable
- Separator: muted, small
- Compact: single line, no wrapping

6. HEADER NAV WIDGET (header-nav)

A navigation bar with links. Used for consumer-level navigation when a consumer declares a sidebar or header nav.

Demo data:
  Links: Overview (active), Task Board, Analytics, Settings

Variations:
a) Horizontal tabs: 4 links in a row — active has accent underline
b) With icons: each link has an icon prefix (mdi icons)
c) Many links: 8+ links — overflow handling
d) Vertical sidebar: same links rendered vertically (sidebar variant)

Anatomy:
- Horizontal: flex row, each link is a button/link with text + optional icon
- Active link: accent color + bottom border (or background highlight)
- Inactive: muted text, hover shows primary text
- Vertical: stacked list, active has left border accent
- Compact: each link ~32-40px height

7. DRAWER WIDGET (drawer)

A slide-in panel from the side of the viewport. Used for filters, details, annotations.

Variations:
a) Right drawer: slides from right, 320px width, with close button
b) Left drawer: slides from left (sidebar variant)
c) With content: drawer containing a list widget inside
d) Overlay: drawer overlays content with a dimmed backdrop

Anatomy:
- Panel: elevated background, full viewport height, fixed position
- Header: title + close button (X), border-bottom
- Body: scrollable content area
- Close: X button, Esc key
- Backdrop (overlay mode): semi-transparent dark overlay on main content
- Width: configurable, default 320px
- Transition: slide-in from edge (subtle, fast)

8. SEARCH FILTER WIDGET (search-filter)

A text input for filtering displayed data. Typically placed above a table or list.

Variations:
a) Basic search: text input with search icon, placeholder "Search..."
b) With filter chips: search + active filter chips below (status: active, tags: backend)
c) Instant filter: typing filters a table below in real-time
d) Empty results: search term matches nothing — "No results for 'xyz'"

Anatomy:
- Input: full-width text input, surface background, border, rounded
- Search icon: left side of input, muted
- Clear button: right side, appears when text is entered
- Filter chips below input: small removable pills showing active filters
- Placeholder text: muted
- Focus state: accent border

DEMO PAGE LAYOUT

  ## Kanban Board
  [3-col] [4-col] [compact] [rich]

  ## Timeline
  [standard] [compact] [grouped] [single]

  ## Log Feed
  [standard] [colored] [auto-scroll] [many]

  ## Tree View
  [expanded] [collapsed] [deep] [with-badges]

  ## Breadcrumb
  [3-level] [2-level] [4-level] [truncated]

  ## Header Nav
  [horizontal] [with-icons] [many-links] [vertical]

  ## Drawer
  [right] [left] [with-content] [overlay]

  ## Search Filter
  [basic] [with-chips] [instant-filter] [empty-results]

NON-NEGOTIABLE

- Dark theme. Same card frame for all widgets.
- Kanban: no drag-and-drop (display only).
- Timeline and Log Feed must feel distinctly different — timeline is visual/rich, log feed is compact/terminal.
- Tree View expand/collapse is keyboard-accessible (Enter/Space).
- Drawer must not trap focus — Esc always closes.
- Search input must be styled consistently with form inputs elsewhere (if any).
- Breadcrumb links are functional navigation, not decorative text.
```
