# Handoff → atomic-skills: aiDeck v0.1 engine extensions + migration contracts

**From:** the aiDeck runtime agent (`/home/henry/aideck`), 2026-06-17.
**To:** the atomic-skills agent (consumer side).
**Status of the aiDeck side:** **implemented, tested, on branch `feat/ds-v2.1-widgets`.**
**753 tests pass**, `tsc --noEmit` clean, `vite build` green.

This is the contract for moving atomic-skills off its legacy/workaround manifest onto the new
aiDeck capabilities. Everything below is **live in the runtime now** — you implement your side
(manifest + data files) against these contracts and it will render.

## Headline decisions (so we don't re-litigate)

1. **No `schemaVersion` bump. Stay `schemaVersion: '0.1'`.** Every capability here is an *additive,
   optional* field. Do **not** send `schemaVersion: "2.0"` — the parser refuses it (Iron Law #3).
2. **Keep `dataSources:` as an array.** The `sources:` *map* form from the design sample is NOT
   adopted (cosmetic; not worth a breaking change). Your existing `dataSources` array is correct.
3. **No domain-named widgets.** `front-card`, `project-grid`, `parallelism-banner`, `skill-catalog`,
   `plan-picker`, etc. are **not** built and won't be. Use the generic widgets (`stat`, `card`,
   `collection-grid`, `catalog`, `headline-banner`, `record-switcher`, `stepper`, `status-list`,
   `progress`, `table`) + config. aiDeck core carries no domain vocabulary.
4. **aiDeck now computes aggregations at read time** (`agg`/`where`/`of`). You may therefore
   **delete the precomputed count/ratio fields from your emitter** for anything expressible below
   (you can keep them; they just become unnecessary). True per-record derived fields you still
   emit (see §"What you still emit").

---

## A. What shipped — manifest grammar reference (all optional, additive)

### A1. `nav` — sidebar page navigation
```yaml
nav:
  style: sidebar        # 'tabs' (default) | 'sidebar'
  showIcons: true       # default false
```
- `style: sidebar` → the active consumer's pages render **nested in the left Sidebar**; the in-page
  tab bar is suppressed. `tabs` (or omitted) keeps today's tab bar.
- `showIcons: true` → page `icon`s render in the sidebar/tab rows.

**Landing page (the G4 decision in practice).** Mark a page `default: true`:
```yaml
pages:
  - slug: panorama
    title: Panorama
    default: true        # the landing
```
- The consumer root `/:consumerId` renders this page automatically (reached from the home grid, or
  by clicking the consumer name in the sidebar). No click needed to land on it.
- Under `nav.style: sidebar`, the landing page is **pinned to the top** of the page list regardless
  of its position in the `pages:` array, and its row reads **active at the consumer root** (you don't
  have to navigate to `/:consumerId/panorama` for it to highlight).
- This is a **per-consumer** landing — NOT the cross-project bird's-eye Panorama from the original
  design (that remains deferred, §C). If your `panorama` is meant to be per-project, this is exactly
  it; if you wanted cross-project aggregation across consumers, that's the deferred piece.

### A2. Page `icon` + `route`
```yaml
pages:
  - slug: foco
    title: Foco
    icon: "🎯"          # SEE NOTE — use an emoji/glyph, not "mdi:target"
    route: /custom/path # optional; overrides the default /:consumerId/:slug link target
```
- **Icon note (important for you):** aiDeck ships **no icon font**, so a token like `mdi:target`
  degrades to a neutral `◆`. To get a *visible* icon today, supply a literal **emoji or glyph**
  (`🎯`, `◉`, `▦`). Your current manifest uses `mdi:*` everywhere — those will all show `◆`.
  Switch the ones you want visible to emoji, or leave `showIcons` off. (An icon font is a possible
  future aiDeck task; not now.)

