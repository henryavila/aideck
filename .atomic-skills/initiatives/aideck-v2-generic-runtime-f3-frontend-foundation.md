---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f3-frontend-foundation
title: 'Frontend Foundation'
goal: 'Scaffold Vue app, implement 12-column layout engine (sections/grid/single), home page, consumer page shell.'
status: pending
branch: null
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-26T15:58:39Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F3

exitGates: []

stack: []

tasks: []

parked: []

emerged: []
---

# F3 — Frontend Foundation

Depends on F1 (MCP + REST). Requires Claude Design prompts generated before implementation starts.

## Scope

- Vue 3 app scaffold with Vue Router, Pinia store
- Layout engine: 12-column CSS Grid, sections mode, grid mode, single mode
- Responsive breakpoints (sm/md/lg/xl)
- Home page: render consumer cards from GET /api/consumers
- Consumer page shell: read manifest via GET /api/consumers/:id, render pages from manifest
- SSE integration: connect to /sse?consumer=X, update store on events
- Dark theme with CSS custom properties
