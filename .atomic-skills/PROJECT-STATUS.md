---
lastUpdated: '2026-05-26T19:00:00Z'
schemaVersion: '0.1'
activePlans: 1
activeInitiatives: 1
archivedCount: 5
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
| [aideck-v2-generic-runtime](plans/aideck-v2-generic-runtime.md) | active | F0 — Core Runtime | feat/aideck-v2-generic-runtime | 2026-05-26 |

### aideck-v2-generic-runtime — Initiatives

| Phase | Slug | Status | Tasks | Next Action |
|-------|------|--------|-------|-------------|
| F0 | [core-runtime](initiatives/aideck-v2-generic-runtime-f0-core-runtime.md) | active | 0/0 (plan pending) | Write detailed implementation plan |
| F1 | [mcp-rest](initiatives/aideck-v2-generic-runtime-f1-mcp-rest.md) | pending | 0/0 | Aguardando F0 |
| F2 | [cli](initiatives/aideck-v2-generic-runtime-f2-cli.md) | pending | 0/0 | Aguardando F0 |
| F3 | [frontend-foundation](initiatives/aideck-v2-generic-runtime-f3-frontend-foundation.md) | pending | 0/0 | Aguardando F1 |
| F4 | [component-library](initiatives/aideck-v2-generic-runtime-f4-component-library.md) | pending | 0/0 | Aguardando F3 |
| F5 | [integration-demo](initiatives/aideck-v2-generic-runtime-f5-integration-demo.md) | pending | 0/0 | Aguardando F4 |

## Active Initiatives (standalone)

_(none)_

| Slug | Status | Branch | Started | Next Action |
|------|--------|--------|---------|-------------|

## Recently Archived (last 10)

| Slug | Kind | Archived | Reason |
|------|------|----------|--------|
| aideck-v02-roadmap | plan | 2026-05-26 | Superseded by aideck-v2-generic-runtime |
| aideck-v02-roadmap-f0-cross-project-search | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f1-timeline-view | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f2-parallel-dispatch-renderer | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f3-code-review-html-reports | initiative | 2026-05-26 | Parent plan archived |

## Ad-Hoc Sessions Log (last 5)

_(empty)_
