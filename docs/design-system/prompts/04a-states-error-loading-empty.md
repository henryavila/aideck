# Briefing 4a — Cross-cutting states: error, loading, empty

> Colar no chat do Claude Design depois dos briefings 1-4 (layout shell + 3 layouts) e antes dos widgets. Este briefing estabelece os padroes de estado que TODAS as telas e widgets reaproveitam.

```
WHAT THIS BRIEFING SERVES

A consolidated reference for the four cross-cutting states every aiDeck surface must support: loading, empty, error, and offline/disconnected. These appear at three levels:

  1. WIDGET-LEVEL — inside a single widget body (one widget failed, the other 11 on the page still render)
  2. PAGE-LEVEL — the whole consumer page can't render (manifest parse error, missing data source, no page found)
  3. APP-LEVEL — the runtime itself is degraded (server unreachable, version mismatch)

Each level follows the same visual vocabulary: terse copy, monospace inline labels, no illustrated graphics, ALWAYS a concrete next step.

WHY THIS MATTERS

aiDeck readers are developers debugging their own consumer manifests. An empty state isn't a UX dead-end — it's a debugging hint. An error state isn't a apology — it's a structured suggestion. Treat error copy as documentation.

THE FIVE STATES (VOCABULARY)

  default     — has data, renders normally
  loading     — fetching from disk / waiting on first SSE message
  empty       — fetched ok, but the data is genuinely empty (0 rows, 0 events, []) 
  error       — fetch failed, parse failed, schema mismatch, runtime exception
  disconnected — SSE stream lost, last data is stale, awaiting reconnect

THE LANGUAGE CONTRACT

Every error in aiDeck has TWO parts the design must accommodate:

  1. THE FACT      — one line. Mono. "Parse error in runs.jsonl:412 · unexpected ','"
  2. THE SUGGESTION — one line. Mono, prefixed with "→". "→ Run `jq < runs.jsonl` to validate"

This is enforced by the ErrorResponse schema (see src/schemas/common.ts in the repo). The UI never shows an error without a suggestion field. If the runtime fails to provide a suggestion, the UI substitutes a generic one ("→ check the server log").

(A) WIDGET-LEVEL STATES — INSIDE ONE WIDGET

These live inside the canonical widget frame (the body slot, occasionally the header).

LOADING (skeleton shimmer):
  - Body content replaced with .skeleton placeholders shaped like the real widget
  - For a Stat widget: a 22-30px tall pill spanning ~60-70% of body width
  - For a Table widget: 4-6 rows of skeleton bars at row height, with a header-shaped skeleton on top
  - For a Chart widget: a chart-area-sized skeleton block
  - Shimmer animation: 1.6s ease-in-out infinite, semi-transparent diagonal sweep (`.skeleton::after`)
  - Meta slot shows "fetching" in mono 10px / --fg-subtle
  - No spinner. No "loading..." text.

EMPTY:
  - Vertical flex centered, 24-32px vertical padding
  - Line 1: small mono note in --fg-subtle, --font-mono 11px, "calt" 0 — typically a hint about WHY it's empty
      Examples: "// 0 rows" · "// no events today" · "// filter matched nothing"
  - Line 2: a short sans 12px / --fg-muted message describing the empty condition
      Examples: "No open issues match this filter." · "No events recorded yet." · "0 of 142 builds matched."
  - Line 3 (optional): a concrete next action in --accent-link with a trailing "→"
      Examples: "clear filter →" · "reset query →" · "view all 142 →"
  - The action is mono 10-11px, cursor: pointer, hover underline. Not a button — feels like a hyperlink.
  - NO illustrated svg, NO oversized "Nothing here yet!" graphic, NO emoji decoration.

ERROR:
  - The whole widget frame switches to coral:
      border-color: --status-error-line
      header background: color-mix(in srgb, --status-error 6%, transparent)
      header title color: --status-error, with leading × glyph in --font-mono / 700
  - Header meta slot shows "retry" as a small ghost link in --accent-link
  - Body uses col flex, gap 6px:
      Line 1 (sans 12px / --fg-default): the human-readable description ("Could not read runs.jsonl")
      Line 2 (mono 11px / --fg-muted / "calt" 0): the technical detail ("ENOENT · ~/.aideck/consumers/agent-runs/data/runs.jsonl")
      Line 3 (mono 11px / --status-info / "calt" 0): the suggestion, prefixed with "→" ("→ touch runs.jsonl to initialize")
  - On hover of "retry": triggers a refetch. Shows 200ms loading skeleton then either default or error again.

DISCONNECTED (stale data, SSE dropped):
  - Widget remains in default state with its last-known data
  - Meta slot adds a small amber dot + "stale · 14s" instead of the green live dot
  - Subtle 1px --status-warning-line border tint (or a faint amber outer glow via box-shadow color-mix)
  - When reconnects: small toast slides up from the bottom-right "↺ reconnected · 4 widgets refreshed", auto-dismisses in 3s

(B) PAGE-LEVEL STATES — WHOLE CONSUMER PAGE FAILED

When the manifest itself is broken or a top-level data source is missing, the page chrome (tab bar) still renders, but the main content area shows a single page-level state.

PAGE LOADING:
  - Chrome and page title render
  - Main area shows a centered, narrow column (max-width ~480px)
  - Three skeleton blocks: one short (page title), one medium (subtitle), one tall (a "widget" placeholder)
  - Meta below the skeletons: mono 10px / --fg-subtle, "loading manifest…"

PAGE EMPTY (consumer has 0 pages, or 0 widgets in this page):
  - Centered narrow column on the body texture (--texture-grid background remains visible)
  - Headline: sans 16px / --fg-default — "This page has no widgets configured."
  - Sub: sans 12px / --fg-muted — "Edit `manifest.yaml` to add a widget."
  - Mono code line below: `~/.aideck/consumers/<id>/manifest.yaml` (selectable, copyable)
  - Optional "↗ open in editor" ghost button below

PAGE ERROR (manifest parse error, missing page):
  - The entire main content area becomes a single coral-bordered error card (1px --status-error-line, --status-error-bg, 8px radius, 16-18px padding)
  - Header strip: mono 10px / uppercase / --status-error — "manifest error" + filepath
  - Body (max-width ~720px):
      Line 1 (sans 14px / --fg-default / 600): the description, e.g., "Page slug `analytics` is not declared in manifest.yaml"
      Code preview (mono 11px, --bg-sunken, 8-10px padding, --radius-sm): a 5-7 line excerpt of the manifest showing the relevant region, with a tiny arrow pointing at the error line
      Line below: "→" + suggestion in --status-info mono — "→ Add the page or remove the route from `pages:`"
  - Actions row: "↻ reload" + "↗ open file" + "view full server log →" (link)

APP-LEVEL STATES — RUNTIME DEGRADED

APP CONNECTING (first paint, before /_sse is up):
  - Chrome header renders with the wordmark in --fg-default but trust-signal pill is greyed: --bg-elevated background, neutral dot, "127.0.0.1 · connecting…"
  - Main area shows a tiny skeleton: just the page title + 3-4 widget-shaped skeletons
  - No flash of error — wait 2-3s before showing anything more pessimistic

APP DISCONNECTED (server went away):
  - Trust-signal pill switches to --status-warning palette: amber dot (no glow), "127.0.0.1 · offline"
  - A persistent banner appears just below the chrome (full-width, --status-warning-bg, --status-warning-line border, 1px borders):
      ⚠ Lost connection to aideck. Reconnecting every 4s. Last seen 47s ago.
  - All visible widgets get the disconnected treatment (stale + amber meta)
  - No modal, no overlay — the dashboard remains readable with its last-known data

APP RECONNECTED:
  - Banner dismisses with a 200ms fade
  - Trust-signal pill returns to --status-success (green dot, "127.0.0.1 · no telemetry")
  - Toast in the bottom-right: "↺ reconnected" — auto-dismiss 3s

DEMO PAGE LAYOUT

Render a single scrollable demo page showing all states in canonical groupings:

  ## Widget · loading
  [stat skeleton] [table skeleton] [line-chart skeleton] [kanban skeleton]

  ## Widget · empty
  [list empty + action] [table empty + filter clear] [chart empty] [log empty]

  ## Widget · error
  [parse error · runs.jsonl] [tool timeout] [schema mismatch] [missing data source]

  ## Widget · disconnected
  [stat with stale meta] [log feed with no live dot] [chart with amber outer glow]

  ## Page · loading
  [centered skeleton column]

  ## Page · empty
  [no widgets configured]

  ## Page · error
  [manifest parse error card with code excerpt + suggestion]

  ## App · connecting / offline / reconnected
  [3 chrome variants stacked, each with trust-signal pill in its state]

NON-NEGOTIABLE

- Every error state INCLUDES A SUGGESTION (mono, "→" prefix, --status-info color). This is contractual — the ErrorResponse schema requires it.
- No illustrated empty states. Terse mono note + sans message + optional link action.
- No spinners. Skeleton shimmer only.
- No modal interrupts the user for app-disconnected. The dashboard stays usable with stale data.
- The trust-signal pill REFLECTS state: green = healthy + live, amber = degraded/disconnected, never disappears.
- Page-level error cards are clearly bounded coral surfaces — they do NOT take over the chrome.
- Copy is documentation. Treat every error/empty message as a hint a developer can act on.

OUT OF SCOPE

- No "retry-with-exponential-backoff" UI — the runtime handles backoff invisibly
- No "fallback data" or "demo data" prompt on error — empty is empty
- No "support" or "report bug" links anywhere
```
