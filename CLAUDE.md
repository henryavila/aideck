# aiDeck — Agent Instructions

You are implementing aiDeck v0.1 — an AI-native dashboard runtime. These rules apply to ANY change in this repository.

## Before you touch code

Read in this order:

1. [docs/why.md](./docs/why.md) — why this exists
2. [docs/v0.1-scope.md](./docs/v0.1-scope.md) — what ships in v0.1
3. [docs/feature-contracts.md](./docs/feature-contracts.md) — F1-F13 with success gates
4. [docs/canonical-data-pattern.md](./docs/canonical-data-pattern.md) — the architectural rule
5. [docs/data-format.md](./docs/data-format.md) — file layout and concrete examples
6. [docs/mcp-tools.md](./docs/mcp-tools.md) — MCP tool reference (18 tools)
7. [docs/ui-layouts.md](./docs/ui-layouts.md) — wireframes for Vue components
8. [docs/development.md](./docs/development.md) — dev/test/build workflow

If a change conflicts with any of these, the docs are authoritative. Update the docs FIRST in a separate commit, then change code.

## Iron Laws

### 1. Files are canonical. aiDeck never owns state.

The `.atomic-skills/<consumer>/` directory is the source of truth. aiDeck reads YAML/Markdown, projects to HTTP/SSE/MCP, and writes ONLY to `annotations/`, `highlights/`, `inbox/` subdirectories.

Violations:
- Adding a database (SQLite, leveldb, etc.) — **forbidden**
- Adding a cache that's authoritative — caches must be regenerable from files
- aiDeck writing to entity files (e.g., `initiatives/<slug>.md`) directly — **forbidden**; mutations go through file write APIs that the consumer's skill picks up

If you think you need persistent state outside files, you've misunderstood the architecture. Re-read [canonical-data-pattern.md](./docs/canonical-data-pattern.md).

### 2. MCP-first for AI, HTTP/SSE for browser.

MCP tools are the authoritative AI surface. REST endpoints exist for the Vue dashboard. Do NOT add REST endpoints that exist only for AI consumption — promote them to MCP tools instead.

Exception: `/api/state` and `/api/help` are general-purpose reads consumed by both browser and (optionally) AI.

### 3. Schema versioning is enforced.

Every canonical payload includes `schemaVersion: '0.1'`. Parser refuses mismatches with `schema_version_mismatch` error and a suggestion. Never silently coerce versions.

### 4. No telemetry. Bind localhost only.

- HTTP server binds to `127.0.0.1` ONLY (never 0.0.0.0)
- No analytics, no error reporting to external services
- No "phone home" for version checks
- All operations are local-only

Privacy and trust are foundational. This is non-negotiable.

### 5. v0.1 scope is fixed.

Do not implement features marked v0.2+ in feature-contracts.md, even if "it'd be easy". Scope creep delays v0.1. Park the idea (`emerged:` in our own dogfooded project-status, once we set it up here) and continue.

## Code discipline

### TypeScript

- `strict: true` always. No `any` unless interfacing with untyped libs (and then `// @ts-expect-error` with reason).
- ESM-only. `"type": "module"` in package.json. Imports end in `.js` (TypeScript ESM convention).
- Prefer named exports. Default exports allowed for Vue SFCs and top-level CLI entry.

### File organization

- `src/server/` — Hono routes, watcher, file IO
- `src/mcp/` — MCP server + tools (one file per tool group)
- `src/schemas/` — TypeScript types. Single source of truth.
- `src/client/` — Vue 3 app (components, views, styles)
- `src/demo/` — seeded fixtures for `aideck demo`
- `src/cli.ts` — CLI entry
- `tests/` — vitest tests, mirroring `src/` structure
- `fixtures/` — reference data for parser/renderer tests (also used by some unit tests)

### Comments and naming

- Default to no comments. Code should be self-explanatory.
- Add comment only for non-obvious WHY (constraint, invariant, workaround).
- Names: full words. `parseProjectStatus` not `parsePS`.

### Error handling

- Never `throw` strings. Use typed `Error` subclasses or return `ErrorResponse` shapes.
- All errors that cross the API boundary must match `ErrorResponse` in schemas/common.ts.
- No silent failures. Log to stderr if you have no other channel.

### Testing

- Every feature in feature-contracts.md must have at least 1 test that exercises its success gate.
- Unit tests live in `tests/<area>/<file>.test.ts`.
- Integration tests live in `tests/integration/`.
- Coverage target: 70% on schemas, server, mcp (see v0.1 DoD).

## Tools you will use

- `Bash` — running tests, builds, file system inspection
- `Read`, `Edit`, `Write` — file manipulation
- `Grep`, `Glob` — codebase navigation
- TaskCreate/Update — track multi-step work

When implementing a feature, the loop is:

1. Read its contract in feature-contracts.md
2. Read or create the schema(s) it touches
3. Write tests for the success gate
4. Implement until tests pass
5. Update docs if behavior diverged from spec (preferably contract first, then code)

## When you finish

- Run `npm run typecheck` — must pass
- Run `npm test` — must pass
- Update `docs/v0.1-scope.md` if scope shifted (rare, log in decisions.md if so)
- Append to `docs/decisions.md` if you made a non-obvious choice

## When in doubt

If the spec is ambiguous, **ask the user** before implementing your interpretation. A short clarifying message beats two days of rework.

If a contract gate seems unachievable as written, surface it BEFORE building around it. Re-design > silent shortcut.
