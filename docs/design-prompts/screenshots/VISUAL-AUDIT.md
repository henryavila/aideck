# Visual Audit — aiDeck Demo (2026-05-27)

Estado visual do `aideck demo` antes dos prompts Claude Design.

## Ambiente de teste

- Demo: `npx tsx src/cli.ts demo` → http://127.0.0.1:7777
- Frontend: `npx vite` → http://localhost:5173 (proxy API para 7777)
- 2 consumers: aideck-demo (3 data sources, 3 pages), dispatch-test (1/1)

## Home Page (/)

**O que funciona:**
- Titulo "aiDeck" + subtitulo "2 consumers registered"
- Grid de consumer cards com titulo, data source count, page count
- Cards sao clicaveis → navegam para /<consumer-id>/
- Hover tem efeito de border + background

**O que falta / esta feio:**
- Fundo branco default do browser → dark theme so aplica se tokens.css carrega (funciona via Vite)
- Nenhum icone MDI renderizado (mostra texto "mdi:rocket" em vez do icone)
- Nenhum chrome global (sem logo fixo, sem breadcrumb, sem indicador 127.0.0.1)
- Sem demo banner
- Sem empty state estilizado (so texto)
- Cards nao tem card frame consistente (border radius, padding OK mas sem shadow/elevation)
- Sem loading skeleton

## Overview Page (/aideck-demo/overview) — Sections Layout

**O que funciona:**
- Tab bar com 3 tabs (Overview, Task Board, Analytics) com active state
- 3 sections renderizadas: Project Stats, Projects, Recent Activity
- Section headers uppercase, muted, com chevron se collapsible
- Stat widgets: numeros grandes centralizados (4, 2, 3, 8) com labels
- Stat com color custom (var(--color-accent), var(--color-success)) funciona
- Table widget: 4 rows com sticky header, alternating rows, hover
- Timeline widget: renderiza 6 eventos (depende da implementacao)
- Log feed widget: renderiza 6 eventos compactos

**O que falta / esta feio:**
- Widgets sem card frame visual (sem borda, sem background, fundem com o fundo)
- Grid 12-col funciona mas sem gap visual entre widgets
- Stats sao numeros puros sem context visual (sem icone, sem trend)
- Table: status values nao tem color coding semantico (tudo texto plain)
- Timeline: implementacao basica, sem spine/dot decorativo
- Log feed: implementacao basica, sem styling de terminal
- Sem responsive breakpoints (colSpan fixo, nao adapta em telas menores)

## Task Board (/aideck-demo/board) — Grid Layout

**O que funciona:**
- Kanban com 3 colunas (todo, in-progress, done)
- Cards distribuidos corretamente por status
- Column headers com nome + count badge
- Cards mostram campos dos dados

**O que falta / esta feio:**
- Colunas sem color coding no header (todo/in-progress/done identicos)
- Cards sem tags renderizados como chips (mostra array como texto)
- Sem visual distinction entre colunas (todas mesma cor de fundo)
- Grid layout rowHeight funcional mas sem visual de "grid cells"
- Kanban ocupa toda a area mas sem empty column styling elegante

## Analytics (/aideck-demo/analytics) — Sections Layout

**O que funciona:**
- 2 sections: Task Completion, Tags
- Bar chart widget renderiza (depende da implementacao do BarChartWidget.vue)
- Gauge widget renderiza
- Tag chip widget renderiza tags como pills
- Badge widget renderiza status como badges

**O que falta / esta feio:**
- Bar chart: implementacao minima (sem eixos, sem grid lines, sem tooltip)
- Gauge: implementacao minima (sem arco visual, provavelmente so numero)
- Tag chips: sem color rotation (todos mesma cor)
- Badges: sem color semantico por status value

## Widgets nao exercitados no demo

O demo manifest so usa 9 dos 26 widgets:
- Usados: stat, table, timeline, log-feed, kanban-board, bar-chart, gauge, tag-chip, badge
- NAO usados: card, list, key-value, line-chart, progress-bar, markdown, code-block, tabs, accordion, container, grid-columns, breadcrumb, header-nav, drawer, search-filter, tree-view, graph-dag

Estes 17 widgets existem como .vue files mas nao foram visualmente validados.

## Resumo

| Aspecto | Estado |
|---------|--------|
| Dark theme (tokens) | Funciona via Vite |
| Layout sections | Funcional, sem card frames |
| Layout grid | Funcional |
| Layout single | Nao exercitado no demo |
| Tab navigation | Funciona |
| Stat widgets | Funcional, minimo |
| Table widget | Bom, falta color coding |
| Kanban | Funcional, falta color headers |
| Charts | Minimos, sem eixos/tooltips |
| Tags/badges | Funcional, falta color variety |
| 17 widgets nao testados | Existem, nao validados |
| Responsive | Nao implementado |
| Chrome global | Nao existe |
| Demo banner | Nao existe |
| Loading states | Nao existem |
| MDI icons | Nao renderizam |

## Proximos passos

1. Usar prompts Claude Design (docs/design-prompts/) para gerar visual polido
2. Portar CSS de referencia para os Vue SFCs existentes (T-019)
3. Expandir demo manifest para exercitar todos 25 widgets (T-004)
