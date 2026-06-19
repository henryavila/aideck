# atomic-skills dashboard redesign → aiDeck: what to create (verified gap report)

**Audience:** the agent maintaining the aiDeck runtime (`/home/henry/aideck`).
**From:** the atomic-skills agent, 2026-06-17.
**What this folder is:** the approved Claude Design package for the atomic-skills dashboard —
the rendered design (`Atomic Skills Dashboard.dc.html`), the agnostic widget spec
(`aideck-widgets-spec.md`), the target v2.0 manifest (`manifest.sample.yaml`), per-widget
specimens (`_specimens/`), the DS (`_ds/`, `aideck-widgets.css`), the design team's own catalog
prompt (`prompt-aideck-catalog-component.md`), and the brief + real-data fixtures (`uploads/`).

> Standing rule: the atomic-skills agent does not edit/build/commit in this repo. This is a
> handoff with full context + references. Implement what you judge correct.

## Good news first — what already conforms (no work)

I verified the spec against your current `feat/ds-v2.1-widgets` branch. The **visual/interaction
layers of all 7 v2.1 widgets already exist and largely match the spec**:
`callout` (§4) and `card` slots (§9/§11.1) are fully conformant; `stepper`, `status-list`,
`record-switcher`, `catalog`, `headline-banner`, `progress` render correctly. **The gaps are
NOT in the rendered components** — they're in **data binding**, the **v2.0 manifest schema**,
and **chrome wiring**.

## Important context — a working dashboard already ships

The atomic-skills consumer (`assets/aideck-consumer/manifest.yaml`) **renders today** on your
v0.1 runtime by *working around* every gap below: it precomputes all derived/aggregated fields
in its emitter, uses flat `*Field` config keys (not `fieldMap`), uses route-links instead of
`emits`, and ships help as a normal page/tab. So this list is what's needed to realize the
**design's ideal** (sidebar consumer→pages tree, Panorama landing, chrome `?` help, ⌘K over
records, true aggregation) — **not** a prerequisite for a functioning dashboard.

## What aiDeck must create / change (verified — file:line evidence in the spec + your code)

### P0 — nothing v2.0 loads without these
- **Accept `schemaVersion: "2.0"`** — today `manifest-schema.ts` is `z.literal('0.1')`; the sample fails at line 1.
- **Support `sources:` map form** — today the schema requires a `dataSources:` *array*; the design uses a `sources:` map keyed by name.

### P1 — chrome (the most visible divergence from the design; see `Atomic Skills Dashboard.dc.html` lines 22-79)
- **Wire the `?` help button** → open a manifest-declared help `catalog` page, with active state. Today `ChromeHeader.vue:42` is an inert `<button>` (no handler/emit). Spec §10.2; sample `chrome.help { button, opens }`.
- **command-palette must index RECORDS** across collections (today `CommandPalette.vue:120-172` indexes only consumers/pages/file-names + 3 hardcoded commands) and read `chrome.commandPalette { shortcut, search, order }` from the manifest. Spec §10.1; sample L41-47.
- **Sidebar = consumer→pages tree + a top "Panorama/home" landing.** Today `Sidebar.vue` lists consumers only; pages render as a tab bar in `ConsumerPage.vue`. The design's left nav nests the active consumer's pages and pins Panorama on top (HTML lines 50-78). Needs page `home: true` + `scope: project` (below).
- **Schema: `chrome` block** (`trustSignal`, `commandPalette`, `help`). The `127.0.0.1` signal is hardcoded in `ChromeHeader.vue:35-40`; the design drives it from the manifest.

### P2 — manifest grammar / data binding
- **Source aggregation `agg: count|ratio`, `where`, `of`** on bindings (schema + engine). None exists; every `stat`/`headline-banner` count in the sample depends on it. Spec §8; sample L61-69, L150-155.
- **Page `home: true`, `scope: project`, page-level `param.match`** — today only `default`, root-inferred scope, and *widget-level* param exist.
- **`repeat: { source }` (collection fan-out)** — today `repeat` is only a string grouping-key, not a source that fans out N cards.
- **Cross-widget `emits` mechanism** (a `set:`/state bus) — `stepper.onSelect`, `record-switcher.onSelect{set}`, `catalog.onRef{set}`, `status-list.onItem` are all local-only or link-only today. Spec §2/§3/§6/§7/§11.2.
- **`fieldMap: { role: field }` grammar** — the spec binds roles via `fieldMap` (§0.3); every widget instead reads flat `*Field` keys and silently ignores `fieldMap`. Adopt `fieldMap` or document the `*Field` translation.
- **Top-level `statusMap`** feeding widgets (today each widget reads `config.statuses`). Spec §0.2.

### P3 — per-widget refinements
- **`collection-grid`**: declarative `card` template — `metrics[]`, `nested` child-list (`source/where/limit/show/onItem`), `gap`, structured `title.link`. Today only ad-hoc `slots`; `nested` and `metrics[]` are absent. Spec §5.
- **`catalog`**: config-driven `detail.sections[]` order/presence (hardcoded today), `list.facets.field`, `list.denseBadge.field`, `detail.identifier { field, prefix }` (e.g. `/atomic-skills:`), and search over `title` + `subItems` (today only id/oneLiner/summary/facets). Spec §7. See `prompt-aideck-catalog-component.md`.
- **`headline-banner`**: `count { agg, where }`, `tone { from }`, `lanes { tone-field, sort }` — today `count`/`tone` accept only literals/derived fields; an object `count` renders `[object Object]`. Spec §8.
- **`progress`**: register a **`progress`** alias (today `widgetMap` only has `progress-bar`; `type: progress` → Unknown widget) and accept `tone: { from }`. Spec §9; sample L125.
- **`status-list`**: a `showCount` toggle (count is unconditional today). Spec §3.

## Suggested sequence
P0 (schema gate) → P1 (chrome — biggest visible win) → P2 (binding/grammar) → P3 (widget polish).
The atomic-skills manifest will be re-authored to the v2.0 grammar as these land; until then its
v0.1 workaround keeps the dashboard live.
