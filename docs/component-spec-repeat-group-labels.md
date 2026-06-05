# aiDeck component spec — `repeat` group labels (human label, hide-when-single, no slug mangling)

**Audience:** the aiDeck implementer (this repo). **Author:** atomic-skills consumer side.
**Date:** 2026-06-05. **Branch:** `feat/aideck-v2-generic-runtime`.
**Companion docs:** `docs/component-spec-atomic-skills-dashboard.md` (the dashboard port that
introduced per-plan `repeat`), `docs/integration-spec.md`.
**Scope of change:** `src/client/components/WidgetRenderer.vue`, `src/client/styles/sections.css`
(the `.repeat-label`), `src/server/manifest-schema.ts`. No data-plane change.

> ## ✅ Implementation status (aiDeck side, 2026-06-05)
>
> **Implemented and merged** — §2a, §2b, §2c. Validated as philosophy-compliant: `repeatLabelField`
> is the agnostic pattern done right (consumer precomputes a sibling scalar; aiDeck does no join).
> All Iron Laws pass; no data-plane change. Default shipped as `repeatLabel: 'auto'` per §2b.
> Tests: `tests/unit/client/repeat-label.test.ts` (9) + updated `widget-renderer.test.ts`.
>
> Three factual corrections to this spec, found against the real code while implementing:
>
> 1. **`.repeat-label` is NOT in `src/client/styles/sections.css`** — it is a `<style scoped>` rule
>    *inside* `WidgetRenderer.vue`. The `text-transform: capitalize` (§2c) was removed there;
>    `sections.css` was not touched. Disregard the `sections.css` entry in **Scope of change** above.
> 2. **The binding type lives in two places.** Besides the server `WidgetBinding`
>    (`manifest-schema.ts`, §3), there is a client-side `Binding` interface inside
>    `WidgetRenderer.vue`. Both got `repeatLabelField` / `repeatLabel`.
> 3. **No `humanizeKey` util existed to reuse** (§2c / §3) — it was written fresh in
>    `WidgetRenderer.vue` as `s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())`.
>
> §2d (section/container-level repeat) remains deferred, as the spec intended.

## 0. Why this doc exists

A widget binding can carry `repeat: <field>` — it groups the widget's records by that field
and renders one copy of the widget per group, with the **group value as a header label**
(`.repeat-label`). This is how a page shows, e.g., one "Agora" block per active plan.

The mechanism is sound, but the **group header** has three generic defects that hit *any*
consumer grouping by an id / slug / foreign-key field (which is the common case — you group
by a stable key, not by a prose field):

1. **It prints the raw grouping key.** Grouping by `parentPlan` shows the plan **slug**
   (`project-orchestrator-redesign`), never the human title. aiDeck has no join, so it has no
   other value to show — but it also gives the consumer no way to supply one.
2. **`text-transform: capitalize` mangles slugs.** `project-orchestrator-redesign` renders as
   `Project-Orchestrator-Redesign` (the browser capitalizes each hyphen-segment).
3. **It renders even for a single group, and once per widget.** With one group the header is
   pure noise; and because each widget in a section carries its own `repeat`, a 3-widget
   section emits the same header 3×.

This is not an atomic-skills quirk — every consumer that groups by a key field inherits it.
The fix belongs in aiDeck and stays domain-agnostic. The atomic-skills data is used only for
concrete examples.

## 1. Current behavior (what to change)

`src/client/components/WidgetRenderer.vue`:

```vue
<!-- template -->
<div v-for="group in repeatGroups" :key="group.key" class="repeat-item">
  <div v-if="group.key !== ''" class="repeat-label">{{ group.key }}</div>
  <component :is="resolvedComponent" :source="group.records" ... />
</div>
```
```ts
// repeatGroups via groupByField(filtered, binding.repeat) → [{ key: String(record[field] ?? ''), records }]
```
`src/client/styles/sections.css`:
```css
.repeat-label { font-size: var(--fs-sm); font-weight: 600; color: var(--fg-muted);
                margin-bottom: var(--space-2); text-transform: capitalize; }
```
`src/server/manifest-schema.ts` (`widgetBindingSchema`): `repeat`, `repeatDirection`,
`maxRepeatColumns` are sibling keys on the binding.

## 2. The asks

All three are **backward-compatible**: a binding with only `repeat: <field>` keeps working
(grouping unchanged); the only default-behavior change is §2b's hide-when-single, called out
below. New keys sit alongside `repeatDirection`/`maxRepeatColumns` — no nesting, no breaking
rename. This is consistent with aiDeck's "no join / consumer precomputes derived scalars"
philosophy: aiDeck does **not** resolve the key against another dataSource; the consumer
supplies a human label as a sibling field on the same records.

### 2a. `repeatLabelField` — show a human label from a sibling field (headline ask)

Add an optional `repeatLabelField: string` to the widget binding. When set, the group header
renders that field's value instead of the raw grouping key. Since every record in a group
shares the grouping key, the consumer guarantees they also share the label value, so the
header reads `group.records[0]?.[repeatLabelField]`.

- Manifest: `{ repeat: parentPlan, repeatLabelField: parentPlanTitle, … }`.
- aiDeck stays join-free; the consumer precomputes `parentPlanTitle` as a scalar on each record
  (the same rollup pattern already used for `current` / `planActive` / `tasksDone`).
