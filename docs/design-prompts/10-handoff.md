# Handoff to Claude Code

> Apos validar visualmente todos os briefings (01-09), use o botao "Handoff to Claude Code" do Claude Design. No prompt do handoff, cole o texto abaixo.

```
Convert the design system and all screens (home page, 3 consumer layout pages, 5 widget demo pages) into Vue 3 SFC components for the aiDeck project at https://github.com/henryavila/aideck.

Production stack constraints (non-negotiable — these are project iron laws):

- Vue 3 + Composition API + <script setup lang="ts">
- TypeScript strict mode
- Plain CSS using CSS custom properties. NO Tailwind, NO CSS-in-JS, NO Sass.
- Vue Router 4 with createWebHistory (SPA fallback configured server-side)
- `marked` for markdown rendering
- `mermaid` lazy-loaded only for the graph-dag widget
- No external UI framework (no PrimeVue, no Vuetify, no Naive UI)
- No external charting library (bar-chart, line-chart, gauge, progress-bar are pure SVG/CSS)

The file structure is already in place:

  src/client/
    App.vue                           — root (router-view only)
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
        StatWidget.vue                — 26 widget files, one per widget
        TableWidget.vue
        ... (all 26 exist)
    composables/
      useConsumers.ts                 — fetches consumer list from API
    api.ts                            — API client (fetchConsumerManifest, fetchDataSource)
    utils/
      widgetGridStyle.ts              — computes CSS grid placement

All files exist and are functional but minimally styled. Your job is to apply the design system (colors, typography, spacing, card frames) and the visual patterns from the briefings to each component.

CSS custom properties are already defined in the components (--color-bg-secondary, --color-border, --spacing-md, etc.). Update or extend the variable definitions as needed to match the design system. The root variables live in src/client/styles/ — create a theme.css if it doesn't exist.

Iron Laws from the project that constrain the UI:

1. Files are canonical. The dashboard never mutates data files. No "save" buttons, no "edit" affordances, no autosave spinners.
2. Bind localhost only. No outbound network calls from the client beyond /api/* on the same origin. No external fonts, no CDN resources.
3. No telemetry. No analytics scripts.
4. v0.1 scope is fixed — deliver exactly what the briefings specified, nothing more.

Deliver the changes as one coherent update that I can apply to the existing codebase. Preserve all existing TypeScript logic — only modify templates (<template>) and styles (<style>).
```

## Notas operacionais

- **Se o DS gerado divergir do tom**: cite a divergencia especifica e peca refino. Os briefings sao deterministicos quanto a principios, nao a pixels.
- **Se um briefing precisar ser repetido**: re-cole sem alteracoes.
- **Limite conhecido**: Claude Design nao testa interatividade real (SSE live updates). Validacao live so apos handoff + dev server.
- **Sequencia recomendada**: DS setup → Home → Sections layout → Grid layout → Single layout → Widget groups A-E → Handoff. Cada um assume os anteriores.
