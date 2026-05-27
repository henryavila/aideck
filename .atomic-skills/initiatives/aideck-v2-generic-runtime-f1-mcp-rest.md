---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f1-mcp-rest
title: 'MCP + REST'
goal: 'Implement Tier 1 generic MCP tools, 4 handler types, Tier 2 consumer-declared tool registration, and generic REST API endpoints.'
status: done
branch: feat/aideck-v2-generic-runtime
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-27T06:54:13Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F1

exitGates: []

stack: []

tasks:
  - { id: T-008, title: 'Template Engine', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-009, title: 'file-mutation Handler', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-010, title: 'shell-exec Handler', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-011, title: 'script Handler', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-012, title: 'composite Handler', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-013, title: 'Tier 1 MCP Tools (6 generic)', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-014, title: 'Consumer-declared MCP Tools', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-015, title: 'Generic REST API v2', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-016, title: 'F1 Integration Test', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }

parked: []

emerged: []
---

# F1 — MCP + REST

Depends on F0 (Core Runtime). Implements the AI-facing (MCP) and browser-facing (REST) API surfaces.

## Scope

- Tier 1 generic MCP: aideck_read, aideck_list, aideck_write, aideck_health, aideck_list_consumers, aideck_schema_version
- Handler runtime: file-mutation, shell-exec, composite, script
- Tier 2 consumer-declared tools with auto-namespacing (aideck.<mcpNamespace>.<tool>)
- Handler security model: cwd confinement, timeout, error boundaries
- REST API: 7 generic endpoints for browser consumption
- MCP tools/list_changed notification on consumer load/unload
