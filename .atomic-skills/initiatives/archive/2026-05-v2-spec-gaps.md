---
schemaVersion: '0.1'
slug: v2-spec-gaps
title: 'Resolver gaps da review spec vs implementacao v2'
goal: 'Fechar todos os 19 findings (4 critical, 10 significant, 5 minor) da review adversarial spec-vs-implementacao para que aiDeck v2 esteja spec-compliant e visualmente validado.'
status: archived
branch: feat/aideck-v2-generic-runtime
started: '2026-05-27T07:12:35Z'
lastUpdated: '2026-05-29T01:28:37Z'
nextAction: 'Concluido — design v2 portado (foundation+shell+25 widgets+3 layouts+home+palette+live), validado no browser (desktop+mobile). Pronto para commit + PR.'

exitGates:
  - id: GG-1
    description: 'aideck demo roda no browser e renderiza todos 25 widgets com dados reais'
    status: done
    verifier: { kind: manual, description: 'Rodar aideck demo, abrir browser, verificar visualmente cada widget' }
  - id: GG-2
    description: 'npm run test:coverage mostra >= 70% nos modulos core (server, mcp, schemas)'
    status: done
    verifier: { kind: shell, command: 'npm run test:coverage 2>&1 | grep -E "Statements|Branches|Functions|Lines"' }
  - id: GG-3
    description: 'Responsive breakpoints funcionam em 4 faixas (sm/md/lg/xl) nos 3 layouts'
    status: done
    verifier: { kind: manual, description: 'Redimensionar browser em 4 larguras e verificar layout adapta' }
  - id: GG-4
    description: 'README.md atualizado descreve arquitetura v2 (consumers, manifest, generic runtime)'
    status: done
    verifier: { kind: manual, description: 'Ler README e confirmar que descreve v2, nao v0.1' }

stack:
  - { id: 1, title: 'Resolver gaps spec vs implementacao v2', type: task, openedAt: '2026-05-27T07:12:35Z' }

