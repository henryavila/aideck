---
schemaVersion: '0.1'
slug: aideck-v02-roadmap-f1-timeline-view
title: 'Timeline view'
goal: 'Expor um stream cronologico de eventos atraves de todos os projetos, com paginacao e filtros'
status: pending
branch: null
started: '2026-05-25T23:38:00-03:00'
lastUpdated: '2026-05-25T23:38:00-03:00'
nextAction: 'Aguardando ativacao da fase F1'

parentPlan: aideck-v02-roadmap
phaseId: F1

exitGates:
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

stack:
  - { id: 1, title: 'Timeline view', type: task, openedAt: '2026-05-25T23:38:00-03:00' }

tasks:
  - id: T-001
    title: 'Event log persistente'
    description: 'Cada evento SSE tambem grava num append-only JSONL em .atomic-skills/status/events.jsonl (por projeto). Maximo 10k linhas; rotacao para events-<YYYY-MM>-<seq>.jsonl (sem compressao). Rotacao via rename atomico.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-002
    title: 'Schema TimelineEvent'
    description: 'Definir schema em src/schemas/timeline.ts para o formato JSONL (campos: id, timestamp, kind, consumer, slug, projectId, payload). Incluir schemaVersion 0.1.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-003
    title: 'Endpoint REST /api/timeline + Schema TimelineResponse'
    description: 'Query params: since (ISO timestamp), until, project, type, limit (default 50, max 200). Response: {schemaVersion, events: TimelineEvent[], total, truncated}. Retorna eventos ordenados por timestamp desc. Le o JSONL atual + arquivos rotacionados (max 30 dias de historico).'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-004
    title: 'MCP tool get_timeline'
    description: 'Equivalente MCP do endpoint. Permite AI agents reconstruirem historico recente sem ler JSONL diretamente.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-005
    title: 'Replay via SSE'
    description: 'Estender o mecanismo Last-Event-ID para suportar replay de eventos do log persistente. Limite: max 1000 eventos por replay. Eventos alem do limite retornam header X-Replay-Truncated: true.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-006
    title: 'Testes unitarios e integracao'
    description: 'Testes para: escrita JSONL, rotacao, endpoint timeline com filtros, MCP wrapper, replay com Last-Event-ID persistente. Cobertura minima dos exit gates G-1 a G-3.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'

parked: []

emerged: []
---

# Timeline view

Fase F1 do plano aideck-v02-roadmap. Event log persistente + endpoint timeline + replay SSE.

## Decisions

_(record decisions here as they are made)_

## Links

- [Plan](../plans/aideck-v02-roadmap.md)
