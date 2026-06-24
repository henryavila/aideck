# Briefing 2 — Consumer Page: Sections Layout

> Colar no chat do Claude Design. Assume que o layout shell (briefing 1) esta estabelecido.

```
WHAT THIS SCREEN SERVES

A consumer page using the "sections" layout mode — the most common layout in aiDeck. Content flows vertically in named sections, each containing a 12-column grid of widgets. This is the default for overview and summary pages.

This briefing establishes the sections layout pattern. The specific consumer shown is the demo consumer's "Overview" page, but the layout must be generic enough for any consumer.

PERSONA AND MOMENT

A developer clicked into the "aiDeck Demo" consumer from Home and landed on its default page (Overview). They want to scan project stats, see a project table, and check recent activity — all on one page, in flowing sections.

PAGE CHROME (above the sections)

Below the global chrome header (briefing 1), this page adds:
- Page title row: H1 "aiDeck Demo · Overview" (sans 22-24px / 600, --tracking-tight, --fg-default, white-space nowrap). On the right of the same row: monospace meta "refreshed 3s ago · sections layout", followed by two ghost buttons "↻ refresh" and "↗ open in editor" (--btn-secondary, --btn-ghost). The page-title row uses flex baseline alignment.
- TAB BAR row: thin (~36px), border-bottom of --border-default. Three tabs: Overview (active), Task Board, Analytics. Active tab has --fg-default text and a 2px --status-info underline. Inactive tabs are --fg-muted. Optional small count chip after each tab name (mono 10px).

THE MANIFEST DECLARATION (drives the page)

  page:
    slug: overview
    title: "Overview"
    icon: mdi:view-dashboard
    default: true
    layout: sections
    sections:
      - title: "Project Stats"
        columns: 12
        gap: 12
        widgets:
          - widget: stat, colSpan: 3, label: "Total Projects", value: count()
          - widget: stat, colSpan: 3, label: "Active",         value: count(status=active), color: info
          - widget: stat, colSpan: 3, label: "Tasks Done",     value: count(status=done),   color: success
          - widget: stat, colSpan: 3, label: "Total Tasks",    value: count()
      - title: "Projects"
        widgets:
          - widget: table, colSpan: 12, source: projects
      - title: "Recent Activity"
        widgets:
          - widget: timeline, colSpan: 8, source: events
          - widget: log-feed, colSpan: 4, source: events

DEMO DATA (real, for the preview)

Projects (4):
  - proj-1 | API Gateway Redesign     | active | Alice | 2026-04-01
  - proj-2 | Mobile App v3            | active | Bob   | 2026-03-15
  - proj-3 | Data Pipeline Migration  | paused | Carol | 2026-02-01
  - proj-4 | Auth Service Rewrite     | done   | Dave  | 2026-01-10

Tasks (8):
  - T-001 Design API schema             | done        | priority 3 | proj-1 | [design, api]
  - T-002 Implement rate limiting       | in-progress | priority 4 | proj-1 | [backend, security]
  - T-003 Write integration tests       | todo        | priority 2 | proj-1 | [testing]
  - T-004 UI component library          | in-progress | priority 3 | proj-2 | [frontend, ui]
  - T-005 Push notification service     | todo        | priority 5 | proj-2 | [backend, mobile]
  - T-006 Migrate Postgres to BigQuery  | todo        | priority 4 | proj-3 | [data, migration]
  - T-007 OAuth2 provider setup         | done        | priority 5 | proj-4 | [auth, security]
  - T-008 Session token rotation        | done        | priority 3 | proj-4 | [auth, backend]

Events (6):
  - 2026-05-26 14:00 — Task T-001 marked done (Alice)
  - 2026-05-26 13:30 — Task T-002 started (Alice)
  - 2026-05-26 12:00 — Project proj-3 paused (Carol)
  - 2026-05-25 16:00 — Task T-007 marked done (Dave)
  - 2026-05-25 14:00 — Task T-008 marked done (Dave)
  - 2026-05-25 10:00 — Task T-004 started (Bob)

SEMANTIC COLOR MAPPING (use the design system tokens)

In tables, badges, and chips, map consumer values onto the 5 semantic tokens:
- active        → --status-info     (cyan)
- in-progress   → --status-info
- done          → --status-success  (emerald)
- paused        → --status-warning  (amber)
- todo, pending → --status-neutral  (slate)
- failed, error → --status-error    (coral)

VISUAL REQUIREMENTS

Section header. UPPERCASE eyebrow-style title (sans 11-12px / 600, --tracking-wider, --fg-default), followed by an em-dash and a small monospace meta ("— 4 widgets · 24h window") in --fg-subtle. Below the header: 10px margin to the grid. No heavy horizontal rule — the section gap and eyebrow give enough separation.

Section grid. CSS grid template-columns: repeat(12, 1fr), gap from the manifest (default 10-12px).

Section 1 "Project Stats". Four stat widgets in a row (colSpan 3 each). Each stat in a widget frame, body shows the label as small uppercase eyebrow (mono 10px / --fg-subtle), then the big number (sans 30-32px / 600, --tracking-tight, tabular-nums). Optional delta below (mono 11px, --status-success for ↑ improvements, --status-error for ↓ regressions). Two stats use accent colors per the manifest (info=cyan, success=emerald).

Section 2 "Projects". Full-width data table. Columns: id (mono 11px, --fg-subtle), title (sans 12px / --fg-default), status (chip), owner, startDate (mono). Sticky header row in --bg-canvas, mono 10px / uppercase / --fg-subtle. Body rows in --bg-surface, hover row gets --bg-elevated. Borders between rows: 1px --border-subtle. Status cells render the semantic chip (success/info/warning/neutral). Cell padding 6-8px.

Section 3 "Recent Activity". Split 8/4 columns.
  Left (8 cols): TIMELINE widget. A vertical spine (1px --border-default) on the left with 7px dots at each event. Dot color matches semantic status (done=success, started=info, paused=warning). Right of each dot: monospace timestamp (10px / --fg-subtle, e.g., "14:00"), then bold event title (sans 12px / --fg-default), then optional sub-line (mono 10px / --fg-muted, e.g., "Alice").
  Right (4 cols): LOG FEED widget. Compact monospace lines (mono 11px / 1.6 line-height), --bg-sunken background. Each line: timestamp (--fg-subtle) + level tag colored by severity (ok/info/warn/err) + message. Vertical overflow hidden — newest first.

EMPTY / LOADING / ERROR states. If a section's data is empty, render its widgets in their own empty state ("// no data" + terse message). On load, show skeleton shimmer (.skeleton class) shaped like the widget content. Errors show a coral-bordered widget with structured suggestion.

INTERACTIONS

- Click a tab → navigate to that page (Overview, Task Board, Analytics)
- Table rows have hover highlight (--bg-elevated)
- Timestamps in timeline can be relative ("2 hours ago") or absolute — pick one, be consistent
- Section headers can be collapsible: small ▾/▸ caret left of the title

SCALE AND EDGE CASES

- A section with 0 widgets (misconfigured manifest): muted "no widgets configured"
- A widget with no data: its own empty state
- 5+ sections on one page: vertical scroll on the main panel, no pagination
- Section title is optional — without it, the grid renders directly

NON-NEGOTIABLE CONSTRAINTS

- 12-column grid within each section, gap configurable per section
- Widgets respect colSpan strictly
- Dark theme. Body canvas wears --texture-grid. Glass is for chrome only — not on widgets.
- Tab bar is part of the consumer page chrome, not the section layout itself
- Every widget renders inside the canonical card frame (border, radius, padding) — identical across all 25 widgets

OUT OF SCOPE

- No widget drag-and-drop or resize
- No section reordering
- No inline widget configuration
```
