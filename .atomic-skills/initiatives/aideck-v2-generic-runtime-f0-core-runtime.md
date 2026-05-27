---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f0-core-runtime
title: 'Core Runtime'
goal: 'Build the foundation: ConsumerRegistry, manifest loader, schema validator (AJV), generic file watcher, data source parsing.'
status: done
branch: feat/aideck-v2-generic-runtime
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-27T06:54:13Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F0

exitGates: []

stack: []

tasks:
  - { id: T-001, title: 'Manifest Zod Schema', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-002, title: 'Manifest Loader', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-003, title: 'ConsumerRegistry', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-004, title: 'Schema Validator (AJV)', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-005, title: 'Data Source Reader', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-006, title: 'Generic Consumer Watcher', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-007, title: 'F0 Integration Test', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }

parked: []

emerged: []
---

# F0 — Core Runtime

This phase builds the generic foundation that all subsequent phases depend on: manifest loading, schema validation, consumer registry, and generic file watching.

## Scope

- ConsumerRegistry: scan `~/.aideck/consumers/*/manifest.yaml`, register consumers
- Manifest loader: parse manifest.yaml, validate structure
- Schema validator: load consumer's `schema.json`, validate data files via AJV + `better-ajv-errors`
- File watcher refactor: generic dispatch (no hardcoded entity types)
- Data source parsing: read YAML, JSON, JSONL, frontmatter based on manifest `dataSources[].format`

## Decisions

_(record decisions here as they are made)_

## Links

- [Design spec](../../docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md)
