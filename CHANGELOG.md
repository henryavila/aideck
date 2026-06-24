# Changelog

All notable changes to **aiDeck** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-24

### Added

- **DS v2 declarative engine.** Manifests now drive rendering end-to-end: declarative data **aggregation**, widget **bindings**, page/section **chrome**, and **cross-project** composition. The runtime reads what the manifest declares and projects it onto the dashboard, HTTP/SSE, and MCP surfaces without per-consumer code.
- **Remote access (opt-in, tailnet-only).** `--expose=tailscale` fronts the loopback server with an out-of-process Tailscale **Serve** (tailnet-private HTTPS → loopback); `--expose=tailnet` binds a second listener on the node's own Tailscale IP, guarded by a **Host-header allowlist** (`src/server/host-guard.ts`) that closes the DNS-rebinding vector. aiDeck's own socket never binds `0.0.0.0`, Tailscale **Funnel stays forbidden**, and the CLI prints a `reachable by tailnet peers (reads AND writes, no auth)` warning on every exposed start. WSL hosts also get an SSH-tunnel hint.
- **`nav.style: 'projects'`** — a generic project-centric sidebar that lists projects and expands their pages, independent of any consumer's domain.
- **Plan fork link (`Plan.spawnedFrom` + `PhaseDescriptor.spawnedPlans`).** Optional, additive fields modelling a parent/child plan relationship: a child plan carries `spawnedFrom` (`{ plan, phaseId, taskId?, mode: 'pause' | 'parallel' }`) pointing at the parent's anchor phase, and that phase lists the child slug(s) in `spawnedPlans`. Distinct from `supersedes` (replacement) — a fork is additive. Both are optional, so non-forked plans are unchanged. Declared in `planSchema`/`phaseDescriptorSchema` so inline frontmatter no longer hard-rejects (`spawnedFrom`) or silently strips (`spawnedPlans`).
- **`TreeViewWidget` fork affordances.** Per-node `modeField`/`kindField` render a `mode` badge (pause/parallel) and a distinct "forked plan" glyph; optional `linkTo` makes nodes navigate (row-scoped `:token` interpolation, same contract as `table`/`phase-timeline`).
- **`page.showInNav?: boolean`** — a generic shell primitive to keep a page reachable (by route and via `help` / `?` / `commandPalette`) while hiding it from the nav. Default (`undefined`/`true`) is unchanged; `false` omits the page from the sidebar, the projects-mode project expansion, and the in-page tab bar. The consumer decides what to hide; core privileges no page.
- **`collection-grid` record-card preset** — renders the exact DS card with per-row hover affordances.

### Changed

- **Watcher classification is manifest-driven.** File classification follows the consumer's manifest rather than hardcoded domain paths, de-leaking domain assumptions out of core.

### Fixed

- **Resilient instance lifecycle** — bounded shutdown, idempotent `serve`, and clean restart.
- **Dashboard chrome** — resolved a headline-banner CSS class collision, section chrome, and record-card body rendering.

## [0.1.1] - 2026-06-07

### Fixed

- **`/api/health` reports the real package version.** `serve` and `demo` now pass the resolved version into `startServer` instead of falling back to the hardcoded `0.0.1` default, so the health endpoint accurately reflects the running build.
- **`exports` exposes `./package.json`.** Programmatic consumers can now `require.resolve('@henryavila/aideck/package.json')` to locate the install directory without hitting `ERR_PACKAGE_PATH_NOT_EXPORTED`.

## [0.1.0] - 2026-06-06

First public release.

### Added

- **Generic dashboard runtime** — reads consumer `manifest.yaml` files from `~/.aideck/consumers/`, watches their data files, and renders a live dashboard on `127.0.0.1`.
- **25 built-in widgets** across data display, charts, text, navigation/layout, status, AI-specific, gap-analysis, and specialized (`graph-dag`) categories, composable via three layout modes (`sections`, `grid`, `single`) with responsive overrides.
- **Schema validation** — validates every data file against the consumer's `schema.json` (AJV) with LLM-friendly structured errors for agent generate-validate-fix loops.
- **Two-tier MCP server** — always-on generic tools (`aideck_list_consumers`, `aideck_list`, `aideck_read`, `aideck_write`, `aideck_health`, `aideck_schema_version`) plus consumer-declared tools (`file-mutation`, `shell-exec`, `composite`, `script` handlers) registered dynamically via `tools/list_changed`.
- **Multi-project support** — `ProjectRegistry` with project-scoped routes and SSE filtering.
- **CLI** — `serve`, `demo`, `mcp`, `up`, `down`, `env`, `validate-file`, `init-consumer`, and data-format helpers (`yaml`/`json`/`jsonl`/`frontmatter`).
- **`--static-dir`** flag to serve a prebuilt SPA bundle with API passthrough.
- **Local-first guarantees** — binds localhost only, no telemetry, files remain the source of truth.

[Unreleased]: https://github.com/henryavila/aideck/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/henryavila/aideck/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/henryavila/aideck/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/henryavila/aideck/releases/tag/v0.1.0
