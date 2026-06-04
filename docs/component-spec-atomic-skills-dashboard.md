# aiDeck component spec — atomic-skills project-status dashboard

**Audience:** the aiDeck implementer (this repo). **Author:** atomic-skills consumer side.
**Date:** 2026-06-03. **Branch:** `feat/aideck-v2-generic-runtime`.
**Companion docs:** `docs/integration-spec.md`, `docs/ui-layouts.md`, `docs/data-format.md`;
atomic-skills `docs/design/project-orchestrator/15-aideck-dashboard-port-plan.md` (the port plan).

## 0. Why this doc exists

The atomic-skills `project-status` skill reconnected to the rebuilt generic aiDeck as a
Model-B consumer (manifest + handlers, read-in-place). The read/mutation plane works
end-to-end. But the **dashboard** is currently an MVP: a single `table` widget bound to the
raw `plans` dataSource, which dumps every frontmatter field — including `phases` (an ~8 KB
JSON array) and `_body` (raw markdown) — as columns. It is unusable.

The old atomic-skills dashboard (a bespoke React SPA, now retired) offered real insight:
per-plan **phase timelines** with progress + gate meters, an interactive **dependency DAG**,
a **stack** view, **exit-gate** status, **task lists** with blockers, **parked/emerged**
tracking, and a **discover** triage surface. This doc specifies the **generic aiDeck
capabilities and widgets** needed to recreate that insight through the manifest — so aiDeck
stays domain-agnostic and atomic-skills (and any future consumer) gets the components by
declaration.

Two things are being asked of aiDeck:
1. **Three cross-cutting capabilities** (§2): array-explode projection, **widget composition
   / nesting** (the headline ask — render a widget inside another, e.g. a line-chart in a
   card header), and per-record drill-down (scoped param + dynamic link).
2. **A set of new widgets** (§4) plus small extensions to existing ones (§3).

Everything is generic. The atomic-skills data is used only for concrete examples.

---

## 1. The data the dashboard consumes (so examples are concrete)

The consumer exposes five `root: 'project'` dataSources (read-in-place from the repo). aiDeck
injects the glob captures (`projectId`, `planSlug`, `phaseFile`) and `_body`/`_file` onto every
record. The two load-bearing shapes:

### 1a. `plans` — one record per `plan.md` (a plan owns a `phases[]` array)
```jsonc
{
  "schemaVersion": "0.2",
  "slug": "project-orchestrator-redesign",
  "title": "Redesign project skill into a lifecycle orchestrator",
  "status": "active",                       // active | paused | done | archived
  "started": "2026-06-01T00:00:00Z",
  "lastUpdated": "2026-06-03T00:00:00Z",
  "branch": "dogfood/self-host-migration",
  "currentPhase": "F5",
  "parallelismAllowed": false,
  "phases": [                                // NESTED ARRAY — needs explode (§2a)
    { "id": "F5", "slug": "inc7-aideck-prose-long-tail",
      "title": "Inc7 — aiDeck consumer-side + prose/schema long tail",
      "goal": "…", "dependsOn": ["F2"], "subPhaseCount": 0, "status": "active",
      "exitGate": { "summary": "…", "criteria": [ /* … */ ] } }
    /* … F0…F6 … */
  ],
  "_body": "# Redesign project skill…\n\n## Status…",   // markdown narrative
  "projectId": "atomic-skills",              // injected capture
  "planSlug": "project-orchestrator-redesign"
}
```

