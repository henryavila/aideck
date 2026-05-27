# Claude Design Prompts — aiDeck v2

Prompts para colar em [claude.ai/design](https://claude.ai/design) na ordem listada. Cada arquivo contem um briefing auto-contido.

## Sequencia

| # | Arquivo | O que cobre |
|---|---------|------------|
| 00 | [design-system-setup](00-design-system-setup.md) | Formulario DS: blurb, GitHub link, notas |
| 01 | [home-page](01-home-page.md) | Home (consumer listing) + layout shell |
| 02 | [consumer-sections-layout](02-consumer-sections-layout.md) | Consumer page: sections layout (Overview) |
| 03 | [consumer-grid-layout](03-consumer-grid-layout.md) | Consumer page: grid layout (Task Board) |
| 04 | [consumer-single-layout](04-consumer-single-layout.md) | Consumer page: single layout + Analytics |
| 05 | [widgets-stats-metrics](05-widgets-stats-metrics.md) | Grupo A: stat, gauge, progress-bar, badge |
| 06 | [widgets-data-display](06-widgets-data-display.md) | Grupo B: table, list, key-value, card, tag-chip |
| 07 | [widgets-charts](07-widgets-charts.md) | Grupo C: bar-chart, line-chart, graph-dag |
| 08 | [widgets-content-layout](08-widgets-content-layout.md) | Grupo D: markdown, code-block, tabs, accordion, container, grid-columns |
| 09 | [widgets-activity-nav](09-widgets-activity-nav.md) | Grupo E: kanban, timeline, log-feed, tree-view, breadcrumb, header-nav, drawer, search-filter |
| 10 | [handoff](10-handoff.md) | Prompt de handoff para Claude Code |

## Cobertura dos 25+1 widgets

Todos os 26 widgets (25 built-in + card-grid alias) estao cobertos nos grupos A-E.

## Dados usados

Todos os prompts usam dados reais do demo consumer (`src/demo/consumer/`):
- 4 projetos (projects.yaml)
- 8 tasks (tasks.yaml)
- 6 eventos (events.jsonl)
