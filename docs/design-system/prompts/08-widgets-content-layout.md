# Briefing 8 — Widget Group D: Content & Layout

> Colar no chat do Claude Design. Component demo page para 6 widgets de conteudo e layout.

```
WHAT THIS BRIEFING SERVES

Component demo page for 6 widgets that render text content or provide structural layout within a page. These are the building blocks for rich, document-style consumer pages. Every widget renders inside the canonical aiDeck widget frame (except Container, which is intentionally transparent).

THE 6 WIDGETS

1. MARKDOWN WIDGET (markdown)

Renders a markdown string as formatted HTML. Used for documentation, descriptions, principles, notes.

Demo content:
  # Project Overview

  The **API Gateway Redesign** project aims to modernize our API layer.

  ## Key Changes
  - Rate limiting with token bucket algorithm
  - OAuth2 provider integration
  - Request/response logging

  ## Timeline
  | Phase          | Status      |
  |----------------|-------------|
  | Design         | Done        |
  | Implementation | In Progress |
  | Testing        | Pending     |

  > Note: All endpoints must maintain backwards compatibility.

  See `docs/api-spec.md` for the full specification.

Variations:
a) Rich markdown: full content above
b) Short markdown: a single paragraph with inline `code` and **bold**
c) Code-heavy: includes a fenced code block (standalone code widget covers larger blocks)
d) Empty: no content — "// no content" mono note

Anatomy and styling:
- Headers: h1 sans 18-22px / 600, h2 sans 14-16px / 600, h3 sans 13-14px / 600 — all --fg-default, --tracking-tight on h1
- Body paragraphs: sans 12px / 1.55 line-height / --fg-default
- Lists: 18px left padding, comfortable list-style
- Inline code: --font-mono 11px, 0.06em / 0.32em padding, --bg-sunken background, 1px --border-subtle, 3px radius
- Tables: reuse the table widget visual atoms (mono uppercase header, semantic chip rows)
- Blockquotes: 2px left border --status-info, --status-info-bg background, 6-10px padding, --fg-muted text
- Links: --accent-link color (#88c4ff), dotted bottom border, solid on hover
- Max-width for body text: 70-80ch — readable without being too wide
- No bullet point graphics other than • (unicode dot)

2. CODE BLOCK WIDGET (code-block)

Renders a code snippet with syntax highlighting and copy button.

Demo content (TypeScript):
  export interface Consumer {
    id: string
    title: string
    icon?: string
    dataSourceCount: number
    pageCount: number
  }

Variations:
a) TypeScript: interface above with token coloring
b) YAML: manifest snippet (pages, widgets, source)
c) Shell: command line — `aideck serve --port 7777`
d) Long code: 30+ lines — vertical scroll inside the widget, sticky language tag

Anatomy:
- Monospace 11-12px / 1.6 line-height, "calt" 0
- Background --bg-sunken (deepest surface — distinct from the widget body)
- 6-8px padding around the code area, --radius-sm
- Optional line numbers in --fg-faint / --fg-subtle, right-aligned in a fixed-width gutter, non-selectable (user-select: none)
- Token coloring (semantic, NOT rainbow):
    keywords     → --chart-3 (magenta)
    strings      → --status-success
    keys / types → --chart-1 (azure)
    numbers      → --chart-4 (amber)
    comments     → --fg-subtle / italic
- Copy button: top-right corner, icon-only, ghost style; shows "✓ copied" briefly on click
- Language label: small uppercase mono 9-10px in top-right (or top-left of the code), --fg-subtle
- Horizontal scroll for long lines (no wrap by default); vertical scroll for tall snippets
- No syntax-highlighting flicker on load — render synchronously

3. TABS WIDGET (tabs)

A tab container showing one child panel at a time. Used to organize multiple content blocks in the same widget card.

Demo: 3 tabs
  Tab 1 "Summary"  → markdown widget with the project summary
  Tab 2 "Tasks"    → list widget showing the 8 tasks
  Tab 3 "Config"   → code-block widget with the YAML manifest

Variations:
a) 3 tabs (default)
b) Many tabs (8+): horizontal overflow with scroll arrows OR truncation
c) Single tab: still renders the tab bar (for consistency), no switching

Anatomy:
- Tab bar: horizontal flex at the top of the widget, 1px --border-default bottom border
- Tab item padding: 7-9px horizontal, 8-10px vertical
- Active tab: --fg-default text, 2px bottom border in --status-info, negative bottom margin so border overlays the parent border
- Inactive tabs: --fg-muted text, no border
- Hover inactive: --fg-default text
- Tab content slot: --w-body padding, fills remaining card height
- Transition between tabs: instant (no slide animation)
- Keyboard: Tab/Shift-Tab to focus tab buttons; ←/→ to switch; Enter/Space to activate

4. ACCORDION WIDGET (accordion)

Expandable/collapsible sections. Used for FAQ-style content, grouped build steps, nested logs.

Demo: 5 build phases
  Item 1 "install deps"     (expanded) — "142 packages · 0 vulns · cache hit"
  Item 2 "type check"       (expanded) — "tsc --noEmit · 0 errors across 348 files"
  Item 3 "unit tests"       (collapsed)  — "1,284 passed"
  Item 4 "e2e tests"        (expanded) — "2 flaky · re-running 2/3" (in --status-warning)
  Item 5 "build artifact"   (collapsed) — queued

Variations:
a) Default collapsed: all closed
b) First expanded: item 1 open
c) Multiple open: all open simultaneously
d) Nested: accordion item containing another accordion

Anatomy:
- Each row: 7-9px vertical padding, 1px --border-subtle bottom (none on last)
- Header: flex row, gap 8px, with leading caret (▸ collapsed, ▾ expanded, mono 11px, fixed 10-12px width, --fg-subtle)
- Header title: sans 12px / --fg-default
- Trailing slot: optional status text (e.g., "✓ 4.2s" in --status-success, "! 2 flaky" in --status-warning), mono 11px / tabular-nums
- Body: 6-8px top padding, 18-22px left indent, sans 12px / --fg-muted
- Transition: instant (no slide animation)
- Keyboard: focusable header, Enter/Space toggles

5. CONTAINER WIDGET (container)

A transparent wrapper that groups child widgets. Used for visual grouping without a visible card frame.

Variations:
a) Group of 2 stats side by side
b) Titled container: small uppercase eyebrow title above children
c) Nested: container inside a container (depth 2)

Anatomy:
- No visible border, no background
- Optional title: rendered like a section header (uppercase mono 10-11px / --fg-subtle / --tracking-wider), 8-10px bottom margin
- Children: rendered in a flex or grid layout (configurable, default vertical stack with 10px gap)
- The container does NOT add the canonical widget frame. It is invisible by default.

6. GRID COLUMNS WIDGET (grid-columns)

Arranges child widgets in a configurable number of columns, similar to CSS columns.

Variations:
a) 2 columns: list left, key-value right
b) 3 columns: three stat widgets
c) Uneven: 8/4 split with colSpan override

Anatomy:
- CSS grid with configurable column count, gap 10-12px
- Children fill their cells
- Like Container, grid-columns has NO visible frame of its own — children carry their own frames
- On narrow viewports (~700px and below), collapses to single column

DEMO PAGE LAYOUT

  ## Markdown
  [a · rich] [b · short] [c · code-heavy] [d · empty]

  ## Code Block
  [a · typescript] [b · yaml] [c · shell] [d · long]

  ## Tabs
  [a · 3-tabs] [b · many-tabs] [c · single-tab]

  ## Accordion
  [a · collapsed] [b · first-open] [c · multi-open] [d · nested]

  ## Container
  [a · grouped-stats] [b · titled] [c · nested]

  ## Grid Columns
  [a · 2-col] [b · 3-col] [c · uneven]

NON-NEGOTIABLE

- Dark theme. Markdown body must have excellent contrast (--fg-default on --bg-surface).
- Syntax highlighting colors come from the chart palette + status tokens, NOT from a rainbow scheme.
- Code block monospace only. Use JetBrains Mono.
- Tabs and accordion interactions are keyboard-accessible (Tab + Enter/Space + arrow keys).
- Container and grid-columns are INVISIBLE by default — they add no visual weight; only the children carry frames.
- Markdown links use --accent-link (#88c4ff) with dotted bottom border becoming solid on hover.
```
