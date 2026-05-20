# Data Format

aiDeck reads canonical data from `.atomic-skills/<consumer>/` directories. This doc shows the concrete file layout, frontmatter formats, and JSONL conventions with full examples.

## Directory layout

```
.atomic-skills/
└── <consumer-id>/                       ← e.g., project-status
    ├── consumer.yaml                    ← registration manifest (v0.2+)
    ├── plans/
    │   └── <slug>.md                    ← Plan: frontmatter + markdown body
    ├── initiatives/
    │   ├── <slug>.md                    ← Initiative: frontmatter + markdown body
    │   └── archive/
    │       └── YYYY-MM-<slug>.md        ← archived initiatives
    ├── annotations/
    │   └── YYYY-MM-DD.jsonl             ← append-only annotations
    ├── highlights/
    │   └── YYYY-MM-DD.jsonl             ← append-only highlights
    └── inbox/
        └── YYYY-MM-DD.jsonl             ← human-to-AI signals
```

aiDeck writes ONLY to `annotations/`, `highlights/`, `inbox/`. Entity files (`plans/*`, `initiatives/*`) are owned by the consumer's skill — aiDeck never mutates them.

> **Consumer IDs are validated.** Any `consumer` value used in HTTP/MCP inputs must match `/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/` — single safe path segment, no `..`, no separators. Unsafe IDs throw `UnsafeConsumerIdError` (HTTP: `400 invalid_input`; MCP: `invalid_input`). This prevents path traversal at the root of `consumerRoot()`.

## Frontmatter convention

Entity files use **YAML frontmatter** delimited by `---`. Body below the second `---` is markdown narrative.

```markdown
---
schemaVersion: '0.1'
slug: example-slug
# ... other fields per entity schema
---

# Optional human-readable title

The rest of the file is markdown narrative — rationale, decisions, gotchas.
aiDeck parses the frontmatter for structured data and renders the body verbatim
in the dashboard (with markdown-to-HTML).
```

YAML is preferred over JSON in entity files because:

- Humans edit these. YAML is easier to read.
- Comments allowed (`# this is why...`).
- Multi-line strings are natural.

JSONL is used for append-only logs (annotations, highlights, inbox) where multiple writers append concurrently — one JSON object per line, no parsing ambiguity.

## Plan example

`.atomic-skills/project-status/plans/v3-redesign.md`:

