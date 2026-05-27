# Briefing 8 — Widget Group D: Content & Layout

> Colar no chat do Claude Design. Component demo page para 6 widgets de conteudo e layout.

```
WHAT THIS BRIEFING SERVES

Component demo page for 6 widgets that render text content or provide structural layout within a page. These are the building blocks for rich, document-style consumer pages.

THE 6 WIDGETS

1. MARKDOWN WIDGET (markdown)

Renders a markdown string as formatted HTML. Used for documentation, descriptions, notes.

Demo content:
  # Project Overview

  The **API Gateway Redesign** project aims to modernize our API layer.

  ## Key Changes
  - Rate limiting with token bucket algorithm
  - OAuth2 provider integration
  - Request/response logging

  ## Timeline
  | Phase | Status |
  |-------|--------|
  | Design | Done |
  | Implementation | In Progress |
  | Testing | Pending |

  > Note: All endpoints must maintain backwards compatibility.

  See `docs/api-spec.md` for the full specification.

Variations:
a) Rich markdown: the content above — headers, bold, list, table, blockquote, inline code
b) Short markdown: just a paragraph with inline formatting
c) Code-heavy markdown: includes a fenced code block (see code-block widget for standalone)
d) Empty: no content — "No content" muted text

Anatomy:
- Full markdown rendering with proper typography
- Headers: size hierarchy (h1 > h2 > h3), primary color
- Body text: default fg color, comfortable line height (1.5-1.6)
- Code: monospace font, bg-elevated background, rounded corners
- Tables: styled like the table widget (alternating rows, borders)
- Blockquotes: left border accent, muted text
- Links: accent cyan, underline on hover
- Max-width for readability (~80ch for body text)

2. CODE BLOCK WIDGET (code-block)

Renders a code snippet with syntax highlighting and copy button.

Demo content:
  Language: typescript
  Code:
    export interface Consumer {
      id: string
      title: string
      icon?: string
      dataSourceCount: number
      pageCount: number
    }

Variations:
a) TypeScript: the interface above — with syntax highlighting
b) YAML: a manifest snippet — different language highlighting
c) Shell: a command line — `aideck serve --port 7778`
d) Long code: 30+ lines — vertical scroll within the widget

Anatomy:
- Monospace font (the design system's mono pair)
- Dark elevated background (slightly lighter than card bg for distinction)
- Line numbers: muted, left-aligned, non-selectable
- Syntax highlighting: keyword color, string color, type color, comment color
- Copy button: top-right corner, icon-only, shows "Copied" briefly on click
- Language label: small muted text in top-right or top-left
- Horizontal scroll for long lines (no wrapping by default)
- Vertical scroll if code exceeds widget height

3. TABS WIDGET (tabs)

A tab container that shows one child panel at a time. Used to organize multiple content blocks in the same widget card.

Demo data: 3 tabs
  Tab 1: "Summary" — shows a markdown widget with project summary
  Tab 2: "Tasks" — shows a list of tasks
  Tab 3: "Config" — shows a code-block with YAML config

Variations:
a) 3 tabs: the demo above — horizontal tab bar, active tab highlighted
b) Many tabs: 8 tabs — overflow handling (scroll or truncation)
c) Single tab: 1 tab — still renders tab bar (for consistency), no switching needed

Anatomy:
- Tab bar: horizontal row of tab buttons at the top of the widget
- Active tab: accent color text + bottom border, elevated background
- Inactive tabs: muted text, no border
- Tab panel: fills remaining widget space below the tab bar
- Tab content can be any widget (markdown, list, code-block, etc.)
- Transition: instant switch, no animation

4. ACCORDION WIDGET (accordion)

Expandable/collapsible sections. Used for FAQ-style content, grouped details.

Demo data: 3 accordion items
  Item 1: "What is aiDeck?" — "A generic AI dashboard runtime that reads consumer manifests and renders widgets."
  Item 2: "How do I create a consumer?" — "Run `aideck init-consumer` and edit the generated manifest.yaml."
  Item 3: "Can I use custom widgets?" — "Yes. Place a Vue SFC or Web Component in your consumer's components/ directory."

Variations:
a) Default collapsed: all items closed — click to expand one
b) First expanded: item 1 open by default
c) Multiple open: allow multiple items expanded simultaneously
d) Nested: an accordion item containing another accordion (depth 2)

Anatomy:
- Item header: clickable row with title text + chevron (▸ collapsed, ▾ expanded)
- Item body: indented or padded below header, markdown-rendered content
- Border between items (subtle)
- Expand/collapse: toggle on click, no animation (instant)
- Chevron rotates to indicate state

5. CONTAINER WIDGET (container)

A transparent wrapper that groups child widgets. Used for visual grouping without a visible card frame.

Variations:
a) Group of 2 stats: container holding 2 stat widgets side by side
b) Titled container: has a title rendered as a section header above children
c) Nested: container inside a container (layout nesting)

Anatomy:
- No visible border or background (transparent)
- Optional title: rendered like section headers (uppercase, muted, small)
- Children: rendered in a flex or grid layout within the container
- Padding: optional, from config

6. GRID COLUMNS WIDGET (grid-columns)

Arranges child widgets in a configurable number of columns. Similar to CSS columns.

Variations:
a) 2 columns: left = list widget, right = key-value widget
b) 3 columns: three stat widgets
c) Uneven: 2 columns with colSpan override (8/4 split)

Anatomy:
- Uses CSS grid with specified column count
- Gap between columns
- Children fill their cells
- Responsive: collapses to single column on narrow viewports

DEMO PAGE LAYOUT

  ## Markdown
  [rich] [short] [code-heavy] [empty]

  ## Code Block
  [typescript] [yaml] [shell] [long]

  ## Tabs
  [3-tabs] [many-tabs] [single-tab]

  ## Accordion
  [collapsed] [first-open] [multi-open] [nested]

  ## Container
  [grouped-stats] [titled] [nested]

  ## Grid Columns
  [2-col] [3-col] [uneven]

NON-NEGOTIABLE

- Dark theme. Markdown and code rendering must have excellent contrast.
- Syntax highlighting colors must be distinguishable on dark backgrounds.
- Code block: monospace only. Use the design system's monospace font.
- Tab and accordion interactions are keyboard-accessible (Tab + Enter/Space).
- Container widget is invisible by default — it should NOT add visual weight.
```