### 1b. `initiatives` — one record per phase file (`phases/<file>.md`); owns `tasks[]`, `exitGates[]`, `stack[]`, `parked[]`, `emerged[]`
```jsonc
{
  "slug": "inc7-aideck-prose-long-tail",
  "title": "Inc7 — aiDeck consumer-side (Model-B) + prose/schema long tail",
  "goal": "Reconnect the project skill to the rebuilt generic aiDeck…",
  "status": "active",
  "nextAction": "T-004 — publish @henryavila/aideck off 0.0.1 + repoint resolveAideckBin",
  "parentPlan": "project-orchestrator-redesign",
  "phaseId": "F5",
  "exitGates": [                             // NESTED ARRAY
    { "id": "F5-G1", "description": "…", "status": "pending",   // met | pending | deferred
      "verifier": { "kind": "manual", "runner": "npx vitest run", "pattern": "-t 'register'" },
      "evidence": { "verifierKind": "test", "verifiedAt": "2026-06-01T18:34:18Z",
                    "passed": true, "testsCollected": 44,
                    "outputSummary": "44 test(s) passed (exit 0)…" },
      "deferredReason": null } ],
  "tasks": [                                 // NESTED ARRAY
    { "id": "T-001", "title": "Phase A — aiDeck read-in-place capability", "status": "done",
      "description": "…", "lastUpdated": "2026-06-02T00:00:00Z", "closedAt": "2026-06-02T00:00:00Z",
      "blockedBy": [] },
    { "id": "T-004", "title": "Phase D — npm publish + repoint", "status": "pending",
      "blockedBy": ["T-002","T-003"] } ],
  "stack": [],                               // NESTED ARRAY: [{id,title,kind,opened_at}]
  "parked": [],                              // NESTED ARRAY
  "emerged": [                               // NESTED ARRAY
    { "title": "aiDeck rebuilt generic → Model-B consumer", "surfacedAt": "2026-06-02T00:00:00Z",
      "promoted": true, "context": { "solves": "…", "trigger": "…",
        "assumesStillValid": ["…"], "ratifiedAt": "2026-06-03T00:00:00Z", "ratifiedBy": "human",
        "lastReviewedAt": "2026-06-03T00:00:00Z" } } ],
  "_body": "# Inc7 — aiDeck consumer-side…",
  "projectId": "atomic-skills", "planSlug": "project-orchestrator-redesign",
  "phaseFile": "f5-inc7-aideck-prose-long-tail"
}
```

Plus `discover` (a `discover-run.json` with `candidates[]`, `relationships[]`,
`alreadyTracked[]`, `orphanSignals[]`) and `inbox` (mutation-intent JSONL). Both are declared
but unused today.

**The structural problem in one sentence:** every insight beyond a flat list lives inside a
**nested array** (`phases`, `tasks`, `exitGates`, `stack`, `parked`, `emerged`, `candidates`),
and aiDeck's `data-source-reader.ts` returns records as-is — there is no way to turn those
arrays into the per-row records the widgets need. That is capability §2a.

---

## 2. Cross-cutting capabilities (NOT widgets)

### 2a. Array-explode projection  `[effort: L]`  — the structural enabler
**Problem:** `readDataSource` (`src/server/data-source-reader.ts`) returns one record per file.
Nested arrays can't be rendered as rows/cards/timelines.

**Proposal:** add an optional `projection` to a dataSource declaration in
`src/server/manifest-schema.ts` that explodes a nested array field into one record per element,
carrying the parent's scalars + captures down onto each child record.

```yaml
# manifest.yaml — derived dataSources via explode
dataSources:
  - id: phases                       # one row per plan.phases[] element
    derivesFrom: plans
    explode: phases                  # the array field to flatten
    carry: [projectId, planSlug, title, currentPhase]   # parent scalars copied onto each row
  - id: tasks
    derivesFrom: initiatives
    explode: tasks
    carry: [projectId, planSlug, slug, phaseId, nextAction]   # slug = the phase/initiative slug
  - id: exit_gates
    derivesFrom: initiatives
    explode: exitGates
    carry: [projectId, planSlug, slug, phaseId]
  - id: stack_frames     { derivesFrom: initiatives, explode: stack,   carry: [projectId, slug] }
  - id: parked_items     { derivesFrom: initiatives, explode: parked,  carry: [projectId, slug] }
  - id: emerged_items    { derivesFrom: initiatives, explode: emerged, carry: [projectId, slug] }
```

Semantics: a child record = `{ ...carriedParentScalars, ...arrayElement, _parentId: <parent slug> }`.
A `_index` field gives stable ordering. Explosion runs server-side in `readDataSource` after
file read + capture injection, so the project-scoped endpoints
(`/api/consumers/:id/projects/:projectId/data/:ds`) serve exploded rows transparently.

**Derived/computed fields (rollups)** `[decision]` — meters like `tasks done/total` and
`gates met/total` need a count. **Decision taken in the port plan:** the *skill* precomputes
these rollups into the phase frontmatter (`tasksDone`, `tasksTotal`, `gatesMet`, `gatesTotal`,
`staleDays`) so aiDeck stays read-in-place. aiDeck does **not** need a compute engine — but if
a generic `compute:` transform is cheap to add alongside `explode`, it is welcome (optional).
The widgets below assume these scalar rollup fields exist on the record.

