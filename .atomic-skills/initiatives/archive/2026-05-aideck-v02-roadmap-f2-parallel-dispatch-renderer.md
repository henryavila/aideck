---
schemaVersion: '0.1'
slug: aideck-v02-roadmap-f2-parallel-dispatch-renderer
title: 'Parallel-dispatch renderer'
goal: 'Fornecer endpoints e MCP tools para renderizar estado de execucoes parallel-dispatch: agentes ativos, progresso, task graph, resultado consolidado'
status: archived
branch: null
started: '2026-05-25T23:38:00-03:00'
lastUpdated: '2026-05-26T16:25:26Z'
nextAction: 'Aguardando ativacao da fase F2'

parentPlan: aideck-v02-roadmap
phaseId: F2

exitGates:
  - id: G-1
    description: 'Parser le corretamente batch com 4+ agentes e projeta status consolidado'
    status: archived
    verifier:
      kind: shell
      command: "npm test -- --grep 'parallel-dispatch parser'"
  - id: G-2
    description: 'SSE dispatch-progress events chegam ao browser em < 300ms apos mudanca no arquivo de status'
    status: archived
    verifier:
      kind: shell
      command: "npm test -- --grep 'dispatch SSE latency'"
  - id: G-3
    description: 'MCP tool get_dispatch_status retorna JSON valido para batch ativo'
    status: archived
    verifier:
      kind: shell
      command: "npm test -- --grep 'get_dispatch_status'"

stack:
  - { id: 1, title: 'Parallel-dispatch renderer', type: task, openedAt: '2026-05-25T23:38:00-03:00' }

tasks:
  - id: T-001
    title: 'Contrato de leitura externa'
    description: 'Definir contrato de diretorio que aiDeck espera do consumer. Estrutura: .atomic-skills/parallel-dispatch/<batch-id>/manifest.json (batchId, createdAt, agentIds[], taskGraph: {nodes[], edges[]}, schemaVersion). Cada agente: <agent-id>.jsonl (timestamp, status, taskId, progress, error?). Batch discovery: glob parallel-dispatch/*/manifest.json. Dep externa do consumer atomic-skills.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-002
    title: 'Schema DispatchBatchState + DispatchResponse'
    description: 'Definir em src/schemas/dispatch.ts: (a) schema JSONL por agente, (b) DispatchResponse para endpoint REST com schemaVersion 0.1 — {schemaVersion, batches: [{batchId, status, agents[], taskGraph: {nodes[], edges[]}, result?: {summary, completedAt}}], total}.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-003
    title: 'Parser de batch state'
    description: 'Parsear .atomic-skills/parallel-dispatch/<batch-id>/ usando manifest.json + agent JSONL files. Projetar estado consolidado do batch (agentes ativos, progresso agregado, task graph com estado por node, erros). Estender watcher para observar parallel-dispatch/ quando existir.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-004
    title: 'Endpoint REST /api/state/parallel-dispatch'
    description: 'Retorna DispatchResponse com batches ativos. Suporta filtro por batch-id. Retorna 404 se diretorio parallel-dispatch/ nao existir (graceful degradation).'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-005
    title: 'MCP tool get_dispatch_status'
    description: 'Expor estado de um batch para AI agents coordenadores. Retorna mesmo shape que DispatchResponse.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-006
    title: 'SSE events para progresso'
    description: 'Emitir dispatch-progress events (por batch + agente) para que a UI atualize em real-time.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'
  - id: T-007
    title: 'Testes unitarios e integracao'
    description: 'Testes para: parser com fixtures de batch (4+ agentes, task graph com edges), endpoint com filtro, MCP tool, SSE latency, graceful 404 quando diretorio ausente, rejeicao de schemaVersion desconhecido.'
    status: archived
    lastUpdated: '2026-05-26T16:25:26Z'

parked: []

emerged: []
---

# Parallel-dispatch renderer

Fase F2 do plano aideck-v02-roadmap. Parser + projecao de estado de execucoes parallel-dispatch.

## Decisions

_(record decisions here as they are made)_

## Links

- [Plan](../plans/aideck-v02-roadmap.md)