tasks:
  - id: T-001
    title: 'Gerar prompts Claude Design'
    description: 'Gerar prompts para claude.ai/design cobrindo: home page, consumer page (3 layouts), e 5 grupos de widgets com dados reais do demo consumer. Salvar em docs/design-prompts/.'
    status: done
    closedAt: '2026-05-27T07:27:37Z'
    lastUpdated: '2026-05-27T07:27:37Z'
    tags: [critical, design, C1]

  - id: T-002
    title: 'Rodar aideck demo no browser e screenshot estado atual'
    description: 'Executar aideck demo, abrir no browser, capturar o estado visual atual das 3 paginas. Documentar o que funciona vs o que esta quebrado/feio. Base para comparacao pos-design.'
    status: done
    closedAt: '2026-05-27T07:32:14Z'
    lastUpdated: '2026-05-27T07:32:14Z'
    tags: [critical, design, C2]

  - id: T-003
    title: 'Implementar responsive breakpoints nos 3 layouts'
    description: 'Adicionar media queries ou container queries em SectionsLayout, GridLayout, SingleLayout para 4 faixas: sm (<640px), md (640-1024), lg (1024-1440), xl (>1440). WidgetRenderer deve aplicar responsive overrides do binding.'
    status: done
    closedAt: '2026-05-27T08:51:14Z'
    lastUpdated: '2026-05-27T08:51:14Z'
    tags: [significant, frontend, S1]
    blockedBy: [T-002]

  - id: T-004
    title: 'Expandir demo manifest para 25 widgets'
    description: 'Atualizar src/demo/consumer/manifest.yaml para exercitar todos 25 widgets built-in. Adicionar dados de exemplo para widgets faltantes (key-value, progress-bar, code-block, card, line-chart, tabs, accordion, container, grid-columns, breadcrumb, header-nav, drawer, search-filter, tree-view, markdown, list).'
    status: done
    closedAt: '2026-05-27T07:35:44Z'
    lastUpdated: '2026-05-27T07:35:44Z'
    tags: [critical, demo, C3]

  - id: T-005
    title: 'Implementar instance lockfile'
    description: 'Escrever ~/.aideck/lock com PID + port no startup. Recusar start se outra instancia estiver viva (verificar PID). Limpar no shutdown. Adicionar em src/server/index.ts startServer().'
    status: done
    closedAt: '2026-05-27T08:02:02Z'
    lastUpdated: '2026-05-27T08:02:02Z'
    tags: [significant, infra, S3]

  - id: T-006
    title: 'Implementar SSE throttle per-consumer'
    description: 'Adicionar debounce configuravel (default 100ms) no ConsumerWatcher antes de emitir eventos no EventBus. Eventos do mesmo consumer dentro da janela sao coalescidos.'
    status: done
    closedAt: '2026-05-27T08:02:02Z'
    lastUpdated: '2026-05-27T08:02:02Z'
    tags: [significant, infra, S4]

  - id: T-007
    title: 'Implementar file count cap per-consumer'
    description: 'ConsumerWatcher ignora consumidores cujo data/ excede o cap (default 5000 arquivos). Logar warning. Cap configuravel via manifest ou config global.'
    status: done
    closedAt: '2026-05-27T08:02:02Z'
    lastUpdated: '2026-05-27T08:02:02Z'
    tags: [significant, infra, S5]

  - id: T-008
    title: 'Sandboxing do script handler'
    description: 'files.append() no script handler deve validar que o target esta dentro de paths declarados como writable no manifest (dataSources com operation append, ou paths explicitos). Rejeitar escritas fora do escopo.'
    status: done
    closedAt: '2026-05-27T08:18:37Z'
    lastUpdated: '2026-05-27T08:18:37Z'
    tags: [significant, security, S6]

  - id: T-009
    title: 'Implementar tools/list_changed MCP notification'
    description: 'Quando consumers sao carregados/descarregados (hot-reload via watcher), emitir tools/list_changed notification no MCP server para que clients descubram novos tools.'
    status: done
    closedAt: '2026-05-27T08:18:37Z'
    lastUpdated: '2026-05-27T08:18:37Z'
    tags: [significant, mcp, S7]

  - id: T-010
    title: 'Wire route param resolution no WidgetRenderer'
    description: 'Quando um widget tem source.param (ex: planSlug), WidgetRenderer deve ler $route.params[param] e filtrar os records pelo valor. Implementar em ConsumerPage -> WidgetRenderer.'
    status: done
    closedAt: '2026-05-27T08:36:12Z'
    lastUpdated: '2026-05-27T08:36:12Z'
    tags: [significant, frontend, S8]

  - id: T-011
    title: 'Implementar linkTo navigation em widgets'
    description: 'Widgets com config.linkTo devem renderizar como router-link para /<consumerId>/<linkTo>. Adicionar suporte em CardWidget e TableWidget (os dois que mais usam linkTo na spec).'
    status: done
    closedAt: '2026-05-27T08:36:12Z'
    lastUpdated: '2026-05-27T08:36:12Z'
    tags: [significant, frontend, S9]

  - id: T-012
    title: 'Medir e reportar coverage'
    description: 'Rodar npm run test:coverage. Identificar modulos abaixo de 70%. Adicionar testes onde necessario para atingir o target nos modulos core (server/, mcp/, schemas/).'
    status: done
    closedAt: '2026-05-27T08:51:14Z'
    lastUpdated: '2026-05-27T08:51:14Z'
    tags: [significant, testing, S10]

  - id: T-013
    title: 'Atualizar README para v2'
    description: 'Reescrever README.md descrevendo: arquitetura v2 (consumers, manifest, generic runtime), quick start (init-consumer, serve, demo), component library (25 widgets), CLI commands, MCP tools. Remover descricao v0.1.'
    status: done
    closedAt: '2026-05-27T08:36:12Z'
    lastUpdated: '2026-05-27T08:36:12Z'
    tags: [critical, docs, C4]

  - id: T-014
    title: 'Implementar dynamic layout (repeat, autoGrid)'
    description: 'Adicionar repeat/repeatDirection/maxRepeatColumns e autoGrid/maxColumns/minCardWidth/fillScreen ao manifest schema e aos layout components. 7 props da spec secao 6.'
    status: done
    closedAt: '2026-05-27T08:56:24Z'
    lastUpdated: '2026-05-27T08:56:24Z'
    tags: [significant, frontend, S2]
    blockedBy: [T-003]

  - id: T-015
    title: 'Demo banner no frontend'
    description: 'Quando aideck serve roda em modo demo, injetar banner visual no topo da pagina indicando "Demo Mode". Prop passada via API /api/health demo field.'
    status: done
    closedAt: '2026-05-27T08:18:37Z'
    lastUpdated: '2026-05-27T08:18:37Z'
    tags: [minor, frontend, M1]

  - id: T-016
    title: 'Layout spacing props (align, padding)'
    description: 'Adicionar align e padding como props configuráveis em SectionsLayout e GridLayout (via section/page config). Hoje sao hardcoded em CSS.'
    status: done
    closedAt: '2026-05-27T08:36:12Z'
    lastUpdated: '2026-05-27T08:36:12Z'
    tags: [minor, frontend, M2]

  - id: T-017
    title: 'Section visible conditional'
    description: 'Quando section.visible e uma expressao (ex: "status=active"), avaliar contra os dados e esconder/mostrar a secao. Expressoes simples key=value.'
    status: done
    closedAt: '2026-05-27T08:36:12Z'
    lastUpdated: '2026-05-27T08:36:12Z'
    tags: [minor, frontend, M4]

  - id: T-018
    title: 'Decidir MCP tool namespacing (dots vs underscores)'
    description: 'Spec diz dots (aideck.atomic_skills.mark_done), implementacao usa underscores (aideck_atomic_skills_mark_done). Verificar se MCP protocol suporta dots em tool names. Documentar decisao.'
    status: done
    closedAt: '2026-05-27T08:02:02Z'
    lastUpdated: '2026-05-27T08:02:02Z'
    tags: [minor, decision, M5]

  - id: T-019
    title: 'Portar templates Claude Design para Vue SFCs'
    description: 'Apos receber HTML/CSS do Claude Design (T-001), atualizar os 26 widget .vue files e os 3 layouts com o CSS de referencia. Validar no browser.'
    status: done
    closedAt: '2026-05-28T21:50:00Z'
    lastUpdated: '2026-05-28T21:50:00Z'
    tags: [critical, design]
    blockedBy: [T-001, T-002]

