# Runtime answers (aiDeck side) — atomic-skills v2 questions

**Date:** 2026-06-16 · **Branch:** `feat/ds-v2.1-widgets`
**Answers to:** [`atomic-skills-v2-questions.md`](./atomic-skills-v2-questions.md) (Q1–Q12 + the stepper note).

> Answered against the **actual runtime**, grounded in `src/server/manifest-schema.ts`,
> `data-source-reader.ts`, `watch-classify.ts`, `schema-validator.ts`, `consumer-registry.ts`,
> `project-registry.ts`, and `src/client/components/WidgetRenderer.vue`. File:line citations
> inline. Where an answer is a **product/roadmap call** (not determined by code), it's flagged
> **[Henry to ratify]**.

## TL;DR — read this first

**The DS v2.1 work shipped new widget *components*, NOT a new manifest schema.** The runtime
is still the **`schemaVersion: '0.1'`** manifest contract: `dataSources[]` (not a `sources:`
map), **equality-only `filter`**, route-`param` matching, `slots` as widget-binding lists, and
**read-in-place / read-emitted-files** — with **no** aggregation engine, **no** reactive page
vars / `emits`, **no** top-level `statusMap`, **no** `chrome` block, **no** `master-detail`
layout, **no** page `home`/`scope`.

Your sample manifest is written against an **imagined v2 DSL**. None of that DSL parses today.
**Net consequence: your emitter must precompute every `# ⬅ DERIVED` field** (you already lean
this way) — it's not optional, because the runtime can't aggregate, filter-by-operator, or
interpolate. Bind the new widgets with the v0.1 contract documented below; drive selection
through **routes**, status through **per-widget `config.statuses`**, and emit denormalized
JSON **into the repo under `root: project`** so the watcher keeps SSE live.

| Sample assumes | Runtime reality (v0.1) | What you do |
|---|---|---|
| `schemaVersion: "2.0"` | `z.literal('0.1')` only (`manifest-schema.ts:296`) | keep `'0.1'` |
| `sources: { id: {path,schema} }` map | `dataSources: [ {id,path,format,…} ]` array | array form |
| `agg/where(ops)/of/ratio`, array-OR filters | `filter` = strict `===` (`WidgetRenderer.vue`) | **precompute** every count/ratio/bucket |
| `$scope/$param.x/$record.x/$selectedPhase` + `emits` | only `source.param` (route match) + `$parent.<field>` (slot filter) + `:token` links | **route-driven** selection |
| top-level `statusMap: {v: tone}` | per-widget `config.statuses: {v: {tone}}` | repeat per widget |
| `chrome: {commandPalette, help}` | hardcoded shell; not manifest-driven | not authorable yet |
| `layout: master-detail`, page `home/scope/param` | layouts `sections|grid|single`; page `default` only | `single`+`catalog`; route+projectId |
| `card:{}` / `fieldMap:` / `detail.sections:` DSL | `slots: {name: [bindings]}` + flat `xField` config | translate to real config |

---

## Q1 (CRITICAL) — data model

**Decision: emitter → denormalized `state/*.json`, written into the repo tree under
`root: project` (NOT the consumer dir).** This is a refinement of your lean (A) that keeps
live-refresh.

Why this exact shape:
- The reader **does** support flat JSON: `format: json` + `normalizeToRecords` accepts a
  **bare top-level array** of records (`data-source-reader.ts` `readJsonFile`/`normalizeToRecords`).
  So a denormalized `state/plans.json` works.
- **But live-refresh only fires for `root: 'project'` sources.** `classifyByManifests`
  (`watch-classify.ts`) skips any source whose root ancestor isn't `project` — only files
  inside a *watched project repo* are classified. A `root: 'consumer'` file
  (`~/.aideck/consumers/<id>/state/*.json`) is **read but never watched → no SSE re-render.**
  So your lean "(A) into the consumer dir" silently loses live-refresh. ❌
