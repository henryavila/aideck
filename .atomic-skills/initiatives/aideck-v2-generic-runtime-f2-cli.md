---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f2-cli
title: 'CLI'
goal: 'Implement aideck validate (LLM-friendly errors) and aideck init-consumer (scaffolding), update serve/demo commands.'
status: done
branch: feat/aideck-v2-generic-runtime
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-27T06:54:13Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F2

exitGates: []

stack: []

tasks:
  - { id: T-017, title: 'aideck validate command', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-018, title: 'aideck init-consumer command', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }
  - { id: T-019, title: 'Wire CLI (serve/demo updates)', status: done, lastUpdated: '2026-05-27T06:54:13Z', closedAt: '2026-05-27T06:54:13Z' }

parked: []

emerged: []
---

# F2 — CLI

Depends on F0 (Core Runtime). Can run in parallel with F1 (MCP + REST).

## Scope

- `aideck validate <file>`: resolve consumer from file path, load schema.json, validate with AJV, output LLM-friendly errors
- `aideck init-consumer`: interactive scaffolding — generate manifest.yaml, schema.json, data/ skeleton
- Update `aideck serve` to scan `~/.aideck/consumers/` instead of `.atomic-skills/`
- Update `aideck demo` to seed into `~/.aideck/consumers/aideck-demo/`
