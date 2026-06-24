# aiDeck Design System (v2)

> Dark-first design language for **aiDeck** — a **generic, local-first
> dashboard runtime** that any AI tool can integrate with. aiDeck reads
> consumer manifests (`manifest.yaml`) and projects whatever they
> declare onto three surfaces: a Vue 3 dashboard in the browser, a REST
> + SSE HTTP API, and an MCP server for AI agents in IDEs like Claude
> Code and Cursor.

## What aiDeck is

aiDeck is **not** a project tracker. It is **not** a code-health
dashboard. It is **not** an agent-runs viewer. It is the **substrate**
on which any of those — and dozens more — can be assembled by
declaring a manifest.

Consumers live under `~/.aideck/consumers/<name>/`. A manifest
declares:

- **pages** — each with a layout (`sections` · `grid` · `single`) and
  a list of widget bindings.
- **data sources** — YAML, JSON, JSONL, or frontmatter Markdown, read
  from disk and validated against JSON Schema.
- **widget bindings** — one of the 25 built-in widgets, with the data
  source(s) and shape it should render.

aiDeck reads, validates, renders. Lives at **127.0.0.1**, zero
telemetry, MIT-licensed.

## Audiences

| Audience            | What they see                                          |
| ------------------- | ------------------------------------------------------ |
| **Developer**       | Vue 3 dashboard in the browser, dense, keyboard-first. |
| **AI agent**        | The same surface via MCP — page lists, widgets, data.  |
| **Tool author**     | A manifest that maps their script's output to widgets. |

Not designed for: non-technical PMs, enterprise teams, customer-facing
dashboards.

## Visual tone

Reference: **cockpit / DevTools** — GitHub DevTools, Linear's command
bar, Grafana, Raycast. Closer to those than Notion / Asana /
ClickUp. Information density is a **feature**, not a problem to be
solved with whitespace.

**Calibration target.** A consumer with 5+ pages, each containing
10-20 widgets across sections, must render on a 13″ laptop without
horizontal scroll, overflow, truncation, or pagination tricks. The
spacing scale, type scale, and widget frame are tuned to that.

## Sources

- **GitHub** — `henryavila/aideck` ·
  <https://github.com/henryavila/aideck>
  - `docs/superpowers/specs/2026-05-26-aideck-v2-generic-dashboard-design.md` — v2 architecture
  - `src/client/` — Vue 3 components (functional, this design system
    skins them)
  - `src/client/components/widgets/` — all 26 `.vue` widget files
  - `src/client/layouts/` — `SectionsLayout.vue`, `GridLayout.vue`,
    `SingleLayout.vue`
  - `src/demo/consumer/` — demo manifests + data files
- GitHub is the source of truth — this project does not cache the repo.

## Repository index

```
README.md                       — this file
SKILL.md                        — Agent Skill metadata
AUDIT.md                        — last full system audit
colors_and_type.css             — every design token + semantic type presets
assets/
  wordmark.svg                  — primary wordmark
  wordmark-mono.svg             — mono-cursor variant
components/
  catalog/                      — the Catalog component family (mountable, exported)
preview/                        — specimen cards (the Design tab — each tagged with `<!-- @dsCard group="…" -->`)
prompts/                        — 14 briefings to paste into claude.ai/design (start at 00, INDEX.md is the table of contents)
ui_kits/
  dashboard/                    — hi-fi multi-domain dashboard prototype
```

## Mountable components

Most of the system is specimen CSS that production code copies by hand. The
**Catalog family** is different: it ships as real, exported React components on
the `AiDeckDesignSystem_9ef1e6` namespace (compiled into `_ds_bundle.js`), so a
consumer mounts the actual component instead of re-stitching the pattern.

| Export         | What it is                                                              |
| -------------- | ----------------------------------------------------------------------- |
| `Catalog`      | searchable + faceted master-detail browser; manages search, facets, and selection internally; `refs` chips swap the selection (the graph). Five states: default · loading · empty · error · live. |
| `RecordDetail` | the right-hand detail panel in isolation, for a `single`-layout page    |
| `Facet`        | one toggleable filter pill (atom)                                       |
| `SearchInput`  | the controlled search-field atom                                        |

All props are domain-agnostic — record shape, detail `sections`, `facetField`,
and `searchFields` are supplied by the consumer; nothing in the component or
its defaults names a domain. A consumer mounts it via `<x-import>`:

```html
<x-import component-from-global-scope="AiDeckDesignSystem_9ef1e6.Catalog"
          records="{{ skills }}" facet-field="tags"
          selected-id="{{ sel }}" on-select="{{ onPick }}"
          hint-size="100%,480px"></x-import>
```

`preview/widget-catalog.html` (Widgets specimen) and the `ui_kits/dashboard`
catalog page both mount this exported component — the chrome `?` action opens
the same component an external consumer would.

