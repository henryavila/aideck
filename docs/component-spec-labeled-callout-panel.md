# aiDeck component spec — a labeled single-record "panel" (header + title + body, no inner box)

**Audience:** the aiDeck implementer (this repo). **Author:** atomic-skills consumer side.
**Date:** 2026-06-05. **Branch:** `feat/aideck-v2-generic-runtime`.
**Companion docs:** `docs/component-spec-atomic-skills-dashboard.md`,
`docs/component-spec-repeat-group-labels.md`.
**Likely scope:** `src/client/components/widgets/CalloutWidget.vue` (+ its scoped CSS) or a new
small widget — see §2. No data-plane change.

> **You may change the implementation.** This doc states a NEED + VALUE + a small CONTRACT
> (§2 / §6). The concrete approach in §3 is a *suggestion*. If a different shape fits aiDeck
> better (a new `panel`/`field-card` widget, a flag on an existing one, a Markdown extension,
> whatever), do that — as long as the §6 acceptance holds. (Same spirit as the repeat-labels
> spec, where you corrected three of my assumptions while implementing.)

> ## ✅ Implementation status (aiDeck side, 2026-06-05)
>
> **Implemented as a NEW `panel` widget** (`src/client/components/widgets/PanelWidget.vue` +
> one `widgetMap` entry), i.e. the §3 *alternative* — NOT the primary "extend CalloutWidget"
> path. Why: callout's identity is the colored banner box (tone/glyph/bar/pulse/link), so a
> `plain` mode would split it in two behind a flag; and callout is `<WidgetFrame frameless>`
> (renders `.w-frameless`, not `.w`), so it wouldn't even grid-stretch without converting it to
> the framed path. The new widget gets header + boxless `.w-body` + **equal-height stretch for
> free** from the framed `WidgetFrame` path (`.w` is flex-column inside a grid with
> `align-items: stretch` — sections.css:46 / :139), exactly like `progress-bar`.
>
> **Resolved contract (note the must-fix vs. the §3 suggestion):**
> - `config.title` → **frame header ONLY**. It does NOT feed the prominent line. (The §3 idea of
>   reusing CalloutWidget's `title = config.title ?? record[titleField]` precedence would have
>   duplicated the header as the title and swallowed `record[titleField]`.) No `frameTitle` key —
>   `config.title` is the same header key every framed widget already uses.
> - Prominent line ← `record[titleField]` **directly** (default field `title`).
> - Muted line ← `config.body ?? record[bodyField]` (default field `body`) — `config.body` is a
>   distinct key from the header, so that override precedence is safe (mirrors callout).
> - Optional `config.icon` / `config.meta` pass through to the frame.
> - Empty state when **neither** line resolves (`!title && !body`) → frame empty note; a
>   title-only or body-only panel still renders. `.panel-title` **wraps** (long phase titles),
>   never truncates.
>
> **Backward compatible:** brand-new widget; callout / card / markdown untouched. No data-plane
> change. Tests: `tests/unit/client/panel-widget.test.ts` (7), incl. the config.title-no-leak
> regression. Manifest: `{ widget: panel, config: { title: 'Fase atual', titleField: title,
> bodyField: summary } }`.

## 0. Why this doc exists (the necessity)

A common dashboard pattern is a **row of side-by-side "panels"**, each a framed widget with a
**header label** + some content, that should read uniformly and end up the **same height**.
On the atomic-skills Home ("Agora"), the row is **current-phase | task-progress**:

- `progress-bar` is a framed widget: header **"Tarefas"** + a bar **directly in the frame body**.
- The phase block needs the same shape: header **"Fase atual"** + the phase's **title** (prominent)
  + **summary** (muted).

There is **no widget today that renders "header + prominent title + muted body as plain text,
directly in the frame body, filling the width."** Every attempt falls short:

| Widget | Why it fails here |
|---|---|
| `callout` | Renders the title+body nicely and fills width — but is hardcoded `<WidgetFrame frameless>`, so it **cannot carry a header label**. |
| `card` / `card-grid` | Has a header, but `.cards-grid` is `repeat(auto-fill, minmax(200px, 1fr))` → a **single** record renders as a ~200px sub-card in the corner (see screenshot below), and `.subcard` has its **own border** → *box-in-a-box* inside the frame. |
| `markdown` | Framed + fills + no inner box — but renders **one field only** (so you get the summary OR the title, not both). |
| `key-value` | Framed + fills + no box — but prints the **field name as the key** (`summary  <text>`), which reads like a form, not a titled panel. |