### 2b. Widget composition / nesting  `[effort: M]`  — the headline ask
**Goal:** render a widget inside another widget's named slot — e.g. a `line-chart` in a card's
**header**, a `progress-bar` inside a **kanban card**, a `sparkline` inside a **table cell**, a
`callout` inside a **phase-timeline** row. Today only `container`/`grid-columns` have Vue
`<slot>`s and `tabs` carries an unused `tabs[].widgets` field (`TabsWidget.vue:46`) — nesting
was planned but never wired. `WidgetRenderer.vue:66-94` is a clean string→component dispatch;
`:23` already passes `sourceData` down — the natural seam.

**Schema change** (`manifest-schema.ts`, one new optional field on the widget binding):
```ts
// widgetBindingSchema (manifest-schema.ts:55-75) gains:
slots?: Record<string, WidgetBinding[]>   // named slot -> ordered child widget bindings
```

**Data scoping for a nested widget** — two modes:
1. **Inherit the parent record (source-less child).** A child with no `source.ref` renders
   against the parent widget's *current record* (the row / card / item / timeline-phase it sits
   in). This is the common case: a `progress-bar` in a kanban card binds to that card's record.
2. **Own source with `$parent` binding.** A child *with* `source.ref` runs its own dataSource,
   and its `source.filter` may reference parent fields via `$parent.<field>` tokens — e.g. a
   `sparkline` in a task row filtered by `{ taskId: "$parent.id" }`.

**Renderer changes** (`WidgetRenderer.vue`, ~20 lines + one new component):
- Accept `parentRecord?` and `depth = 0` props; resolve `$parent.*` tokens in `source.filter`
  against `parentRecord`; when a child has no `source.ref`, use `[parentRecord]` as its data.
- New trivial `WidgetSlot.vue` wrapper: given `{ binding, parentRecord, depth }`, dispatches
  back through `WidgetRenderer` (recursion). **Guard: max depth 8** → render a muted
  `slot too deep` notice beyond it.
- Backward compatible: `slots` is optional; a widget that doesn't read a given slot ignores it.

**Slot vocabulary per host widget** (widgets that gain slots):

| Host widget | Slots it exposes | Record in scope for the slot |
|-------------|------------------|------------------------------|
| `card` / `card-grid` | `header`, `media`, `body`, `footer` | the card's record |
| `table` | `cell:<columnId>` (per-column cell renderer) | the row record |
| `list` | `item`, `lead`, `tail` | the item record |
| `kanban-board` | `card` (card-body overlay) | the card record |
| `tabs` | `panel:<tabId>` (replaces the unused `widgets` field) | the tab's filtered source |
| `accordion` | `panel:<sectionId>` | the section record |
| `container` / `grid-columns` | `children` (already slotted — formalize via `slots.children`) | page/source scope |
| `stat` | `trend` (e.g. a sparkline under the number) | the stat's source |
| `phase-timeline` (new) | `phase-extra` (per-phase footer) | the phase record |

