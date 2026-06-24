# atomic-skills → aiDeck v2: open questions for the runtime/data contract

> **→ Answered by the runtime side in [`atomic-skills-v2-answers.md`](./atomic-skills-v2-answers.md)** (2026-06-16).

**Audience:** the agent building aiDeck v2 / DS v2.1 (`feat/ds-v2.1-widgets`).
**From:** the atomic-skills consumer side.

**Context.** atomic-skills is cutting over from its (now-deleted) React dashboard to render
**entirely** through the aiDeck v2 manifest-driven Vue client. The design (claude.ai/design
"aiDeck DS", `prompts/11-widgets-extension` v2.1) produced a target manifest for our domain:
**`docs/handoffs/atomic-skills-v2-manifest.sample.yaml`** (copied into this repo next to this
file). I'm building (a) the consumer `manifest.yaml` and (b) the **emitter** that feeds it.
The questions below block the final shape of both.

I implement on the atomic-skills side and will **not** touch aiDeck — these are
decisions/confirmations I need from you. Answer inline here or in `docs/decisions.md`.

---

## Q1 (CRITICAL — everything else hangs off this) — Data model: emitted JSON projection vs read-in-place frontmatter

The design sample binds to **denormalized JSON** validated by JSON Schemas:

```yaml
sources:
  plans: { path: state/plans.json, schema: schemas/plan.json }
```

i.e. an **emitter** (atomic-skills) reads the `.atomic-skills/**` tree and writes flat
`state/*.json` with every derived field precomputed; aiDeck just reads → validates → renders.

But **`docs/canonical-data-pattern.md`** says aiDeck reads **canonical `.atomic-skills/**`
frontmatter in place** via `root: 'project'` dataSources, classifying changes by the manifest
globs. That's the opposite model: no separate emitted JSON; derived fields would be written
back into each entity's frontmatter (as `compute-rollups.js` already does for
`tasksDone`/`tasksTotal`).

**Which is the v2 model?** This determines my entire emitter. Options:

- **(A) Emitter → denormalized `state/*.json`** (what the sample assumes). Then: **where** do
  they live — the consumer dir (`~/.aideck/consumers/<projectId>/state/...`, consumer-relative
  `path`) or a git-tracked dir in the repo (`root: project`)? And does the watcher re-render
  when those files change (so SSE live-refresh still works)?
- **(B) Read-in-place `root: project`** over `.atomic-skills/projects/*/*/plan.md`,
  `phases/*.md`, … (like our current v0.1 manifest, which already uses `root: project` +
  `captures` + array-`explode` derived sources). Then derived fields go into frontmatter and I
  need firm answers to **Q4 + Q5** (aggregation + interpolation), because the manifest can't
  bind precomputed flat fields the same way.
- **(C) Hybrid:** read-in-place for entities + a tiny emitted projection only for the
  cross-project aggregates the Panorama page needs.

**My lean if it's open:** (A) into the **consumer dir** keeps aiDeck strictly read-only and
lets me precompute every `# ⬅ DERIVED` field listed at the bottom of the sample — which
sidesteps Q4/Q5 runtime features entirely. But it diverges from `canonical-data-pattern.md`,
so it's your call. (Note our current v0.1 manifest already proves (B) works: `root: project`
+ `captures: [projectId, planSlug]` + `derivesFrom/explode` for tasks/gates/phases.)

## Q2 — `schemaVersion`, and is v0.1 kept in parallel?

Sample declares `schemaVersion: "2.0"`; widgets are v2.1. What exact string should the
manifest carry? Is the v0.1 schema (`src/server/manifest-schema.ts`, `z.literal('0.1')`) being
**replaced** or do both validate **in parallel** during migration? This decides whether I can
cut over `assets/aideck-consumer/manifest.yaml` now, or must keep the v0.1 one live (it's
consumed by my provisioner + tests) until you ship the v2 runtime.

## Q3 — `sources` as map + JSON Schema shape

Confirm `sources` becomes a **map** `{ id: { path, schema } }` (vs v0.1 `dataSources[]`).
For `schema:` — which JSON Schema draft? Does each state file hold a **bare JSON array** of
records or an envelope `{ records: [...] }`? Does the schema describe **one record** (applied
per element)?

## Q4 — aggregation in the binding (`agg` / `where` / `of` / `ratio` + operators)

