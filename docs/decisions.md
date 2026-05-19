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
- **Port collision strategy** — fail loudly with suggestion, or auto-find next free port? (Decision: fail loudly. Surprise port changes break MCP client config.)

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
