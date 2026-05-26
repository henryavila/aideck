---
schemaVersion: '0.1'
slug: aideck-v02-roadmap-f0-cross-project-search
title: 'Cross-project search'
goal: 'Permitir busca de plans/initiatives/tasks por texto livre ou filtro estruturado atraves de todos os projetos registrados no ProjectRegistry'
status: archived
branch: null
started: '2026-05-25T23:38:00-03:00'
lastUpdated: '2026-05-26T16:25:26Z'
nextAction: 'Iniciar T-001: construir indice invertido in-process'

parentPlan: aideck-v02-roadmap
phaseId: F0

exitGates:
  - id: G-1
    description: 'Busca por texto retorna resultados de 2+ projetos registrados simultaneamente'
    status: archived
    verifier:
      kind: shell
      command: "curl -s 'http://127.0.0.1:7777/api/search?q=foundation&type=plan' | jq '.results | length > 1'"
  - id: G-2
    description: 'MCP tool search_across_projects retorna mesmos resultados que REST'
    status: archived
    verifier:
      kind: shell
      command: "npm test -- --grep 'search_across_projects'"
  - id: G-3
    description: 'Indice atualiza em < 500ms apos file change (watcher event -> index rebuild)'
    status: archived
    verifier:
      kind: shell
      command: "npm test -- --grep 'search index update latency'"

stack:
  - { id: 1, title: 'Cross-project search', type: task, openedAt: '2026-05-25T23:38:00-03:00' }

tasks:
  - id: T-001
    title: 'Indice em memoria'
    description: 'Construir um indice invertido in-process que indexa titulo, slug, tags, goal de toda entidade parsada. Atualiza incrementalmente via eventos do watcher.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-002
    title: 'Endpoint REST /api/search'
    description: 'Query params: q (texto livre), type (plan|initiative|task), project (filter por rootDir), limit (default 20, max 100), offset (paginacao). Ranking: substring match com boost por campo (title 3x, slug 2x, tags 2x, goal 1x). Retorna {schemaVersion, results: SearchResult[], total, limit, offset}.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-003
    title: 'MCP tool search_across_projects'
    description: 'Wrapper MCP do endpoint de busca. Permite AI agents acharem entidades sem saber em qual projeto estao.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-004
    title: 'SSE event index-updated'
    description: 'Emitir evento quando o indice muda, para que a UI possa invalidar resultados cached.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-005
    title: 'Schema SearchResponse + SearchResult'
    description: 'Definir schemas em src/schemas/search.ts para o payload de resposta (com schemaVersion 0.1) e para cada item de resultado (projectId, entityType, slug, title, filePath, apiHref, score, matchedFields).'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-006
    title: 'Testes unitarios e integracao'
    description: 'Testes para: indice incremental, ranking, paginacao, MCP wrapper, SSE event emission. Cobertura minima dos exit gates G-1 a G-3.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'

parked: []

emerged: []
---

# Cross-project search

Fase F0 do plano aideck-v02-roadmap. Habilita busca cross-project no aiDeck.

## Decisions

_(record decisions here as they are made)_

## Links

- [Plan](../plans/aideck-v02-roadmap.md)
- [Review](../reviews/2026-05-25-1430-aideck-v02-roadmap.md)
