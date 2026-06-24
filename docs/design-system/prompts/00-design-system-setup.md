# Design System Setup — aiDeck v2 (para Claude Design)

> Preencher no formulario "Set up your design system" em claude.ai/design.

## Campo "Company name and blurb"

```
aiDeck — Generic AI dashboard runtime.

aiDeck is a local-first dashboard runtime that any AI tool can integrate with. It reads structured data (YAML, JSON, JSONL, frontmatter Markdown) from consumer directories under ~/.aideck/consumers/, validates against JSON Schema, and projects onto three surfaces: a Vue 3 dashboard in the browser, a REST + SSE HTTP API, and an MCP (Model Context Protocol) server for AI agents in IDEs like Claude Code and Cursor.

Consumers declare their UI via a manifest.yaml: pages, layouts (sections/grid/single), data sources, and widget bindings from a built-in library of 25 widgets. aiDeck renders whatever a consumer declares — it is not tied to any specific domain.

Lives at 127.0.0.1:7777 (localhost only), zero telemetry, MIT-licensed. The dashboard is a projection, never the source of truth — consumer data files are canonical; aiDeck reads, validates, and renders.
```

## Campo "Link code on GitHub"

```
https://github.com/henryavila/aideck
```

## Campo "Any other notes?"

```
AUDIENCE AND TONE

Primary user: a developer working in a terminal-heavy IDE (Claude Code, Cursor) alongside AI agents. Comfortable with GitHub DevTools, Linear, iTerm2. They expect dense information and keyboard-first interaction.

Secondary user: the AI agent itself, which reads the same surface via the MCP server. The product must serve both equally well.

Third user: tool authors who build consumers (Python scripts, Node CLIs, AI skills) and want to see their data rendered without writing frontend code. They experience aiDeck through their own manifest.yaml.

Not designed for: non-technical project managers, enterprise teams, customer-facing dashboards.

VISUAL TONE

Dark-first ONLY. Do not design or propose light theme variants.

The reference tone is "premium cockpit / DevTools" — Linear, Vercel, Raycast, Grafana, GitHub DevTools. Closer to those than Notion, Asana, ClickUp, or Monday.com. Information density is a feature, not a problem to solve with whitespace.

CALIBRATION TARGET. A consumer with 5+ pages, each containing 10-20 widgets across sections, must render on a 13" laptop without horizontal scroll, overflow, truncation, or pagination tricks. Treat that as a hard constraint.

PREMIUM SURFACE TREATMENT

The runtime chrome (header, command palette, drawers, popovers) uses translucent glass surfaces with backdrop-filter blur. The body canvas wears a subtle graph-paper texture (radial dots, ~8% white, 28px grid) — engineered, not decorative. Widgets sit on the canvas as solid surfaces; glass is reserved for chrome.

THE 25 BUILT-IN WIDGETS

Data display: Table, Stat/Metric, List, Key-Value
Charts: Line Chart, Bar Chart, Gauge, Progress Bar
Text/Content: Markdown, Code Block
Navigation/Layout: Tabs, Grid/Columns, Accordion, Container
Status: Badge/Status
AI-tool specific: Kanban Board, Timeline/History, Log/Activity Feed
Gap analysis: Tree View, Card, Tag/Chip, Breadcrumb, Drawer/Sidebar, Header/Nav Bar, Search/Filter
Specialized: Graph/DAG (Mermaid)

All 25 must share a consistent visual language: card frames, spacing, typography, color usage for status/severity.

CANONICAL WIDGET FRAME

Every widget — all 25 of them — renders inside the same frame:
- 1px solid border (--border-default)
- 8px border radius (--radius-lg)
- Background --bg-surface
- --shadow-ambient (subtle 1px top highlight + faint drop)
- Optional header row: title (sans 12px / 600) + meta (mono 10px / muted)
- Body: padded 12-14px, widget-specific content
- Optional footer row: source/action, mono 10px muted, top border
- Five states: default · loading (skeleton shimmer) · empty (terse copy + action) · error (coral border + structured suggestion) · live (subtle scanline overlay for SSE-connected)

3 LAYOUT MODES

1. sections — flowing content, auto-stacked, each section has a title and a 12-column grid of widgets. The default.
2. grid — explicit 12-column grid with colStart/colSpan/rowSpan positioning per widget.
3. single — one widget fills the entire page.

All three must feel like the same product, not three different dashboards.

BRAND PRINCIPLES

1. "Files are canonical." aiDeck never owns state — it projects from consumer data files. The UI must not imply system-of-record semantics. No "saving..." spinners, no "unsaved changes" warnings. Mutations are framed as requests, never saves.

2. "Localhost-only, zero telemetry." A persistent, visible trust signal showing aiDeck is bound to 127.0.0.1. Developers trust the product specifically because it doesn't phone home. The trust signal lives in the chrome header as a pill: a green dot + monospace "127.0.0.1" + "no telemetry". Use --status-success for the dot.

3. "Consumer-agnostic vocabulary." Tokens are semantic, not domain-specific. A token named --status-success is correct; --phase-done is not. The runtime renders whatever the manifest declares — project tracker, code-health dashboard, CI pipeline viewer, personal knowledge base.

4. "Widget consistency." All 25 widgets share the same frame above. Same border radius, same header typography, same five states.

5. "Density is a feature." A consumer with 5 pages × 12-20 widgets per page renders on a 13" laptop. Don't "improve" the design with more whitespace.

ANTI-PATTERNS TO AVOID

- Big illustrated empty states. Terse text + a concrete next step is better.
- Avatar grids, team UI, presence indicators. Single user, no @mentions.
- Multi-step onboarding wizards, tutorial tooltips on first visit.
- Light-mode toggle.
- Modal-everything. Use inline expansion where possible.
- Decorative gradients in widget bodies. Glass is for chrome only (header, command palette, drawer, popovers) — never on a widget body.
- Custom-drawn SVG icons. Unicode glyphs first, Lucide as fallback, custom never.

COLOR TOKENS (canonical — use these exact values)

Surfaces (six dark levels):
--bg-sunken:    #07090d   /* inputs, code blocks */
--bg-canvas:    #0a0d12   /* page background */
--bg-surface:   #12161d   /* cards, widgets */
--bg-elevated:  #1a1f28   /* hover, popovers */
--bg-overlay:   #232936   /* selected rows */
--bg-highlight: #2d3340   /* highest */

Glass (chrome only):
--glass-thin:   rgba(18,22,29,0.55)
--glass-medium: rgba(18,22,29,0.72)
--glass-thick:  rgba(10,13,18,0.85)
--glass-blur:   saturate(180%) blur(20px)

Borders:
--border-subtle:  #1a2029
--border-default: #262d38
--border-strong:  #3d4656
--border-bright:  #555f72

Foreground:
--fg-default: #e9eef5  /* primary text */
--fg-muted:   #98a1ad  /* secondary */
--fg-subtle:  #6b7585  /* tertiary, metadata */
--fg-faint:   #424a5a  /* disabled */
--fg-on-accent: #08090d

Semantic status (5 canonical states — consumers map their vocabulary onto these):
--status-success: #4cc28e   /* passed, done, healthy */
--status-warning: #e0a44a   /* needs attention, paused */
--status-error:   #ff5c5c   /* failed, critical */
--status-info:    #5fb1ff   /* active, running, current — also --accent-primary */
--status-neutral: #8b95a3   /* idle, pending, unknown */

Chart palette (8 hues for multi-series — use in order):
--chart-1: #5fb1ff  --chart-2: #4cc28e  --chart-3: #e668a8  --chart-4: #e0a44a
--chart-5: #8b5cf6  --chart-6: #2dd4bf  --chart-7: #f0c757  --chart-8: #f87171

Textures:
--texture-grid:    radial dots, 28px grid, ~8.5% white — default canvas background
--texture-grid-lg: 1px crosshatch, 64px grid, ~4% white — hero/feature backdrops
--texture-scan:    1px horizontal scanlines, 3px gap — SSE-live widget overlay

TYPOGRAPHY

Sans: Inter (Google Fonts), weights 400/500/600/700. Used for UI, body, narrative, headings.
Mono: JetBrains Mono (Google Fonts), weights 400/500/600. Used for identifiers, paths, commands, IDs, code, numeric stats. Ligatures off (font-feature-settings: "calt" 0) — developers want to see exactly what's there.

Type scale (10 → 56):
--fs-2xs: 10  --fs-xs: 11  --fs-sm: 12  --fs-base: 13 (dense body)
--fs-md: 14 (UI default)  --fs-lg: 16  --fs-xl: 20  --fs-2xl: 24
--fs-3xl: 32  --fs-4xl: 40  --fs-5xl: 56

Base body 13-14px. Page titles 22-24px. Stat values 30-40px. Tabular numbers (font-variant-numeric: tabular-nums) for all numerics.

SPACING

4px base scale (--space-1 = 2px through --space-32 = 64px). Row padding in dense tables 4-6px. Card padding 10-14px. Section gap 10-12px. Tighter than a marketing page — density.

RADII

--radius-xs: 2 · --radius-sm: 4 · --radius-md: 6 · --radius-lg: 8 (default widget) · --radius-xl: 12 · --radius-pill: 999

ELEVATION

Surface step + 1px hairline is the primary elevation signal. Drop shadows reserved for floating layers (menus, popovers, drawer, modal):
--shadow-ambient (resting cards) · --shadow-sm (hover) · --shadow-md (popovers) · --shadow-lg (drawer/modal) · --shadow-xl (command palette) · --shadow-focus (2px canvas + 2px cyan ring)

ICONOGRAPHY

Unicode first: ✓ ◉ · × ! ⌘ ⌥ → ↗ ▸ ▾ ⌕ ⚑
Lucide CDN as fallback (1.5px stroke, currentColor).
Custom SVG: never. If a concept needs an illustration, it's the wrong concept.

ACCESSIBILITY

WCAG AA contrast minimum (4.5:1 text, 3:1 UI). All interactive elements keyboard-reachable. :focus-visible visible against dark surfaces (cyan ring + canvas-colored padding). Skip-to-content link in the chrome. Aria labels on icon-only buttons. Charts use SVG (not canvas) so screen readers can traverse.

WHERE TO LOOK IN THE LINKED REPO

- docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md — full v2 spec
- src/client/ — existing Vue 3 components (functional but minimally styled)
- src/client/components/widgets/ — all 26 .vue widget files
- src/client/layouts/ — SectionsLayout.vue, GridLayout.vue, SingleLayout.vue
- src/client/pages/ — HomePage.vue, ConsumerPage.vue
- src/demo/consumer/ — demo manifest + data files

DESIGN SYSTEM SHOULD INCLUDE

- Six surface levels (sunken → canvas → surface → elevated → overlay → highlight) for nested cards
- Three glass tiers (thin/medium/thick) for chrome only
- Canonical widget card frame with 5 states (default/loading/empty/error/live)
- Five semantic status tokens (success/warning/error/info/neutral)
- 8-color chart palette
- Inter + JetBrains Mono pair, scale 10→56
- 4px spacing base, calibrated for 13" laptops
- Loading skeleton (shimmer 1.6s ease-in-out infinite)
- Persistent 127.0.0.1 trust signal in chrome
- Graph-paper canvas texture, scanline overlay for SSE-live widgets
```

## Outros campos

- **"Link code from your computer"**: pular (ja linkado via GitHub)
- **"Upload a .fig file"**: pular
- **"Add fonts, logos and assets"**: pular

Clique **Set up**. Itere visualmente ate o tom bater. So entao prossiga aos briefings de tela.