- Therefore: emit your JSON **into the repo**, e.g. `.atomic-skills/<consumer>/state/*.json`
  (git-trackable), declared as `root: project`. You then get all three: aiDeck strictly
  read-only (Iron Law ✓), full precompute (sidesteps the missing agg/expr engine — Q4/Q5),
  **and** SSE live-refresh (the watcher matches the glob). ✅
- Iron-Law check: aiDeck never writes these — *your* emitter writes them into *your* tree;
  aiDeck only reads. `canonical-data-pattern.md` says "YAML or Markdown," but the reader also
  ingests `json`/`jsonl`; an emitted, regenerable JSON projection is a legitimate canonical
  artifact of the skill. No violation.
- Option (B) read-in-place frontmatter also works and is live (your current v0.1 manifest
  proves it) — but you'd *still* precompute rollups into frontmatter, so (A′) is cleaner: one
  emitter pass → flat JSON → bind directly.

**So: build your emitter for option (A′).** Files live in the repo, `root: project`, bare
JSON arrays, every derived field precomputed.

## Q2 — schemaVersion / parallel

- Runtime validates **`schemaVersion: z.literal('0.1')`** (`manifest-schema.ts:296`). `"2.0"`
  **fails manifest validation** and the consumer won't load. There is **no** v2 manifest schema
  (even `api-v2.ts` still emits `schemaVersion: '0.1'`).
- **Keep `schemaVersion: '0.1'`.** The "v2 / v2.1" in "DS v2.1" is the **design-system / widget
  set**, not the manifest schema. New widgets are usable under the *same* `'0.1'` manifest — a
  widget is just a string key in `widgetMap`.
- v0.1 is **not** replaced and there's no parallel v2 schema. **Keep your existing v0.1
  `assets/aideck-consumer/manifest.yaml` live** — nothing forces a cutover. You can adopt the
  new widget keys incrementally inside it.

## Q3 — sources + JSON Schema

- **Not a map.** `dataSources: [ { id, path, format, schema?, root?, captures?, derivesFrom/explode/carry/parentKey } ]`
  (`manifest-schema.ts` `dataSourceSchema`). Keep the array.
- `format`: `yaml | frontmatter | json | jsonl`.
- **Record shape: emit a bare top-level JSON array.** `normalizeToRecords` turns an array →
  records, but a single object → **one** record — so an envelope `{ records: [...] }` collapses
  to a single bogus record. Bare array only.
- `schema:` in the manifest is an **inline JSON-Schema object** (`z.record(z.unknown())`), and
  it is **NOT enforced on the read/render path** — `readDataSource` never validates. So
  `schema: schemas/plan.json` (a path *string*) is **invalid** under v0.1, and even an inline
  schema isn't checked at fetch time.
- JSON-Schema validation **does** exist but **only** via the **`aideck validate` CLI**
  (`src/cli/validate.ts` → **Ajv**, draft-07 default, `strict:false`, validates each record
  against a `$ref` in a schema *file*). Use it as a pre-publish / CI gate in your emitter, not
  a runtime guarantee. **Recommendation:** omit manifest `schema:`; keep your `schemas/*.json`
  as files and run `aideck validate` in CI.

## Q4 — aggregation in the binding

**Not supported. The emitter must pre-derive every count/ratio/filtered aggregate as a plain
field.** `sourceBinding = { ref, filter, param }` (`manifest-schema.ts` `sourceBindingSchema`);
`filter` is applied as **strict equality** `r[k] === v` (`WidgetRenderer.vue` loadData).

- No `agg: count|ratio`, no `of:`, no operators (`gt/gte/lt/lte/ne`).
- ⚠️ **Array-OR filters don't work either:** `where: { status: [active, paused] }` compares
  `r.status === ['active','paused']` → never true → **silently zero rows.** Your sample uses
  array filters in ~8 places. Replace each with a precomputed boolean/bucket field (e.g.
  `liveFront: true`, or a single `bucket: "live"`).
- `where: { activeCount: { gt: 1 } }` → compares `=== {gt:1}` → never matches. Precompute
  `isParallel: true`.