### A3. `help` — chrome `?` button
```yaml
help: ajuda             # the slug of an existing page
pages:
  - slug: ajuda
    title: Ajuda
    layout: single
    widget: catalog
    source: { ref: skills }
    config: { ... }       # your master-detail catalog config
```
- The chrome `?` opens this page and reads active while on it. The button is **hidden** if `help`
  is unset. `help` **must** name a declared page slug, or the manifest fails to parse (no dead
  button). With `nav.style: sidebar`, drop the help page from the normal nav flow — `?` reaches it.

### A4. `statusMap` — your status words → DS tones (declare once)
```yaml
statusMap:
  active:   info
  pending:  neutral
  paused:   warning
  blocked:  error
  done:     success
  archived: neutral
  met:      success
  deferred: warning
```
- A value is a bare tone (`active: info`) **or** a full triple (`blocked: { tone: error, label: travado, glyph: "⚑" }`).
- This is the **per-widget default** for every status-rendering widget on the page. You can **delete
  the repeated `config.statuses` blocks** from individual widgets — a widget's own `config.statuses`
  still wins per-key if you keep it.

### A5. Source aggregation — `agg` / `where` / `of` (runtime-computed)
On any widget `source` binding:
```yaml
source:
  ref: plans
  filter: { ... }        # existing: scopes the records the WIDGET receives (now array-aware, see A6)
  agg: count             # count | ratio | sum
  where: { status: active }   # scopes WHICH records the AGGREGATE counts (independent of `filter`)
  of: status==done       # ratio numerator predicate, OR (for sum) the numeric field name
  ratioFormat: percent   # percent (default) | fraction | raw
```
**`where` clause grammar** (multiple fields are ANDed):
| form | meaning |
|---|---|
| `status: active` | equality (string-coerced) |
| `blocked: true` | boolean equality |
| `blockedBy: "*"` | field exists & non-empty |
| `n: { gt: 1 }` | `gt` / `gte` / `lt` / `lte` (numeric) |
| `s: { in: [active, paused] }` | membership |
| `s: { ne: done }` | not-equal |
| `f: { exists: false }` | field absent/empty |

**`agg` semantics** (over records matching `where`; if `where` omitted, over the filtered set):
- `count` → number of matching records.
- `sum` → Σ `record[of]` (numeric) over matching records (`of` = field name).
- `ratio` → `count(matching AND of) / count(matching)`. `of` is a predicate: `"field==value"`,
  `"field!=value"`, or `"field"` (truthy).

**Delivery (what the widget sees):** the widget still receives its records (so `headline-banner`
lanes / `table` rows keep working). The scalar is injected into the widget config:
- `config.value` ← the formatted aggregate (count/sum number, or ratio per `ratioFormat`).
  An author-set `config.value` wins, so don't set it if you want the aggregate.
- `config.aggCount`, `config.aggTotal`, `config.aggRatio` ← raw numbers, for custom display.

`stat` renders `config.value` directly. For `headline-banner`, set the count via `source.agg`
(the injected `value`) and the lanes via `filter` + the lane fields.

> **Use the `source.agg` form, not a `count: {agg}` object inside `config`.** The design sample
> wrote `count: { agg, where }` on `headline-banner`; the runtime contract is the uniform
> `source: { agg, where }` instead — it works for every widget.

