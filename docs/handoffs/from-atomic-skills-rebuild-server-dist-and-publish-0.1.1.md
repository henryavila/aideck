# Handoff → aiDeck runtime: FYI before you publish `0.1.1`

**Audience:** the agent maintaining the aiDeck runtime repo (`/home/henry/aideck`).
**From:** the atomic-skills agent (consumer side), 2026-06-17.
**Status:** Not urgent, not a blocker. The atomic-skills dashboard has been **validated
against your current server SOURCE** and works. This note is for **when you publish
`0.1.1`** (the owner publishes aiDeck *after* validating the dashboard).

> Per the atomic-skills owner's standing rule, the atomic-skills agent does **not** edit,
> build, or commit in this repo. Hence this note rather than a PR.

## Validation result (good news)

Running aiDeck from current source (the live instance on `127.0.0.1:7799`, `version 0.1.1`,
v2 consumer model) with the `atomic-skills` consumer + this repo registered as a project:

- ✅ All 7 pages load (`foco, panorama, planos, plan, phase, concluidos, help`).
- ✅ All 10 project-scoped dataSources resolve `HTTP 200` with correct counts
  (plans:14, phases:44, initiatives:38, tasks:147, gates:61, phaseGates:71, stack:37,
  totals:1, catalog:15, projects:1).
- ✅ SSE live-refresh works: mutating the watched state files emitted 11 `data_changed`
  events tagged `consumer: atomic-skills` with the right dataSource.
- ✅ Static contract: every widget the manifest uses is in `WidgetRenderer.vue`'s
  `widgetMap`, every `config:` key is consumed by the widget's props (audited
  `CollectionGrid/StatusList/RecordSwitcher/Stepper/Callout/ProgressBar`), and the
  `catalog` record shape matches `CatalogWidget`.

So your committed source is correct for the atomic-skills consumer. No change requested.

## The one build-hygiene item (for your publish step)

Your local `dist/` is **half-rebuilt**: `vite build` regenerated the client (June 16, with
the v2.1 widgets), but `tsc -p tsconfig.server.json` did **not** re-run, so `dist/server`
is a **stale May-28 build** (`dist/server/index.js` mtime 2026-05-28, `grep -c aideckBaseDir
dist/server/index.js` → 0, reports `version 0.0.1`). It runs the **old** consumer-discovery
model (scans a project's `.atomic-skills/` subdirs as consumers) instead of scanning
`~/.aideck/consumers/`.

This does **not** affect your running `7799` instance (started from current source), but it
**will** ship broken if you publish from this `dist/`. Before publishing `0.1.1`, run a
**full** `npm run build` (`tsc -p tsconfig.server.json && vite build && node
scripts/copy-demo-assets.mjs`) so `dist/server` matches `src/server`. After the build,
`GET /api/health` should report `0.1.1` and `GET /api/consumers` should list `atomic-skills`
(from `~/.aideck/consumers/`), not the project's `.atomic-skills/` subdirs.

(There is also a **stale instance lock** at `~/.aideck/lock` pointing at a dead pid 630205 /
port 7799; a fresh `aideck` start may refuse with `InstanceAlreadyRunningError` until it's
cleared. Minor, mentioning in passing.)

## A widget design judgment to confirm (optional)

In `StatusListWidget.vue` a row renders its **annotation instead of the status chip** when
`annotationField` resolves non-empty (`v-if field(annotation) … v-else chip`). The
atomic-skills "Exit gates" list sets `annotationField: verifierLabel`, and every gate has a
`verifierLabel` — so those rows show the verifier label but **no status chip
(met/pending/deferred)**. If intended, ignore; if a gate row should show both, it's a tweak
on your widget (or the manifest drops `annotationField` there). Flagging since it's your
widget's behavior.

## After you publish `0.1.1`

atomic-skills will bump its dependency `^0.1.0` → `^0.1.1` (it pins `^0.1.0` today and won't
bump before publish, since that would break `npm ci`).
