# Handoff to Claude Code

> Apos validar visualmente todos os briefings (01-09), use o botao "Handoff to Claude Code" do Claude Design. No prompt do handoff, cole o texto abaixo.

```
Convert the design system and all screens (home page, 3 consumer layout pages, cross-cutting states + command palette + live/SSE patterns, 5 widget demo pages) into Vue 3 SFC components for the aiDeck project at https://github.com/henryavila/aideck.

Production stack constraints (non-negotiable — project iron laws):

- Vue 3 + Composition API + <script setup lang="ts">
- TypeScript strict mode
- Plain CSS with CSS custom properties. NO Tailwind, NO CSS-in-JS, NO Sass/Less.
- Vue Router 4 with createWebHistory (SPA fallback configured server-side)
- `marked` for markdown rendering
- `mermaid` lazy-loaded only for the graph-dag widget
- No external UI framework (no PrimeVue, no Vuetify, no Naive UI, no shadcn-vue)
- No external charting library — bar-chart, line-chart, gauge, progress-bar are pure SVG / CSS
- Fonts via Google Fonts: Inter (sans, weights 400/500/600/700) + JetBrains Mono (mono, 400/500/600). Self-host in production if telemetry-strict, but Google Fonts in dev is fine.

DESIGN TOKEN APPLICATION

The design system established in setup uses these tokens. Apply them as CSS custom properties under :root (and dark-theme defaults — there is no light theme). The project's existing src/client/styles/ folder should contain a theme.css with these variables — create or replace.

  SURFACES
  --bg-sunken:    #07090d
  --bg-canvas:    #0a0d12
  --bg-surface:   #12161d
  --bg-elevated:  #1a1f28
  --bg-overlay:   #232936
  --bg-highlight: #2d3340

  GLASS (chrome only — header, command palette, drawers, popovers)
  --glass-thin:   rgba(18,22,29,0.55)
  --glass-medium: rgba(18,22,29,0.72)
  --glass-thick:  rgba(10,13,18,0.85)
  --glass-blur:   saturate(180%) blur(20px)

  BORDERS
  --border-subtle:  #1a2029
  --border-default: #262d38
  --border-strong:  #3d4656
  --border-bright:  #555f72

  FOREGROUND
  --fg-default:   #e9eef5
  --fg-muted:     #98a1ad
  --fg-subtle:    #6b7585
  --fg-faint:     #424a5a
  --fg-on-accent: #08090d

  SEMANTIC STATUS (5 canonical — consumers map domain vocabulary onto these)
  --status-success: #4cc28e
  --status-warning: #e0a44a
  --status-error:   #ff5c5c
  --status-info:    #5fb1ff
  --status-neutral: #8b95a3

  CHART PALETTE (8 hues for multi-series, in order)
  --chart-1..8: #5fb1ff #4cc28e #e668a8 #e0a44a #8b5cf6 #2dd4bf #f0c757 #f87171

  TYPE
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace
  Scale 10→56px (2xs=10, xs=11, sm=12, base=13, md=14, lg=16, xl=20, 2xl=24, 3xl=32, 4xl=40, 5xl=56)
  Mono ligatures off: font-feature-settings: "calt" 0
  Tabular numbers on all numerics: font-variant-numeric: tabular-nums

  SPACING — 4px base, --space-1=2 through --space-32=64
  RADII   — xs:2 sm:4 md:6 lg:8 (default) xl:12 pill:999
  SHADOWS — ambient, sm, md, lg, xl, focus, glow-info

  TEXTURES — applied via CSS background-image
  --texture-grid:    radial dots, 28px grid, ~8.5% white (default body bg)
  --texture-grid-lg: 1px crosshatch, 64px grid, ~4% white (hero / empty backdrops)
  --texture-scan:    1px horizontal scanlines, 3px gap (SSE-live widget overlay via .is-live)

FILE STRUCTURE IN PLACE

  src/client/
    App.vue                           — router-view only
    pages/
      HomePage.vue                    — home page (consumer listing)
      ConsumerPage.vue                — consumer page (tab bar + layout switch)
    layouts/
      SectionsLayout.vue              — sections layout engine
      GridLayout.vue                  — grid layout engine
      SingleLayout.vue                — single layout engine
    components/
      WidgetRenderer.vue              — resolves widget name to component
      widgets/
        StatWidget.vue                — one .vue per widget kind (all 26 exist)
        TableWidget.vue
        ListWidget.vue
        KeyValueWidget.vue
        BarChartWidget.vue
        LineChartWidget.vue
        GaugeWidget.vue
        ProgressBarWidget.vue
        BadgeWidget.vue
        TagChipWidget.vue
        CardWidget.vue
        KanbanBoardWidget.vue
        TimelineWidget.vue
        LogFeedWidget.vue
        TreeViewWidget.vue
        BreadcrumbWidget.vue
        HeaderNavWidget.vue
        DrawerWidget.vue
        SearchFilterWidget.vue
        MarkdownWidget.vue
        CodeBlockWidget.vue
        TabsWidget.vue
        AccordionWidget.vue
        ContainerWidget.vue
        GridColumnsWidget.vue
        GraphDagWidget.vue              — lazy imports mermaid
    composables/
      useConsumers.ts                 — fetches consumer list from API
      useDataSource.ts                — fetches and subscribes to a data source (SSE)
    api.ts                            — API client (fetchConsumerManifest, fetchDataSource)
    utils/
      widgetGridStyle.ts              — computes CSS grid placement
    styles/
      theme.css                       — design tokens (create or update)
      reset.css                       — minimal reset

All files exist and are functional but minimally styled. Your job is to apply the design system (colors, typography, spacing, card frames, glass chrome, textures) and the visual patterns from the briefings to each component. Preserve all existing TypeScript logic — only modify <template> and <style> blocks.

IRON LAWS

1. Files are canonical. The dashboard never mutates consumer data files. No "save" buttons, no "edit" affordances, no autosave spinners. Mutations are framed as *requests*, never *saves*.
2. Localhost-only. No outbound network calls from the client beyond /api/* and /_sse on the same origin. No external fonts at runtime if telemetry-strict (self-host); CDN fonts are OK in dev. No analytics, no error reporting, no auto-update pings.
3. The 127.0.0.1 trust signal must remain visible in the chrome header at all times.
4. Dark theme only. Do NOT add a light theme toggle, prefers-color-scheme branch, or a "theme provider" abstraction. v0.1 is dark-only and explicit.
5. Density is a feature. Do not increase whitespace, padding, or font sizes to "improve" readability. The system is calibrated for dense data.
6. Glass is chrome only. backdrop-filter blur belongs on the header, command palette, drawer, and popovers — never on a widget body.
7. Every widget uses the canonical frame. 1px --border-default, 8px --radius-lg, --bg-surface, --shadow-ambient. Identical loading / empty / error states.

Deliver as one coherent update I can apply to the existing codebase.
```

## Notas operacionais

- **Se o DS gerado divergir do tom**: cite a divergencia especifica e peca refino. Os briefings sao deterministicos quanto a principios, nao a pixels.
- **Se um briefing precisar ser repetido**: re-cole sem alteracoes.
- **Limite conhecido**: Claude Design nao testa interatividade real (SSE live updates). Validacao live so apos handoff + dev server.
- **Sequencia recomendada**: DS setup → Home → Sections layout → Grid layout → Single layout → **04a estados** → **04b command palette** → **04c live/SSE** → Widget groups A-E → Handoff. Cada briefing assume os anteriores.