### A6. Array filters (now supported)
`filter` (the widget's record scope) now accepts an **array = membership**:
```yaml
filter: { status: [active, paused] }    # keeps records whose status is active OR paused
```
A scalar value is still strict equality (no behavior change for existing manifests).

### A7. `fieldMap` — role→field sugar (on a widget binding)
```yaml
- widget: collection-grid
  fieldMap:
    title: name           # → titleField: name
    subtitle: oneLiner     # → subtitleField: oneLiner
    badge: status          # → badgeField: status
  source: { ref: projects }
```
- Expands `{ <role>: <field> }` to the flat `config.<role>Field` keys widgets already read. An
  explicit `config.<role>Field` wins. Pure sugar — use it or keep writing `*Field` keys directly;
  both work. Roles = any `<role>Field` a widget reads (`title`, `subtitle`, `status`, `badge`,
  `value`, `label`, `message`, `timestamp`, `tags`, `link`, `metric`, `x`, `y`, … see the widget).

### A8. `repeat: { ref }` — collection fan-out
```yaml
- widget: card
  repeat: { ref: plans, filter: { status: active } }   # one card per active plan
  config: { titleField: title, ... }
  slots:
    body: [ { widget: progress, source: { ref: tasks, filter: { planSlug: "$parent.slug" } } } ]
```
- Renders **one widget instance per record** of `ref` (with `filter`/`param` applied). Each instance
  receives that record as its source; **per-instance nested data goes through `slots`**, which fetch
  independently and resolve `$parent.<field>` against the repeat record.
- The **string** form (`repeat: status`) is unchanged: it groups the widget's own records by a field.

### A9. `commandPalette.records` — ⌘K over your records
```yaml
commandPalette:
  records:
    - ref: plans
      titleField: title            # default 'title'
      subtitleField: branch        # optional
      route: /:consumerId/plano/:slug   # :consumerId + :field tokens resolved per record
```
- The runtime ⌘K palette indexes these records (titled by `titleField`, navigating to the resolved
  `route`). Records appear **above** pages in results. Chrome feature — declared once, no widget.

### A10. `progress` alias
`widget: progress` now renders the progress bar (was "Unknown widget"; only `progress-bar` worked).

### A11. `emits` / page-state bus — cross-widget selection (same page, no navigation)
Selecting an item in one widget re-scopes another on the **same page**, without a route change.
```yaml
# Emitter — a selectable stepper writes the chosen step id to page state:
- widget: stepper
  source: { ref: phases }
  config: { selectable: true, orientation: vertical, currentField: current }
  emits: { select: { set: selectedPhase } }   # selecting writes pageState.selectedPhase

# Reader — a widget whose source reads that state key re-scopes reactively:
- widget: table
  source:
    ref: initiatives
    param: { match: [ { field: phaseId, state: selectedPhase } ] }   # phaseId === pageState.selectedPhase
```
- `emits: { select: { set: <key>, value?: <field> } }` — on the widget's `select` event, write
  `pageState[key]`. The payload is the selected id by default; `value: <field>` writes that field of
  the selected record instead.
- `source.param.match` entries now accept **`{ field, state }`** (read page state) alongside the
  existing `{ field, param }` (read a route param) and bare-string forms.
- **Defaults:** a `selectable` **`stepper`** emits its **current** step on load, so the reader shows
  the current item before any click. If a state key is unset, the reader's `{ field, state }` clause
  is **skipped** (it shows all records) — the bus degrades gracefully.
- **Scope/lifetime:** page state is reset on every navigation (per consumer + page); it is ephemeral
  UI state, never canonical data. Today the wired **emitter is `stepper`** (the DS's phase-select →
  focus interaction); other widgets keep using route-links / drill-down `param` for selection and can
  adopt `@select` later with no contract change.

### A12. Cross-project read — `source.scope: all-projects` (the Panorama unlock)
Read a **project-scoped** dataSource across **all** registered projects at once, merged, with every
record tagged `projectId`. This is the cross-project overview primitive (your Panorama).
```yaml
# Per-project today (the project selector scopes to ONE project):
source: { ref: plans }                       # scope: project (default)

# Cross-project (every project at once, each record carries projectId):
source: { ref: plans, scope: all-projects }
```
- Only meaningful for a **`root: project`** dataSource (the per-repo `.atomic-skills/...` tree). A
  `root: consumer` source ignores it (read once). A project that lacks the collection is **skipped**,
  not an error — one sparse project never breaks the view.
- Each merged record gains a **`projectId`** field (the registered project id). Group/aggregate on it.
- **Composes with the rest of the engine** — this is how you build the Panorama with no new widgets:
  - **Cross-project totals strip:** `stat` with `source: { ref: plans, scope: all-projects, agg: count, where: { status: active } }` → "FRENTES ATIVAS" across all projects.
  - **Per-project sections/cards:** a widget with `source: { ref: plans, scope: all-projects }` + the
    string `repeat: projectId` (group-by) → one group per project, each listing its live fronts.
  - **One project's slice:** `where: { projectId: <id> }` or `filter: { projectId: <id> }`.
- Make the Panorama your **landing**: `default: true` on that page (§A1) → it shows at `/:consumerId`
  and pins to the top of the sidebar.

---

## B. What atomic-skills must do on its side

### B1. Re-author the manifest (recommended — it's a net simplification)
Concretely, you can now:
- Set `nav: { style: sidebar, showIcons: true }` and `help: <your ajuda slug>`; drop help from the
  tab flow.
- Add the top-level `statusMap` (§A4) and **delete the per-widget `config.statuses`** repetition.
- Replace precomputed counts with `source: { agg, where, of }` on every `stat`/banner (§A5). E.g.
  the "FRENTES ATIVAS" stat becomes `source: { ref: plans, agg: count, where: { status: active } }`
  — no emitter field needed.
- Use `filter: { status: [active, paused] }` array membership instead of pre-filtered files (§A6).
- Use `repeat: { ref: plans, filter: {...} }` for the per-plan card fan-out (§A8).
- Optionally adopt `fieldMap` (§A7) where it reads cleaner.
- Add `commandPalette.records` (§A9) for your plans/initiatives.
- Switch any page `icon` you want **visible** from `mdi:*` to an emoji/glyph (§A2).
- **Build the cross-project Panorama** (§A12): a `default: true` landing page whose widgets use
  `source: { …, scope: all-projects }` — a cross-project totals strip via `agg`, and per-project
  sections via `repeat: projectId`. This is the bird's-eye over all your projects at once, with no
  new widgets and nothing precomputed in the emitter.

### B2. What you STILL emit (aiDeck does NOT compute these)
aiDeck only aggregates (count/ratio/sum) and filters. It does **not** join, walk relationships, or
compute per-record derived scalars. You still write these into your data files via your emitter:
- **Per-record rollups** that aren't a single-collection aggregate: e.g. a plan's
  `tasksDone`/`tasksTotal`, `currentPhase`, `gatesMet`/`gatesTotal`, `activeCount` (active fronts on
  a project), `parallelismAllowed`, `lastUpdated`, `nextAction`.
- **Cross-collection / relationship fields** (phase→initiative 1:1 via `phaseId`, `blockedBy`
  targets, `dependsOn`). aiDeck has no join engine.
- **Boolean flags you filter/aggregate on** that come from a relationship, e.g. `blocked: true`
  (a task is blocked because something else is) — emit the flag; aiDeck counts it.
- Stable **`id`/`slug`** on every record (used by `param` drill-down, `repeat` keys, palette routes).

Rule of thumb: **if it's `count`/`ratio`/`sum` over one collection with a `where`, aiDeck does it
now — delete it from the emitter. If it requires looking at another record or the tree, you emit it.**

### B3. Data source shape (unchanged, but restated)
- Files stay canonical under `.atomic-skills/<...>` / the consumer dir; aiDeck only reads. Your
  glob `captures` + derived `explode`/`carry` dataSources (already in the 0.1 schema) are how you
  flatten the project tree — keep using them.
- Each collection a widget binds must be a declared `dataSource` (array entry) with `id`, `path`,
  `format`. Project-scoped reads keep `root: project`.

---

## C. Still deferred (NOT implemented — do not design against these yet)

- **Rich `chrome:` block** (`trustSignal`/nested `commandPalette`/`help`). The top-level `help:` and
  `commandPalette:` above are the supported forms; the trust signal stays runtime-rendered.
- **Icon font for `mdi:*` tokens** (see §A2 — use emoji/glyph meanwhile).

---

## D. Verification handle

When you publish an updated manifest, validate it before relying on it:
- `aideck validate` (CLI) / the parser reports `invalid_input` with a path on any bad field.
- A dangling `help` slug, unknown `agg`/tone, or bad `nav.style` are now hard parse errors — you'll
  get a message, not a silent drop.

Questions on any contract above → ask the aiDeck side; we'll clarify or adjust the grammar before
you build against it.