- Fallback: if `repeatLabelField` is unset or the field is empty on the group, fall back to the
  grouping key (current behavior, but see §2c for how the key is rendered).

### 2b. `repeatLabel: 'auto' | 'always' | 'never'` — header visibility (default `auto`)

Add an optional `repeatLabel` enum controlling whether the header renders:

- `auto` (**default**): show the header **only when there is more than one group**
  (`repeatGroups.length > 1`). One group → no header (kills the single-plan noise).
- `always`: always show (the pre-change behavior — use to opt back in).
- `never`: never show (repeat purely for layout, no headers).

> **Behavior-change note:** moving the default to `auto` means existing consumers lose the
> header when a repeat happens to have a single group. This is the intended improvement (a
> one-group header is redundant) and is reversible per-binding with `repeatLabel: 'always'`.
> If you prefer zero behavior change, default to `always` and let consumers opt into `auto` —
> but `auto` as the default is the better generic UX and is what the atomic-skills Foco wants.

### 2c. Don't force-capitalize the label

Remove `text-transform: capitalize` from `.repeat-label`. Render the label verbatim:

- When `repeatLabelField` is set, the consumer already supplies a human-cased label —
  capitalizing it is wrong (mangles `iOS`, `API`, proper nouns).
- When falling back to the raw key, prefer a **slug-aware humanize in JS** over the CSS
  transform: `key.replace(/[-_]+/g, ' ')` then title-case each word. This turns
  `project-orchestrator-redesign` → `Project Orchestrator Redesign` (spaces, not hyphens),
  which is what `capitalize` was trying and failing to do. (Optional but recommended; at
  minimum, drop the `capitalize` so slugs aren't hyphen-mangled.)

### 2d. (Optional / future) section- or container-level repeat — one header per block

The per-widget duplication in §0(3) only fully disappears if `repeat` can live **above** a
single widget — i.e. a `section` (in `SectionsLayout`) or a `container` widget repeats the
**whole block** once per group, with a single header, and the child widgets render inside.
This is a larger change (SectionsLayout + schema + slot binding to the group) and is **not
required** for this spec: §2a+§2b already make the common single-group case clean. Flagging it
as the proper structural fix for consumers that routinely show multiple groups (e.g. several
active plans) and want one header above the whole block instead of per widget.

## 3. Implementation pointers

**`src/server/manifest-schema.ts`** — extend `widgetBindingSchema` (and the `WidgetBinding`
interface) with two optional keys next to `repeat`:
```ts
repeatLabelField: z.string().optional(),
repeatLabel: z.enum(['auto', 'always', 'never']).optional(),
```

**`src/client/components/WidgetRenderer.vue`** — derive the label + visibility:
```ts
function groupLabel(group) {
  const f = props.binding.repeatLabelField
  const raw = (f && group.records[0]?.[f]) ? String(group.records[0][f]) : group.key
  // humanize ONLY the raw-key fallback; a consumer-supplied labelField is shown verbatim.
  return (f && group.records[0]?.[f]) ? raw : humanizeKey(raw)
}
const showRepeatLabel = computed(() => {
  const mode = props.binding.repeatLabel ?? 'auto'
  if (mode === 'never') return false
  if (mode === 'always') return true
  return repeatGroups.value.length > 1            // 'auto'
})
```
```vue
<div v-if="group.key !== '' && showRepeatLabel" class="repeat-label">{{ groupLabel(group) }}</div>
```
`humanizeKey(s) = s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())` (or reuse an
existing util).

**`src/client/styles/sections.css`** — drop `text-transform: capitalize` from `.repeat-label`.

## 4. Tests to add (`tests/unit/client/`)

- `repeatLabelField` set → header text = the sibling field value (verbatim, not capitalized);
  unset → falls back to the humanized key.
- `repeatLabel: 'auto'` → header hidden with 1 group, shown with ≥2 groups.
- `repeatLabel: 'always'` → shown with 1 group; `'never'` → never shown.
- Slug key with no labelField → `project-orchestrator-redesign` renders `Project Orchestrator
  Redesign` (humanized), not `Project-Orchestrator-Redesign`.
- Backward-compat: a binding with only `repeat: <field>` still groups correctly.

## 5. Consumer-side counterpart (atomic-skills — for context, not your work)

Once §2a lands, the atomic-skills consumer will: (1) precompute `planTitle` (the active plan's
`title`) onto phase/initiative records in `reconcile-focus.js` — same precompute discipline as
the `current`/`planActive` markers; (2) set `repeatLabelField: planTitle` on the Foco "Agora"
widgets. End state: the Foco shows **"Redesign project skill into a lifecycle orchestrator
(dogfood)"** once per plan, instead of `Project-Orchestrator-Redesign` repeated per widget.
The slug stays the durable id (dir name, `parentPlan`, consumer id) — only the *display* label
changes.

## 6. Acceptance

- A binding with `repeat` + `repeatLabelField` shows the human field as the group header,
  verbatim (no capitalize).
- `repeatLabel` defaults to `auto`: no header for a single group; header returns for ≥2 groups.
- Raw-key fallback is humanized (spaces, title-case), never hyphen-mangled.
- Existing `repeat`-only bindings are unaffected (aside from the intended `auto` hide-when-single).
- Unit tests in §4 pass; no data-plane / dataSource change.
