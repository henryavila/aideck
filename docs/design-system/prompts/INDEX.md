# Claude Design Prompts — aiDeck v2

> Briefings prontos para colar em [claude.ai/design](https://claude.ai/design), na ordem listada. Cada arquivo contem um briefing auto-contido.

## Sequencia

| # | Arquivo | O que cobre |
|---|---------|------------|
| 00 | [design-system-setup](00-design-system-setup.md) | Formulario DS: blurb, GitHub link, **tokens do colors_and_type.css**, fontes Inter/JBM, paleta de charts (8 hues), texturas, glass, principios |
| 01 | [home-page](01-home-page.md) | Home (consumer listing) + layout shell (chrome glass, sidebar, status bar, trust signal 127.0.0.1, ⌘K trigger) |
| 02 | [consumer-sections-layout](02-consumer-sections-layout.md) | Consumer page: sections layout (Overview · stats + table + timeline + log) |
| 03 | [consumer-grid-layout](03-consumer-grid-layout.md) | Consumer page: grid layout 12-col (Task Board · kanban) |
| 04  | [consumer-single-layout](04-consumer-single-layout.md) | Consumer page: single layout (Plan Detail · tree-view) + bonus Analytics (bar + gauge + badges + tags) |
| 04a | [states-error-loading-empty](04a-states-error-loading-empty.md) | **Cross-cutting** — loading skeleton, empty states, error states (widget · page · app levels), disconnected/stale data |
| 04b | [command-palette](04b-command-palette.md) | **Cross-cutting** — ⌘K palette: glass-thick overlay, fuzzy nav across consumers/pages/widgets/files/commands |
| 04c | [sse-live-indicators](04c-sse-live-indicators.md) | **Cross-cutting** — live data vocabulary: live dot, scanline overlay, row flash, disconnect banner, reconnect toast |
| 05 | [widgets-stats-metrics](05-widgets-stats-metrics.md) | Grupo A: stat · gauge · progress-bar · badge |
| 06 | [widgets-data-display](06-widgets-data-display.md) | Grupo B: table · list · key-value · card · tag-chip |
| 07 | [widgets-charts](07-widgets-charts.md) | Grupo C: bar-chart · line-chart · graph-dag (Mermaid) |
| 08 | [widgets-content-layout](08-widgets-content-layout.md) | Grupo D: markdown · code-block · tabs · accordion · container · grid-columns |
| 09 | [widgets-activity-nav](09-widgets-activity-nav.md) | Grupo E: kanban-board · timeline · log-feed · tree-view · breadcrumb · header-nav · drawer · search-filter |
| 10 | [handoff](10-handoff.md) | Prompt de handoff para Claude Code — stack lockdown + tokens completos + file structure + iron laws |
| 11 | [widgets-extension](11-widgets-extension.md) | **v2.1** — 7 widgets novos (stepper · status-list · callout · collection-grid · record-switcher · catalog · headline-banner) + 3 enhancements (progress · card · header-nav). Todos agnósticos, tom via `statusMap` |

## Cobertura dos 25 widgets

Os 25 widgets built-in (+ card-grid alias) estao cobertos integralmente nos grupos A-E (briefings 5-9).

| Familia | Widgets |
|---------|---------|
| Data display | Table · Stat · List · Key-Value |
| Charts | Line · Bar · Gauge · Progress |
| Text / content | Markdown · Code Block |
| Layout primitives | Container · Grid/Columns · Tabs · Accordion |
| Status | Badge · Tag/Chip · Card |
| Activity (AI-tool) | Kanban · Timeline · Log Feed |
| Navigation | Tree View · Breadcrumb · Header/Nav · Drawer · Search/Filter |
| Specialized | Graph/DAG (Mermaid) |

**v2.1 (briefing 11):** stepper · status-list · callout · collection-grid · record-switcher · catalog · headline-banner, mais enhancements de progress · card · header-nav. Specimens em `preview/`; protótipo em `ui_kits/dashboard` (páginas `records` · `record` · `catalog`).

## Dados de demo

Todos os briefings usam os mesmos dados do demo consumer (`src/demo/consumer/`):

- **4 projects** (proj-1 API Gateway, proj-2 Mobile App v3, proj-3 Data Pipeline, proj-4 Auth Rewrite)
- **8 tasks** (T-001 a T-008, distribuidas em todos status: done/in-progress/todo/paused)
- **6 events** (timeline + log feed)

Numeros consistentes entre telas — Claude Design pode validar visualmente que "12 tasks" significa o mesmo na Stat, na Table, no Kanban, e no Timeline.

## Vocabulario semantico (consistente em todos os briefings)

| Token | Hex | Mapeia | Glifo Unicode |
|-------|-----|--------|---------------|
| `--status-success` | #4cc28e | passed, done, healthy | ✓ |
| `--status-warning` | #e0a44a | needs attention, paused, blocked | ! |
| `--status-error`   | #ff5c5c | failed, critical, broken | × |
| `--status-info`    | #5fb1ff | active, running, current (accent primary) | ◉ |
| `--status-neutral` | #8b95a3 | idle, pending, unknown | · |

| Consumer value | Maps to |
|----------------|---------|
| active, in-progress | --status-info |
| done | --status-success |
| paused, blocked | --status-warning |
| todo, pending | --status-neutral |
| failed, error | --status-error |

## Briefings cross-cutting (04a · 04b · 04c)

Entre os layouts (04) e os grupos de widgets (05), tem 3 briefings que estabelecem vocabularios usados em todas as telas. Cole na ordem antes de passar pros widgets:

- **04a · estados** — loading skeleton, empty, error em 3 niveis (widget, pagina, app), mais disconnect/stale. Garante que toda mensagem de erro tem `fato + sugestao` (contrato do schema).
- **04b · command palette ⌘K** — superficie de navegacao keyboard-first. Glass-thick overlay com grupos PAGES / CONSUMERS / COMMANDS, fuzzy match, atalhos ⌘1..⌘9.
- **04c · indicadores SSE/live** — dot verde com glow, scanline overlay em widgets ao vivo, row-flash em entradas novas, banner de disconnect, toast de reconnect.

## Iron rules vigentes (resumo)

1. **Dark theme only.** Sem light, sem `prefers-color-scheme`.
2. **Files are canonical.** Sem "Save", sem "unsaved changes".
3. **127.0.0.1 visivel sempre** no chrome header.
4. **Density is a feature.** 5 paginas × 12-20 widgets em 13".
5. **Glass = chrome only.** Nunca em widget body.
6. **Widget frame canonico** identico nos 25.
7. **Semantica nos tokens.** `--status-success`, nao `--phase-done`.
