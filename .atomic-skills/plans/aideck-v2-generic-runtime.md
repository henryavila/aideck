---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime
title: 'aiDeck v2 — Generic Dashboard Runtime'
version: '1.0'
status: done
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-27T06:54:13Z'
currentPhase: null
parallelismAllowed: false

principles:
  - id: P1
    title: 'Files are canonical'
    body: 'aiDeck never owns state. Data lives in ~/.aideck/consumers/<id>/data/. aiDeck reads, validates, projects, and writes ONLY to consumer-declared writable paths.'
  - id: P2
    title: 'Consumers own their domain'
    body: 'aiDeck has zero knowledge of Plan, Initiative, Task, or any domain type. All domain logic lives in consumer packages (manifest + handlers + schemas).'
  - id: P3
    title: 'Kubernetes pattern for schemas'
    body: 'Consumers author schemas in their own language, publish as JSON Schema. aiDeck validates with AJV. Language-agnostic by design.'
  - id: P4
    title: 'Intent-based mutations'
    body: 'Domain mutations write intent records to inbox JSONL, not directly to entity files. The consumer agent tails inbox and applies changes.'
  - id: P5
    title: 'Multi-consumer by default'
    body: 'Multiple consumers run simultaneously. Isolation via namespacing (MCP tools, components), per-consumer error boundaries, SSE throttling, resource caps.'

glossary:
  - term: consumer
    definition: 'A plugin that integrates with aiDeck. Ships a manifest.yaml, schema.json, data files, and optionally custom components and script handlers.'
  - term: manifest.yaml
    definition: 'The consumer declaration file. Declares pages, data sources, widgets, MCP tools, and custom components.'
  - term: schema.json
    definition: 'JSON Schema published by the consumer for data validation. Generated from Zod, Pydantic, or hand-written.'
  - term: handler
    definition: 'A consumer-declared MCP tool implementation. 4 types: file-mutation, shell-exec, composite, script.'
  - term: mcpNamespace
    definition: 'Required field in manifest.yaml. Used to prefix consumer MCP tool names: aideck.<mcpNamespace>.<tool>. Must match [a-z][a-z0-9_]{0,31}.'

tracks:
  - { id: A, title: 'Backend', domain: 'runtime' }
  - { id: B, title: 'Frontend', domain: 'ui' }

phases:
  - id: F0
    slug: aideck-v2-generic-runtime-f0-core-runtime
    title: 'Core Runtime'
    goal: 'Build the foundation: ConsumerRegistry, manifest loader, schema validator (AJV), generic file watcher, data source parsing.'
    dependsOn: []
    subPhaseCount: 12
    status: done
    exitGate:
      summary: 'manifest.yaml loads, schema.json validates via AJV, watcher dispatches generically for any consumer'
      criteria:
        - id: G0-1
          description: 'ConsumerRegistry scans ~/.aideck/consumers/*/manifest.yaml and registers all valid consumers'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/server/consumer-registry.test.ts' }
        - id: G0-2
          description: 'AJV validates data files against consumer schema.json with LLM-friendly errors'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/server/schema-validator.test.ts' }
        - id: G0-3
          description: 'File watcher dispatches events for any consumer without hardcoded entity types'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/server/watcher.test.ts' }

  - id: F1
    slug: aideck-v2-generic-runtime-f1-mcp-rest
    title: 'MCP + REST'
    goal: 'Implement Tier 1 generic MCP tools, 4 handler types, Tier 2 consumer-declared tool registration, and generic REST API endpoints.'
    dependsOn: [F0]
    subPhaseCount: 10
    status: done
    exitGate:
      summary: '6 generic MCP tools work, 4 handler types execute, consumer tools auto-namespaced, 7 REST endpoints return data'
      criteria:
        - id: G1-1
          description: 'All 6 Tier 1 MCP tools (read, list, write, health, list_consumers, schema_version) work against any consumer'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/integration/mcp/' }
        - id: G1-2
          description: 'All 4 handler types (file-mutation, shell-exec, composite, script) execute correctly'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/server/handlers/' }
        - id: G1-3
          description: 'Consumer-declared tools registered with aideck.<mcpNamespace>.<tool> namespacing'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/integration/mcp/consumer-tools.test.ts' }

  - id: F2
    slug: aideck-v2-generic-runtime-f2-cli
    title: 'CLI'
    goal: 'Implement aideck validate (LLM-friendly errors) and aideck init-consumer (scaffolding), update serve/demo commands.'
    dependsOn: [F0]
    subPhaseCount: 6
    status: done
    exitGate:
      summary: 'aideck validate outputs structured errors, init-consumer scaffolds a working consumer'
      criteria:
        - id: G2-1
          description: 'aideck validate <file> outputs path+expected+got errors, exit 0=valid, exit 1=errors'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/cli/validate.test.ts' }
        - id: G2-2
          description: 'aideck init-consumer scaffolds manifest.yaml + schema.json + data/ skeleton'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/cli/init-consumer.test.ts' }

  - id: F3
    slug: aideck-v2-generic-runtime-f3-frontend-foundation
    title: 'Frontend Foundation'
    goal: 'Scaffold Vue app, implement 12-column layout engine (sections/grid/single), home page, consumer page shell.'
    dependsOn: [F1]
    subPhaseCount: 10
    status: done
    exitGate:
      summary: 'Home page renders consumer list, 3 layout modes work with responsive breakpoints'
      criteria:
        - id: G3-1
          description: 'Home page renders consumer cards from manifest metadata'
          status: pending
          verifier: { kind: manual, description: 'Visual inspection of home page with 2+ consumers' }
        - id: G3-2
          description: 'Layout engine renders sections, grid, and single modes correctly'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/client/layout-engine.test.ts' }

  - id: F4
    slug: aideck-v2-generic-runtime-f4-component-library
    title: 'Component Library'
    goal: 'Implement 25 built-in widgets with props contracts, data binding, and responsive behavior.'
    dependsOn: [F3]
    subPhaseCount: 25
    status: done
    exitGate:
      summary: 'All 25 components render with real data in a demo page'
      criteria:
        - id: G4-1
          description: 'Demo page renders all 25 built-in components with realistic data'
          status: pending
          verifier: { kind: manual, description: 'Visual inspection of component demo page' }
        - id: G4-2
          description: 'Each component has a configSchema and validates its props'
          status: pending
          verifier: { kind: shell, command: 'npm test -- tests/unit/client/components/' }

  - id: F5
    slug: aideck-v2-generic-runtime-f5-integration-demo
    title: 'Integration + Demo'
    goal: 'Build demo consumer, end-to-end tests, and produce handoff document for atomic-skills migration.'
    dependsOn: [F4]
    subPhaseCount: 8
    status: done
    exitGate:
      summary: 'aideck demo works end-to-end, handoff document complete'
      criteria:
        - id: G5-1
          description: 'aideck demo seeds a consumer, starts server, renders dashboard with all layout modes'
          status: pending
          verifier: { kind: manual, description: 'Run aideck demo, verify dashboard renders correctly' }
        - id: G5-2
          description: 'Handoff document covers manifest schema, handler API, component contract, breaking changes'
          status: pending
          verifier: { kind: manual, description: 'Review handoff doc for completeness against spec checklist' }