- **Stats / Panorama totals:** emit a single-record source (e.g. `state/totals.json` =
  `[{ projetos:4, frentesAtivas:7, emParalelo:2, tasksTravadas:3 }]`) and bind one `stat`
  widget per field. (Check the exact `stat` config keys in `src/demo/consumer/manifest.yaml`,
  the canonical binding-vocabulary reference.)
- **Supported filters:** scalar equality (`{ projectId: "p", status: "active" }`), `source.param`
  route matching, and the `$parent.<field>` token inside a slot filter. That's the whole set.

## Q5 — reactive interpolation / emits

**Not supported.** There are **no** `$scope`, `$param.x`, `$record.x`, `$var`, `$selectedPhase`
tokens and **no** `emits.onSelect.set`. The only scoping/interpolation mechanisms
(`WidgetRenderer.vue`, `utils/link.ts`):
1. `source.param` — route-param **matching** (`"slug"` vs `r.id`/`r.slug`, or
   `{ match: [ {field, param} ] }`). It *filters by the current route*, it doesn't inject a value.
2. `filter` value token **`$parent.<field>`** — resolved against the parent record when a
   widget sits in a slot (§2b). **This is your `$record.x` → write `$parent.x`.**
3. `resolveRowLink` `:token` interpolation from a record, for `linkTo`.

⇒ **The plan-page "selectable stepper sets `selectedPhase`; container reads it" design does not
work as written.** Use **route-driven selection** (the v0.1-native equivalent):
- Make the selected phase a **route** (`/plan/:slug/:phaseId` or a query param). The vertical
  stepper rows are links (`config.linkTo`, interpolated by `resolveRowLink`); the detail
  `container` binds `source.param: { match: [ {field: phaseId, param: phaseId}, {field: planSlug, param: slug} ] }`.
  Changing the route re-filters the container — identical UX, no reactive var.
- **`record-switcher`:** my `RecordSwitcherWidget` already implements *selection = navigation*
  (renders `RouterLink`s, resolves "current" from `route.path`). Set `config.linkTo` to the plan
  route; drop `emits`.
- **`$scope` (page inherits project):** there is no page `scope`. Project scoping is realized at
  the **dataSource + route** layer — `root: project` sources resolved per `:projectId` via
  `/api/consumers/:id/projects/:projectId/data/:ds`. Filter children by `projectId` (a route
  param via `param.match`, or a precomputed field).

**[Henry to ratify]** Cross-widget reactive page vars + `emits` are a genuine v2 feature. For
v0.1, **route params are the state channel.**

## Q6 — statusMap

No top-level `statusMap`. Status→tone is **per-widget** `config.statuses` with shape
`{ <value>: { tone, label?, glyph? } }` (object-per-value), resolved by
`statusInfo(value, statuses)` (`utils/status.ts`). Tone set is exactly
**`success | warning | error | info | neutral`** ✓. You repeat `statuses:` on each
status-rendering widget (or template it in your manifest generator).

**[Henry to ratify]** A top-level `statusMap` threaded into every widget is a clean, low-risk v2
addition — say the word and I'll add it. For now: per-widget `config.statuses`.

## Q7 — chrome (command palette + help)

**Not manifest-driven.** `ChromeHeader.vue` has a hardcoded palette trigger (emits
`open-palette`) and a hardcoded `?` button (currently **no** click handler). `CommandPalette.vue`
exists as generic client chrome but isn't consumer-configurable; there is **no `chrome:` block**
in the manifest schema. The `?`-help → catalog-page action is exactly the item I **deferred** in
the DS v2.1 pass. **Don't author a `chrome:` block — it's ignored/invalid.** The trust signal
(127.0.0.1, zero telemetry) is already shown by the shell.

**[Henry to ratify]** Manifest-driven `chrome` (palette search sources + `?`→catalog) is a
focused follow-up; the runtime would own the palette-search schema once built.

## Q8 — layouts + page props