parked: []

emerged: []
---

# v2 Spec Gaps — Resolver findings da review adversarial

Esta initiative fecha todos os gaps identificados na review adversarial de 2026-05-27 que comparou a spec (`docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md`) contra o plano de implementacao e o codigo real.

## Contexto

A implementacao v2 completou 42 tasks (F0-F5) com 410 tests e typecheck green. O backend esta solido. Os gaps concentram-se em:
1. **Frontend nunca validado visualmente** — nenhum Claude Design, nenhum browser test
2. **Spec features faltantes** — responsive, lockfile, throttle, sandboxing, etc.
3. **DoD incompleto** — demo com 9/25 widgets, README desatualizado, coverage nao medida

## Agrupamento por dependencia

```
T-001 Design prompts ─────┐
T-002 Browser screenshot ──┼── T-019 Portar CSS ──── T-003 Responsive ──── T-014 Dynamic layout
T-004 Demo 25 widgets      │
                            │
T-005 Lockfile              │   (independentes — infra)
T-006 SSE throttle          │
T-007 File count cap        │
T-008 Script sandboxing     │
T-009 tools/list_changed    │
                            │
T-010 Route params          │   (independentes — frontend fixes)
T-011 linkTo navigation     │
T-015 Demo banner           │
T-016 Spacing props         │
T-017 Section visible       │
T-018 MCP naming decision   │
                            │
T-012 Coverage report       │   (roda no final)
T-013 README v2             │
```

## Links

- [Review adversarial](../../docs/superpowers/plans/review-spec-vs-implementation.md)
- [Spec v2](../../docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md)
- [Plano implementacao](../../docs/superpowers/plans/2026-05-26-aideck-v2-implementation.md)
