# Briefing 4 — Consumer Page: Single Layout

> Colar no chat do Claude Design. Assume que briefings 1-3 estao estabelecidos.

```
WHAT THIS SCREEN SERVES

A consumer page using the "single" layout mode — one widget fills the entire page content area. Used for focused views like a detail page, a full-page markdown document, or a tree visualization.

This briefing shows the demo consumer's "Analytics" page, which uses sections layout (not single), but I'll describe a hypothetical "Plan Detail" single-layout page to exercise the pattern — then show the real Analytics page as a bonus.

PERSONA AND MOMENT

The developer navigated to a detail page that renders a single widget at full size. The content fills the viewport with no competing elements — just the tab bar above and the widget below.

SINGLE LAYOUT PATTERN

The single layout renders exactly one widget that fills the available space (100% width, fills remaining height below the tab bar). The manifest declares:

  page:
    slug: plan-detail
    title: "Plan Detail"
    layout: single
    widget: tree-view
    source: { ref: projects }
    config: { expandDepth: 2 }

The tree-view widget renders a hierarchical tree of the data. Each node shows the record title and status. Nodes are expandable/collapsible.

DEMO DATA FOR TREE VIEW

Render the 4 projects as tree nodes, each with their tasks as children:

  API Gateway Redesign (active)
    ├── T-001 Design API schema (done)
    ├── T-002 Implement rate limiting (in-progress)
    └── T-003 Write integration tests (todo)
  Mobile App v3 (active)
    ├── T-004 UI component library (in-progress)
    └── T-005 Push notification service (todo)
  Data Pipeline Migration (paused)
    └── T-006 Migrate Postgres to BigQuery (todo)
  Auth Service Rewrite (done)
    ├── T-007 OAuth2 provider setup (done)
    └── T-008 Session token rotation (done)

VISUAL REQUIREMENTS

The tree-view fills the page. Nodes use box-drawing characters or indentation with expand/collapse toggles. Status is shown as a colored dot or badge next to each node title. Depth levels are visually distinguished by indentation.

The single layout has no section headers, no grid cells — just the widget in a full-page card frame with minimal padding.

BONUS: ANALYTICS PAGE (sections layout, for reference)

The demo's actual third page uses sections layout:

  page:
    slug: analytics
    title: "Analytics"
    layout: sections
    sections:
      - title: "Task Completion"
        widgets:
          - widget: bar-chart, colSpan: 6 (tasks by priority)
          - widget: gauge, colSpan: 6 (average priority)
      - title: "Tags"
        widgets:
          - widget: tag-chip, colSpan: 6 (task tags as chips)
          - widget: badge, colSpan: 6 (task status as badges)

Design this page too — it exercises bar-chart, gauge, tag-chip, and badge widgets in a two-column sections layout.

INTERACTIONS

Single layout:
- Tree nodes: click to expand/collapse.
- Leaf nodes: hover highlight.

Analytics page:
- Bar chart: hover shows tooltip with value.
- Gauge: displays a single numeric value with a visual indicator.
- Tag chips: colored pills for each unique tag.
- Badges: colored dots/pills for each unique status value.

NON-NEGOTIABLE CONSTRAINTS

- Single layout: widget fills available space, no scrollbar on the page (widget manages its own scroll).
- Same dark theme. Same widget card frame for consistency.
- Tab bar visible with the active page highlighted.

OUT OF SCOPE

- No tree node editing.
- No chart interactivity beyond tooltips.
```
