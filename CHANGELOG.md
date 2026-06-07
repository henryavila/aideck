# Changelog

All notable changes to **aiDeck** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/henryavila/aideck/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/henryavila/aideck/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/henryavila/aideck/releases/tag/v0.1.0