```markdown
---
schemaVersion: '0.1'
slug: v3-redesign
title: 'SDA v2 — Plano v3 (Redesign)'
version: '1.0'
status: active
started: '2026-05-19T10:00:00Z'
lastUpdated: '2026-05-19T18:42:00Z'
branch: v2-rebuild
currentPhase: F0
parallelismAllowed: true

principles:
  - id: P1
    title: 'Fonte da verdade são os 2 dumps'
    body: |
      Os arquivos `data/dumps/vsda_landlord.dump` e `vsda_tenant.dump` são a única
      fonte autoritativa. PostgreSQL local é resultado, descartável.
  - id: P2
    title: 'Determinismo total — zero IA em runtime'
    body: |
      Toda operação é script (artisan, SQL, Python) idempotente.
      Nenhuma transformação depende de chamada LLM em tempo de execução.

glossary:
  - term: 'Tenant song'
    definition: 'Música cadastrada por uma igreja específica (`tenant_id NOT NULL`).'
  - term: 'Collection song'
    definition: 'Música da coleção LouvorJA, compartilhada (`is_collection = true`).'
  - term: 'Exit gate'
    definition: 'Critério verificável que fecha uma sub-fase.'

tracks:
  - id: A
    title: 'Dados'
    domain: 'data'
  - id: B
    title: 'UI Base'
    domain: 'ui'
  - id: C
    title: 'Planejamento'
    domain: 'features'

phases:
  - id: F0
    slug: v3-f0-foundation-repair
    title: 'Foundation Repair (Dados)'
    goal: 'Resolver completamente os dados antes de qualquer trabalho de UI.'
    dependsOn: []
    track: A
    subPhaseCount: 8
    status: active
    exitGateType: standard
    exitGate:
      summary: 'Tag git core-v2 + pipeline reproduzível + 0 duplicatas'
      criteria:
        - id: F0-G1
          description: 'Tag git `core-v2` criada'
          verifier: { kind: shell, command: 'git tag | grep core-v2' }
          status: pending
        - id: F0-G2
          description: 'scripts/full-pipeline.sh roda do zero sem intervenção'
          verifier: { kind: shell, command: 'bash scripts/full-pipeline.sh', expectExitCode: 0 }
          status: pending
        - id: F0-G3
          description: 'Query de auditoria retorna 0 duplicatas'
          verifier:
            kind: query
            sql: 'SELECT COUNT(*) FROM v_song_duplicates'
            expectRowCount: 0
          status: pending

  - id: F1
    slug: v3-f1-filament-redesign
    title: 'Filament Backend Redesign'
    goal: 'Redesenhar 100% do admin Filament 5 importando framework do /arch.'
    dependsOn: [F0]
    track: B
    subPhaseCount: 10
    status: pending
    exitGateType: ui-gate
    audience: 'Admin operacional'
    externalImports:
      - kind: repo-path
        path: '/Volumes/External/code/arch'
        label: 'Filament migration framework'
        inside_repo: false
    exitGate:
      summary: 'Todas 35 Resources redesenhadas + 10 features legacy portadas'
      criteria:
        - id: F1-G1
          description: 'Cada Resource passa UI Gate (3 viewports + dark + smoke + i18n)'
          verifier: { kind: manual, description: 'Visual review per Resource' }
          status: pending

  - id: F4
    slug: v3-f4-ministry-oversight
    title: 'Oversight Ministerial'
    goal: 'Dashboard ministerial.'
    dependsOn: [F3]
    parallelWith: [F5]
    track: D
    subPhaseCount: 6
    audience: 'Líder de ministério'
    status: pending
    exitGate:
      summary: '/ministerio full features'
      criteria: []

  - id: F5
    slug: v3-f5-set-curation
    title: 'Set Curation + Theme Graph'
    goal: 'Curadoria assistida via Theme Graph determinístico.'
    dependsOn: [F3]
    parallelWith: [F4]
    track: E
    subPhaseCount: 5
    status: pending
    exitGate:
      summary: 'Líder inicia curadoria a partir de tema'
      criteria: []

interPhaseGates:
  - from: F0
    to: F1
    criteria:
      - 'core-v2 tag exists'
      - 'No duplicates in v_song_duplicates'

supersedes:
  path: 'docs/superpowers/plans/2026-03-20-sda-v2-master-implementation.md'
  supersedeScope: partial
  partialAreas: ['UI', 'matcher']
  remainsValid: ['pipeline de dados', 'arquitetura técnica']

references:
  - kind: file
    path: '_bmad-output/planning-artifacts/prd.md'
    label: 'PRD canônico (9 epics)'
    inside_repo: true
  - kind: file
    path: 'data/dumps/vsda_landlord.dump'
    label: 'Dump landlord'
    inside_repo: true
    gitignored: true
  - kind: repo-path
    path: '/Volumes/External/code/arch'
    label: 'Filament reference'
    inside_repo: false

whatStaysValid:
  - 'Schema do domínio collections (overlay tenant_id=NULL)'
  - 'Pipeline de áudio S3 (3502 arquivos já enviados)'
  - 'Classificações de energia (1882 songs)'
---

# SDA v2 — Master Roadmap v3 (Redesign)

> Roadmap canônico do redesign. Estado e execução vivem em `.atomic-skills/initiatives/v3-fX-*.md`.

## 1. Contexto: por que v3?

(Full markdown body — context, problems, decisions, etc.)

## 2. Princípios invioláveis

(Detail on each principle from frontmatter — humans read this; aiDeck renders it.)
```

## Initiative example

`.atomic-skills/project-status/initiatives/v3-f0-foundation-repair.md`:

```markdown
---
schemaVersion: '0.1'
slug: v3-f0-foundation-repair
title: 'F0 — Foundation Repair'
goal: 'Resolver dados antes de qualquer trabalho de UI.'
status: active
branch: v2-rebuild
started: '2026-05-19T10:00:00Z'
lastUpdated: '2026-05-19T18:42:00Z'
nextAction: 'T-002: Pipeline dumps → PostgreSQL'

parentPlan: v3-redesign
phaseId: F0
audience: 'Developer'

scope:
  paths:
    - 'backend/app/Console/Commands/CollectionMigrateTenant.php'
    - 'scripts/load-from-dumps.sh'
    - 'scripts/full-pipeline.sh'
    - 'backend/database/migrations/*'

exitGates:
  - id: F0-G1
    description: 'Tag git `core-v2` criada'
    verifier: { kind: shell, command: 'git tag | grep core-v2' }
    status: pending
  - id: F0-G2
    description: 'Query retorna 0 duplicatas'
    verifier:
      kind: query
      sql: 'SELECT COUNT(*) FROM v_song_duplicates'
      expectRowCount: 0
    status: pending

stack:
  - id: 1
    title: 'F0 kickoff'
    type: task
    openedAt: '2026-05-19T10:00:00Z'

tasks:
  - id: T-001
    title: 'Restore local infra'
    description: 'Composer install, .env, PostgreSQL vsda, npm install, MySQL legacy verificado'
    status: done
    lastUpdated: '2026-05-19T11:30:00Z'
    closedAt: '2026-05-19T11:30:00Z'
    outputs:
      - kind: file
        path: '.env'
        description: 'Local env populated'
      - kind: command
        command: 'php artisan migrate'
        description: 'Schema applied to PostgreSQL vsda'

  - id: T-002
    title: 'Pipeline dumps → PostgreSQL'
    description: 'Script reproduzível que carrega dumps em PostgreSQL zerado'
    status: active
    lastUpdated: '2026-05-19T14:00:00Z'
    outputs:
      - kind: file
        path: 'scripts/load-from-dumps.sh'
    verifier:
      kind: shell
      command: 'bash scripts/load-from-dumps.sh && psql vsda -c "SELECT 1"'
      expectExitCode: 0

  - id: T-005
    title: 'Reescrever matcher'
    description: 'Determinístico. Album+artist signals, N:1 detection.'
    status: pending
    lastUpdated: '2026-05-19T10:00:00Z'
    tags: ['critical', 'gap-legacy']
    blockedBy: ['T-003', 'T-004']
    outputs:
      - kind: command
        command: 'php artisan app:match-louvorja-v2'

parked: []

emerged:
  - title: 'Investigate Patrimony Clone (mentioned in F1 docs)'
    surfacedAt: '2026-05-19T13:15:00Z'
    promoted: false

references:
  - kind: section
    path: '../plans/v3-redesign.md'
    section: 'F0 — Foundation Repair (Dados)'
    label: 'Phase definition in master plan'
    inside_repo: true
  - kind: file
    path: '../../RUNBOOK.md'
    section: '§2 pipeline de dados'
    label: 'Canonical pipeline reference'
    inside_repo: true

crossTaskRefs:
  - fromTaskId: T-005
    toInitiativeSlug: v3-f1-filament-redesign
    toTaskId: T-002
    relation: unblocks
    note: 'Matcher fix is prerequisite for clean Song Resource data'
---

# F0 — Foundation Repair

## Why

(Markdown body — rationale, decisions made during execution, references.)

## T-005 deep dive

The matcher has two known bugs at `backend/app/Console/Commands/CollectionMigrateTenant.php:73`
and `:102-110`. ...
```

## JSONL formats

Every JSONL record carries `schemaVersion: '0.1'`. Records without it are
rejected with `schema_version_mismatch` (found: `"missing"`). Timestamps are
ISO-8601 with offset (`Z` or `+HH:MM`), validated with Zod
`.datetime({ offset: true })`. IDs are `<prefix>-<YYYY-MM-DD>-<8 hex chars>`
(UUID-based, collision-resistant across concurrent writers).