The deeper requirement the table reveals: to match `progress-bar`, the content must sit
**directly in the frame body with NO nested bordered box**. `card` and a (hypothetical) framed
`callout` both bring their own box → box-in-a-box. Only `markdown`/`key-value` render boxless
text today, and neither shows a prominent-title-plus-muted-body pair.

```
Observed (card, 1 record): a tiny ~200px sub-card pinned top-left of a half-width frame,
the rest empty — visually broken next to the full "Tarefas" panel.
```

## 1. The reference to match

`ProgressBarWidget.vue` = `<WidgetFrame :title="config.title">` (header) + the bar rendered
**directly in `.w-body`** (no inner box). It fills width and, because section grids are
`grid-template-columns: repeat(N, 1fr)` with the default `align-items: stretch`, two such
panels in one row **stretch to equal height** automatically. The phase panel must behave the
same way.

## 2. The ask (contract)

A way to render, for a **single record**, a framed panel:

- **A. Header label** — a frame title (e.g. "Fase atual"), like `progress-bar`'s `config.title`.
- **B. Prominent title** — from a record field (e.g. `title`).
- **C. Muted body/subtitle** — from a record field (e.g. `summary`).
- **D. Boxless body** — title + body rendered as **plain text directly in the frame body**,
  **no inner bordered card/banner box** (so it doesn't become box-in-a-box and it fills width).
- **E. Backward compatible** — existing frameless callouts / card grids unchanged.

## 3. Suggested implementation (change freely)

Smallest path — extend `CalloutWidget.vue` with an optional framed + boxless "panel" mode:

1. **Frame header.** Add `config.frameTitle` (distinct from the existing `config.title`, which is
   the banner's own title-override). When set, render `<WidgetFrame :title="frameTitle">` instead
   of `<WidgetFrame frameless>`. When unset → frameless, exactly as today (E).
2. **Boxless mode.** When framed (or via an explicit `config.plain: true`), drop the `.callout`
   box — its `border` / `background` wash / `border-radius` / `co-bar` — so the body is just
   `co-title` (B) + `co-body` (C) as text in `.w-body` (D). The existing `titleField`/`bodyField`
   already map B/C onto record fields.

Example manifest binding (the consumer side, for concreteness):
```yaml
- widget: callout
  colSpan: 6
  source: { ref: initiatives, filter: { current: true } }
  config: { frameTitle: 'Fase atual', plain: true, titleField: title, bodyField: summary }
```

Equally acceptable alternatives (your call):
- A **new `panel` (or `field-card`) widget**: framed, `titleField` + `bodyField`, boxless body.
  Cleaner separation from the banner-style callout if you'd rather not overload it.
- A **`markdown` enhancement** that accepts a small `titleField` + `bodyField` instead of a single
  `field` (renders bold title + muted body). Reuses the framed-markdown chrome.

## 4. Tests to add (`tests/unit/client/`)

- Framed mode: `frameTitle` set → a `WidgetFrame` head with that label renders; title+body come
  from `titleField`/`bodyField`.
- Boxless: no `.callout`/`.subcard` bordered box element in framed/plain mode.
- Backward-compat: a callout with no `frameTitle` still renders frameless exactly as before.
- Fills width / no min-width grid (regression vs the `card` cramping).

## 5. Consumer-side usage (atomic-skills — context)

The Home "Agora" row becomes two uniform panels: **"Fase atual"** (phase `title` + `summary`) |
**"Tarefas"** (`progress-bar`). Same framed-header structure → grid-stretched to equal height →
the standardized, same-height row the dashboard wants. (The plan name already sits in the
full-width "Plano em foco" banner above the row.)

## 6. Acceptance

- A single-record block can show: a **frame header label** + a **prominent title** + a **muted
  body**, as **plain text in the frame body with no inner box**, filling the frame width.
- Placed beside `progress-bar` in the same section row, the two **stretch to equal height**.
- Existing frameless callouts and card grids are visually unchanged (backward compatible).
- Unit tests in §4 pass; no data-plane / dataSource change.
