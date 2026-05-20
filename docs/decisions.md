# Decisions Log

Architectural and design decisions made during aiDeck design. Each entry is a snapshot — read top-down for chronology.

---

## 2026-05-19 — Founding decisions

Recorded after the design session that produced aiDeck v0.1 scope.

### Naming
- **Package name**: `aiDeck` (display), `@henryavila/aideck` (npm), `aideck` (CLI binary).
- **Rationale**: Flight-deck metaphor positions tool as a cockpit for AI workflows. Apple-style camelCase reads as unified word.

### Positioning
- **What**: AI-native dashboard runtime for developer workflows.
- **Not**: A markdown previewer (that's mdprobe). Not a CI dashboard. Not a project management tool.

### Architecture
- **Backend**: Hono + Node + chokidar + open.
- **Frontend**: Vue 3 (Composition API + `<script setup>`), Vite for dev/build.
- **Integration**: MCP server is the primary AI-facing contract. HTTP/SSE for browser. Files are canonical.
- **Theme**: dark-first; light is v0.2+.

### Schemas
- Embedded in main package (`@henryavila/aideck/schemas`), NOT a separate package.
- Rationale: only one consumer planned for v0.1 (atomic-skills). Split if/when Python or Rust consumers appear.

### MCP-first vs file-first
- Files remain canonical. aiDeck reads, never owns.
- MCP is a gateway, not a replacement for files.
- Skills work without aiDeck running.

### Integration tiers
- Tier 1: read-only (file conventions only).
- Tier 2: read-write (consume aiDeck inbox via MCP).
- Custom consumer support (registration manifest) deferred to v0.2.

### Demo requirement
- `aideck demo` must work standalone (no atomic-skills needed).
- Demonstrates dashboard + MCP integration with seeded fixtures.

### Roadmap
- v0.1: runtime + project-status + help + demo + MCP (this)
- v0.2: parallel-dispatch + audit
- v0.3: hunt + reviews (HTML projection, .md retained as canonical-derived)
- v0.4: cross-cutting views

---

## Open questions deferred

- **Where does MCP server run** — same process as HTTP server, or child? (Decision: same process for v0.1; revisit if performance demands separation.)
- **Help page data source** — frontmatter parsed from atomic-skills skill files at runtime, or shipped as static fixture? (Leaning frontmatter for live accuracy; static fallback if frontmatter migration delays.)
- **Annotation persistence format** — JSONL per day, JSONL per consumer, or single file? (Decision: JSONL per day under `<consumer-root>/annotations/<YYYY-MM-DD>.jsonl`; rotates naturally, append-only safe.)
- **Port collision strategy** — fail loudly with suggestion, or auto-find next free port? (Decision **revised 2026-05-19**: hybrid — auto-fallback 7777→7787 ONLY when user did not pass `--port`; fail loudly when `--port` was explicit. Env file `~/.aideck/env` records the chosen port so consumers discover it without probing a range. Surprise port change is still surprising for explicit `--port`, but the default-port case is robust to background processes squatting 7777.)

---

## 2026-05-19 (later in session) — MCP and schema expansion

After analyzing the real sda-v2 v3-redesign plan (843 lines, 9 phases, 61 sub-phases) we realized the initial v0.1 design was minimalist.

### Schema expansion
- `Plan` gains: `version`, `narrative` (full markdown body), `parallelismAllowed`, `principles[]`, `glossary[]`, `tracks[]`, `supersedes`, `references[]`, `whatStaysValid[]`.
- `PhaseDescriptor` gains: `goal`, `audience`, `track`, `parallelWith[]`, `subPhaseCount`, `exitGate` with criterion list + verifiers, `externalImports[]`, `exitGateType` (standard/ui-gate/custom).
- `Initiative` gains: `body` (markdown), `audience`, `externalImports[]`, `references[]`, `crossTaskRefs[]`.
- `Task` gains: `description`, `outputs[]`, `tags[]`, `resourceCounts`, per-task `verifier`.
- New types: `ArtifactRef`, `Principle`, `GlossaryTerm`, `Track`, `ExitCriterion`, `ExitCriterionVerifier`, `InterPhaseGate`, `PlanSupersedeRef`, `CrossTaskRef`, `NextActionProjection`, `DriftReport`, `HealthReport`.

### MCP expansion (4 tools → 18 tools)
Reorganized into 5 categories:
- **Read** (7): `get_state`, `get_plan`, `get_phase`, `get_initiative`, `get_task`, `get_next_action`, `get_dependencies`
- **Mutate** (9): `mark_task_done`, `update_initiative_status`, `update_next_action`, `push_frame`, `pop_frame`, `park_item`, `emerge_item`, `promote_parked`, `add_task`
- **Exit-gate** (1): `verify_exit_gate`
- **Feedback** (4): `annotate`, `highlight`, `record_decision`, `inbox`
- **Meta** (3): `list_consumers`, `health`, `schema_version`

### Feature contracts doc added
`docs/feature-contracts.md` lists F1-F13 with verifiable success gates per feature. Composite gate at the end. Reference test target: render real sda-v2 v3-redesign plan correctly.

### Rationale
A minimalist MCP forces consumers (atomic-skills skills) to fall back to direct file mutation, defeating the purpose of MCP-first integration. The expanded surface covers the full operational loop: read → decide → mutate → verify → feedback.

---

## 2026-05-19 (continued) — Detection / lifecycle spec (initial draft, superseded same day)

Identified during atomic-skills design session that aiDeck contracts didn't specify how consumers detect aiDeck is running. Filled the gap with `~/.aideck/runtime.json` (PID + URL + port + version + modes + startedAt). See HANDOFF-2026-05-19.md (deleted).

**Superseded** later the same day after cross-model adversarial research — see next entry.

---

## 2026-05-19 (continued — final) — Detection / lifecycle, revised to probe + env file

After cross-model research into production daemons (Ollama, LM Studio, Vite, Wrangler, n8n, PostgreSQL, Docker, Next.js 16.2, Atuin) and consultation of MCP lifecycle semantics in Claude Code/Cursor, revised the detection spec.

### Decisions
- **Detection for AI agents** (unchanged): MCP tool availability is the canonical signal.
- **Detection for CLI/shell consumers**: HTTP probe `/api/health` with `service: "aideck"` fingerprint. 200ms timeout.
- **Port discovery**: `~/.aideck/env` file contains 3 lines (comment + `export AIDECK_URL=...` + `export AIDECK_PORT=...`). NO pid, NO version, NO modes — all metadata via `/api/health`.
- **File permissions**: 0700 dir / 0600 file, applied via `open(O_CREAT | O_WRONLY | O_EXCL, 0o600)` (NOT writeFile + chmod, which has caused real credential leaks in certbot/acme.sh/KeePassXC).
- **Stale file handling**: probe failure IS the liveness signal. No PID, no fcntl. If env file points to a dead URL, `/api/health` 200ms timeout fails and consumer falls back to direct file write.
- **Auto-port fallback**: default port (no `--port`) auto-tries 7777→7787 (10 attempts). Explicit `--port` fails loudly on collision. Env file is updated with chosen port.
- **Multi-instance**: not supported v0.1; env file holds last started.

### Rationale for the pivot
1. **Dominant production pattern is probe, not PID file**: 5 of 6 surveyed local HTTP daemons (Ollama, LM Studio, Vite, Wrangler, n8n) use convention port + HTTP probe. Only Next.js 16.2 (March 2026) added a lock file, explicitly for AI agents — strong but isolated precedent.
2. **PID file done correctly is complex**: `kill -0 $pid` has documented TOCTOU race (kernel PID recycling); correct implementation requires `fcntl` exclusive lock (per `trbs/pid` library and LWN article on race-free signaling). The original handoff's spec only mentioned `kill -0`, which is insufficient.
3. **Permissions footgun is real and recurring**: certbot (#6936), acme.sh (#3127), KeePassXC (#2575) all leaked credentials via `writeFile + chmod` patterns. Mitigation requires `O_EXCL | mode` at `open()`. Smaller files with no sensitive data reduce attack surface.
4. **MCP spec has no discovery convention for stdio servers** — IDE owns lifecycle via static config. Detection between aiDeck HTTP daemon and aiDeck stdio MCP shim should NOT use runtime.json (would create a second source of truth, violating Iron Law 1); both read canonical files independently.
5. **The original problem ("how does a skill detect aiDeck?") is fully solved by MCP tool availability for AI consumers in v0.1**. The runtime file primarily helps hypothetical Tier 2 consumers, which are formally deferred to v0.2+ per Iron Law 5.
6. **Env file is a thin compromise**: 10 bytes, plain text, format identical to shell `source`-able scripts (pattern used by mise/asdf/direnv). Single purpose: tell shell consumers which port aiDeck chose when default 7777 wasn't available. Metadata still comes from `/api/health`.

### What `/api/health` returns
```json
{
  "schemaVersion": "0.1",
  "apiVersion": "0.1",
  "service": "aideck",
  "version": "0.1.0",
  "status": "ok",
  "uptimeMs": 12345,
  "consumerCount": 1,
  "demo": false,
  "modes": ["http", "sse"]
}
```

`service: "aideck"` is the identity fingerprint (same pattern as Ollama's "Ollama is running" body and LM Studio's `/lmstudio-greeting`).

### What replaces runtime.json
| Original field | Where it lives now |
|---|---|
| schemaVersion, apiVersion | `/api/health` body |
| pid | not needed — probe failure detects death |
| url, port | `~/.aideck/env` (for shell discovery) + `/api/health` body |
| modes | `/api/health` body |
| startedAt | derived from `uptimeMs` in `/api/health` body |
| version | `/api/health` body |

### Sources consulted
- Ollama FAQ + issue #1378 (no PID file, root path probe)
- LM Studio CLI source (`findOrStartLlmster`, `/lmstudio-greeting`, 500ms timeout)
- Next.js 16.2 blog post (`.next/dev/lock` introduction, AI-agent rationale)
- PostgreSQL 18 §19.3 (socket + lock file pattern)
- Docker daemon socket protection guide
- Greg's Wiki ProcessManagement (PID file pitfalls)
- LWN article on race-free process signaling
- trbs/pid library (fcntl-based stale handling)
- Anthropic Claude Code MCP docs (static config, per-session child spawn, no runtime announcement)
- MCP architecture overview at modelcontextprotocol.io

---

## 2026-05-19 (implementation kickoff) — Etapa 01: foundation deps locked in

First implementation session executed `docs/implementation/01-foundation-deps.md`.

### Picks
- **Zod 3.x** (not 4) — ecosystem types still reference 3.x; migrate post-v0.1.
- **Pinia 2.x + vue-router 4.x** — current stable for Vue 3.5; matches existing repo Vue dep.
- **marked 14.x** — ships its own types in v14; no `@types/marked` needed.
- **mermaid 11.x** — registered only; will be `import('mermaid')` dynamic in step 11 to avoid ~600KB hit on first paint.
- **happy-dom 15.x** over jsdom — ~2× faster on Vue component mounts; sufficient for v0.1 test surface.
- **@vitest/coverage-v8 2.1** — matches vitest 2.1.x already pinned.
- **`passWithNoTests: true`** in vitest config — required so `npm test` returns 0 before step 02 lands the first test file. Removed implicitly once tests exist (no-op when files present).

### Vite root + tsconfig
- `vite.config.ts` already had `root: 'src/client'`, so `index.html` lives at `src/client/index.html` and references `/main.ts` (resolved against the Vite root, not project root).
- Added `src/client/vue-shim.d.ts` declaring `*.vue` modules; needed because `tsc --noEmit` (not vue-tsc) can't resolve SFC imports otherwise.

### Known dev-only CVE noise
`npm audit` reports 6 moderate + 1 critical against pinned `vite@5.4` (esbuild GHSA-67mh-4wv8-2f99) and `happy-dom@15` (GHSA-37j7-fg3j-429f). All advisories require **major-version bumps** (`vite@8`, `happy-dom@20`). Scope is dev-time only (test runner + local dev server bound to localhost). Holding the pins for v0.1; revisit in v0.2 cleanup. Not a blocker for step 01 per its DoD.

### Server placeholder pattern
`src/server/index.ts` exits 0 when invoked as entrypoint (so `tsx watch` doesn't crash-loop before step 05 lands the Hono app) but does nothing when imported by tests. Used `import.meta.url === \`file://${process.argv[1]}\`` for the gate — standard Node ESM idiom.

---

## 2026-05-19 (later) — Etapa 02: Zod validators + schemaVersion error discrimination

Step 02 landed Zod runtime validators for every canonical type plus the 5 new append-only JSONL types (`Resolution`, `Acknowledgement`, `IntentRecord`, `IntentApplication`, `VerifierResult`). 32 tests, 100% function coverage on `src/schemas/validators/`, 99.3% lines.

### Non-obvious decision: distinguishing missing vs wrong `schemaVersion`

Step 02 spec mandates two distinct error codes:
- Plan **without** `schemaVersion` → `invalid_input`
- Plan **with** `schemaVersion: '0.0.9'` (or any non-'0.1' value) → `schema_version_mismatch` with a `migrate` suggestion

Zod's `z.literal('0.1')` emits `code: 'invalid_literal'` for **both** cases — the `received` field is the only discriminator (undefined when the key is absent, string when present-but-wrong). The validator's `isSchemaVersionMismatch` checks `'received' in issue && issue.received !== undefined` before flagging as a mismatch; otherwise it falls through to `invalid_input`.

This matters because users hitting an old payload need to know to run `aideck migrate`, while users hitting a malformed payload need to know to fix the field — different next actions.

> **Revised 2026-05-20** (see post-review fix entry below): missing `schemaVersion` is now also classified as `schema_version_mismatch` (with `found: "missing"`). The original "missing → invalid_input" distinction was unhelpful — both cases need the same migration path. Tests updated accordingly.

### Coverage scope clarification

The global 70% threshold in `vitest.config.ts` is computed across `src/schemas/**`, `src/server/**`, `src/mcp/**`. With only step 02 landed, placeholder files (`src/server/index.ts`, `src/mcp/index.ts`, `src/schemas/index.ts` barrel) show 0% — but the validators cover enough to push the global numbers above 70 (97/86/96/97). When steps 04-08 land real code those placeholders go away.

### `passWithNoTests: true` removed

Closes F-001 from `.atomic-skills/reviews/2026-05-19-1539-aideck-step01-scaffold.md` as documented in that review's "Fixes applied" log. Coverage gate now actually enforces thresholds because tests exist.

---

## 2026-05-20 — Post-review fixes (commit 7c59168, all 40 findings)

After the 8-scope parallel cross-model code review of `69144b6..HEAD`
(`.atomic-skills/reviews/2026-05-19-2210-aideck-backend-phase.md`,
2 critical + 36 major + 6 minor), all findings were addressed in a single
commit. Below: the load-bearing design decisions that emerged.

### Path traversal: validate at the root

Every MCP and HTTP call site eventually passes a `consumer` string to
`consumerRoot(rootDir, consumerId)`. Validation lives **in that function**
(`SAFE_CONSUMER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/`) and throws
`UnsafeConsumerIdError`. Each surface translates that to its native error
shape (HTTP `400 invalid_input`, MCP `invalid_input`). Defense in depth +
fail-closed: any future caller is protected without remembering to validate.

### Decisions live in `inbox/` (not `decisions/`)

Iron Law #1 limits aiDeck writes to `annotations/`, `highlights/`, `inbox/`.
The original `/api/decision` and `aideck_record_decision` wrote to a fourth
directory (`decisions/`), violating the contract. Fix: decisions become
`kind: 'decision'` inbox records — semantically they are signals about
state, which is exactly what inbox is for. The aggregated inbox projection
still surfaces them under `kind === 'decision'` to callers.

### Hostname option removed entirely

`startServer({ hostname })` allowed binding to arbitrary interfaces,
violating Iron Law #4 (localhost-only). The option was removed from the
public API rather than validated — there is no legitimate reason to allow
non-localhost bind in v0.1, so providing the knob invites misuse. The
constant `LOCALHOST = '127.0.0.1'` is now hard-coded in `startServer`.

### IDs become UUID-based, not file-line-counted

Previous ID schemes (`ann-<day>-001`, `int-<day>-001`, etc.) counted
existing JSONL lines and incremented. Under concurrent appenders this
generates duplicates — two `aideck_annotate` calls racing on the same
daily file both read count=N and emit `ann-<day>-(N+1)`. Fix: every ID
becomes `<prefix>-<YYYY-MM-DD>-<8 hex chars of UUIDv4>`. Collision-resistant
without locks; the day prefix preserves human-readable ordering for the
common case.

### Intent record becomes discriminated by `operation`

Before: `intentRecord.args: z.record(z.unknown())` — operations could be
recorded with empty or wrong `target` and `args`, polluting the append-only
log. After: `z.discriminatedUnion('operation', [...9 members])` where each
operation pins the required target and args shape. The writer-side ergonomics
shift: `appendIntent({ intent: IntentPayload })` takes a single discriminated
payload rather than separate `operation/target/args` parameters.

Same pattern applied to `inboxItemSchema` (discriminated on `kind`) and
`verifierResult.criterionRef` (discriminated on `target`, with `'plan'`
removed since plan-level verification was advertised in the schema but
never implemented — a half-finished implementation forbidden by Iron Law #5).

### MCP tool input must be a plain object

`@modelcontextprotocol/sdk` validates that `tool.inputSchema.type === 'object'`.
A `z.discriminatedUnion(...)` produces `{ anyOf: [...] }` at the JSON Schema
level — no `type: 'object'` at the top. Result: tool registration crashes
with a `$ZodError` at the SDK boundary. Compromise: the tool *input schema*
stays a single strict object with discriminator + optional fields, and the
handler enforces the per-discriminator required fields, returning
`invalid_input` on mismatch. Applies to `aideck_get_dependencies`.

### Watcher buffers unterminated trailing lines

The previous cursor advanced through every byte seen, including the
trailing unterminated fragment of an interrupted append. The completed line
on the next change event was parsed as a suffix-only string and never
emitted as a record. Fix: `JsonlState` carries a `pending: string` for the
fragment after the last `\n`. The cursor only advances through complete
lines.

### `appendJsonlLine` serializes per-path

POSIX guarantees atomic `write(2)` under `PIPE_BUF` (4 KB) with `O_APPEND`.
For larger payloads (annotation bodies with long quotes, verifier outputs)
or concurrent same-process appenders, this is not enough. Fix: in-process
`Map<path, Promise<void>>` chain. Each `appendJsonlLine(path, ...)` queues
behind the previous one for the same `path`. Hard cap at 64 KB per line
(`JsonlLineTooLargeError`) — beyond that, the per-FS atomicity ceiling on
non-Linux/macOS becomes the limiting factor and silent corruption beats
typing the records into a different shape, so we refuse.

### Shell verifier runs in its own process group

`spawn('bash', ['-c', cmd])` runs the shell as a single process, but
typical commands (test runners, package scripts) fork children. A
SIGTERM/SIGKILL to the shell PID leaves the children running. Fix:
`spawn(..., { detached: true })` creates a new process group; on timeout
we send the signal to `-pid` (negative PID == process group). Falls back
to `child.kill()` if the group is already gone.

### `allGatesMet` reads canonical + inbox

`aideck_verify_exit_gate` writes its outcome to inbox/ and never edits the
entity file. Previously `allGatesMet` looked only at canonical sibling
status from the parsed file at call time — so two sequential verifications
both returned `allGatesMet: false` because the consumer skill hadn't yet
projected the first one back into the entity file. Fix: scan inbox/ for
`verifier_result` records and use the latest per criterion ID, falling
back to canonical for siblings without any inbox record.

### Fake-consumer stays in `src/demo/` (renamed semantics, not relocated)

The fake-consumer simulates what an external consumer skill does in
production. In `aideck demo` it runs in-process — that's the only place in
the aiDeck package that writes to entity files. Technically a violation of
Iron Law #1 if read narrowly. The fix is documentary: the file's docblock
makes the boundary explicit ("SIMULATED EXTERNAL CONSUMER (demo only)") and
the per-file processing chain prevents the race condition where rapid
intent appends race on entity reads. The intent stream is now validated
through `parseIntentRecord` (Zod) before application; malformed lines get
a `rejected` IntentApplication record so the audit trail captures them.

### `pathToFileURL(process.argv[1]).href` for ESM main check

`import.meta.url === \`file://${process.argv[1]}\`` fails when the install
path contains characters needing URL encoding (`%20` for spaces, etc.) —
`import.meta.url` is percent-encoded, the template-literal version is not.
`pathToFileURL` does the encoding correctly.
