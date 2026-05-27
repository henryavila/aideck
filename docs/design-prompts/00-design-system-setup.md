# Design System Setup — aiDeck v2 (para Claude Design)

> Preencher no formulario "Set up your design system" em claude.ai/design.

## Campo "Company name and blurb"

```
aiDeck — Generic AI dashboard runtime.

aiDeck is a local-first dashboard runtime that any AI tool can integrate with. It reads structured data (YAML, JSON, JSONL, frontmatter Markdown) from consumer directories under ~/.aideck/consumers/, validates against JSON Schema, and projects onto three surfaces: a Vue 3 dashboard in the browser, a REST + SSE HTTP API, and an MCP (Model Context Protocol) server for AI agents in IDEs like Claude Code and Cursor.

Consumers declare their UI via a manifest.yaml: pages, layouts (sections/grid/single), data sources, and widget bindings from a built-in library of 25 widgets. aiDeck renders whatever a consumer declares — it is not tied to any specific domain.

Lives at 127.0.0.1 (localhost only), zero telemetry, MIT-licensed. The dashboard is a projection, never the source of truth — consumer data files are canonical; aiDeck reads, validates, and renders.
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

The reference tone is "cockpit / DevTools", not "Notion-pretty". Closer to GitHub DevTools, Linear's command bar, Grafana dashboards than to Asana, ClickUp, or Monday.com. Information density is a feature, not a problem to solve with whitespace.

The product must render a consumer with 5+ pages, each containing 10-20 widgets across sections, without overflow, truncation, or pagination tricks. Treat that as a calibration constraint.

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

3 LAYOUT MODES

1. sections — flowing content, auto-stacked, each section has a title and a 12-column grid of widgets
2. grid — explicit 12-column grid with colStart/colSpan/rowSpan positioning
3. single — one widget fills the entire page

All three must feel like the same product, not three different dashboards.

BRAND PRINCIPLES

1. "Files are canonical." aiDeck never owns state — it projects from consumer data files. The UI must not imply system-of-record semantics. No "saving..." spinners, no "unsaved changes" warnings.

2. "Localhost-only, zero telemetry." A subtle, persistent trust signal showing aiDeck is bound to 127.0.0.1. Developers trust the product specifically because it doesn't phone home.

3. "Consumer-agnostic." The dashboard renders whatever the manifest declares. No hardcoded domain vocabulary. The design system must work equally well for a project tracker, a code health dashboard, a CI pipeline viewer, or a personal knowledge base.

4. "Widget consistency." All 25 built-in widgets share visual atoms: card frames with consistent border radius, header typography, empty states, loading states, error states.

ANTI-PATTERNS TO AVOID

- Big illustrated empty states. Terse text is better.
- Avatar grids, team UI, presence indicators. This is single-user.
- Multi-step onboarding wizards.
- "Tutorial" tooltips on first visit.
- Light-mode toggle.
- Modal-everything. Use inline expansion where possible.
- Decorative gradients or glass effects. Developer audience.

COLOR TOKENS (reference, not prescriptive — Claude Design may refine)

--bg-canvas: #0d1117 (page background)
--bg-surface: #161b22 (cards, panels)
--bg-elevated: #1f262e (hover, modals)
--fg-default: #e6edf3 (primary text)
--fg-muted: #8b949e (secondary text)
--accent-cyan: #58a6ff (active, links)
--accent-green: #56d364 (success, done)
--accent-amber: #d29922 (warning, blocked)
--accent-red: #f85149 (critical, error)
--accent-magenta: #db61a2 (accent)
--accent-purple: #a371f7 (accent)
--border-default: #30363d
--border-subtle: #21262d

ACCESSIBILITY

WCAG AA contrast minimum (4.5:1 text, 3:1 UI). All interactive elements keyboard-reachable. :focus-visible outlines visible against dark surfaces. Skip-to-content link. Aria labels on icon-only buttons.

WHERE TO LOOK IN THE LINKED REPO

- docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md — the full v2 architecture spec
- src/client/ — existing Vue 3 components (functional but unstyled)
- src/client/components/widgets/ — all 26 .vue widget files
- src/client/layouts/ — SectionsLayout.vue, GridLayout.vue, SingleLayout.vue
- src/client/pages/ — HomePage.vue, ConsumerPage.vue
- src/demo/consumer/ — demo manifest + data files with realistic content
- docs/ui-layouts.md — v0.1 wireframes (reference only, not prescriptive for v2)

DESIGN SYSTEM SHOULD INCLUDE

- A dark canvas with at least 3 distinct surface levels (canvas, surface, elevated) for nested cards
- Widget card frame: consistent border, radius, padding, header slot, body slot, empty state
- Accent colors mapped to semantic status (success, warning, error, info, neutral)
- A spacing scale tight enough for dense widget grids on a 13" laptop without horizontal scroll
- A type scale with a strong monospace pair — developers read IDs, paths, and code constantly
- Chart color palette: 6-8 distinguishable hues for multi-series data
- Loading skeleton for widgets (shimmer effect while data loads)
```

## Outros campos

- **"Link code from your computer"**: pular (ja linkado via GitHub)
- **"Upload a .fig file"**: pular
- **"Add fonts, logos and assets"**: pular

Clique **Set up**. Itere visualmente ate o tom bater. So entao prossiga aos briefings de tela.