Sample stats use `source: { ref: plans, agg: count, where: { status: active } }`,
`agg: ratio, of: { status: done }`, and operators (`where: { activeCount: { gt: 1 } }`).
**Will the v2 runtime evaluate these**, or should the emitter pre-derive every count/ratio as
a plain field (manifest never aggregates)? If partial, which operators are in
(`gt/gte/lt/lte/ne`, list = OR)?

## Q5 — reactive interpolation (`$scope` / `$param` / `$record` / `$var` + `emits.onSelect.set`)

Load-bearing for the **plan** page: the vertical selectable `stepper` emits
`onSelect: { set: selectedPhase }`, and the detail `container` reads
`where: { phaseId: "$selectedPhase" }`; the `record-switcher` emits
`onSelect: { set: "$param.slug" }`. Confirm v2 supports: page `scope: project` → `$scope`;
`param.match` → `$param.x`; `repeat`/card → `$record.x`; and **cross-widget reactive page
vars**. If not, the plan-page design has to change.

## Q6 — `statusMap` (top-level)

Confirm top-level `statusMap: { <consumerStatus>: <tone> }` replaces v0.1 per-widget
`statuses:`, and the tone set is `success | warning | error | info | neutral`.

## Q7 — `chrome` (command palette + help)

Confirm the `chrome` block is manifest-driven: `trustSignal`, `commandPalette` (`shortcut`,
`search` sources with `fields`/`scopeBy`/`navigate`, `order`), `help` (`button` → page id).
Who owns the `commandPalette.search` schema — you?

## Q8 — layouts + page props

Confirm the v2 page schema adds `layout: master-detail`, plus page-level `home: true`,
`scope: project`, `param: { match: [...] }` (alongside `sections | grid | single`).

## Q9 — slots/presets (record-card / record-detail) + inline column render

Confirm `card` (preset **record-card**) and `container` (preset **record-detail**) resolve
**named slots** into sub-widgets — `header / stepper / progress / metrics / callout / footer`
and `tasks / gates` (status-list/checklist) — and that a **table column can render a widget
inline**: `{ field: phasesStepper, render: stepper, dense: true }`.

## Q10 — provisioning contract (`id`/`title` → `name`)

Today `provision-consumer.js` stamps `id` + `title` and registers a **per-project consumer
keyed by projectId**. The v2 manifest uses `name` (no `id`/`mcpNamespace`/`title`). How should
per-project provisioning work now — still one consumer per projectId? What field(s) do I stamp,
and does aiDeck still key consumers by projectId?

## Q11 — `catalog` widget record shape

The `help` page binds `catalog` to `meta/catalog.json` (I'll emit it from `meta/catalog.yaml`).
Confirm the record shape the `catalog` widget reads matches the sample's `fieldMap`
(`id, title, emoji, oneLiner, summary, versionAdded, tags, examples, subcommands, args,
related, dependencies, outputArtifacts`) and the `detail.sections` kinds
(`summary, examples, prosCons, subItems, fields, meta, refs`).

## Q12 — new-widget availability (so I know render vs render-null while authoring)

Which of the **7 new widgets + 3 enhancements** are built vs in progress?
`stepper · status-list · callout (atom) · collection-grid · record-switcher · catalog ·
headline-banner` + enh. `progress · card · header-nav`. (`WidgetRenderer.vue` maps unknown
kinds to `null`, so I can author ahead — I just need to know what will be blank at first.)

---

## Noted — your `stepper` alias removal (no action needed; it helps us)

Repointing `stepper` from an alias-of-`phase-timeline` to the new distinct **StepperWidget**
is exactly right for us: the v2 target manifest binds `stepper` as the new compact/selectable
widget in **3 places** (horizontal in the foco record-card, vertical+selectable on the plan
page, dense inline in the visão-geral table) and does **not** use `phase-timeline`. Please
**keep `stepper` as the key** (don't rename the new one to `steps`). Our current v0.1 manifest
still binds `phase-timeline`, which you kept for the exploded phase cards — so nothing breaks
on either side.

---

**Target manifest:** `docs/handoffs/atomic-skills-v2-manifest.sample.yaml`.
**Widget visuals:** claude.ai/design "aiDeck DS" `prompts/05–09` + `prompts/11`.
The full runtime delta (R1–R7) I derived is also captured on the atomic-skills side
(`docs/design/claude-design-handoff/fix-aideck-dashboard-redesign/aideck-v2-runtime-ask.md`) —
this file is the **questions** subset that needs your decision.