### Annotations

`.atomic-skills/project-status/annotations/2026-05-19.jsonl`:

```jsonl
{"schemaVersion":"0.1","id":"ann-2026-05-19-a1b2c3d4","target":{"consumer":"project-status","slug":"v3-redesign","path":"phases.F2.tasks.T-005"},"author":"ai","body":"Need to verify unicode normalization for emoji edge cases.","createdAt":"2026-05-19T14:32:11Z"}
{"schemaVersion":"0.1","id":"ann-2026-05-19-e5f6a7b8","target":{"consumer":"project-status","slug":"v3-f0-foundation-repair","path":"exitGates.F0-G2"},"author":"human","body":"This query might be expensive on 50M rows. Consider indexed view.","createdAt":"2026-05-19T15:01:00Z","resolved":false}
```

### Highlights

`.atomic-skills/project-status/highlights/2026-05-19.jsonl`:

```jsonl
{"schemaVersion":"0.1","id":"hl-2026-05-19-9c8d7e6f","target":{"consumer":"project-status","slug":"v3-redesign","path":"phases.F3"},"reason":"Detected drift: writes touched F3 paths while currentPhase is F0.","severity":"warn","source":"ai","createdAt":"2026-05-19T16:42:00Z"}
```

### Inbox

`.atomic-skills/project-status/inbox/2026-05-19.jsonl`:

The inbox is the **heterogeneous** stream. Each line is one of:
`intent`, `intent_application`, `resolution`, `acknowledgement`,
`verifier_result`, `annotation`, `highlight`, `decision`. Lines are
discriminated by `kind`. Decisions land here (not in a separate `decisions/`
directory) to honor Iron Law #1.

```jsonl
{"schemaVersion":"0.1","kind":"intent","intentId":"int-2026-05-19-7a8b9c0d","operation":"mark_task_done","target":{"initiativeSlug":"v3-f0","taskId":"T-005"},"args":{"verifierResultId":"vr-2026-05-19-a1b2c3d4"},"by":"ai","requestedAt":"2026-05-19T16:00:00Z"}
{"schemaVersion":"0.1","kind":"verifier_result","verifierResultId":"vr-2026-05-19-a1b2c3d4","criterionRef":{"target":"phase","planSlug":"v3-redesign","phaseId":"F0","criterionId":"F0.G1"},"result":"met","evidence":"npm test exit 0","ranAt":"2026-05-19T15:58:00Z","by":"ai"}
{"schemaVersion":"0.1","kind":"decision","id":"dec-2026-05-19-f1e2d3c4","target":{"consumer":"project-status","slug":"v3-f0","path":"exitGates.F0-G2"},"decision":"defer","reason":"awaiting data team","by":"human","createdAt":"2026-05-19T16:30:00Z"}
```

`intent` records use a **discriminated union on `operation`** — each operation
fixes the required shape of `target` and `args` (e.g. `mark_task_done`
requires `taskId`, `update_initiative_status` requires `args.status`). See
`src/schemas/validators/common.ts:intentRecordSchema`.

`verifier_result.criterionRef` is **discriminated on `target`**:
- `target: 'phase'` → requires `planSlug + phaseId + criterionId`.
- `target: 'initiative'` → requires `initiativeSlug + criterionId`.
- `target: 'task'` → requires `initiativeSlug + taskId + criterionId`.
(`target: 'plan'` was removed in post-review fixes; plan-level verification is not v0.1 scope.)

## Verifier serialization

The four verifier kinds serialize as:

```yaml
# Shell
verifier:
  kind: shell
  command: 'bash scripts/full-pipeline.sh'
  expectExitCode: 0

# Query (SQL)
verifier:
  kind: query
  sql: 'SELECT COUNT(*) FROM v_song_duplicates'
  expectRowCount: 0

# Test
verifier:
  kind: test
  runner: 'pest'
  pattern: 'tests/Feature/MatcherTest.php'

# Manual
verifier:
  kind: manual
  description: 'Visual review of /musicas page (no duplicates visible)'
```

