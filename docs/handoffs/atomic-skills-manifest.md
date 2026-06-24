# Handoff — atomic-skills: publish a `project-status` manifest

**Audience:** the agent maintaining the `atomic-skills` repo / skills.

> **⚠️ STATUS UPDATE — the aiDeck hard-cut is ALREADY APPLIED.**
> The original "do this before aiDeck lands" sequencing is no longer the situation:
> aiDeck no longer recognizes any `project-status` path convention on its own, so **the
> project-status dashboard has no live-refresh and `/api/state` returns nothing for the
> flat layout until you publish the manifest below.** atomic-skills is now on the critical
> path — this is an immediate action item, not a "before" step. (The Sequencing section
> at the bottom describes the original plan; treat step 1 as "do now".)

**Action required:** publish the `project-status` manifest (below) and migrate
annotations/highlights/inbox to the explicit consumer layout.

## Why

aiDeck used to hardcode `project-status` domain knowledge in its generic runtime — the
file watcher and path classifier knew about `plans/`, `initiatives/`,
`projects/<id>/<slug>/plan.md`, `phases/`, and a `DEFAULT_CONSUMER = 'project-status'`
constant. That violated the Iron Law that aiDeck must be **domain-agnostic**: the runtime
reads arbitrary files and projects them purely from globs declared in a consumer's
`manifest.yaml`.

We removed that hardcoding (hard-cut). aiDeck no longer recognizes any `project-status`
path convention on its own. For the project-status dashboard + live-refresh to keep
working, **atomic-skills must register `project-status` as a normal v2 consumer with a
manifest** — exactly like the demo consumer (`src/demo/consumer/manifest.yaml`).

## What you must publish

A manifest at:

```
~/.aideck/consumers/project-status/manifest.yaml
```

aiDeck's `ConsumerRegistry` scans `~/.aideck/consumers/*/` on startup and loads every
`manifest.yaml` it finds. No data needs to move — the manifest's `root: project` data
sources read your existing `.atomic-skills/` tree **in place** inside each registered
project.

### Glob convention (important)

For `root: project` sources the `path` is resolved **relative to the project rootDir**, so
every glob must begin with `.atomic-skills/`. Wildcards: `*` matches within one path
segment, `**` matches any depth (including zero). `captures` names the wildcard segments
left-to-right and injects them as fields on each record.

### Reference manifest

```yaml
schemaVersion: '0.1'
id: project-status
mcpNamespace: project_status
title: 'Project Status & Planning'

dataSources:
  # Flat-layout plans (incl. archive/ subdirs)
  - id: plans
    path: '.atomic-skills/plans/**/*.md'
    format: frontmatter
    root: project

  # Nested per-project plans
  - id: project-plans
    path: '.atomic-skills/projects/*/*/plan.md'
    format: frontmatter
    root: project
    captures: [projectId, planSlug]

  # Nested per-project phases
  - id: project-phases
    path: '.atomic-skills/projects/*/*/phases/**/*.md'
    format: frontmatter
    root: project
    captures: [projectId, planSlug, phaseFile]

  # Flat-layout initiatives (incl. archive/ subdirs)
  - id: initiatives
    path: '.atomic-skills/initiatives/**/*.md'
    format: frontmatter
    root: project

pages:
  # Declare whatever pages/widgets the dashboard should render over the
  # sources above. See src/demo/consumer/manifest.yaml for the full
  # widget/binding vocabulary (table, list, card, kanban, stepper, etc.).
  - slug: plans
    title: Plans
    layout: single
    widget: table
    source: { ref: plans }
  - slug: initiatives
    title: Initiatives
    layout: single
    widget: list
    source: { ref: initiatives }
```

Read project-scoped data via:

```
GET /api/consumers/project-status/projects/:projectId/data/:dataSourceId
GET /api/consumers/project-status/projects/:projectId/data/:dataSourceId/:slug
```

(`:projectId` comes from `GET /api/consumers/project-status/projects`.)

## annotations / highlights / inbox

These three subdirectories remain **aiDeck's universal write contract** — they are NOT
domain-specific and do not need manifest declarations. aiDeck still watches them and emits
live events. The only requirement after the hard-cut: they must live under the **explicit
consumer layout**, i.e.

```
.atomic-skills/project-status/annotations/<YYYY-MM-DD>.jsonl
.atomic-skills/project-status/highlights/<YYYY-MM-DD>.jsonl
.atomic-skills/project-status/inbox/<YYYY-MM-DD>.jsonl
```

The MCP write tools (`aideck_annotate`, `aideck_highlight`, `aideck_record_decision`) already
write to `consumerRoot(rootDir, 'project-status')/...`, which is exactly this explicit path —
so if you only ever write via MCP you are already compliant. **If any skill writes to the
old flat path** `.atomic-skills/annotations/...` (no `project-status/` segment), migrate it
to the explicit subdir — the flat layout is no longer attributed to any consumer.

## `/api/state` migration

The legacy aggregate endpoint `GET /api/state/:consumer` no longer dual-scans the flat
layout; it reads only the explicit `.atomic-skills/project-status/{plans,initiatives}/`
tree. Prefer the generic project-scoped data endpoints above for the dashboard. `/api/state`
remains for backward compatibility but is considered legacy.

## Sequencing (do not skip)

1. **atomic-skills (you):** publish `~/.aideck/consumers/project-status/manifest.yaml`
   (above), ensure annotations/highlights/inbox use the explicit layout, and confirm the
   consumer loads (`GET /api/consumers` lists `project-status`).
2. **aiDeck:** land the hard-cut that removes the hardcoded classification.

If aiDeck's hard-cut lands first, the project-status dashboard loses live-refresh and
`/api/state` flat reads until the manifest is published. Coordinate so step 1 ships first.

## Verifying on your side

- `GET /api/consumers` includes `{ id: "project-status", ... }`.
- `GET /api/consumers/project-status/projects/<projectId>/data/plans` returns your plan
  records (each carrying its frontmatter fields).
- Editing a plan file fires an SSE `data_changed` event with
  `consumer: "project-status"`, and the dashboard widget re-fetches.
