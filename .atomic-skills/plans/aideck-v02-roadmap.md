---
schemaVersion: '0.1'
slug: aideck-v02-roadmap
title: 'aiDeck v0.2+ Roadmap'
version: '1.0'
status: active
started: '2026-05-25T23:38:00-03:00'
lastUpdated: '2026-05-25T23:38:00-03:00'
currentPhase: F0
parallelismAllowed: true

principles:
  - id: P1
    title: 'Backend-first, UI por consumer'
    body: 'aiDeck continua sendo um runtime de API. Cada feature entrega endpoints HTTP + tools MCP. A renderizacao visual (Vue SPA) vive no consumer (atomic-skills) e consome os endpoints via fetch/SSE.'
  - id: P2
    title: 'Sem quebra de contrato v0.1'
    body: 'Nenhuma feature deste roadmap altera o comportamento existente dos endpoints v0.1. Novos endpoints usam prefixos novos (/api/search, /api/timeline). MCP tools existentes nao mudam assinatura.'
  - id: P3
    title: 'Incremental value'
    body: 'Cada fase entrega valor usavel isoladamente. Nenhuma fase consome outputs de outra — todas dependem exclusivamente da infra v0.1 (watcher, SSE, ProjectRegistry, parsers). A ordem F0-F3 e sugerida, nao obrigatoria.'
  - id: P4
    title: 'Local-only, zero telemetria'
    body: 'Herda a iron law do v0.1. Busca e indexacao rodam in-process, sem servicos externos. Reports HTML sao arquivos estaticos locais.'

glossary: []

phases:
  - id: F0
    slug: aideck-v02-roadmap-f0-cross-project-search
    title: 'Cross-project search'
    goal: 'Permitir busca de plans/initiatives/tasks por texto livre ou filtro estruturado atraves de todos os projetos registrados no ProjectRegistry'
    dependsOn: []
    subPhaseCount: 6
    status: active
    exitGate:
      summary: 'Busca cross-project funcional via REST + MCP com indice incremental'
      criteria:
        - id: G-1
          description: 'Busca por texto retorna resultados de 2+ projetos registrados simultaneamente'
          status: pending
          verifier:
            kind: shell
            command: "curl -s 'http://127.0.0.1:7777/api/search?q=foundation&type=plan' | jq '.results | length > 1'"
        - id: G-2
          description: 'MCP tool search_across_projects retorna mesmos resultados que REST'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'search_across_projects'"
        - id: G-3
          description: 'Indice atualiza em < 500ms apos file change (watcher event -> index rebuild)'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'search index update latency'"

  - id: F1
    slug: aideck-v02-roadmap-f1-timeline-view
    title: 'Timeline view'
    goal: 'Expor um stream cronologico de eventos atraves de todos os projetos, com paginacao e filtros'
    dependsOn: []
    subPhaseCount: 6
    status: pending
    exitGate:
      summary: 'Timeline funcional com event log persistente, rotacao, e replay via SSE'
      criteria:
        - id: G-1
          description: 'GET /api/timeline retorna eventos de multiplos projetos ordenados cronologicamente'
          status: pending
          verifier:
            kind: shell
            command: "curl -s 'http://127.0.0.1:7777/api/timeline?limit=10' | jq '.events[0].timestamp > .events[1].timestamp'"
        - id: G-2
          description: 'Rotacao do JSONL ocorre ao atingir 10k linhas sem perda de eventos'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'event log rotation'"
        - id: G-3
          description: 'Last-Event-ID replay funciona com eventos do log persistente (alem da sessao atual)'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'SSE replay from persistent log'"

  - id: F2
    slug: aideck-v02-roadmap-f2-parallel-dispatch-renderer
    title: 'Parallel-dispatch renderer'
    goal: 'Fornecer endpoints e MCP tools para renderizar estado de execucoes parallel-dispatch: agentes ativos, progresso, task graph, resultado consolidado'
    dependsOn: []
    subPhaseCount: 7
    status: pending
    exitGate:
      summary: 'Parser + endpoint + MCP tool para dispatch state com task graph e resultado consolidado'
      criteria:
        - id: G-1
          description: 'Parser le corretamente batch com 4+ agentes e projeta status consolidado'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'parallel-dispatch parser'"
        - id: G-2
          description: 'SSE dispatch-progress events chegam ao browser em < 300ms apos mudanca no arquivo de status'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'dispatch SSE latency'"
        - id: G-3
          description: 'MCP tool get_dispatch_status retorna JSON valido para batch ativo'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'get_dispatch_status'"

  - id: F3
    slug: aideck-v02-roadmap-f3-code-review-html-reports
    title: 'Code review HTML reports'
    goal: 'Gerar reports HTML estaticos a partir de code reviews com syntax highlighting, severity badges, e navegacao por finding'
    dependsOn: []
    subPhaseCount: 5
    status: pending
    exitGate:
      summary: 'HTML gerado automaticamente via watcher + startup backfill, servido e listado via REST + MCP'
      criteria:
        - id: G-1
          description: 'HTML gerado a partir de review .md abre no browser com syntax highlighting funcional'
          status: pending
          verifier:
            kind: manual
            description: 'Abrir o HTML gerado no browser e verificar que code blocks tem highlighting e findings tem severity badges'
        - id: G-2
          description: 'Watcher gera HTML automaticamente quando .md e adicionado a reviews/'
          status: pending
          verifier:
            kind: shell
            command: "npm test -- --grep 'review HTML auto-generation'"
        - id: G-3
          description: 'GET /api/reviews lista todos os reports com metadata correta'
          status: pending
          verifier:
            kind: shell
            command: "curl -s http://127.0.0.1:7777/api/reviews | jq '.reviews | length >= 1'"

