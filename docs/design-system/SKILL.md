---
name: aideck-design
description: Use this skill to generate well-branded interfaces and assets for aiDeck — a generic local-first dashboard runtime that any AI tool can integrate with — either for production or throwaway prototypes/mocks. Contains design guidelines, tokens, fonts, the 25-widget library, and the 3 layout modes (sections, grid, single).
user-invocable: true
---

# aiDeck Design Skill

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, dashboards
for a specific consumer), copy assets out and create static HTML files for the
user to view. If working on production code, copy assets and read the rules
here to become an expert in designing with this brand.

## What aiDeck is (one paragraph)

aiDeck is a **generic, local-first dashboard runtime**. It reads
`manifest.yaml` files under `~/.aideck/consumers/<name>/`, validates the
structured data they declare (YAML / JSON / JSONL / frontmatter markdown)
against JSON Schema, and renders 25 built-in widgets across 3 layout modes
(`sections` · `grid` · `single`). Lives at `127.0.0.1`, zero telemetry,
MIT-licensed. The dashboard is a **projection** — consumer data files are
canonical.

## Where to look

- `README.md` — full design system: philosophy, foundations, widget
  library, layout modes.
- `colors_and_type.css` — every design token (surfaces, glass, status,
  chart palette, foreground, borders, type scale, spacing, radii,
  elevation, motion, textures).
- `assets/` — wordmarks.
- `preview/` — specimen cards for every part of the system (the Design
  System tab reads these via `<!-- @dsCard group="…" -->` tags).
- `ui_kits/dashboard/` — hi-fi prototype showing the runtime rendering
  **multiple consumer domains** (code-health, agent-runs, ci-pipeline,
  knowledge-base) to prove consumer-agnostic.
- `prompts/` — 14 briefings ready to paste into claude.ai/design,
  in order. Start with `INDEX.md`. Covers DS setup, the 3 layouts,
  cross-cutting states / command palette / live-SSE, the 5 widget
  groups, and the Claude-Code handoff.

## Iron rules

1. **Dark theme only.** Light theme is explicitly out of scope. Don't
   propose light variants unless the user opens that conversation.
2. **Files are canonical.** The UI is a projection of local files.
   Never imply system-of-record semantics — no "Saving…" spinners, no
   autosave anxiety, no "unsaved changes" warnings. Mutations are
   framed as *requests*, never *saves*.
3. **Consumer-agnostic vocabulary.** Tokens are semantic
   (`--status-success`, not `--phase-done`). Component names are
   generic (`Kanban`, not `PhaseBoard`). If a piece of UI assumes a
   specific domain, push back.
4. **127.0.0.1 indicator stays visible.** It is part of the brand —
   the trust contract is "localhost-only, zero telemetry" and the UI
   must reinforce that. See `preview/brand-localhost.html`.
5. **No team UI.** Single user. No avatars, no presence, no @mentions.
6. **Unicode > Lucide > custom SVG.** Stick to the glyph vocabulary
   in `README.md` before reaching for an icon library. Never hand-draw
   SVG for icons (placeholders for product imagery are fine).
7. **Density is a feature.** A consumer with 5 pages × 12-20 widgets
   per page fits a 13″ laptop without horizontal scroll. Don't
   "improve" the design with more whitespace.
8. **Widget consistency.** Every one of the 25 widgets uses the same
   canonical frame: 1px `--border-default`, 8px radius
   (`--radius-lg`), `--shadow-ambient`, header slot + body slot +
   optional footer. See `preview/widget-frame.html`.
9. **Glass = chrome only.** `--glass-thin/medium/thick` and
   `backdrop-filter: blur` are for the header, command palette,
   drawer, popovers. Never on a widget body.

## If the user invokes this skill without other guidance

Ask them what they want to build or design. Useful first questions:

- Production Vue 3 code or throwaway HTML prototype?
- Which consumer domain are they mocking — or are they building the
  runtime / a built-in widget?
- Which layout mode — `sections`, `grid`, or `single`?
- Which widgets are involved?
- Is this a generic widget (improves the runtime for everyone) or
  consumer-specific styling (lives in a manifest)?

Then act as an expert designer who outputs HTML artifacts or production
code, depending on the need.
