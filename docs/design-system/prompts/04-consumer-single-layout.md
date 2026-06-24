# Briefing 4 — Consumer Page: Single Layout

> Colar no chat do Claude Design. Assume que briefings 1-3 estao estabelecidos.

```
WHAT THIS SCREEN SERVES

A consumer page using the "single" layout mode — one widget fills the entire page content area. Used for focused views: a tree, a wide table, a full-page markdown doc, a pipeline DAG.

This briefing covers the single layout pattern with TWO concrete instances:

(A) the demo consumer's "Plan Detail" page (single layout · tree-view widget)
(B) the demo consumer's "Analytics" page (sections layout, two-column · bar-chart, gauge, tag-chip, badge) — for reference, since it exercises chart widgets in a familiar layout

PERSONA AND MOMENT

The developer navigated from Task Board to a focused detail view. The content fills the viewport with no competing elements — just the tab bar above and the widget below.

(A) SINGLE LAYOUT — PLAN DETAIL

THE MANIFEST DECLARATION

  page:
    slug: plan-detail
    title: "Plan Detail"
    layout: single
    widget: tree-view
    source: { ref: projects }
    config: { expandDepth: 2 }

The widget renders a hierarchical tree. Nodes are expandable/collapsible. The single layout has no grid cells and no section headers — the widget sits inside a single canonical card frame that fills the page content area (100% width, calc(100vh - chrome - tab-bar - page-title - padding) height).

DEMO DATA FOR TREE VIEW

Render the 4 projects as parent nodes, each with their tasks as children:

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

The tree-view fills the page. Monospace font (JetBrains Mono 11-12px / 1.65 line-height, font-feature-settings "calt" 0). Each tree row:
- Left caret (▾ open, ▸ closed), 10px width, --fg-subtle
- 16-20px indent per depth level
- Project nodes: --chart-1 color for the name (azure)
- Task nodes: --fg-default
- Right side: small meta (status chip or size, --fg-subtle 9-10px) pushed via flex grow
- Status chip: mini soft chip (height 14-16px) using semantic tokens (done=success, in-progress=info, todo=neutral, paused=warning)
- Active/selected row: --status-info-bg background, 3px radius, --status-info name color
- Click caret or node: expand/collapse
- Hover row: --bg-elevated

The widget frame around the tree: 1px --border-default, 8px radius, --shadow-md (since this is a focal widget that fills the page), inner --bg-surface. Header strip with title "Plan Detail · tree" + meta "4 projects · 8 tasks · depth 2".

(B) BONUS — ANALYTICS PAGE (sections layout)

  page:
    slug: analytics
    title: "Analytics"
    layout: sections
    sections:
      - title: "Task Completion"
        widgets:
          - widget: bar-chart, colSpan: 6, source: tasks, groupBy: priority
          - widget: gauge,     colSpan: 6, source: tasks, value: avg(priority), max: 5
      - title: "Tags"
        widgets:
          - widget: tag-chip, colSpan: 6, source: tasks, field: tags
          - widget: badge,    colSpan: 6, source: tasks, field: status

VISUAL REQUIREMENTS (Analytics)

Section "Task Completion" — two widgets side by side (colSpan 6 each):
  - BAR CHART: tasks grouped by priority. Bars: priority 2 (1), 3 (3), 4 (2), 5 (2). Each bar uses a single chart hue (--chart-1 through --chart-4 by priority). Mini SVG, ~120-160px tall. Subtle horizontal gridlines (--border-subtle). Y-axis omitted; values shown above bars in mono 10px / --fg-muted.
  - GAUGE: average priority = 3.5 out of 5. Semicircular arc (264 path length). Track --bg-elevated, fill --chart-2 (emerald). Center text: "3.5" (sans 24-26px / 600 / tabular-nums) + sub "of 5" (mono 10px / --fg-muted).

Section "Tags" — two widgets side by side:
  - TAG CHIP cloud: all unique tags from tasks rendered as outlined chips. Each chip uses a chart-N color rotating across the palette (tags are not semantic — variety is the point). Square chips (--radius-sm), transparent bg, tinted border, mono 10px text.
    Tags: design, api, backend (3), security (2), testing, frontend, ui, mobile, data, migration, auth (2)
  - BADGE widget: status distribution as soft pills. "done · 3" (success bg), "in-progress · 2" (info bg), "todo · 3" (neutral bg). Each pill carries the semantic color tint.

INTERACTIONS

Single layout:
- Tree nodes: click caret to expand/collapse; click body to select
- Keyboard: ↑/↓ to move focus, →/← to expand/collapse, Enter to select

Analytics page:
- Bar chart: hover bar shows a tooltip (elevated bg, mono 11px) with value
- Gauge: static, no interaction
- Tag chips: display-only (not buttons)
- Status badges: display-only

NON-NEGOTIABLE CONSTRAINTS

- Single layout: widget fills available space; widget manages its own internal scroll (page does not scroll)
- Same dark theme, same canonical widget frame across all layouts
- Tab bar visible with active page highlighted
- Bar chart, gauge, badge, tag-chip all live in widget cards with the same 1px border / 8px radius / --shadow-ambient
- No light theme variants

OUT OF SCOPE

- No tree node editing or drag-reorder
- No chart interactivity beyond hover tooltip
- No drilldown on bar click
```
