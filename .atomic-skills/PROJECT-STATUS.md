---
lastUpdated: '2026-06-02T14:09:48Z'
schemaVersion: '0.1'
activePlans: 0
activeInitiatives: 0
archivedCount: 7
---

# Project Status Index

Canonical entry point. Auto-updated by `atomic-skills:project-status`. Read first every session.

This repo follows a 3-level model:

- **Plan** — multi-phase project with narrative, principles, phases, exit gates (`plans/<slug>.md`)
- **Initiative** — one phase of a plan, OR a standalone unit of work (`initiatives/<slug>.md`)
- **Task** — atomic action inside an initiative (lives in initiative frontmatter `tasks[]`)

Standalone initiatives (no `parentPlan`) coexist with plan-anchored initiatives.

## Active Plans

_(none)_

## Completed Plans

| Slug | Status | Phases | Branch | Completed |
|------|--------|--------|--------|-----------|
| [aideck-v2-generic-runtime](plans/aideck-v2-generic-runtime.md) | done | F0-F5 (6/6 done) | feat/aideck-v2-generic-runtime | 2026-05-27 |

### aideck-v2-generic-runtime — Initiatives (all done)

| Phase | Slug | Status | Tasks | Completed |
|-------|------|--------|-------|-----------|
| F0 | [core-runtime](initiatives/aideck-v2-generic-runtime-f0-core-runtime.md) | done | 7/7 (T-001..T-007) | 2026-05-27 |
| F1 | [mcp-rest](initiatives/aideck-v2-generic-runtime-f1-mcp-rest.md) | done | 9/9 (T-008..T-016) | 2026-05-27 |
| F2 | [cli](initiatives/aideck-v2-generic-runtime-f2-cli.md) | done | 3/3 (T-017..T-019) | 2026-05-27 |
| F3 | [frontend-foundation](initiatives/aideck-v2-generic-runtime-f3-frontend-foundation.md) | done | 8/8 (T-020..T-027) | 2026-05-27 |
| F4 | [component-library](initiatives/aideck-v2-generic-runtime-f4-component-library.md) | done | 6/6 (T-028..T-033) | 2026-05-27 |
| F5 | [integration-demo](initiatives/aideck-v2-generic-runtime-f5-integration-demo.md) | done | 9/9 (T-034..T-042) | 2026-05-27 |

## Active Initiatives (standalone)

_(none)_

## Recently Archived (last 10)

| Slug | Kind | Archived | Reason |
|------|------|----------|--------|
| v2-security-remediation | initiative | 2026-06-02 | Concluída — 7/7 tasks done, 3/3 exit gates met (typecheck + 582 testes), fixes commitados |
| v2-spec-gaps | initiative | 2026-05-29 | Concluída — 19/19 tasks done, design v2 portado e validado no browser |
| aideck-v02-roadmap | plan | 2026-05-26 | Superseded by aideck-v2-generic-runtime |
| aideck-v02-roadmap-f0-cross-project-search | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f1-timeline-view | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f2-parallel-dispatch-renderer | initiative | 2026-05-26 | Parent plan archived |
| aideck-v02-roadmap-f3-code-review-html-reports | initiative | 2026-05-26 | Parent plan archived |

## Ad-Hoc Sessions Log (last 5)

_(empty)_