Layouts are a discriminated union on `layout` ∈ **`sections | grid | single`** only
(`manifest-schema.ts` `pageSchema`). Page fields: `slug, title, layout, icon, default, route`
(+ layout-specifics). **No** `master-detail`, **no** `home`, **no** page-level `scope`/`param`.
- `master-detail` → **`layout: single` + `widget: catalog`.** My `CatalogWidget` fills the
  single-layout height and *is* the master-detail surface internally — that's how I built it. ✓
- `home: true` → **`default: true`** (the page shown with no specific route).
- `scope: project` → not a page prop; comes from `root: project` sources + `:projectId` route.
- page `param: { match: [slug] }` → put it on the **widget's `source`**, not the page.

## Q9 — slots/presets + inline column widget

- **Slots resolve as `slots: Record<string, WidgetBinding[]>`** — a named slot → an ordered list
  of **child widget bindings**, rendered in the host with the host record as `$parent` (§2b).
  So **record-card / record-detail are consumer-authored compositions, not a `card:{}` DSL.**
  My host widgets read these slot names: **`card` / `collection-grid` → `header` / `body` /
  `footer`**; `phase-timeline` → `item-extra`/`phase-extra`. There is **no** baked
  `stepper:`/`progress:`/`tasks:`/`gates:` slot convention — map the sample's
  `slots: { stepper, progress, callout }` onto:
  ```yaml
  widget: card
  slots:
    header: [ { widget: <whatever>, config: {…} } ]
    body:   [ { widget: stepper,       source: {…}, config: {…} },
              { widget: progress-bar,  config: { valueText: …, caption: … } },
              { widget: callout,       config: { eyebrow: "PRÓXIMA AÇÃO", bodyField: nextText, tone: info } } ]
    footer: [ { widget: <whatever>, config: {…} } ]
  ```
  For **`record-detail`**, use a `container`/`card` host with `body` slots (callout + metrics +
  a `status-list` for tasks + a `status-list variant:checklist` for gates).
- **`collection-grid`** does **not** read the sample's `card:{title,badge,metrics,nested,overflow}`
  block. Real config: `minColWidth`, `titleField`, `subtitleField`, `fields`, `linkTo`,
  `badgeField`/`badgeToneField`, `attention: { when, gt|eq, tone }`, `live: { when }`, and the
  per-card body via `slots.body` (+`header`/`footer`). `nested`/`overflow` aren't built —
  compose a nested mini-list as a child widget in `body`, or precompute an overflow text field.
- **Inline column widget: YES** — via **`slots["cell:<columnId>"]`** on a `table`
  (`TableWidget.vue:29` renders `cell:<col>` bindings per row, row = `$parent`). Your
  `{ field: phasesStepper, render: stepper, dense: true }` becomes:
  ```yaml
  widget: table
  config: { columns: [title, status, currentPhaseText, phasesStepper, nextText, updatedRel] }
  slots:
    cell:phasesStepper: [ { widget: stepper, source: { ref: phases, param: {…} }, config: { variant: dense } } ]
  ```
  (Keep the column in `config.columns`; the cell slot overrides its rendering.)

## Q10 — provisioning

The runtime keys **consumers by `manifest.id`** (`consumer-registry.ts` scans
`~/.aideck/consumers/<dir>/manifest.yaml`). **Projects are a separate registry** keyed by
`projectId` (`project-registry.ts`). A consumer's `root: project` sources resolve per-project
via `/api/consumers/:id/projects/:projectId/data/:ds`.

⇒ **Provision ONE consumer, not one-per-projectId.** Keep **`id` + `mcpNamespace` + `title`**
(all **required**; `id` ≤64, `mcpNamespace` `[a-z][a-z0-9_]{0,31}`). The sample's bare
`name: project-tracker` (no `id`/`mcpNamespace`/`title`) is **invalid** under v0.1 — it won't
load. **Register each repo as a *project*** (existing project-registration flow); the dashboard
scopes by the `:projectId` route param. This is exactly the model in `atomic-skills-manifest.md`
(one `project-status` consumer, `root: project`, N projects). If `provision-consumer.js` today
stamps a consumer per projectId, **collapse it to one consumer + project registration.**

