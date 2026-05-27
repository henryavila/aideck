# Briefing 2 — Consumer Page: Sections Layout

> Colar no chat do Claude Design. Assume que o layout shell (briefing 1) esta estabelecido.

```
WHAT THIS SCREEN SERVES

A consumer page using the "sections" layout mode — the most common layout in aiDeck. Content flows vertically in named sections, each containing a 12-column grid of widgets. This is the default for overview/summary pages.

This briefing establishes the sections layout pattern. The specific consumer page shown is the demo consumer's "Overview" page, but the layout must be generic enough for any consumer.

PERSONA AND MOMENT

A developer clicked into the "aiDeck Demo" consumer from Home and landed on its default page (Overview). They want to scan project stats, see a project table, and check recent activity — all on one page, in flowing sections.

THE MANIFEST DECLARATION (what drives this page)

This is the actual manifest.yaml that describes this page:

  page:
    slug: overview
    title: "Overview"
    icon: mdi:view-dashboard
    default: true
    layout: sections
    sections:
      - title: "Project Stats"
        columns: 12
        gap: 16
        widgets:
          - widget: stat, colSpan: 3, label: "Total Projects", value: count()
          - widget: stat, colSpan: 3, label: "Active", value: count(status=active), color: accent
          - widget: stat, colSpan: 3, label: "Tasks Done", value: count(status=done), color: success
          - widget: stat, colSpan: 3, label: "Total Tasks", value: count()
      - title: "Projects"
        widgets:
          - widget: table, colSpan: 12, source: projects
      - title: "Recent Activity"
        widgets:
          - widget: timeline, colSpan: 8, source: events
          - widget: log-feed, colSpan: 4, source: events

DEMO DATA (real, for the preview)

Projects (4 records):
  - API Gateway Redesign, active, Alice, 2026-04-01
  - Mobile App v3, active, Bob, 2026-03-15
  - Data Pipeline Migration, paused, Carol, 2026-02-01
  - Auth Service Rewrite, done, Dave, 2026-01-10

Tasks (8 records):
  - T-001 Design API schema, done, priority 3, proj-1, [design, api]
  - T-002 Implement rate limiting, in-progress, priority 4, proj-1, [backend, security]
  - T-003 Write integration tests, todo, priority 2, proj-1, [testing]
  - T-004 UI component library, in-progress, priority 3, proj-2, [frontend, ui]
  - T-005 Push notification service, todo, priority 5, proj-2, [backend, mobile]
  - T-006 Migrate Postgres to BigQuery, todo, priority 4, proj-3, [data, migration]
  - T-007 OAuth2 provider setup, done, priority 5, proj-4, [auth, security]
  - T-008 Session token rotation, done, priority 3, proj-4, [auth, backend]

Events (6 records):
  - 2026-05-26 14:00 — Task T-001 marked done (Alice)
  - 2026-05-26 13:30 — Task T-002 started (Alice)
  - 2026-05-26 12:00 — Project proj-3 paused (Carol)
  - 2026-05-25 16:00 — Task T-007 marked done (Dave)
  - 2026-05-25 14:00 — Task T-008 marked done (Dave)
  - 2026-05-25 10:00 — Task T-004 started (Bob)

VISUAL REQUIREMENTS

The page header area shows a tab bar with 3 tabs: Overview (active), Task Board, Analytics. When the consumer has multiple pages, these tabs are always visible below the chrome.

Section 1 "Project Stats": 4 stat widgets in a row across 12 columns (3 each). Each stat shows a large number and a label below. Two of the stats have accent colors (active = cyan, done = green).

Section 2 "Projects": a full-width data table with columns: id, title, status, owner, startDate. Sortable headers. Alternating row backgrounds. Status values should use semantic color coding (active = cyan, paused = amber, done = green).

Section 3 "Recent Activity": split 8/4 columns.
  Left (8 cols): a timeline widget showing events as a vertical timeline with timestamps, action titles, and detail text.
  Right (4 cols): a log feed widget showing the same events as a compact scrollable log (timestamp + one-line message).

Section headers are uppercase, small, muted text with a horizontal rule. Sections can optionally be collapsible (chevron toggle).

INTERACTIONS

- Click a tab in the page tab bar → navigate to that consumer page.
- Table rows have hover highlight.
- Timeline entries show relative timestamps ("2 hours ago").
- Collapsible sections: click header to toggle.

SCALE AND EDGE CASES

- A section with 0 widgets (misconfigured manifest): show "No widgets configured" placeholder.
- A widget with no data (empty data source): each widget has its own empty state ("No data").
- 5+ sections on one page: vertical scroll, no pagination.
- Section title is optional — a section without title renders its grid directly.

NON-NEGOTIABLE CONSTRAINTS

- 12-column grid within each section, gap configurable per section.
- Widgets respect colSpan. A widget with colSpan: 3 takes 3/12 of the section width.
- Dark theme only.
- Tab bar is part of the consumer page chrome, not the section layout itself.
- Each widget renders inside a consistent card frame (border, radius, padding).

OUT OF SCOPE

- No widget drag-and-drop or resize.
- No section reordering.
- No inline widget configuration.
```