references:
  - path: docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md
    title: 'Design spec (approved 2026-05-26)'
  - path: .atomic-skills/reviews/2026-05-26-1830-aideck-v2-spec.md
    title: 'Adversarial review (local + codex)'
---

# aiDeck v2 — Generic Dashboard Runtime

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 1. Context

aiDeck v0.1 was built with deep coupling to atomic-skills: hardcoded `.atomic-skills/` directory, `project-status` as default consumer, Plan/Initiative/Task types baked into the core, and 18 MCP tools implementing domain-specific operations. This makes it impossible for other tools to integrate.

This plan implements the v2 architecture: aiDeck becomes a generic AI dashboard runtime where consumers (plugins) own everything beyond the home page. The first consumer remains atomic-skills, but the architecture supports arbitrary consumers in any language.

The design spec (`docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md`) was produced through a research-driven brainstorming process covering 11 architectural decisions, validated by adversarial review (local self-loop + codex cross-model). verified_by: docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md

## 2. Inviolable principles

**P1 — Files are canonical.** aiDeck never owns state. Data lives in `~/.aideck/consumers/<id>/data/`. Read, validate, project, write only to declared writable paths.

**P2 — Consumers own their domain.** aiDeck has zero knowledge of Plan, Initiative, Task. All domain logic lives in consumer packages.

**P3 — Kubernetes pattern for schemas.** Consumers author in their language, publish JSON Schema. aiDeck validates with AJV.

**P4 — Intent-based mutations.** Domain mutations write intent records to inbox JSONL. Consumer agent applies to entity files.

**P5 — Multi-consumer by default.** Namespaced tools/components, per-consumer error boundaries, SSE throttling, resource caps.

## 3. Phase tree

```
F0 Core Runtime          [Track A: Backend] ← active
  └─ F1 MCP + REST       [Track A: Backend] depends on F0
  └─ F2 CLI              [Track A: Backend] depends on F0 (parallel with F1)
      └─ F3 Frontend Foundation  [Track B: Frontend] depends on F1
          └─ F4 Component Library [Track B: Frontend] depends on F3
              └─ F5 Integration + Demo [Track B: Frontend] depends on F4
```

F1 and F2 can run in parallel after F0 completes (both depend only on F0). F3+ is sequential.

## 4. What stays valid (from prior work)

The migration strategy (hybrid A+B) preserves 2,080 LOC of generic infrastructure:
- Event bus (`server/event-bus.ts`)
- SSE streaming (`server/routes/sse.ts`)
- CORS, port resolver, env-file lifecycle
- JSONL append utility, frontmatter parser, JSONL parser
- Shell verifier execution
- MCP server setup + tool registration mechanism
- CLI framework (args, help, up, down, version)
- Common schemas (ErrorResponse, Result type)

verified_by: docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md (section "11. Migration strategy")

## 5. Dependent workstreams (out of scope for this plan)

- **UI design via Claude Design**: prompts for each page/component generated before F3 starts
- **Atomic-skills consumer migration**: separate workstream triggered by handoff document from F5

## Self-review against code-quality gates

- **G1 read-before-claim**: 2 claims about existing code (infrastructure LOC, file list), both backed by the codebase audit in the spec. verified_by: docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md:329-333
- **G2 soft-language**: scanned plan for ban list; 0 occurrences.
- **G6 reference-or-strike**: 2 assertions carry `verified_by:`. 0 bare assertions.
