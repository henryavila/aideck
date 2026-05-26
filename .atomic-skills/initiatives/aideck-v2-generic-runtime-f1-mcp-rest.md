---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f1-mcp-rest
title: 'MCP + REST'
goal: 'Implement Tier 1 generic MCP tools, 4 handler types, Tier 2 consumer-declared tool registration, and generic REST API endpoints.'
status: pending
branch: null
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-26T15:58:39Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F1

exitGates: []

stack: []

tasks: []

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
