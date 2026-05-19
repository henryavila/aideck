# UI Prompts — aiDeck v0.1 (para Claude Design)

Prompts prontos para colar no [Claude Design](https://claude.ai/design) (web service da Anthropic, lançado abr/2026). Cada prompt assume que você já fez o setup abaixo uma única vez por sessão de design.

## Setup inicial (faça antes do primeiro prompt)

1. Abra **[claude.ai/design](https://claude.ai/design)** (Pro/Max/Team/Enterprise; precisa estar habilitado).
2. Crie um novo design project: **"aiDeck v0.1 dashboard"**.
3. Na seção "Link code repository" do onboarding, cole:
   ```
   https://github.com/henryavila/aideck
   ```
   Recomendado: linke o subdiretório `docs/` se a UI sugerir restringir (Claude Design adverte que repos grandes podem causar lag — `docs/` tem todo o spec sem ruído de scaffolding).
4. Quando o design system inicial for sugerido pelo Claude Design (ele lê `docs/ui-layouts.md` + esquemas e propõe tokens/cores), **aceite** se bater com o que está em [`docs/ui-layouts.md § Color tokens (dark theme)`](https://github.com/henryavila/aideck/blob/main/docs/ui-layouts.md). Caso diverga, peça para alinhar com as variáveis daquela seção. Esse design system será reaproveitado em todos os 8 prompts.
5. **(Opcional) Calibração de escala real**: o aiDeck precisa renderizar planos do tamanho do projeto sda-v2 v3-redesign (9 fases · 61 sub-fases · 8 trilhos paralelos). Esse repo é separado e provavelmente privado — se quiser que Claude Design veja, linke também `sda-v2` (subdir `docs/superpowers/plans/v3-redesign/`). Sem linkar, os prompts 5 e 6 incluem inline a estrutura crítica para calibrar.

## Ordem dos prompts

Execute em sequência. Cada um pressupõe que os anteriores estão prontos no workspace. Tempo total estimado: 3-5 horas de iteração visual + handoff.

1. [Design system + tokens](#1-design-system--tokens)
2. [Átomos compartilhados](#2-átomos-compartilhados)
3. [TopChrome — header global](#3-topchrome--header-global)
4. [HomeView + DemoBanner](#4-homeview--demobanner)
5. [PlanView — bird's-eye (F5)](#5-planview--birds-eye-f5)
6. [InitiativeView — zoom (F6)](#6-initiativeview--zoom-f6)
7. [HelpView — skills directory (F7)](#7-helpview--skills-directory-f7)
8. [AnnotationPanel + HighlightBadge (F11/F12)](#8-annotationpanel--highlightbadge-f11f12)

## Convenção dentro dos prompts

Onde aparece "consult repo file X", o agente Claude Design consulta `https://github.com/henryavila/aideck/blob/main/X` via o link configurado no setup. Se você não linkou o repo, copie e cole o conteúdo do arquivo dentro da mensagem antes do prompt.

## Stack alvo

- Vue 3 + Composition API + `<script setup>` + TypeScript strict
- CSS vars puro (sem Tailwind — não está nas deps do projeto)
- Pinia para state, Vue Router 4 para rotas
- Sem libs UI externas — átomos feitos à mão
- `marked` para markdown body; `mermaid` lazy-loaded para dependency graph

Claude Design pode renderizar previews em React/HTML por default. Quando você fizer **Handoff to Claude Code** ao final, peça para converter para Vue 3 SFC seguindo a stack acima. (Detalhe no fim do doc.)

## Iron laws (válidas em toda tela)

- Dark-first, localhost-only, sem telemetria
- aiDeck NÃO muta entity files — botões de mutação disparam MCP tools que apendam intents (etapa 07 do plano)
- WCAG AA contrast 4.5:1 (texto) / 3:1 (UI)
- Sem FOUC

---

## 1. Design system + tokens

**Objetivo**: validar e refinar com Claude Design os tokens (cores, typography, spacing, shadows, radii, transitions, z-index) que servirão de base para todas as telas. Output esperado: design system aprovado dentro do workspace + opcionalmente um preview de "tokens showcase" (uma página renderizando swatches, tipografia, sombras).

**Prompt:**

````
You are setting up the design system foundation for aiDeck, an AI-native local
dashboard runtime. This is step 1 of 8 prompts.

## Read first (in the linked repo henryavila/aideck)

1. docs/why.md — sections "Why dark-first" and "What aiDeck IS" (sets the tone)
2. docs/ui-layouts.md — entire file. The section "Color tokens (dark theme)"
   is your exact starting palette; the wireframes inform spacing/density needs
3. CLAUDE.md — "Iron Laws" section (especially #4 about no telemetry and
   localhost-only, which informs trust signals in the UI)

## Goal

Establish the canonical design system for the aiDeck dashboard inside this
Claude Design workspace, so prompts 2-8 can reference it consistently.

## Token list (from docs/ui-layouts.md — match exactly)

```
--bg-canvas: #0d1117       page background, never inside cards
--bg-surface: #161b22      cards, panels, top chrome
--bg-elevated: #1f262e     hover, modals, dropdowns
--fg-default: #e6edf3      primary text
--fg-muted: #8b949e        secondary text
--fg-subtle: #6e7681       tertiary text
--accent-cyan: #58a6ff     active state, current phase, HERE marker, links
--accent-green: #56d364    done, met gates
--accent-amber: #d29922    warn, blocked tasks, parked items, DEMO banner
--accent-red: #f85149      critical highlights
--accent-magenta: #db61a2  parked items secondary
--accent-purple: #a371f7   emerged items
--border-default: #30363d
--border-subtle: #21262d
```

## Tokens to add beyond the wireframe (you propose; I'll review)

- Spacing scale: 4/8/12/16/20/24/32/64 px
- Font stack: system-ui sans + ui-monospace mono
- Font sizes: xs 11, sm 12, base 14, lg 16, xl 18, 2xl 20, 3xl 24
- Line heights: tight 1.2, normal 1.5, relaxed 1.7
- Radii: sm 4, md 6, lg 10
- Shadows: sm (cards), md (modals), focus (accent-cyan glow)
- Transitions: fast 120ms, base 200ms
- Z-index scale: base 1, dropdown 100, drawer 200, modal 300, toast 400

## Status icon vocabulary (used across screens)

```
✓ done     → --accent-green
◉ active   → --accent-cyan
· pending  → --fg-muted
⊘ blocked  → --accent-amber
⌂ parked   → --accent-magenta
⇥ emerged  → --accent-purple
⚑ highlight → color by severity
```

## Verifier badge colors (used in initiative view)

```
shell  → --accent-green pill
query  → --accent-cyan pill
test   → --accent-purple pill
manual → --fg-muted pill
```

## Deliverables in this workspace

1. Approved design system (tokens registered with Claude Design so subsequent
   screens auto-apply)
2. A single "tokens showcase" preview page rendering:
   - Color swatches with name, hex, when-to-use
   - Typography scale (h1-h6 + body + small + mono)
   - Spacing scale visualized as stacked rectangles
   - Border radii samples
   - Shadow samples on cards
   - Status icon row with all 7 glyphs labeled
   - Verifier badge row with all 4 kinds

## Constraints

- Dark theme ONLY in v0.1. Don't propose light mode tokens (deferred to v0.2).
- WCAG AA: bg-canvas vs fg-default = 14:1 (great); verify accent colors
  against bg-surface visually — flag any below 3:1 for UI elements.
- No external UI framework. The team's stack is plain CSS vars + Vue 3.

## Don't

- Don't design components yet (Button, Card, Modal) — those come in prompt 2.
- Don't propose icon library integrations. Status icons are Unicode glyphs;
  artifact-link icons are emoji. No lucide/heroicons.
- Don't propose animations beyond hover/focus transitions.

When you finish, summarize: "Design system established. 14 colors + spacing
+ typography + status vocabulary registered. Ready for prompt 2 (atoms)."
````

---

## 2. Átomos compartilhados

**Objetivo**: gerar os ~9 componentes atômicos reusados em todas as telas. Faça antes das telas grandes para evitar refactor.

**Prompt:**

````
You are creating the atomic component layer for aiDeck. Step 2 of 8. The
design system (tokens) was established in prompt 1 and applies automatically.

## Read first (linked repo henryavila/aideck)

1. docs/ui-layouts.md — the "Atomic components reused across views" list near
   the bottom; also inline usage in every wireframe
2. src/schemas/common.ts — types ArtifactRef, Annotation, Highlight
3. src/schemas/project-status.ts — types TaskStatus, GateStatus, StackFrameType,
   ExitCriterionVerifier

## Atoms to design (preview each in this workspace)

1. **StatusIcon** — props `{status: 'done'|'active'|'pending'|'blocked'|'parked'|'emerged'|'highlight'}`. Renders the Unicode glyph from the status vocab established in prompt 1, color-coded.

2. **TagChip** — small pill for task tags. Predefined colors: `critical` red, `gap-legacy` purple, default muted gray. Inline, wraps in flexbox.

3. **TaskCountBadge** — `<done>/<total>` with color shifting toward green as ratio approaches 1.0 (use HSL interpolation: 0% = muted, 50% = amber, 100% = green).

4. **ExitGateBadge** — `<met>/<total> gates met` with same color logic as TaskCountBadge.

5. **VerifierBadge** — color-coded pill: shell green, query cyan, test purple, manual muted. Hover tooltip shows the verifier `command` / `sql` / `pattern` / `description`. Max-width tooltip 320px with overflow wrap.

6. **HighlightBadge** — `⚑{count}` with color of highest severity (info=cyan, warn=amber, critical=red). Props `{count, severity, reason?}`. Hover tooltip shows reason text. Clickable.

7. **ArtifactLink** — renders a reference like `{kind: 'file', path: 'docs/...', label: '...', gitignored: true, inside_repo: false}`. Layout: `{icon by kind} {label or path} {badge if gitignored} {badge if external}`. Icons: 📄 file, 🔗 url, 📁 repo-path, § section. Mono font for paths.

8. **MarkdownBody** — renders a markdown string (headings, paragraphs, lists, code, links, blockquotes). Code blocks have `--bg-elevated` background. Links use `--accent-cyan`. Blockquotes have left border. Max-width 80ch for readability.

9. **RelativeTime** — given ISO timestamp prop, renders "30 min ago" / "2 hrs ago" / "3 days ago" / "1 week ago". Muted color, --text-xs.

## Preview page in this workspace

Build a single "atoms catalog" page rendering each atom 3-5 times with
different prop combinations:

- StatusIcon: all 7 statuses in a row, labeled
- TagChip: critical + gap-legacy + 3 random tags
- TaskCountBadge: 0/8, 3/8, 7/8, 8/8 (color progression visible)
- ExitGateBadge: 0/3, 2/3, 3/3
- VerifierBadge: one of each kind with hover demo
- HighlightBadge: one info (count 1), one warn (count 2), one critical (count 1)
- ArtifactLink: 4 variants (file inside_repo, file gitignored, url, repo-path external)
- MarkdownBody: render this string verbatim:
  ```
  # F0 — Foundation Repair

  ## Why

  Two known bugs at `backend/app/Console/Commands/CollectionMigrateTenant.php:73`
  and `:102-110`. Need rewrite.

  - Item 1
  - Item 2

  > Important note in blockquote.
  ```
- RelativeTime: 30 min ago, 2 hrs ago, 3 days ago, 1 week ago

## Constraints

- Every atom must support `:focus-visible` with the focus shadow token
- Every interactive atom needs aria-label
- No icon library; Unicode glyphs and emoji only
- Use the design system tokens from prompt 1 exclusively

## Don't

- Don't create the AnnotationPanel here — that's prompt 8
- Don't add layout or page-level components — atoms only

When you finish, summarize: "9 atoms designed. Catalog page rendered. Ready
for prompt 3 (TopChrome)."
````

---

## 3. TopChrome — header global

**Objetivo**: header sticky presente em toda view. Logo, breadcrumb dinâmico, botões Help/Highlights/Menu, skip link de acessibilidade.

**Prompt:**

````
You are designing the TopChrome — the sticky header present at the top of
every aiDeck view. Step 3 of 8. Design system (prompt 1) and atoms (prompt 2)
are in place.

## Read first

1. docs/ui-layouts.md — section "1. Top chrome (every view)" — ASCII
   wireframe and interaction notes
2. CLAUDE.md — accessibility & UX expectations (under "Code discipline")

## Wireframe (literal)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  aiDeck         /v3-redesign · F0 · v3-f0-foundation-repair    [?][⚑3][≡]  │
└────────────────────────────────────────────────────────────────────────────┘
   ▲              ▲                                              ▲  ▲   ▲
   logo           breadcrumb                                     │  │   menu
                                                                 │  highlights
                                                                 help
```

## Layout requirements

- Height 56px, padding 12px 20px
- `position: sticky; top: 0`
- Background `--bg-surface`, bottom border `1px solid --border-default`
- Flex row: Logo (left) / Breadcrumb (center, grows) / Right cluster (Help,
  Highlights, Menu) with 8px gap
- z-index `--z-base` (1) — drawers and modals layer above

## Breadcrumb states to design previews for

- **Home** (`/`): empty (Breadcrumb takes no space; right cluster pushes left)
- **Help** (`/help`): "Help"
- **Plan view** (`/plans/v3-redesign`): `/v3-redesign`
- **Initiative view with parent plan** (`/initiatives/v3-f0-foundation-repair`):
  `/v3-redesign · F0 · v3-f0-foundation-repair`
- **Standalone initiative**: `/(standalone) · v3-f0-foundation-repair`

Each segment is a clickable link. Hover shows underline + `--accent-cyan`.
Separator `·` is muted.

## Right cluster

- **HelpButton** `[?]` — links to /help. Aria-label "Open help / skill directory"
- **HighlightsButton** `[⚑N]` — shows badge when N>0 (uses HighlightBadge atom
  internally, severity = highest active). Click opens AnnotationPanel filtered
  to highlights. Aria-label "Show N highlights"
- **MenuButton** `[≡]` — toggles dropdown showing app version + "Demo mode"
  indicator + "Settings (v0.2)" disabled. Dropdown anchored to button right
  edge, z-index --z-dropdown (100)

## Accessibility

- Skip link at top of App, `class="sr-only"`, visible on focus, jumps to
  `#main-content`
- Every button has explicit aria-label
- `:focus-visible` uses focus shadow token
- Logo is a RouterLink, not a button (correct semantics)

## Preview screens

In this workspace, render TopChrome in 4 states side-by-side:

1. Home (empty breadcrumb)
2. Plan view (3-segment breadcrumb, no highlights)
3. Initiative view (full breadcrumb, 3 highlights badge in warn color)
4. Demo mode (additional banner above showing the DEMO warning — see prompt 4)

## Don't

- Don't add search to TopChrome (search lives only on /help)
- Don't add a notifications dropdown distinct from Highlights — they're the
  same surface in v0.1
- Don't add user avatar / login — aiDeck is single-user local

When done, summarize: "TopChrome + 4 state previews complete. Ready for prompt 4."
````

---

## 4. HomeView + DemoBanner

**Objetivo**: rota `/` mostra consumers detectados + entry points. `/demo` mostra welcome + banner DEMO sempre.

**Prompt:**

````
You are designing the HomeView (route /) and DemoView (/demo) for aiDeck.
Step 4 of 8.

## Read first

1. docs/ui-layouts.md — section "5. Demo home"
2. docs/api-examples.md — payloads `GET /api/consumers` and `GET /api/state/:consumer`
3. docs/why.md — section "What aiDeck IS" (tone for welcome copy)

## Screens to design

### HomeView (`/`)

```
┌─ TopChrome ───────────────────────────────────────────────────────────────┐
├─ DemoBanner (if health.demo === true) ────────────────────────────────────┤
├─ Welcome (only when consumers.length === 0 OR /demo route) ──────────────┤
│ <welcome copy + 2 CTAs>                                                  │
├─ Consumers ───────────────────────────────────────────────────────────────┤
│ ConsumerCard "project-status"                                            │
│   Active plans (cards):                                                  │
│     ┌─ PlanCard ──────────────────────────────────────────┐              │
│     │ v3-redesign — Plano v3 (Redesign)                    │              │
│     │ v1.0 · active · started 2026-05-19 · current F0      │              │
│     │ 9 phases · 61 sub-phases · 0/24 gates met            │              │
│     └──────────────────────────────────────────────────────┘              │
│   Standalone initiatives (rows):                                         │
│     ⌂ Some standalone work · active · updated 2 hrs ago                  │
│   Inbox: 2 unread annotations · 1 highlight                              │
└───────────────────────────────────────────────────────────────────────────┘
```

### DemoView (`/demo`)

Same as HomeView but: DemoBanner always renders + Welcome always shows + a
"Try these" section with 4 links:

- View demo plan: "Sample Migration Plan" → /plans/v3-redesign
- View demo initiative: "Phase F0 — Foundation" → /initiatives/v3-f0-foundation-repair
- Browse skills directory → /help
- Try MCP from Claude Code (config: see Help) → /help#mcp-setup

### DemoBanner (rendered in App layout when health.demo === true)

- Full-width strip above TopChrome
- Background `--accent-amber`, color `--bg-canvas`, weight 600
- Padding 8px 20px, text-align center
- Text verbatim: `⚠ DEMO MODE — seeded fixtures, not your data. Quit (Ctrl+C) to clean.`

## Welcome copy (use verbatim)

```
Welcome to aiDeck.

This dashboard renders structured data from local skills as a live,
interactive surface. AI agents can read and annotate the same data via MCP.

To use it on your project:

1) Install atomic-skills (deep integration)
   npm install -g @henryavila/atomic-skills
   atomic-skills setup
   aideck serve

2) Or build your own consumer:
   See docs/integration-spec.md and docs/mcp-tools.md
```

## Subcomponents to design

- **ConsumerCard** — header (id + title + root path + state badge), body with
  PlanCards + InitiativeRows + Inbox summary line
- **PlanCard** — clickable card. Shows title, version, status, branch, current
  phase, TaskCountBadge (aggregated across initiatives), ExitGateBadge,
  highlighted if currentPhase set. Click navigates to `/plans/:slug`.
- **InitiativeRow** — compact row: status icon + title + RelativeTime + Next
  action one-liner. Click navigates to `/initiatives/:slug`.

## Empty states

- No consumers: hide ConsumerCard region; show only Welcome
- Consumer with `state: 'empty'`: show ConsumerCard with "No plans or
  initiatives yet" placeholder
- Consumer with `state: 'error'`: show ConsumerCard with red border + error
  detail

## Preview deliverables

1. HomeView with 1 consumer ("project-status") having 1 plan (v3-redesign,
   9 phases) and 1 standalone initiative
2. HomeView empty state (no consumers) — only Welcome shows
3. DemoView with all 4 "Try these" CTAs visible + DemoBanner active
4. Standalone DemoBanner showing it would render above any view

## Don't

- Don't show plan internals (phases, tasks) here — that's PlanView
- Don't add filter/search on Home in v0.1
- Don't auto-redirect to /demo when demo flag is on — user lands on / and
  sees the banner

When done: "Home + DemoView + DemoBanner ready. Ready for prompt 5 (PlanView)."
````

---

## 5. PlanView — bird's-eye (F5)

**Objetivo**: a tela mais densa do produto. Precisa renderizar 9 fases / 8 trilhos / parallel pairs / cross-doc refs sem overflow. Esta é a tela onde aiDeck prova seu valor.

**Prompt:**

````
You are designing PlanView — the bird's-eye view of a Plan. This is the most
visually dense screen in aiDeck v0.1. It must render the real-world scale of
the sda-v2 v3-redesign plan (9 phases · 8 tracks · 61 sub-phases · parallel
F4∥F5 · ~30 cross-doc refs · external imports) without overflow or truncation.
Step 5 of 8.

## Read first (CRITICAL — these define the contract)

1. docs/ui-layouts.md — section "2. Plan bird's-eye view" — the ASCII wireframe
   is your source of truth. Reproduce the information hierarchy exactly.
2. docs/feature-contracts.md — section "F5. Project-status renderer — Plan
   bird's-eye view" — every bullet in the success gate is your acceptance test.
3. src/schemas/project-status.ts — types `Plan`, `PhaseDescriptor`, `Track`,
   `Principle`, `GlossaryTerm`, `ExitCriterion`, `InterPhaseGate`,
   `PlanSupersedeRef`, `ArtifactRef`. These are your data model.
4. fixtures/plans/v3-redesign.demo.md — primary test fixture. Read the
   frontmatter to understand realistic data shape.

## Real-world calibration

The fixture is a curated demo. The real target lives in a separate repo
(sda-v2 v3-redesign plan). Critical structural facts you must accommodate:

- 9 top-level phases (F0..F8)
- 8 tracks (A through H), grouping phases by domain
- F4 and F5 are explicitly marked `parallelWith` each other (only parallel pair)
- Each phase has 4-12 sub-phases (rendered in InitiativeView, not here)
- Each phase has an exit gate with verifiable criteria
- Cross-doc references include both `inside_repo: true` (gitignored or not)
  and `inside_repo: false` (external repos like `/Volumes/External/code/arch`)
- Plan has a long `narrative` markdown body (hundreds of lines)
- Plan has `principles[]` (6+) and `glossary[]` (8+)

## Wireframe (literal — from docs/ui-layouts.md section 2)

```
┌─ TopChrome ───────────────────────────────────────────────────────────────┐
├─ Plan header ─────────────────────────────────────────────────────────────┤
│ SDA v2 — Plano v3 (Redesign)             [Open narrative ▼] [Refs] [⌬]   │
│ v1.0 · active · started 2026-05-19 · branch v2-rebuild · current: F0     │
├─ Principles / Glossary (collapsible) ─────────────────────────────────────┤
│ ▾ 6 Principles                          ▾ 8 Glossary terms                │
├─ Phase tree (grouped by track) ───────────────────────────────────────────┤
│ TRACK A — Dados                                                          │
│   ┌─ F0 ◉ Foundation Repair · 3/8 tasks · 0/3 gates met ──────┐          │
│   │   audience: developer · scope: backend/app/...             │          │
│   │   exit: tag core-v2 + pipeline + 0 dup            ⚑[2]    │          │
│   │   ──────────────────────────────────────────────────────── │          │
│   │   Next: T-002 Pipeline dumps → PostgreSQL                  │          │
│   └────────────────────────────────────────────────────────────┘          │
│ TRACK B — UI Base                                                        │
│   ┌─ F1 Filament Redesign · 0/10 tasks · audience: admin ─────┐          │
│   │   imports: /Volumes/External/code/arch                     │          │
│   │   exit-gate-type: ui-gate                                  │          │
│   └────────────────────────────────────────────────────────────┘          │
│   ┌─ F2 Nuxt Redesign · 0/12 tasks · audience: end-user ──────┐          │
│   └────────────────────────────────────────────────────────────┘          │
│ TRACK C — Planejamento                                                   │
│   ┌─ F3 Planning Mode · 0/5 tasks · audience: líder de equipe ┐          │
│   └────────────────────────────────────────────────────────────┘          │
│   ┌─ F4 ∥ Ministry Oversight ──┐  ┌─ F5 ∥ Set Curation ──────┐          │
│   │ ∥F5 paralelo permitido     │  │ ∥F4 paralelo permitido    │          │
│   └────────────────────────────┘  └───────────────────────────┘          │
│ TRACK F-H — sequencial F6 → F7 → F8                                      │
│   ...                                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

## Components to design

### PlanHeader
- Title (h1, 24px), version + status + started + branch + current phase
  (subline, 14px, muted)
- Toolbar with 3 buttons: `[Open narrative ▼]`, `[Refs]`, `[⌬]`
- Current phase has cyan glow chip "F0 HERE"

### PrinciplesPanel + GlossaryPanel
- Native `<details>` collapsibles, side by side on desktop
- Header: "▾ 6 Principles" / "▾ 8 Glossary terms"
- Body: card per principle (title + body markdown), definition list for glossary

### PhaseTree (the main canvas)
- Group phases by `track` (lookup in `plan.tracks`)
- TrackHeader: band heading "TRACK A — Dados" with slightly elevated bg
- Inside each track, render PhaseCards (or ParallelGroup if 2+ phases share
  `parallelWith`)
- Collapse/expand per track via clicking the header

### PhaseCard
Internal layout:
- Top line: StatusIcon + phase id (F0) + title + "∥ parallel allowed" if applicable
- Sub-line: audience + scope (first 2 paths, "+N more" expandable)
- Body: exit gate summary text (1 line)
- TaskCountBadge (done/total tasks) — show `?/${subPhaseCount}` if not loaded
- ExitGateBadge (met/total gates)
- HighlightBadge if highlights on this phase
- Footer (only if currentPhase): "Next: <task title>" in --accent-cyan
- Click → navigate to `/initiatives/<phase.slug>`
- Cards have id `phase-F0` so `/plans/...#phase-F4` scrolls into view

Distinct visual treatment for:
- `exitGateType: 'standard'` — default border
- `exitGateType: 'ui-gate'` — extra label badge "UI Gate"
- `exitGateType: 'custom'` — extra label badge "Custom gate"

### ParallelGroup
- CSS grid 2-col equal width
- Vertical pipe `∥` label between cards, centered vertically
- Cards visually paired (shared accent color or connecting line)

### DependencyOverlay
- Toggled by `[⌬]` button. Renders an overlay/modal with a Mermaid graph TD
  showing phase dependencies. Dark theme. Lazy-loaded (~600KB chunk; only
  loads on toggle).

### ReferencesModal
- Lists `plan.references[]` using ArtifactLink atom
- Gitignored badge, external badge
- Scrollable if many

### NarrativePanel
- Collapsible (default closed). Toggled by `[Open narrative ▼]`
- When open, renders `plan.narrative` via MarkdownBody
- Max-height 2400px with "Show more" if longer

## Visual density requirements

The wireframe groups phases by TRACK with horizontal bands. Make those bands
visually distinct:
- Track header: --bg-elevated background, full width, prominent
- Phase cards inside have a subtle left border colored by accent
- currentPhase has unmistakable highlight: glow + cyan icon + "HERE" badge
- F4 ∥ F5 pair has shared vertical line / paired visual treatment

## Preview deliverables in workspace

Render PlanView with realistic data:
1. **Full plan view** with 9 phases across 8 tracks, F0 as currentPhase
   (cyan glow), F4 ∥ F5 paired side-by-side, 2 highlights on F0
2. **Principles panel expanded** showing 6 principles as cards
3. **Glossary panel expanded** showing 8 terms
4. **Narrative panel expanded** with sample markdown body (use first 50 lines
   of the fixture's narrative)
5. **References modal open** with 12+ references mixed inside_repo/external,
   2 gitignored
6. **Dependency overlay open** with Mermaid graph showing F0→F1→F2→F3→F4∥F5→F6→F7→F8

## Empty / edge cases

- Plan with 0 phases → "No phases defined for this plan"
- Plan without tracks → list phases without grouping
- `parallelismAllowed: false` but a phase has parallelWith → render
  ParallelGroup with warning chip "marked parallel but plan disallows
  parallelism — verify"

## Don't

- Don't render Mermaid eagerly (lazy on toggle)
- Don't add "filter by status" controls in v0.1
- Don't expand narrative by default (hundreds of lines = bad UX)
- Don't add inline editing of any phase field — aiDeck is read-only on entity
  files (Iron Law 1)

When done: "PlanView with 6 preview states ready. Ready for prompt 6 (InitiativeView)."
````

---

## 6. InitiativeView — zoom (F6)

**Objetivo**: rota `/initiatives/:slug`, detalhe de uma iniciativa: tasks table, exit gates, stack, parked/emerged, cross-refs, markdown body.

**Prompt:**

````
You are designing InitiativeView — the zoom view of one Initiative. Step 6
of 8. Atoms (prompt 2), TopChrome (prompt 3), and PlanView (prompt 5) are
designed; reuse their components and visual language.

## Read first

1. docs/ui-layouts.md — section "3. Initiative zoom view" — ASCII wireframe
   is authoritative
2. docs/feature-contracts.md — section "F6. Project-status renderer — Initiative
   zoom view" — success gate
3. src/schemas/project-status.ts — types Initiative, Task, StackFrame,
   ParkedItem, EmergedItem, CrossTaskRef, ExitCriterion, TaskOutput, InitiativeScope
4. fixtures/initiatives/v3-f0-foundation-repair.demo.md — primary test fixture

## Wireframe (literal)

```
┌─ TopChrome ───────────────────────────────────────────────────────────────┐
├─ Initiative header ───────────────────────────────────────────────────────┤
│ F0/9 · plan: v3-redesign                                                 │
│ v3-f0-foundation-repair · active · 2026-05-19 → ...                       │
│ Goal: Resolver dados antes de qualquer trabalho de UI.                    │
│ Branch: v2-rebuild · Scope: backend/app/.../* + scripts/* + migrations/* │
│ Next: T-002 Pipeline dumps → PostgreSQL                                   │
├─ Exit gates (3) ──────────────────────────────────────────────────────────┤
│ [·] F0-G1  Tag git core-v2 criada           [shell] git tag | grep core-v2│
│ [·] F0-G2  Query retorna 0 duplicatas       [query] SELECT COUNT(*)...   │
│ [·] F0-G3  scripts/full-pipeline.sh exit 0  [shell] bash scripts/...     │
├─ Stack (depth 1) ─────────────────────────────────────────────────────────┤
│ └─ F0 kickoff (task) ◉ HERE                                              │
├─ Tasks ───────────────────────────────────────────────────────────────────┤
│ ID     Title                                  Status   Updated            │
│ ──────────────────────────────────────────────────────────────────────── │
│ T-001  Restore local infra                    ✓ done   2 hrs ago     ⚑   │
│ T-002  Pipeline dumps → PostgreSQL            ◉ active 30 min ago   [▾]  │
│        > description, outputs[2], verifier preview ...                   │
│ T-003  Unificação do modelo Álbum             · pend   --                │
│ T-004  Cleanup tenant songs                   · pend   --                │
│ T-005  Reescrever matcher           [critical][gap-legacy] ⊘ blocked     │
│        blocked by: T-003, T-004                                          │
│ T-006  Validação humana via HTML report       · pend   --                │
│ T-007  Re-run pipeline + verify               · pend   --                │
│ T-008  Tag core-v2 + archive + snapshot       · pend   --                │
├─ Parked (0) ──────────────── Emerged (1) ────────────────────────────────┤
│ (empty)                       ⇥ Investigate Patrimony Clone              │
│                                 surfaced 5 hrs ago · not promoted        │
├─ References / Cross-refs ─────────────────────────────────────────────────┤
│ → ../plans/v3-redesign.md § F0 — Foundation Repair                       │
│ → ../../RUNBOOK.md § §2 pipeline de dados                                │
│ ↗ T-005 unblocks v3-f1-filament-redesign T-002                           │
├─ Narrative body (markdown rendered) ──────────────────────────────────────┤
│ # F0 — Foundation Repair                                                  │
│ ## Why                                                                   │
│ ...                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

## Components to design

### InitiativeHeader
- Sticky-ish header (sticks only below TopChrome on scroll, then unsticks)
- Line 1: breadcrumb `<phaseId>/<total> · plan: <parentPlan>` or `(standalone)`
- Line 2: slug + status badge + started → lastUpdated relative
- Line 3: "Goal: <text>"
- Line 4: branch + scope (truncate paths to 3 + "(N more)" expandable)
- Line 5: "Next: <nextAction>" prominently in --accent-cyan

### ExitGateList + ExitGateRow
- "Exit gates (N)" header
- Each row: StatusIcon + criterion id + description + VerifierBadge (right-aligned)
- Click row → inline expand showing verifier definition as code block
- "Run" button visible only for shell verifiers
- Met gates show ✓ + timestamp
- Deferred gates show ⊘ + deferred reason

### StackTree + StackFrame
- Tree indent (16px per depth level)
- Color frame by type: task=cyan, research=purple, validation=green, discussion=muted
- Top (last) frame gets "◉ HERE" label

### TaskTable + TaskRow + TaskExpanded
- Table with sticky header row
- Columns: ID (mono, 80px) · Title (flex) · Status (icon, 32px) · Updated (relative, 80px)
- TagChip inline after title
- HighlightBadge in right cell
- Expand affordance `[▾]` reveals TaskExpanded inline
- TaskExpanded shows: description, outputs (chips with kind icon), verifier
  preview (small VerifierBadge), blockedBy as clickable chips
- Row ids: `task-T-002` so URL hash scrolls + expands
- Expand state persists across re-renders (Set<taskId> in component state)

### ParkedEmergedPanel
- Two-column layout: "Parked (N)" left · "Emerged (N)" right
- Empty side shows "(empty)" placeholder
- Each item: status glyph + title + RelativeTime + "promoted" badge for emerged

### ReferencesList + CrossRefList
- ReferencesList: `→ {path} § {section}` rendered via ArtifactLink
- CrossRefList: `↗ {fromTaskId} {relation} {toInitiativeSlug}.{toTaskId}`
  with relation as styled chip, click navigates with hash for the target task

### MarkdownBody section
- Renders `initiative.body` via MarkdownBody atom
- Max-height 2400px with "Show more" if longer

## Visual density management

Initiatives can have up to 12 tasks (real target). Keep:
- TaskRow height tight: 40px collapsed, ~140px expanded
- Status icon column fixed width (32px) for alignment
- Tags wrap if too many in title cell
- Markdown body uses --leading-relaxed and max-width 80ch

## Preview deliverables

Render InitiativeView with the fixture v3-f0-foundation-repair data:

1. **Full view** showing all sections populated
2. **T-002 expanded** revealing description + outputs + verifier preview
3. **T-005 row** with both tags (`critical`, `gap-legacy`) and ⊘ blocked status,
   blockedBy chips visible
4. **Empty parked column** + **1 emerged item** (Patrimony Clone)
5. **CrossRef** "T-005 unblocks v3-f1-filament-redesign T-002" with hover note
6. **Standalone variant**: same view but breadcrumb shows `(standalone)`

## Don't

- Don't add task drag-and-drop reordering (read-only)
- Don't add inline editing (mutations via MCP, not UI)
- Don't render markdown body uncapped if it's very long
- Don't load verifier output history on initial render (lazy on expand)

When done: "InitiativeView with 6 preview states ready. Ready for prompt 7."
````

---

## 7. HelpView — skills directory (F7)

**Objetivo**: `/help` lista skills do ecossistema atomic-skills com search/filter/copy.

**Prompt:**

````
You are designing HelpView — the skills directory. Step 7 of 8.

## Read first

1. docs/ui-layouts.md — section "4. Help / Skills directory"
2. docs/feature-contracts.md — section "F7. Help page (atomic-skills discovery)"
3. docs/api-examples.md — `GET /api/help` payload

## Wireframe (literal)

```
┌─ TopChrome ────────────────────────────────────────────────────┐
├─ Search + Filters ─────────────────────────────────────────────┤
│ 🔍 Search skills...                Filter: [All▾] [In repo▾]   │
├─ Skill grid (cards) ───────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐│
│ │ project-status   │ │ parallel-dispatch│ │ hunt             ││
│ │ Track work via   │ │ Dispatch N tasks │ │ Adversarial      ││
│ │ initiatives.     │ │ in parallel.     │ │ tests find bugs. ││
│ │                  │ │                  │ │                  ││
│ │ When: starting,  │ │ When: indep task │ │ When: untested   ││
│ │ resuming work    │ │ list, off-keyb   │ │ code             ││
│ │                  │ │                  │ │                  ││
│ │ [/atomic-skills: │ │ [/atomic-skills: │ │ [/atomic-skills: ││
│ │  project-status] │ │  parallel-...]   │ │  hunt]           ││
│ │ [📋 copy]        │ │ [📋 copy]        │ │ [📋 copy]        ││
│ │ ● active in repo │ │ ○ available      │ │ ○ available      ││
│ └──────────────────┘ └──────────────────┘ └──────────────────┘│
│ (... 9 more cards ...)                                         │
└────────────────────────────────────────────────────────────────┘
```

## Components

### SearchBar
- Input, placeholder "🔍 Search skills..."
- Debounce 50ms (gate F7: filter < 50ms for 12 items)
- `[×]` clear button when value present

### FilterControls
- Pills/radios: All · In repo · Available
- Single-select

### SkillGrid
- CSS Grid: `repeat(auto-fill, minmax(280px, 1fr))` with 16px gap
- Renders SkillCards

### SkillCard
- Header: skill name (h3) + ActiveIndicator (● in repo green / ○ available muted)
- Body: purpose paragraph (line-clamp 3 lines)
- "When: <first whenToUse[0]>" line (or "—" if empty)
- "When NOT: <first whenNotToUse[0]>" if present
- Footer: copy-command pill `[/atomic-skills:<name>]` + 📋 button
- Click card body → opens SkillCardExpanded modal

### SkillCardExpanded (modal)
- Native `<dialog>` element, centered
- Header: name + close [×]
- Full purpose paragraph
- All whenToUse[] as bulleted list
- All whenNotToUse[] as bulleted list
- All examples[] as `<pre>` code blocks
- Related skills row: clickable chips that swap the expanded view to that
  skill (animate the swap, don't close+reopen)
- ESC closes

### CopyCommandButton
- 📋 icon button
- Click → navigator.clipboard.writeText(command)
- On success: trigger a toast "Copied!" (1.5s)

### ActiveIndicator
- ● green for active in repo (i.e., a `.atomic-skills/<skill-name>/` exists)
- ○ muted for available (registered in atomic-skills but not active here)

## Frontmatter-missing fallback

If skill arrives with only `name` and `purpose` (no whenToUse, no examples):
- Card body still shows purpose
- Badge "📝 metadata incomplete" next to the name
- "When:" line shows "—"
- Copy button works
- Expanded view shows "No detailed metadata available"

## Preview deliverables

1. SkillGrid with 12 skill cards (mix of "active in repo" and "available")
2. Search filter applied (typed "review" → grid narrows to skills containing
   "review")
3. SkillCardExpanded modal open for `project-status` with all sections populated
4. SkillCard with metadata-incomplete badge
5. Empty state when filter returns nothing: "No skills match your filters."
6. Toast "Copied!" overlay (bottom-center, fading out)

## Don't

- Don't add "Install skill" button (out of scope v0.1)
- Don't add per-skill ratings/comments (read-only)
- Don't add pagination (max 12 skills; grid handles it)

When done: "HelpView with 6 preview states ready. Ready for prompt 8."
````

---

## 8. AnnotationPanel + HighlightBadge (F11/F12)

**Objetivo**: drawer lateral + badges inline. Wire da interatividade que conecta tudo.

**Prompt:**

````
You are designing AnnotationPanel + HighlightBadge — the bidirectional human↔AI
feedback surface. Step 8 of 8 (final UI prompt).

## Read first

1. docs/ui-layouts.md — sections "6. Annotation panel" + "7. Highlight indicators"
2. docs/feature-contracts.md — sections "F11. Annotation panel" + "F12. Highlight indicators"
3. docs/api-examples.md — POST /api/annotate, POST /api/highlight, SSE events
   `annotation-added` / `highlight-added`
4. src/schemas/common.ts — types Annotation, Highlight, AnnotationTarget, Decision

## Wireframe (literal)

```
┌─── Annotations ───────── × ─┐
│ [Filter: target ▾]          │
│ [ all  human  ai  resolved ]│
├─────────────────────────────┤
│ ► v3-redesign/phases.F2/    │
│   tasks.T-005               │
│   ai · 2 hrs ago            │
│   ▌ Need to verify unicode  │
│   ▌ normalization for emoji │
│   ▌ edge cases.             │
│   [Resolve]                 │
│                             │
│ ► v3-f0-foundation-repair/  │
│   exitGates.F0-G2           │
│   human · 1 hr ago          │
│   ▌ This query might be     │
│   ▌ expensive on 50M rows.  │
│   ▌ Consider indexed view.  │
│   [Resolve]                 │
│                             │
└─────────────────────────────┘
```

## Components

### AnnotationPanel
- Slide drawer, right side, fixed positioning
- Width 360px, height calc(100vh - 56px), top 56px (below TopChrome)
- Background --bg-surface, left border 1px solid --border-default
- Transition transform var(--transition-base); closed state translateX(100%)
- z-index --z-drawer (200)
- Header (sticky inside drawer): title "Annotations" or "Highlights" + close [×]
- AnnotationFilter below header
- Body: scrollable list grouped by target

### AnnotationFilter
- Pills: All · Human · AI · Resolved
- Multi-select toggle (selected pills have --accent-cyan border)

### AnnotationEntry
- Author badge: 👤 human (cyan) / 🤖 ai (purple)
- RelativeTime
- Body in `<blockquote>` (left border, padding, italic)
- `[Resolve]` button if not resolved
- Resolved entries: 50% opacity + "(resolved)" tag, no Resolve button

### HighlightEntry (when panel filter kind === 'highlights')
- Severity dot (using HighlightBadge atom logic for color)
- Reason text (full, not truncated)
- Source badge (human / ai)
- `[Acknowledge]` button

### HighlightBadge (extended — atom from prompt 2)
- Adopt props `{targetKey: string}` now connecting to a store
  `highlightsStore.activeForTarget(targetKey)` returning Highlight[]
- Count = active.length (excluding acknowledged)
- Color = highest severity (info < warn < critical)
- Hover tooltip: first reason text (or "{N} highlights — click for details" if N > 1)
- Click → opens AnnotationPanel filtered to that target as highlights

## Wiring (functional spec for Claude Code handoff)

- HighlightsButton in TopChrome → opens panel with filter `{kind: 'highlights'}`
- Hotkey `]` toggles panel; ESC closes (not when input/textarea/dialog focused)
- SSE `annotation-added` → annotationsStore.add() → panel reactive update < 200ms
- Click [Resolve] → POST /api/annotation/:id/resolve → on success: entry fades
  + "(resolved)" tag added
- Click [Acknowledge] → POST /api/highlight/:id/acknowledge → on success:
  entry fades + parent badge count decrements

## Wireframe — HighlightBadge inline usage

In PhaseCard (PlanView), TaskRow (InitiativeView), ExitGateRow (InitiativeView):
the badge sits to the right of the title/id, color matching highest severity.
Hover shows reason; click opens AnnotationPanel.

```
F2  Nuxt Redesign  ⚑[1 info]
F3  Planning Mode  ⚑[2 warn]
F0  Foundation R.  ⚑[1 crit]
```

## Empty / edge cases

- Panel open, no annotations match filter: "No annotations match your filter"
- Highlight on a deleted entity (orphan target): show entry with "⚠ orphan
  target" badge
- Resolution POST fails: show inline error in entry with retry button

## Preview deliverables

1. **Panel open** showing 3 annotations grouped by 2 targets, 1 resolved
2. **Panel open with highlights filter** showing 3 highlights of different
   severities
3. **HighlightBadge inline** on a PhaseCard (info severity, count 1)
4. **HighlightBadge inline** on a TaskRow (critical severity, count 2)
5. **Toast confirming resolve**
6. **Empty state** with friendly placeholder
7. **Hotkey overlay** (a tiny tooltip near the panel showing "Press ] to toggle")

## Don't

- Don't allow inline editing of annotation body after creation
- Don't show decisions in panel in v0.1 (v0.2 feature)
- Don't persist panel open state in localStorage (always closed on load)
- Don't render more than 100 annotations without virtualization — for v0.1
  slice to 100 and show "showing 100 of N" footer

When done: "AnnotationPanel + HighlightBadge wiring complete. Ready for handoff
to Claude Code."
````

---

## Handoff to Claude Code

Após os 8 prompts, use o botão **"Handoff to Claude Code"** do Claude Design.

No prompt do handoff, inclua:

```
Convert this design system + 8 screens into Vue 3 SFC components for the
aiDeck project at https://github.com/henryavila/aideck.

Stack constraints:
- Vue 3 + Composition API + <script setup lang="ts">
- TypeScript strict mode
- Plain CSS using CSS vars (no Tailwind — not in package.json deps)
- Pinia for state management
- Vue Router 4 for routing
- marked for markdown body rendering
- mermaid lazy-loaded for dependency graph (etapa 11 in docs/implementation/)

File organization (already scaffolded):
- src/client/styles/theme.css — design tokens here
- src/client/components/atoms/ — atomic components
- src/client/components/chrome/ — TopChrome and sub-components
- src/client/components/plan/ — PlanView sub-components
- src/client/components/initiative/ — InitiativeView sub-components
- src/client/components/help/ — HelpView sub-components
- src/client/components/annotation/ — AnnotationPanel sub-components
- src/client/views/ — page-level views (HomeView, DemoView, PlanView,
  InitiativeView, HelpView)
- src/client/stores/ — pinia stores (state, sse, ui, annotations, highlights,
  help, toast)
- src/client/router.ts — uses createWebHistory (NOT hash); SPA fallback is
  configured server-side in Hono per docs/implementation/05-hono-rest-sse.md

Apply Iron Laws from docs/CLAUDE.md:
- Dark theme only in v0.1
- localhost-only, no telemetry
- aiDeck never mutates entity files — mutation buttons emit @intent events
  that the implementation layer (step 07 of docs/implementation/) wires to
  MCP intent recording
- WCAG AA contrast minimum

Follow the existing implementation plan in docs/implementation/INDEX.md;
the UI work corresponds to steps 10-14.
```

Esse handoff produz código Vue/TS aplicável diretamente ao repo via Claude Code (CLI ou Web). O design system permanece persistente no workspace Claude Design para iterações futuras (v0.2+).

## Quando re-executar um prompt

Se um preview gerado pelo Claude Design não bater com o wireframe ou com o gate da feature-contracts.md: cite a divergência específica ("section X said Y, current preview shows Z") e peça refino. Os prompts foram desenhados para serem determinísticos quando o agente consulta o repo linkado.

## Limites conhecidos do Claude Design no workflow aiDeck

- Output Vue 3 SFC nativo não é first-class — sai via handoff Claude Code que faz a conversão
- Não consegue testar interatividade real (SSE live updates) — isso fica para o dev server local após handoff
- Não conhece o backend Hono real; previews usam mock data — para validar contra dados reais use `aideck demo` localmente após handoff
