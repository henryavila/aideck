---
lastUpdated: '2026-05-25T23:38:00-03:00'
schemaVersion: '0.1'
activePlans: 1
activeInitiatives: 1
archivedCount: 0
---

# Project Status Index

Canonical entry point. Auto-updated by `atomic-skills:project-status`. Read first every session.

This repo follows a 3-level model:

- **Plan** — multi-phase project with narrative, principles, phases, exit gates (`plans/<slug>.md`)
- **Initiative** — one phase of a plan, OR a standalone unit of work (`initiatives/<slug>.md`)
- **Task** — atomic action inside an initiative (lives in initiative frontmatter `tasks[]`)

Standalone initiatives (no `parentPlan`) coexist with plan-anchored initiatives.

## Active Plans

| Slug | Status | Current Phase | Branch | Started |
|------|--------|---------------|--------|---------|
| [aideck-v02-roadmap](plans/aideck-v02-roadmap.md) | active | F0 — Cross-project search | — | 2026-05-25 |

### aideck-v02-roadmap — Initiatives

| Phase | Slug | Status | Tasks | Next Action |
|-------|------|--------|-------|-------------|
| F0 | [cross-project-search](initiatives/aideck-v02-roadmap-f0-cross-project-search.md) | active | 0/6 | Iniciar T-001: construir indice invertido in-process |
| F1 | [timeline-view](initiatives/aideck-v02-roadmap-f1-timeline-view.md) | pending | 0/6 | Aguardando ativacao |
| F2 | [parallel-dispatch-renderer](initiatives/aideck-v02-roadmap-f2-parallel-dispatch-renderer.md) | pending | 0/7 | Aguardando ativacao |
| F3 | [code-review-html-reports](initiatives/aideck-v02-roadmap-f3-code-review-html-reports.md) | pending | 0/5 | Aguardando ativacao |

## Active Initiatives (standalone)

_(none)_

| Slug | Status | Branch | Started | Next Action |
|------|--------|--------|---------|-------------|

## Recently Archived (last 10)

_(empty)_

## Ad-Hoc Sessions Log (last 5)

_(empty)_
