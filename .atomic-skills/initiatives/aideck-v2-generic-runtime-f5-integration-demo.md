---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f5-integration-demo
title: 'Integration + Demo'
goal: 'Build demo consumer, end-to-end tests, and produce handoff document for atomic-skills migration.'
status: pending
branch: null
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-26T15:58:39Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F5

exitGates: []

stack: []

tasks: []

parked: []

emerged: []
---

# F5 — Integration + Demo

Depends on F4 (Component Library). Final phase — ties everything together.

## Scope

- Demo consumer: manifest.yaml with 3 pages exercising all layout modes, schema.json, realistic data files
- Demo as component library showcase: all 25 widgets with rich data
- `aideck demo` seeds into `~/.aideck/consumers/aideck-demo/`, cleaned on exit
- End-to-end tests: start server → load consumer → MCP call → REST call → SSE event → dashboard renders
- Handoff document for atomic-skills migration (manifest schema ref, handler API, component contract, breaking changes, extracted code reference)
- README update for v2 architecture
- Definition of Done verification (19 gates from spec)
