# Fixtures

Reference data for parser, renderer, and integration tests.

These are **demo / test fixtures**, not real production data. They mirror the shape of realistic projects (modeled after sda-v2 v3-redesign) so the implementing agent can verify renderers handle realistic scale.

## Contents

```
fixtures/
├── plans/
│   └── v3-redesign.demo.md              ← 9-phase plan with principles, glossary, tracks, refs
├── initiatives/
│   └── v3-f0-foundation-repair.demo.md  ← 8-task initiative with cross-refs, verifiers, scope
├── annotations/
│   └── 2026-05-19.jsonl                 ← 3 annotations (mixed human/ai)
└── highlights/
    └── 2026-05-19.jsonl                 ← 2 highlights (warn + critical)
```

## Use in tests

```typescript
import { readFileSync } from 'node:fs'
import { parsePlan } from '../src/server/parsers/project-status'

const raw = readFileSync('fixtures/plans/v3-redesign.demo.md', 'utf-8')
const plan = parsePlan(raw)

expect(plan.phases).toHaveLength(9)
expect(plan.principles).toHaveLength(6)
expect(plan.references?.find(r => r.gitignored)).toBeDefined()
```

## Use in demo mode

`aideck demo` copies these fixtures to a temp directory and serves them. The user sees realistic content without needing a real `.atomic-skills/` setup.

## Don't put real customer/project data here

Fixtures are checked into git. Sanitize anything that resembles real-world data before adding.