references:
  - path: 'docs/v0.1-scope.md'
    role: 'v0.1 scope (what this roadmap extends)'
  - path: '.atomic-skills/reviews/2026-05-25-1430-aideck-v02-roadmap.md'
    role: 'Cross-model adversarial review (local + codex)'
---

# aiDeck v0.2+ Roadmap

O runtime aiDeck v0.1 entrega o backend completo: HTTP/SSE/MCP, watcher, multi-project, parsers, CLI. As features deste roadmap estendem aiDeck para cobrir os cenarios que o v0.1 explicitamente deixou de fora: busca cross-project, visualizacoes cronologicas, renderizacao de coordenacao paralela, e reports HTML para code review.

Cada fase e auto-contida e pode ser liberada independentemente. A numeracao (F0-F3) reflete uma ordem sugerida de implementacao, nao uma cadeia de dependencias: nenhuma fase consome outputs de outra. Todas dependem exclusivamente da infra v0.1 (watcher, SSE, ProjectRegistry, parsers).

## 1. Context

aiDeck v0.1 resolve o problema de dar ao humano uma superficie persistente para ver o que o AI esta fazendo. Mas o v0.1 e scoped para um unico consumer (project-status) e nao oferece busca, historico, coordenacao de agentes paralelos, ou reports visuais. Este roadmap estende o runtime para cobrir esses gaps sem quebrar os contratos existentes.

Origem: bloco "Roadmap" do README.md, cruzado com "Out-of-scope for v0.1" em docs/v0.1-scope.md.

## 2. Principios

- **P1 — Backend-first, UI por consumer.** aiDeck entrega API; a UI vive no consumer.
- **P2 — Sem quebra de contrato v0.1.** Endpoints existentes nao mudam. Novos prefixos (/api/search, /api/timeline).
- **P3 — Incremental value.** Fases independentes, sem cadeia de dependencias.
- **P4 — Local-only, zero telemetria.** Tudo in-process, sem servicos externos.

## 3. Phase tree

- **F0 — Cross-project search** (6 tasks): indice em memoria, REST /api/search, MCP tool, SSE event, schema, testes
- **F1 — Timeline view** (6 tasks): event log persistente, schema, REST /api/timeline, MCP tool, SSE replay, testes
- **F2 — Parallel-dispatch renderer** (7 tasks): contrato externo, schema, parser, REST endpoint, MCP tool, SSE events, testes
- **F3 — Code review HTML reports** (5 tasks): renderer markdown-to-HTML, REST /api/reviews, watcher + backfill, MCP tool, testes

## 4. What stays valid (from v0.1)

- Todos os 24 MCP tools existentes
- REST API v0.1 (/api/state, /api/health, /api/consumers, /api/help, /api/inbox, /api/annotate, /api/highlight, /api/decision)
- SSE endpoint /sse com Last-Event-ID em memoria
- Multi-project support (ProjectRegistry, scoped routes)
- CLI (serve, up, down, demo, mcp, env)

## Self-review against code-quality gates

- **G1 read-before-claim**: N/A — plano descreve trabalho novo, nao faz claims sobre codigo existente alem de verified_by: inline
- **G2 soft-language**: 0 ocorrencias (scanned)
- **G6 reference-or-strike**: Tasks referenciam codigo existente com verified_by:; tasks futuras sao descricoes de trabalho (aceitavel)

## Reviews

- [2026-05-25 — Cross-model review (local + codex)](./../reviews/2026-05-25-1430-aideck-v02-roadmap.md): verdict needs_changes, 0B/1C/6M — all findings applied