---

## The 25 built-in widgets

A consumer composes from this library. Every widget shares the same
canonical frame (header · body · optional footer) and the same five
states (default · loading · empty · error · live).

| Family       | Widgets                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| Data         | Table · Stat / Metric · List · Key-Value                                  |
| Charts       | Line Chart · Bar Chart · Gauge · Progress                                 |
| Text         | Markdown · Code Block                                                     |
| Navigation   | Tabs · Accordion · Breadcrumb                                             |
| Layout prim. | Grid / Columns · Container                                                |
| Status       | Badge · Tag / Chip                                                        |
| Forms        | Search / Filter                                                           |
| AI-tool      | Kanban · Timeline / History · Log / Activity Feed                         |
| Gap-analysis | Tree View · Card · Drawer / Sidebar · Header / Nav Bar                    |
| Specialized  | Graph / DAG (Mermaid)                                                     |

All 25 share visual atoms: card frame, header typography, empty
states, loading skeletons, error states.

### v2.1 — extension widgets (consumer-agnostic)

Seven new widgets + three enhancements, all domain-free: status
values stay consumer-defined and resolve to a DS *tone* via the
manifest's `statusMap`. Specimen cards live in `preview/` (Widgets /
Components groups); the `ui_kits/dashboard` prototype exercises them
on `code-health` (`records`, `record`, `catalog` pages + the chrome
palette).

| Widget              | Class    | What it adds                                                        |
| ------------------- | -------- | ------------------------------------------------------------------- |
| **`stepper`**       | new      | ordered states — horizontal pills + vertical timeline w/ deps; dense table-cell variant |
| **`status-list`**   | new      | list grouped by status field + per-item chip + annotation; `checklist` variant |
| **`callout`**       | new atom | tone-coded side-bar block for one important field (next action, alert) |
| **`collection-grid`**| new layout | auto-fit `minmax()` grid, 1 data-bound card per record; `attention` + `live` |
| **`record-switcher`**| new     | page-title trigger → scrollable dropdown of the collection (replaces a tab row) |
| **`catalog`**       | new      | searchable / faceted master-detail browser w/ configurable sections + refs graph |
| **`headline-banner`**| new     | big aggregate stat + per-record tone-coded *lanes* strip          |
| `progress`          | enhanced | `label` · right-aligned `valueText` · `caption` · tone · optional segmented mode |
| `card`              | enhanced | slot composition — title-link, body slots, footer-link (the *record-card* preset) |
| `header-nav`        | chrome   | command-palette (⌘K, records + pages) + a `?` help action that opens a `catalog` page |

**Two presets** (compositions, not new code): *record-card* (`card` +
`stepper` + `progress` + `callout` + nested list, used by
`collection-grid`) and *record-detail* (`callout` + `stat`s +
`status-list` + `checklist` beside a selectable vertical `stepper`).

## Three layout modes

1. **`sections`** — flowing content, auto-stacked, each section has a
   title and a 12-column grid of widgets. The default for most pages.
2. **`grid`** — explicit 12-column grid with `colStart`, `colSpan`,
   `rowSpan` positioning per widget. For finely tuned dashboards.
3. **`single`** — one widget fills the entire page. For a wide table,
   a DAG, a long markdown doc.

All three must feel like the same product, not three different
dashboards.

---

## Brand principles

1. **Files are canonical.** aiDeck never owns state — it projects
   from consumer data files. The UI must not imply system-of-record
   semantics. **No "Saving…" spinners, no "unsaved changes"
   warnings, no autosave anxiety.** Mutations are framed as
   *requests*, never *saves*.
2. **Localhost-only, zero telemetry.** A persistent trust signal
   shows `127.0.0.1` in the chrome. Developers trust the product
   specifically because it doesn't phone home.
3. **Consumer-agnostic.** The dashboard renders whatever the manifest
   declares. **No hardcoded domain vocabulary.** A token named
   `--status-success` is correct; `--phase-done` is not.
4. **Widget consistency.** All 25 built-in widgets share visual
   atoms: card frame with consistent border radius, header typography,
   empty / loading / error states.
5. **Density is a feature.** A consumer with 5 pages × 12-20 widgets
   per page renders on a 13″ laptop without horizontal scroll. Don't
   "improve" the design with more whitespace.

## Anti-patterns

- Big illustrated empty states. Terse text is better.
- Avatar grids, team UI, presence indicators — single user, no `@`s.
- Multi-step onboarding wizards.
- Tutorial tooltips on first visit.
- Light-mode toggle.
- Modal-everything. Use inline expansion where possible.
- Decorative gradients in widget bodies. Glass is **only** for chrome
  (header, command palette, drawer, popovers).

---

## Visual foundations

### Surfaces

