---
schemaVersion: '0.1'
slug: aideck-v02-roadmap-f3-code-review-html-reports
title: 'Code review HTML reports'
goal: 'Gerar reports HTML estaticos a partir de code reviews com syntax highlighting, severity badges, e navegacao por finding'
status: pending
branch: null
started: '2026-05-25T23:38:00-03:00'
lastUpdated: '2026-05-25T23:38:00-03:00'
nextAction: 'Aguardando ativacao da fase F3'

parentPlan: aideck-v02-roadmap
phaseId: F3

exitGates:
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

stack:
  - { id: 1, title: 'Code review HTML reports', type: task, openedAt: '2026-05-25T23:38:00-03:00' }

tasks:
  - id: T-001
    title: 'Renderer markdown-to-HTML'
    description: 'Converter review markdown em HTML standalone (single-file, CSS inline). Syntax highlighting via build-time rendering (marked + highlight.js no servidor — HTML resultante contem apenas CSS classes pre-computadas, sem JS runtime no browser). Template inclui severity badges e navegacao por finding.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-002
    title: 'Endpoint REST /api/reviews + Schema ReviewsResponse'
    description: 'Listar reviews disponiveis com metadata. Response: {schemaVersion: 0.1, reviews: [{slug, date, planSlug?, severityCounts: {blocker, critical, major, minor, nit}, htmlPath}]}.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-003
    title: 'Build automatico via watcher + startup backfill'
    description: 'Quando um .md aparece em reviews/, gerar o HTML correspondente em reviews/html/. Watcher trigger. No startup, backfill: para cada .md existente sem HTML correspondente, gerar o HTML.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-004
    title: 'MCP tool get_review_report'
    description: 'Retornar o conteudo estruturado de um review (findings[], severities, files touched) para consumo por AI agents.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'
  - id: T-005
    title: 'Testes unitarios e integracao'
    description: 'Testes para: renderer com fixture .md, endpoint /api/reviews, auto-build via watcher, MCP tool. Cobertura minima dos exit gates G-1 a G-3.'
    status: pending
    lastUpdated: '2026-05-25T23:38:00-03:00'

parked: []

emerged: []
---

# Code review HTML reports

Fase F3 do plano aideck-v02-roadmap. Geracao de HTML a partir de reviews markdown.

## Decisions

_(record decisions here as they are made)_

## Links

- [Plan](../plans/aideck-v02-roadmap.md)