**Example — line-chart in a card header (the user's example):**
```yaml
- widget: card
  source: { ref: plans }
  config: { titleField: title, subtitleField: status }
  slots:
    header:
      - widget: line-chart           # source-less → inherits each card's plan record…
        config: { xField: week, yField: velocity, area: true, height: 48 }
        # …but a plan record has no velocity series, so in practice use $parent:
    footer:
      - widget: stat
        config: { label: "Phase", value: "field(currentPhase)" }   # source-less, parent record
```

**Example — progress-bar overlay in each kanban card:**
```yaml
- widget: kanban-board
  source: { ref: phases }            # exploded per-phase rows (§2a)
  config: { statusField: status, titleField: title, columns: [pending, active, done] }
  slots:
    card:
      - widget: progress-bar
        config: { pct: true, valueField: tasksDone, maxField: tasksTotal }   # parent (card) record
```

**Example — sparkline cell + drill-down link in a table:**
```yaml
- widget: table
  source: { ref: tasks }
  config: { columns: [id, title, status, activity] }
  slots:
    "cell:activity":
      - widget: sparkline
        source: { ref: task_activity, filter: { taskId: "$parent.id" } }   # own source + $parent
        config: { xField: date, yField: count, height: 24 }
```

### 2c. Per-record drill-down  `[effort: M]`
Detail pages use the route `/:consumerId/:pageSlug/:routeParam` + `source.param`. Two gaps:
1. **`param` matches `r.id===v || r.slug===v` only** (`WidgetRenderer.vue:172-175`). Plans and
   phases share slugs across `projects/<id>/`, so multi-project repos collide (the F-001 issue).
   → support a **composite / `projectId`-scoped param** (the route already carries `:projectId`
   via the project-scoped API). Proposal: `source: { param: { match: [projectId, slug] } }`.
2. **`linkTo` is a static page slug** (`CardWidget.vue:16`, `TableWidget.vue:95-99`) — every
   row links to the same page. → support a **row-scoped link** that interpolates the record:
   `linkTo: "/plan/:projectId/:slug"`.

### 2d. SSE live-refresh for nested paths  `[effort: M]`
`classifyFile` (`src/server/writers/paths.ts`) recognizes `<consumer>/<entityDir>/<file>` and
flat `<entityDir>/<file>` but not the nested `.atomic-skills/projects/<id>/<slug>/…` layout, so
edits classify as `kind:'other'` and emit no `state-change` → the dashboard won't auto-refresh.
Add a nested `projects/<id>/<slug>/(plan.md|phases/*.md)` branch so SSE fires. Initial render is
unaffected (it uses the watcher-independent read path); this only restores live refresh.

---

## 3. Existing widgets — small extensions

Most existing widgets are already sufficient as **children**; the work is composition support
(§2b). Specific notes:

- **`table`** — already supports `config.columns` whitelist and drops `_body`/`_file`
  (`TableWidget.vue:104-112`). The MVP's broken table is fixed **consumer-side** by declaring
  columns; no aiDeck change for that. Composition adds `cell:<col>` slots (§2b).
- **`card` / `card-grid`** — add `header`/`media`/`body`/`footer` slots.
- **`kanban-board`** — add `card` slot for per-card overlays (progress meter, blocker count).
- **`progress-bar`** — already does stacked + `valueField`/`maxField` (`ProgressBarWidget.vue:73-85`).
  Usable as-is for phase/task meters once exploded rows + rollups exist.
- **`tree-view`** — already a real recursive tree with status chips + `childrenField`. Reused by
  `stack-view` if a bespoke widget isn't built (see §4e).
- **`tabs`** — replace the dead `tabs[].widgets` with the formal `slots.panel:<tabId>` (§2b).
- **`markdown`** — renders `_body` natively; used on every detail page. No change.
- **`graph-dag`** — currently mermaid-text-in-a-`<pre>` (no layout). Either upgrade in place to
  render mermaid as a diagram, or supersede with the interactive `dag-graph` (§4b).

---

## 4. New widgets

Each spec gives: **purpose/context** · **where used** · **visual structure** · **config schema**
· **example data** (real project-status fields) · **composition role**. Old-dashboard source
cited for fidelity.

### 4a. `phase-timeline`  `[effort: L]`  — north-star
- **Purpose/context:** the spine of a plan — an ordered run of phases, each showing task
  progress, gate readiness, and the active "you are here". Replaces `PhaseCard`
  (`src/dashboard/components/plan/PhaseCard.tsx`) + `ActivePhaseCallout`.
- **Where used:** the **Plan detail** page, top section.
- **Visual:** vertical (or horizontal) sequence of phase cards. Each card: status glyph + left
  status bar, phase `id` + `title`, a **task progress bar** (`done/total`), a **gate meter**
  (`met/total`), optional `nextAction` footer, optional parallel-group bracket for phases that
  run together. The **active** phase is emphasized (accent edge / glow).
- **Config schema:**
  ```ts
  {
    idField?: string,            // 'id'
    titleField?: string,         // 'title'
    statusField?: string,        // 'status'  (active highlighted)
    tasksDoneField?: string,     // 'tasksDone'   (rollup, §2a)
    tasksTotalField?: string,    // 'tasksTotal'
    gatesMetField?: string,      // 'gatesMet'
    gatesTotalField?: string,    // 'gatesTotal'
    nextActionField?: string,    // 'nextAction'
    parallelField?: string,      // 'dependsOn' / 'parallelWith' (for grouping)
    orientation?: 'vertical' | 'horizontal',  // 'vertical'
  }
  ```
- **Example data** (exploded `phases` rows + skill rollups):
  ```jsonc
  [ { "id":"F4","title":"Live proof on throwaway repo","status":"done","tasksDone":1,"tasksTotal":1,"gatesMet":1,"gatesTotal":1 },
    { "id":"F5","title":"Inc7 — aiDeck consumer-side","status":"active","tasksDone":3,"tasksTotal":4,"gatesMet":0,"gatesTotal":1,
      "nextAction":"T-004 — publish @henryavila/aideck + repoint" },
    { "id":"F6","title":"Anthropic subagent tier (deferred)","status":"paused","tasksDone":0,"tasksTotal":0,"gatesMet":0,"gatesTotal":1 } ]
  ```
- **Composition role:** HOST — exposes a `phase-extra` slot (per-phase footer) so a consumer can
  drop a `callout` (next-action) or `sparkline` into each phase. Each phase row is a CHILD scope.

### 4b. `dag-graph`  `[effort: L]`  — interactive dependency graph
- **Purpose/context:** see the dependency structure at a glance — what blocks what, what runs in
  parallel, where the critical path is. Replaces `DepGraphOverlay`
  (`src/dashboard/components/plan/DepGraphOverlay.tsx`).
- **Where used:** Plan detail (a "Dependencies" tab or drawer) and optionally per-phase task DAGs.
- **Visual:** SVG DAG. Topological **columns by depth** (Kahn layout), optional **rows by track**,
  cubic-bezier **edges** with arrow markers, **active-edge** highlight, **parallel** nodes in a
  dashed backdrop pill, a small legend. Node = phase/task; click → select / navigate.
- **Config schema:**
  ```ts
  {
    nodesField?: string,     // when source rows ARE the nodes: id/label/status/track read per row
    idField?: string,        // 'id'
    labelField?: string,     // 'title'
    statusField?: string,    // 'status'
    trackField?: string,     // optional row lane
    edges: { fromField: string, toField: string } | string,  // edge list source.ref OR a field holding [{from,to}]
    layout?: 'kahn-columns',
    linkTo?: string,         // row-scoped navigation on node click
  }
  ```
- **Edge derivation:** from `dependsOn[]` on exploded phase rows (project the array into a
  `{from,to}` edge list, or pass an `edges` dataSource). `parallelWith[]` marks parallel pills.
- **Example data:** nodes = the `phases` rows above; edges = `[{ "from":"F2","to":"F5" }, { "from":"F0","to":"F1" }, …]`.
- **Composition role:** CHILD (lives in a tab/drawer/page). Interim fallback: keep `graph-dag`
  mermaid text until this ships.

### 4c. `callout`  `[effort: M]`  — accented banner
- **Purpose/context:** a single prominent, accented message — the active-phase "YOU ARE HERE"
  with its next-action, a data-inconsistency / scope-drift warning, or the CODEX-review line.
  Replaces `ActivePhaseCallout` + `InconsistencyBanner`.
- **Where used:** top of Plan / Initiative detail; anywhere a one-line status banner is needed;
  as a slot child inside `phase-timeline`.
- **Visual:** rounded container, 3px left status bar, leading icon/glyph, bold title, body line,
  optional right-aligned action link, `variant` color. Optional subtle pulse for `attention`.
- **Config schema:**
  ```ts
  {
    variant?: 'info' | 'success' | 'warning' | 'attention' | 'error',  // drives color + glyph
    titleField?: string, title?: string,        // field(...) from record OR static
    bodyField?: string,  body?: string,
    actionLabel?: string, linkTo?: string,       // optional CTA (row-scoped link ok)
    pulse?: boolean,
  }
  ```
- **Example data:** `[{ "title":"F5 — active", "body":"T-004 — publish @henryavila/aideck + repoint", "variant":"attention" }]`
  or a drift record: `[{ "title":"Scope drift", "body":"3 phases declare parallelWith but plan forbids parallelism", "variant":"warning" }]`.
- **Composition role:** CHILD (and slot child). Source-less variant binds to the parent record.

### 4d. `sparkline` (+ `confidence-bar` mode)  `[effort: M]`
- **Purpose/context:** a compact inline trend — discover candidate **activity** over time, or a
  0–100 **confidence** bar. Replaces `discover/ActivitySparkline` + `discover/ConfidenceBar`.
- **Where used:** discover triage cards; inline in table cells / card headers (composition).
- **Visual:** `mode:'line'` → mini SVG line/area with optional end-cap dot, sized for inline
  (e.g. 184×38). `mode:'bar'` → stacked horizontal 0–100 bar with a right-aligned score label
  colored by threshold (≥0.6 success, 0.4–0.6 accent, <0.2 muted).
- **Config schema:**
  ```ts
  {
    mode?: 'line' | 'bar',       // 'line'
    xField?: string,             // 'date'  (line)
    yField?: string,             // 'count' (line)
    valueField?: string,         // 'confidence' (bar, 0..1)
    height?: number,             // 38
    colorField?: string,
  }
  ```
- **Example data:** line → `[{ "date":"2026-05-01","count":3 }, { "date":"2026-05-08","count":1 }, …]`;
  bar → `[{ "confidence":0.82 }]`.
- **Composition role:** CHILD (designed to nest in cells/headers/rows). Honors `$parent` filters.

### 4e. `stack-view`  `[effort: M]`  (or reuse `tree-view`)
- **Purpose/context:** the attention/interruption call-stack of an initiative — what's open, how
  deep, what's the current frame. Replaces `StackPanel` (`initiative/Panels.tsx:287-443`).
- **Where used:** Initiative detail.
- **Visual:** depth-indented frames; per-frame kind glyph (`◉` task, `✓✓` validation, `⌬`
  investigation/discussion); a pulsing **HERE** marker on the top frame; per-frame id, title,
  kind label, opened-at.
- **Config schema:**
  ```ts
  { idField?, titleField?, kindField?, openedAtField?, hereField? /* bool: current top */ }
  ```
- **Example data** (exploded `stack` rows): `[{ "id":1,"title":"verify F5 gate","kind":"validation","opened_at":"…","here":true }]`
  (project-status stacks are often empty — render an `emptyNote`).
- **Composition role:** CHILD. **Cheaper alternative:** reshape `stack` into `tree-view`'s
  `{label,status,children}` and skip the bespoke widget if HERE-marker fidelity is not required
  (insight-parity path). Spec'd as bespoke for full fidelity.

### 4f. `exit-gate-list`  `[effort: M]`  (or `table` + composition)
- **Purpose/context:** the gates that close a phase — what's met, what's pending, the verifier and
  its last run. Replaces `ExitGatesCard` (`initiative/Panels.tsx:12-285`).
- **Where used:** Plan + Initiative detail.
- **Visual:** collapsible rows: status glyph (met/pending/deferred), gate `id`, `description`,
  verifier-kind badge; metadata pills (last-run pass/fail, `testsCollected`, `verifiedAt`);
  expandable detail = verifier command block + `evidence.outputSummary` / `deferredReason`.
- **Config schema:**
  ```ts
  { idField?, descriptionField?, statusField?,
    verifierField?,            // object {kind,runner,pattern}
    evidenceField?,            // object {passed,testsCollected,verifiedAt,outputSummary}
    deferredReasonField? }
  ```
- **Example data** (exploded `exit_gates` rows): the `F5-G1` gate from §1b.
- **Composition role:** CHILD. **Alternative:** `table` (columns `[id,description,status]` +
  native status chip) with a `cell:detail` slot rendering a `markdown` of the evidence — viable
  insight-parity path; bespoke widget gives the expandable verifier fidelity.

### 4g. `task-list` (rich)  `[effort: M, optional]`  (or `table` + composition)
- **Purpose/context:** tasks of a phase with blockers and detail. Replaces `TaskList`
  (`initiative/TaskList.tsx`).
- **Where used:** Initiative detail.
- **Visual:** collapsible rows: status glyph, `id`, `title`, tags, **blockedBy** pills, expandable
  description / outputs / verifier; optional HERE badge.
- **Recommendation:** with composition (§2b), a `table` over exploded `tasks` rows
  (columns `[id,title,status]`, native status chips, a `cell:blockers` slot rendering blockedBy
  as `tag-chip`, and an `item`/`cell:detail` slot with `markdown` description) achieves
  insight-parity **without a new widget**. Build the bespoke `task-list` only if pixel-parity is
  required. Listed here for completeness.

---

## 5. How the pages compose (target manifest, end state)

| Page | Composition |
|------|-------------|
| **Overview** | `stat` tiles (active/total plans, phases done/active, blocked) · `table` over `plans` (scalar columns) · `kanban-board` over `phases` (status lanes) with a `progress-bar` card slot |
| **Plans** | `card-grid` over `plans` grouped `repeat: projectId`; each card: `header` slot = status + currentPhase, `footer` slot = `progress-bar` (phase rollup); `linkTo:/plan/:projectId/:slug` |
| **Plan detail** (`/plan/:projectId/:slug`) | `callout` (active phase) · `phase-timeline` over this plan's `phases` · `dag-graph` (deps) in a tab/drawer · `markdown` `_body` · `exit-gate-list` |
| **Initiative detail** (`/phase/:projectId/:slug`) | `callout` (next-action) · `key-value` metadata · `task-list`/`table` over `tasks` · `exit-gate-list` · `stack-view` · `list` parked + `list` emerged · `markdown` `_body` |
| **Discover** | `card-grid` over `candidates` bucketed `repeat: bucket`; each card: `sparkline`(activity) + `sparkline mode:bar`(confidence) + evidence `tag-chip`; action bar |
| **Inbox** | `log-feed`/`table` over `inbox` intents |

---

## 6. Division of labor & sequencing

**aiDeck-side (this repo) — build in this order:**
1. **Composition / slots** (§2b): `slots` schema field, `WidgetSlot.vue`, `WidgetRenderer`
   recursion + `$parent` resolution + depth guard. Wire slots into `card`, `kanban-board`,
   `table`, `list`, `tabs`, `accordion`, `stat`. *(Unblocks most of the dashboard.)*
2. **Array-explode projection** (§2a): `explode`/`derivesFrom`/`carry` in `manifest-schema.ts` +
   `data-source-reader.ts`. *(Unblocks every per-row visualization.)*
3. **Per-record drill-down** (§2c): composite `projectId`-scoped `param` + row-scoped `linkTo`.
4. **New widgets** (§4): `phase-timeline`, `callout`, `sparkline` first (highest value/effort);
   then `exit-gate-list`/`stack-view`/`task-list` (or accept the `table`+composition
   alternatives); then `dag-graph` (interactive) — `graph-dag` mermaid is the interim.
5. **SSE nested-path fix** (§2d) — last; only affects live refresh.

**Consumer-side (atomic-skills) — in parallel / behind the matching aiDeck step:**
- **Now, no aiDeck dep:** fix the broken table via `config.columns`; real Plans page (table +
  `repeat:projectId` card-grid); lane-meaningful stat tiles; `markdown` `_body` on detail pages.
- **Behind §2a:** declare the exploded dataSources (`phases`, `tasks`, `exit_gates`, …) + skill
  precomputes the rollup fields (`tasksDone/Total`, `gatesMet/Total`, `staleDays`).
- **Behind §2b/§2c:** build the detail pages + composed cards (progress in kanban, callouts,
  sparklines) + drill-down links.
- **Behind §4:** bind `phase-timeline` / `dag-graph` / `exit-gate-list` / `stack-view` /
  discover cards.

**Contract for "done":** each capability/widget ships with (a) the schema addition validated by
`aideck validate`, (b) a fixture in the demo consumer, and (c) backward compatibility (existing
manifests render unchanged). The consumer manifest is updated to consume it as each lands.

**So:** once this spec is agreed, aiDeck starts at §6.1 (composition) and atomic-skills starts at
the no-dependency consumer work in parallel; we meet at each capability boundary.

---

## 7. Open decisions (carried from the port plan §7)

1. **Rollup ownership** — assumed *skill-precomputes* into frontmatter (aiDeck stays
   read-in-place). A generic `compute:` transform in aiDeck is optional/nice-to-have.
2. **Parity level** — this spec targets **insight-parity** with bespoke widgets only where the
   generic `table`+composition path loses essential fidelity (`phase-timeline`, `dag-graph`,
   `callout`, `sparkline` are bespoke; `exit-gate-list`/`stack-view`/`task-list` have generic
   alternatives). Confirm if pixel-parity is required.
3. **DAG fidelity** — interim `graph-dag` mermaid → interactive `dag-graph` later. Confirm priority.
4. **Multi-project scope** — composite param (§2c) only matters for repos with >1 `projects/<id>`
   sharing slugs; can defer to single-project-per-repo for now.
