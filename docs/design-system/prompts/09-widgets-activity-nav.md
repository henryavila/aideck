# Briefing 9 — Widget Group E: Activity & Navigation

> Colar no chat do Claude Design. Component demo page para 8 widgets de atividade e navegacao.

```
WHAT THIS BRIEFING SERVES

Component demo page for 8 widgets covering activity feeds, navigation, and specialized interactions. These are the most visually complex widgets in the library. Every widget renders inside the canonical aiDeck widget frame.

THE 8 WIDGETS

1. KANBAN BOARD WIDGET (kanban-board)

Column-based board for status-grouped items. Already shown in briefing 3 (grid layout); this demo shows variations.

Demo data: 8 tasks grouped by status

Variations:
a) 3 columns: todo (3) · in-progress (2) · done (3) — standard
b) 4 columns: add "blocked" with 0 items — handles empty column
c) Compact cards: title only — minimal card
d) Rich cards: title + tags + priority + owner — full detail

Anatomy:
- Columns: equal width via CSS grid (1fr each), 8px gap
- Each column: --bg-sunken background, 1px --border-subtle, 6px radius, 8px padding
- Column header: row with name on the left (mono 10px / uppercase / --tracking-wider / --fg-muted, semantic color for in-progress/done as in briefing 3) and count on the right (mono 10px / tabular-nums / --fg-default)
- Cards inside column: stacked vertically with 6px gap, see briefing 3 anatomy
- Empty column: mono "// empty" centered in --fg-subtle, no graphic
- Column overflow: vertical scroll within the column

2. TIMELINE WIDGET (timeline)

Vertical chronological feed of events. Used for activity history, audit logs.

Demo data: 6 events (from the consumer)
  2026-05-26 14:00 — Task T-001 marked done — Alice
  2026-05-26 13:30 — Task T-002 started — Alice
  2026-05-26 12:00 — Project proj-3 paused — Carol
  2026-05-25 16:00 — Task T-007 marked done — Dave
  2026-05-25 14:00 — Task T-008 marked done — Dave
  2026-05-25 10:00 — Task T-004 started — Bob

Variations:
a) Standard: timestamp + title + sub-detail + actor
b) Compact: timestamp + title only
c) Grouped by day: events grouped under date headers
d) Single event: 1 event — doesn't look broken

Anatomy:
- Vertical spine: 1px --border-default, 5-6px from the left
- Each event: a 7px dot on the spine (semantic color by event kind: done=success, started=info, paused=warning, error=error). Dot has a 2px border in the semantic color and --bg-surface fill so it sits on top of the spine. Info-kind dots get a subtle box-shadow glow (--status-info @ 60%).
- Content to the right of the spine: 14-18px left padding
  - Timestamp: mono 10px / --fg-subtle / 0.04em letter-spacing
  - Title: sans 12px / --fg-default, 2px top margin
  - Sub-detail: mono 10-11px / --fg-muted (or --status-warning when relevant), 1-2px top margin
- Events flow top (newest) to bottom (oldest)
- Day-grouped variant: date header row (mono 10px / uppercase / --fg-subtle) above each day's events

3. LOG FEED WIDGET (log-feed)

Compact scrolling log of messages. Like a terminal tail. Denser than timeline.

Demo data (same events, rendered as one-line log entries):
  14:00:00  ok    Task T-001 marked done       Alice
  13:30:00  info  Task T-002 started           Alice
  12:00:00  warn  Project proj-3 paused        Carol
  yesterday 16:00 ok    Task T-007 marked done       Dave
  ...

Variations:
a) Standard: timestamp + level + message + key/val
b) Colored by level: ok/info green-blue, warn amber, err coral
c) Auto-scroll: new entries appear at bottom, auto-scrolls to latest
d) Many entries: 50+ lines — vertical scroll

Anatomy:
- Container: --bg-sunken background, --radius-sm, 10-12px padding
- Each line: --font-mono 11px / 1.6 line-height, "calt" 0, white-space nowrap, overflow ellipsis
- Columns inline (no table — inline spans):
    [timestamp]  : --fg-subtle, ~62px width
    [level]      : 44-46px width, colored:
                     ok    → --status-success
                     info  → --status-info
                     warn  → --status-warning
                     err   → --status-error
    [message]    : --fg-default
    [key=val]    : key in --chart-3 (magenta), val in --fg-muted
- "Live" header indicator: small green dot + "streaming" mono 10px in the widget header meta slot when SSE is connected
- Auto-scroll behavior: when at bottom, auto-follows; user scrolling up pauses follow until they scroll back to bottom

4. TREE VIEW WIDGET (tree-view)

Hierarchical tree with expand/collapse. Already shown in briefing 4 (single layout); this demo shows variations.

Demo data: projects → tasks hierarchy

Variations:
a) Default expanded to depth 2
b) Collapsed: only top-level project nodes visible
c) Deep tree: 3 levels (category → project → task)
d) With badges: each node shows a status chip beside title

Anatomy:
- Container: --font-mono 11-12px / 1.65 line-height / "calt" 0
- Indentation: 16-20px per depth level (use left padding)
- Caret: ▾ (open) / ▸ (closed), 10px width, --fg-subtle, padded so click target is comfortable
- Name: --fg-default for files; --chart-1 (azure) for directory nodes
- Meta slot on the right (mono 9-10px / --fg-subtle): file size, count, last-modified
- Selected/focused row: --status-info-bg background, 3px radius, name color → --status-info, 1-6px horizontal padding
- Hover: --bg-elevated
- Keyboard: ↑/↓ move focus, →/← expand/collapse, Enter selects

5. BREADCRUMB WIDGET (breadcrumb)

Horizontal path showing navigation hierarchy. Used at the top of detail pages and in the chrome header.

Demo data:
  Home > aiDeck Demo > Overview

Variations:
a) 3 levels (default)
b) 2 levels (consumer landing)
c) 4 levels (deep navigation)
d) Truncated: very long labels — ellipsis on middle segments

Anatomy:
- Horizontal flex, 6px gap
- Segments: sans 12px / --fg-muted, link cursor for previous segments
- Current (last) segment: --fg-default, --fw-medium (500), not clickable
- Separators: "/" in --font-mono / --fg-faint
- Compact single line; on overflow, middle segments collapse to "…"
- Hover on previous segments: --fg-default

6. HEADER NAV WIDGET (header-nav)

A navigation bar with links. Used for consumer-level navigation when a consumer declares a sidebar or top-tab nav inside a widget.

Demo data:
  Links: Overview (active), Task Board, Analytics, Plan Detail

Variations:
a) Horizontal tabs: 4 links, active gets accent underline
b) With glyphs: each link has a leading Unicode glyph (or Lucide icon)
c) Many links: 8+ links — overflow wraps or scrolls horizontally
d) Vertical sidebar: same links rendered vertically (sidebar variant)

Anatomy (horizontal):
- Flex row, no gap (tabs touch but feel distinct via padding)
- Each link: 7-9px horizontal padding, 8-10px vertical
- Active: --fg-default text, 2px bottom border in --status-info, negative bottom margin
- Inactive: --fg-muted, hover --fg-default

Anatomy (vertical sidebar variant):
- Flex column, 2-4px gap
- Each link: 5-6px vertical padding, 8px horizontal
- Active: --bg-overlay background, --fg-default text, 2-3px left border in --status-info
- Inactive: --fg-muted, hover --bg-elevated + --fg-default
- Count chip on the right (mono 10px / --fg-subtle, --fg-default when active)

7. DRAWER WIDGET (drawer)

A slide-in panel from the side of the viewport. Used for filters, details, sources.

Variations:
a) Right drawer: 320-380px wide, slides from right
b) Left drawer: same dimensions, slides from left (alternative sidebar)
c) With content: drawer containing a list, key-value, or markdown widget
d) Overlay: drawer overlays content with dimmed backdrop

Anatomy:
- Panel: --bg-elevated background (or glass-thick with backdrop-filter blur if it overlays glassy content), --shadow-lg, fixed position, full viewport height, 1px left/right --border-default
- Header strip: 44-48px tall, flex row with title (sans 13px / 600) + close button (icon-only ghost ✕)
- Body: scrollable, --w-body padding
- Backdrop (overlay mode): rgba(0,0,0,0.45), tap or Esc to dismiss
- Transition: slide-in from edge over 200ms ease-out
- Focus management: focus traps inside the drawer, returns to opener on close
- Keyboard: Esc closes

8. SEARCH FILTER WIDGET (search-filter)

A text input for filtering data. Typically placed above a table or list. Can also live in chrome (command palette uses a similar atom).

Variations:
a) Basic search: input with leading ⌕ glyph, "Search…" placeholder
b) With filter chips: search + active filters below (status:open, label:bug) each removable
c) Instant filter: typing filters a table in real-time
d) Empty results: "// no results for 'xyz'" mono note

Anatomy:
- Input wrapper: --bg-sunken background, 1px --border-default, --radius-md, height 28-30px
- Leading glyph (⌕ or 🔎): mono 11px, --fg-subtle, 10px left padding
- Input text: sans 12px / --fg-default, transparent bg, no border, no outline
- Focus state: wrapper border → --accent-focus, 2px ring (--shadow-focus reduced)
- Clear button: right side, appears when input has text, ✕ glyph, ghost style
- Filter chip row below: 6px gap, chips with semantic tints and trailing × (mono 9px), removable on click
- "+ add filter" chip: outlined, --fg-muted, --border-default

DEMO PAGE LAYOUT

  ## Kanban Board
  [a · 3-col] [b · 4-col + empty] [c · compact] [d · rich]

  ## Timeline
  [a · standard] [b · compact] [c · day-grouped] [d · single]

  ## Log Feed
  [a · standard] [b · colored] [c · auto-scroll] [d · many]

  ## Tree View
  [a · expanded] [b · collapsed] [c · deep] [d · with-badges]

  ## Breadcrumb
  [a · 3-level] [b · 2-level] [c · 4-level] [d · truncated]

  ## Header Nav
  [a · horizontal] [b · with-glyphs] [c · many-links] [d · vertical]

  ## Drawer
  [a · right] [b · left] [c · with-content] [d · overlay]

  ## Search Filter
  [a · basic] [b · with-chips] [c · instant-filter] [d · empty-results]

NON-NEGOTIABLE

- Dark theme. Canonical widget frame across all widgets.
- Kanban: display-only (no drag-and-drop in v0.1).
- Timeline and Log Feed must feel distinctly different — timeline is visual/rich (spine + dots), log feed is compact/terminal (--bg-sunken, monospace, no decoration).
- Tree View expand/collapse keyboard-accessible (Enter/Space + arrow keys).
- Drawer Esc-closes and does not trap focus indefinitely.
- Search input styled like a form input atom — consistent with command palette and other text inputs.
- Breadcrumb links are functional navigation, not decorative.
- Header nav active state always uses --status-info (info is the runtime's signature color).
```