Verifier execution rules (per F13 contract):
- v0.1 ships full execution for `shell` and `manual` kinds.
- `query` and `test` schemas land in v0.1 but execution is stubbed (returns error: `not_implemented`).
- Full execution arrives in v0.2.

## Evidence block (optional)

When a consumer (e.g. the `project-status` skill) executes a verifier workflow against an `ExitCriterion`, it MAY persist an inline `evidence` block on the criterion. The dashboard's ExitGatesCard renders this trace; aiDeck treats it as read-only data.

Shape:

```yaml
exitGates:
  - id: F0-G1
    description: 'Tag git `core-v2` criada'
    verifier: { kind: shell, command: 'git tag | grep core-v2' }
    status: met
    metAt: '2026-05-19T15:58:00Z'
    evidence:
      verifierKind: shell        # REQUIRED: shell | query | test | manual
      verifiedAt: '2026-05-19T15:58:00Z'  # REQUIRED, ISO8601
      passed: true               # optional
      exitCode: 0                # optional (shell)
      rowCount: 0                # optional (query, >= 0)
      outputSummary: 'tag core-v2 found at refs/tags/core-v2'  # optional
```

Notes:
- `evidence` is **fully optional** — pre-existing criteria without it parse unchanged.
- `verifierKind` and `verifiedAt` are the only required sub-fields.
- The MCP `aideck_verify_exit_gate` tool writes a separate `VerifierResult` record into the JSONL append-only log; that is the canonical execution audit trail. The inline `evidence` block is a derived snapshot the consumer skill may also write to the criterion, intended purely for rendering.
- Validator is strict: unknown sub-fields are rejected.

## Field-level mapping (schema TS → YAML)

| TS field | YAML location in entity file |
|----------|------------------------------|
| `Plan.slug`, `Plan.title`, `Plan.status`, etc. | Frontmatter top-level |
| `Plan.narrative` | Markdown body (everything after second `---`) |
| `Plan.principles[]` | Frontmatter list |
| `Plan.glossary[]` | Frontmatter list |
| `Plan.phases[]` | Frontmatter list (each phase as an object) |
| `Initiative.body` | Markdown body |
| `Initiative.tasks[]` | Frontmatter list |
| `Initiative.stack[]` | Frontmatter list |
| `Annotation.*` | Single line in `annotations/YYYY-MM-DD.jsonl` |

## Parser rules

1. Parse frontmatter with a YAML 1.2 parser (`yaml` npm package).
2. Validate against Zod schemas from `@henryavila/aideck/schemas`.
3. If `schemaVersion` is **missing** OR **not `'0.1'`**: emit
   `schema_version_mismatch` error. Missing case reports `found: "missing"`
   with suggestion to add the field; non-`'0.1'` case reports the offending
   value with `aideck migrate --from=<X> --to=0.1` suggestion.
4. Canonical schemas (`planSchema`, `initiativeSchema`, `projectStatusStateSchema`,
   `annotationSchema`, `highlightSchema`, `decisionSchema`, `intentRecordSchema`,
   `verifierResultSchema`, etc.) are `.strict()` — unknown keys reject as
   `invalid_input` rather than being silently stripped.
5. Body is preserved verbatim; aiDeck renders it as markdown in the dashboard.
6. JSONL: parse line-by-line; the watcher buffers unterminated trailing
   fragments and advances its cursor only through newline-terminated lines,
   so partial appends are picked up on the next change event. Schema
   violations and JSON parse errors are reported via `logSink` (stderr by
   default) and accumulated in the `errors[]` array of the result.
7. JSONL writes are serialized per-path via in-process promise chain and
   capped at 64 KB per line (`JsonlLineTooLargeError`) so concurrent
   appenders cannot interleave records.
6. Append-only logs MUST be appended atomically (open in `a` mode, write+newline+flush).
