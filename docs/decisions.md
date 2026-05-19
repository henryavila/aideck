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
