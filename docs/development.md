# Development

How to work in this repo: setup, dev loop, tests, build, release.

## Setup

```bash
git clone <repo>
cd aideck
npm install
```

Requires:
- Node ≥ 20 (ESM, modern fetch, native test runner)
- npm ≥ 10

## Dev loop

The dev workflow runs Hono (server) and Vite (Vue dashboard) in parallel:

```bash
npm run dev
```

This invokes `concurrently` to run:

- `npm:dev:server` — `tsx watch src/server/index.ts` (Hono backend with hot reload)
- `npm:dev:client` — `vite` (Vue dashboard with HMR)

### Ports

- **Hono backend**: `127.0.0.1:7777` (REST + SSE + MCP)
- **Vite dev server**: `127.0.0.1:5173` (Vue app with HMR)

In dev, the Vite server proxies `/api/*` and `/sse` to Hono. The Vue app makes same-origin requests; the proxy hides the multi-port complexity.

In production builds, Hono serves the built Vue assets statically — no proxy needed.

### HMR behavior

- **Server (Hono)**: `tsx watch` reloads on `src/server/**`, `src/mcp/**`, `src/schemas/**` changes. Restart is fast (~200ms) but client connections drop.
- **Client (Vue)**: Vite HMR for `src/client/**`. Component-level updates without page reload.
- **Schemas**: changes hot-reload both server and client.

When you edit a schema, expect a brief flicker as the server restarts and the SSE connection re-establishes.

## File structure (where code goes)

```
src/
├── cli.ts                     ← CLI entry. Subcommands: serve, demo, mcp.
├── server/
│   ├── index.ts               ← Hono app + lifecycle
│   ├── routes/
│   │   ├── api.ts             ← REST endpoints
│   │   └── sse.ts             ← SSE stream
│   ├── watcher.ts             ← chokidar wrapper
│   ├── parsers/
│   │   └── project-status.ts  ← YAML → schema parser
│   └── writers/
│       └── jsonl-append.ts    ← atomic JSONL writes
├── mcp/
│   ├── server.ts              ← MCP server bootstrap
│   └── tools/
│       ├── read.ts            ← get_state, get_plan, get_phase, ...
│       ├── mutate.ts          ← mark_task_done, push_frame, ...
│       ├── gates.ts           ← verify_exit_gate
│       ├── feedback.ts        ← annotate, highlight, decision, inbox
│       └── meta.ts            ← list_consumers, health, schema_version
├── schemas/                   ← Single source of truth for types
│   ├── common.ts
│   ├── project-status.ts
│   └── index.ts
├── client/                    ← Vue 3 app
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   ├── components/            ← atomic components (see ui-layouts.md)
│   ├── views/                 ← page-level views
│   ├── stores/                ← pinia stores (state + SSE)
│   └── styles/
│       └── theme.css          ← dark theme CSS vars
└── demo/
    ├── fixtures/              ← seeded data for `aideck demo`
    └── seed.ts                ← copies fixtures to temp dir
```

## Test strategy

Run all tests:

```bash
npm test
```

Run a specific file:

```bash
npm test -- tests/schemas/project-status.test.ts
```

Watch mode:

```bash
npm test -- --watch
```

### Test types

| Type | Location | Runner | Purpose |
|------|----------|--------|---------|
| Unit | `tests/unit/**` | vitest | Pure functions, schemas, parsers, formatters |
| Integration | `tests/integration/**` | vitest | Hono routes, MCP tools, watcher behavior |
| Fixture-based | `tests/fixtures/**` | vitest | Parse + render fixtures (`fixtures/` directory) end-to-end |

### What to test (per feature contract)

For each F1-F13 feature, write at minimum:
1. One test that proves the success gate is achievable.
2. One test for each error path in the contract.
3. For renderers (F5, F6, F7): snapshot test against fixture rendering.

### Test data

- `fixtures/plans/v3-redesign.demo.md` — realistic plan fixture (do NOT use real sda-v2 data).
- `fixtures/initiatives/v3-f0-foundation-repair.demo.md` — realistic initiative.
- Add more as needed; keep them under 200 lines each for test speed.

## Typecheck

```bash
npm run typecheck
```

Must pass before any commit. CI will block PRs that fail typecheck.

## Build

```bash
npm run build
```

Runs in two stages:

1. `npm run build:server` — `tsc -p tsconfig.server.json` → `dist/` (server, MCP, schemas, demo seeds)
2. `npm run build:client` — `vite build` → `dist/client/` (Vue app)

The published npm package contains:
- `dist/cli.js` (entry, `bin` field)
- `dist/index.js` (programmatic entry, exports schemas + mcp)
- `dist/client/` (Vue assets served by Hono in production)
- `dist/schemas/`, `dist/mcp/` (re-exports)

## Running locally

```bash
npm run build
node dist/cli.js serve --port=7777
node dist/cli.js demo
node dist/cli.js mcp        # MCP-only, stdio mode
```

Or after `npm link`:

```bash
aideck serve
aideck demo
aideck mcp
```

## MCP integration (for testing)

Add to Claude Code's MCP config (path varies by platform):

```json
{
  "mcpServers": {
    "aideck": {
      "command": "node",
      "args": ["/absolute/path/to/aideck/dist/cli.js", "mcp"]
    }
  }
}
```

Restart Claude Code. The 18 tools should appear in tool discovery.

## Release process

For v0.1 release:

1. Confirm all v0.1 feature contracts gates met (`docs/feature-contracts.md`)
2. Run final smoke: `aideck demo` works, render real sda-v2 plan works
3. Bump version in `package.json` (`0.0.1` → `0.1.0`)
4. Update `CHANGELOG.md`
5. `git tag v0.1.0`
6. `npm publish --access public`
7. Push tag: `git push --tags`

CI/CD setup is deferred to v0.1.1+. For v0.1, releases are manual from a clean local build.

## Commit conventions

Use Conventional Commits:

- `feat:` new functionality
- `fix:` bug fix
- `refactor:` no behavior change
- `docs:` docs only
- `test:` test only
- `chore:` tooling, deps, build
- `style:` formatting only

For features that span multiple commits, use a scope:

```
feat(parser): parse YAML frontmatter and validate against schema
feat(parser): handle multi-line markdown body
test(parser): cover error paths
docs(data-format): document YAML conventions
```

## When to update docs

Update docs **before** code when:
- You discover the contract is wrong.
- You add a field to schemas (update data-format.md + decisions.md).
- You add an MCP tool (update mcp-tools.md).

Update docs **after** code when:
- You make non-obvious decisions (decisions.md).
- The README quickstart needs adjustment.

Never let code and docs drift. If they diverge, the spec wins — refactor code or update spec atomically.

## Common pitfalls

- **Don't add a database.** Files are canonical. (Iron Law 1.)
- **Don't bind to 0.0.0.0.** Localhost only. (Iron Law 4.)
- **Don't `throw` strings from APIs.** Use `ErrorResponse`. (Code discipline.)
- **Don't silently coerce schema versions.** Reject with structured error. (Iron Law 3.)
- **Don't add features beyond v0.1.** Park ideas; ship the scope. (Iron Law 5.)
- **Don't write to entity files from aiDeck.** Only `annotations/`, `highlights/`, `inbox/`. (Iron Law 1.)
- **Don't add Express, Fastify, or other server frameworks.** Hono is the choice. Stay there.
- **Don't add React. Don't add Svelte.** Vue 3 is the choice.
