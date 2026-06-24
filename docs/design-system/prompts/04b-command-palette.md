# Briefing 4b — Command Palette (⌘K)

> Colar no chat do Claude Design depois do briefing 4a. Define a superficie ⌘K que ja foi referenciada no layout shell.

```
WHAT THIS BRIEFING SERVES

The command palette is aiDeck's primary navigation surface beyond the sidebar. It is a glass-thick overlay invoked by ⌘K (Ctrl+K on Win/Linux) from anywhere in the app. It exposes:

  - All consumers + their pages — "jump anywhere"
  - All widgets on the current page — focus or scroll to one
  - All data sources of all consumers — open the underlying file
  - A small set of runtime commands — reload manifest, toggle sidebar, copy current page URL, view server log

It is the keyboard-first developer's primary tool. The sidebar is for browsing; the palette is for jumping.

PERSONA AND MOMENT

The developer is deep inside `code-health · pull-requests`, scrolling a kanban. They want to jump to the `agent-runs` consumer's `errors` page. They press ⌘K, type "err", and Enter on the result. <500ms total.

INVOCATION

  ⌘K (Mac) · Ctrl+K (Win/Linux) — opens
  Esc — closes
  Click outside the panel — closes
  Click the chrome "jump anywhere" pill — opens

The chrome pill (briefing 1) is the visible affordance. Pressing it OR the shortcut opens the same palette.

VISUAL ANATOMY

Container:
  - Fixed position, full viewport, z-index above everything except modal
  - Backdrop: rgba(0, 0, 0, 0.45), centered on the palette
  - Backdrop has a subtle fade-in (120ms ease-out)

Panel:
  - 640px wide, max 80vh tall
  - Positioned 18-20vh from the top (NOT vertically centered — settles in the upper third for keyboard-comfort)
  - Background: --glass-thick rgba(10,13,18,0.85)
  - backdrop-filter: var(--glass-blur) — saturate(180%) blur(20px)
  - Border: 1px --glass-border
  - Border radius: --radius-xl (12px)
  - Box-shadow: --shadow-xl (deep drop + inner highlight)

Header — input row:
  - 56px tall
  - Flex row, 10px gap, padding 0 18px
  - Leading glyph: ⌕ in --font-mono 16px / --fg-subtle
  - Input: transparent, no border, --font-sans 15px / --fg-default, placeholder "jump to consumer, page, widget, file…" in --fg-faint
  - Trailing kbd hint: small ESC pill when input is empty; small ↵ pill when a result is selected
  - 1px --border-subtle bottom border

Result list — body:
  - Vertical scroll if needed (max-height calc(80vh - 56px - 32px))
  - Padding 6px 8px around the list

GROUPING

Results group under sticky uppercase headers (mono 10px / --fg-subtle / --tracking-wider). Empty groups are hidden. Default empty-query order:

  PAGES — consumer + page combinations recently visited (3-6 items)
  CONSUMERS — all 4 consumers (each as a single row)
  COMMANDS — 4-6 runtime commands

When the user types, groups become FILTERED + RE-RANKED. Each result gains a small fuzzy-match underline on matched chars.

RESULT ROW

  - 36-40px tall
  - Flex row, 10px gap, 10-12px horizontal padding
  - Hover OR keyboard-focused row: --bg-overlay background, 4px --radius-sm
  - Selected (kb-focused) row also gets a 3px left edge in --status-info

  Anatomy of a row:
  
  [icon/dot]  [primary text]  [secondary path/meta]  …  [shortcut hint]

  - icon/dot (16-18px wide, fixed):
      consumer row: colored dot from the consumer's --chart-N
      page row: a small mono glyph (⌑) in --fg-subtle
      widget row: ◧ glyph
      file row: file-shaped Lucide icon
      command row: ⌘ glyph
  - primary text: sans 13px / --fg-default
  - secondary path: mono 11px / --fg-subtle, --tracking-normal, "calt" 0
      examples: "code-health / pull-requests" · "~/.aideck/consumers/agent-runs/data/runs.jsonl"
  - matched chars in either text: --status-info underline (or color shift to --fg-default while neighbors are --fg-muted)
  - shortcut hint (optional, right-side): "⌘1" / "Enter" in mini kbd pills

EXAMPLES

  PAGES
  ⌑  Overview           code-health / overview                ⌘1
  ⌑  Pull requests      code-health / pull-requests           ⌘2
  ⌑  Today              agent-runs  / today                   ⌘3
  ⌑  Errors             agent-runs  / errors                  ⌘4

  CONSUMERS
  •  code-health        4 pages · v0.3.1
  •  agent-runs         3 pages · v0.2.0
  •  ci-pipeline        2 pages · v0.1.4
  •  knowledge          3 pages · v0.4.2

  COMMANDS
  ⌘  Reload manifests                                       ⇧⌘R
  ⌘  Toggle sidebar                                         ⌘B
  ⌘  Copy current page URL                                  ⇧⌘C
  ⌘  Open server log
  ⌘  View raw manifest of current consumer

FOOTER STRIP

The palette has a footer (28px, --bg-canvas, 1px --border-subtle top border, padding 0 14px), showing keyboard hints:

  ↑↓ navigate · ↵ open · ⇥ jump to group · Esc close

All in mono 10px / --fg-subtle / "calt" 0.

KEYBOARD

  ↑/↓        — move selection between rows
  ⇥          — jump to the first row of the next group
  ⇧⇥         — jump to the previous group
  ↵          — activate the selected row
  ⌘1..⌘9    — jump to the nth visible PAGE row directly (numeric shortcuts visible)
  Esc        — close the palette
  any letter — start filtering

FILTERING BEHAVIOR

  - Substring AND fuzzy (subsequence) match across primary text + secondary path
  - Rank: exact prefix > word-boundary match > fuzzy
  - Pages of the CURRENT consumer rank above other consumers' pages
  - Recently visited (last 24h, persisted to localStorage) rank above never-visited
  - Empty result set: terse mono note "// no match for 'xyz'" centered + a single secondary line "press ⌘K to clear"

VARIATIONS TO DESIGN

a) Open / empty input: shows the three default groups (PAGES recent, CONSUMERS, COMMANDS)
b) Filtered: user typed "pul" — shows just matched rows (1-2 pages, a "Pull requests" page) with fuzzy underlines on matched chars
c) Empty results: user typed "xyzqq" — empty-results note
d) Inside a consumer: when invoked from `code-health/pull-requests`, the CURRENT consumer's pages are pinned at the top of the PAGES group

NON-NEGOTIABLE CONSTRAINTS

- The palette is GLASS-THICK with backdrop-filter blur. The blur is part of what signals "this floats above your work, focus on it".
- The body texture (--texture-grid) should remain faintly visible through the panel — the blur dampens it, doesn't erase.
- ENTIRELY keyboard-driven. Mouse hover is supported, but every action has a key.
- Esc always closes. The palette does not trap focus indefinitely.
- The chrome pill ("jump anywhere") is the only persistent visible affordance; no big "Try ⌘K!" tooltips.
- No "recent searches" history (the developer types fast — last-visited PAGES are enough).
- No global authentication or login prompt — this is localhost.

OUT OF SCOPE

- No natural-language commands ("open the page about pull requests please")
- No file content search (only file names + paths)
- No multi-select / batch actions
- No customization of which commands appear (yet)
```