Six dark levels stack from `--bg-sunken` (#07090d) through
`--bg-canvas` (#0a0d12 — page background) up to `--bg-highlight`
(#2d3340). Elevation is expressed by **surface step + 1px hairline**.
Drop shadows exist (`--shadow-sm` through `--shadow-xl`) but are
reserved for floating layers: menus, popovers, drawers, modals.

### Glass

Three translucent tiers (`--glass-thin/medium/thick`) for chrome
surfaces only — chrome header, command palette, drawers, popovers.
Always paired with `backdrop-filter: saturate(180%) blur(20px)`.
Never on a widget body.

### Colors

Three canonical vocabularies — reference them by name rather than
re-specifying hue.

- **Semantic status** (5): `--status-success` (emerald),
  `--status-warning` (amber), `--status-error` (coral),
  `--status-info` (azure — primary accent), `--status-neutral`
  (slate).
- **Chart palette** (8): `--chart-1` through `--chart-8`. Tuned in
  OKLCH for consistent luminance — no series is louder than another.
  Use in order; if a chart has 3 series, use `--chart-1`, `-2`, `-3`.
- **Foreground** (5): `--fg-default` → `--fg-faint`.

`--status-info` doubles as `--accent-primary` — it's the runtime's
signature color and lives in the wordmark's cyan square.

### Type

- **Sans · Inter** — UI, narrative, headings, all body. 400–700.
- **Mono · JetBrains Mono** — identifiers, paths, commands, IDs,
  code, all numeric stats. Ligatures off (`"calt" 0`) — developers
  want to see exactly what's there.

Base body is **13–14px**. View headers 24px. Page titles 28–32px.
Dense by design.

### Spacing

A **4px base** scale (`--space-1` … `--space-32`). Row padding in
dense tables is **4-6px**. Card padding is **10-14px**. Not the
12-16px you'd see on a marketing page.

### Radii

Modest. Default for widgets and buttons is **8px**. Pills (status
chips) are 999px. This is DevTools.

### Borders

Three weights. `--border-subtle` for inner dividers,
`--border-default` for card outlines, `--border-strong` for focus.
**All hairlines are 1px.**

### Textures

Two canonical textures, both vocabulary atoms, not decoration.

| Token              | Pattern                    | Means                          |
| ------------------ | -------------------------- | ------------------------------ |
| `--texture-grid`   | Radial dots, 28px grid     | Default canvas — "files are atoms" |
| `--texture-grid-lg`| 1px crosshatch, 64px grid  | Hero / feature backdrops       |
| `--texture-scan`   | 1px scanlines, 3px gap     | "Live data is streaming" (SSE) |

The grid is the default body background. The scan overlay sits on
SSE-live widgets via `.is-live`. Both respect
`prefers-reduced-motion`.

### Iconography

1. **Unicode glyphs first** — `✓ ◉ · × ! ⌘ ⌥ → ↗ ▸ ▾ ⌕ ⚑`. They
   render identically in terminal, browser, and DOM dumps — which
   matters because the AI agent reads the same surface.
2. **Lucide (CDN)** for anything Unicode can't say tastefully — file,
   terminal, link, copy, search. 1.5px stroke, `currentColor`.
3. **Custom SVG: never.**

The cyan square in the wordmark doubles as the "runtime live"
indicator in the chrome.

### Animation

- Hover and focus transitions: **120ms**, `cubic-bezier(0.16, 1, 0.3, 1)`.
- Panel slide-in (drawer): **200ms** same easing.
- Skeleton shimmer: 1.6s ease-in-out infinite.
- **No entrance animations on initial page load.** Information should
  be legible immediately.
- **No bounces, springs, parallax.** This is a cockpit.

### Widget states

Every widget supports five states.

- **default** — has data, renders normally.
- **loading** — skeleton shimmer (`.skeleton`), no spinner.
- **empty** — terse copy + a concrete next action ("clear filter").
  Never illustrated.
- **error** — coral border + structured error message + a
  `suggestion` field with a concrete next step.
- **live** — `.is-live` overlay (subtle scanline) signals SSE-
  connected widgets that update without user action.

---

## How to use this system

- **New screen brief** → read the relevant specimen card (Design tab)
  and the widget family card. Start from the canonical widget frame.
- **Production Vue code** → copy CSS variables from
  `colors_and_type.css` into `src/client/styles/theme.css`. Match
  variable names exactly — components reference them.
- **Prototype or mock** → copy `ui_kits/dashboard/` and reskin the
  data for your domain.
- **Slide deck or marketing piece** → wait. v2 is internal /
  developer-facing only. Discuss before designing.

## Open questions

- Fonts are a tasteful default — Inter + JetBrains Mono. Both
  Google-Fonts and free. Swap variables if a different family is
  ever chosen.
- Lucide CDN is a stop-gap. If we ship to production, self-host the
  subset we actually use.
- Light theme is explicitly **out of scope**.