## Q11 — catalog record shape

My `CatalogWidget` does **not** read the sample's `fieldMap` + `detail.sections` DSL — it reads
**flat `*Field` config keys** (neutral defaults), and a detail section renders iff its field is
present:
- header/master: `idField`('id'), `iconField`('icon'), `oneLinerField`('oneLiner'),
  `facetsField`('facets', `string[]`).
- detail: `summaryField`('summary'); `examplesField`('examples', `string[]`);
  `prosField`('pros')/`consField`('cons') (`string[]`); `subItemsField`('subItems', array of
  `{name,description,group}` with `subItemNameField`/`subItemDescField`/`subItemGroupField`
  overrides); `fieldsField`('fields', array of `{name,kind,required,description}`);
  `depsField`('deps')/`outputsField`('outputs') (`string[]`); `refsField`('refs', `string[]`,
  clickable, matched against `idField` → the graph).
- **Gaps vs your sample:** no separate `title`/`versionAdded` rendering (master row + detail
  header show `id`), no `identifier.prefix` (bake `/atomic-skills:` into your `id` values), no
  custom `prosCons.labels`. Emit `meta/catalog.json` as a **bare array** mapped to these keys.

**[Henry to ratify — cheap]** If you need `title ≠ id` and a `version` line, that's a tiny
`titleField`/`versionField` addition to `CatalogWidget` — tell me and I'll add it.

## Q12 — new-widget availability

**Built, registered, and tested** (compile + mount + behavior, 699/699 on `feat/ds-v2.1-widgets`):
`stepper` · `status-list` · `callout` (enh: `eyebrow` + direct `tone`) · `collection-grid` ·
`record-switcher` · `catalog` · `headline-banner` · `progress-bar` (enh: `tone`/`valueText`/
`caption`/`segmented`). `card` is already a slot host. **Deferred (not built):** the `header-nav`
command-palette **`?`-help** action (chrome).

Two caveats while you author:
1. **"Built" = the component exists and consumes the v0.1 binding contract** (flat `*Field`
   config + `slots` as binding lists + `source.param/filter`) — **not** the sample DSL
   (`fieldMap`, `card:{}`, `count:{agg}`, `lanes:{perRecord}`, `emits`). They render only when
   bound per *this* doc.
2. Unknown widget keys render a visible **"Unknown widget: <key>"** placeholder (not `null`) —
   `WidgetRenderer.vue` — so typos are obvious while authoring. New keys in `widgetMap`:
   `stepper, status-list, catalog, collection-grid, record-switcher, headline-banner` (+ existing
   `callout, progress-bar, card, phase-timeline`).

---

## Noted — stepper alias

Confirmed and done: **`stepper` now maps to the new `StepperWidget`** (key kept, **not** renamed
to `steps`); `phase-timeline` retained for the exploded phase cards. Your 3 `stepper` bindings
and the existing `phase-timeline` both resolve. ✓ (Recorded in `docs/decisions.md`, 2026-06-16.)

---

## The real v2 manifest — scope flag **[Henry to ratify]**

To run your sample manifest **as written**, the runtime needs a **v2 manifest schema + binding
engine**: `sources:` map + `schemaVersion '2.0'`; top-level `statusMap`; `agg/where/of` +
operators + array-OR filters; reactive page vars + `emits`; a `chrome:` block (manifest-driven
palette/help); `master-detail` layout + page `home/scope/param`; and the high-level
`card:`/`fieldMap:`/`detail.sections:` authoring DSL. **None of this is in v0.1**, and much of it
overlaps the explicit "Out of v0.1" list (custom consumer registration, mutation UI).

**Recommendation:** ship now against the v0.1 contract with an emitter that precomputes
everything (unblocks you **today**); treat the v2 manifest DSL as a deliberately-scoped runtime
epic. If greenlit, I'll spec it as R1–R7 and sequence it. — *aiDeck runtime side*
