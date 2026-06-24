# Briefing 4c — Live / SSE indicators

> Colar no chat do Claude Design depois do briefing 4b. Define como o runtime sinaliza que dados estao chegando ao vivo via SSE.

```
WHAT THIS BRIEFING SERVES

aiDeck's REST + SSE API streams data updates from consumer files to the dashboard in real time. When a file on disk changes (a tool writes a new event, a CI run finishes), the runtime re-validates and re-broadcasts. This briefing defines how the UI signals which widgets are receiving live data, which are stale, and what happens during reconnect.

It threads through every widget — Log, Timeline, Stat, Table, Kanban — but the visual language is a small consistent set.

WHY THIS MATTERS

Developers don't trust dashboards that lie. If a Stat shows "142,381 requests" we must answer "as of when?" at a glance. The live/stale/disconnected signal is part of every widget's meta slot — it is not optional decoration.

THREE STATES IN ONE VOCABULARY

  live          — connected to SSE, last update ≤ 4s ago
  idle          — connected, no recent update (just no events)
  stale         — connected but no message for > 8-12s (configurable)
  disconnected  — SSE stream lost, reconnecting

THE FOUR ATOMS

(1) LIVE DOT

A 5-7px circle, rendered inline in widget headers' meta slot.

  live          → --status-success fill, 0 0 6px color-mix(--status-success 70%, transparent) glow
  idle          → --status-neutral fill, no glow
  stale         → --status-warning fill, no glow
  disconnected  → --status-warning fill with a slow pulse (1.6s opacity 0.4 ↔ 1)

The dot sits right of the meta text in the widget header:
  [w-title]                                 [meta · "live" or "12s ago"] [DOT]

(2) SCANLINE OVERLAY (.is-live)

A subtle, slow horizontal scan over the body of an SSE-connected widget. Defined as the texture --texture-scan (1px horizontal stripes, 3px gap, ~4.5% white) applied via a ::after pseudo-element at opacity 0.45, mix-blend-mode lighten, animating background-position from 0 to 240px over 12s linear infinite.

Apply to widgets that BENEFIT from a visible "this is alive" signal — Log Feed, Timeline, recent-events tables. Do NOT apply globally; a Stat tile does not need scan animation (the dot is enough).

Disable when prefers-reduced-motion is set.

(3) ROW HIGHLIGHT FLASH

When a NEW row appears in a Table, List, Log Feed, Kanban column, or Timeline (any "stream" widget), the new row briefly highlights:

  - Background fades in from --status-info @ 22% to transparent over 1.2s ease-out
  - For a Log Feed line: optional left edge in --status-info (2px) that fades out same duration
  - For a Kanban card that just moved between columns: an outer 1px glow ring (--shadow-glow-info shrunken) that fades over 1.2s

If multiple new rows arrive in the same SSE tick, they ALL highlight simultaneously (don't stagger).

Disable when prefers-reduced-motion is set.

(4) TRUST-SIGNAL PILL STATE (in chrome)

The chrome's "127.0.0.1" pill (briefing 1) reflects the GLOBAL SSE status:

  live + healthy → green dot + "127.0.0.1 · no telemetry"
  reconnecting   → amber dot pulsing + "127.0.0.1 · reconnecting…"
  disconnected   → amber dot static + "127.0.0.1 · offline · last seen 47s ago"

When state transitions, the pill morphs in place (~200ms color transition) — no layout shift.

PATTERNS PER WIDGET

LOG FEED (most live-flavored widget)
  - Meta slot in header: "streaming" (mono 10px / --fg-subtle) + LIVE DOT
  - Body: --bg-sunken; new lines highlight-flash; widget gets .is-live overlay
  - When at scroll-bottom, auto-follows new content. When user scrolls up, follow pauses and a small pill appears at the bottom: "↓ 4 new" — click to jump down + resume follow
  - On reconnect: a single mono line inserted at the top "↺ reconnected · 14:33:11" in --status-success

TIMELINE
  - Meta slot: "live" + LIVE DOT
  - New events insert at the TOP with row highlight flash on the new entry's content block
  - Spine dot of the latest event keeps a 2s sustained glow (slow pulse) so the eye finds it
  - Optional micro-banner above the spine: "1 new event · 2s ago" — dismisses on scroll

TABLE / LIST
  - Meta slot: row count + LIVE DOT (no "streaming" word — tables don't stream conversationally, they refresh)
  - New rows insert at the relevant sort position with the row flash (1.2s)
  - Removed rows fade out over 200ms before disappearing
  - Updated cells (value changed without row insertion): cell-level micro-flash, --status-info @ 18% bg for 600ms

KANBAN
  - Meta slot: total cards + LIVE DOT
  - Card move between columns: smooth 200ms transform (translateX) — not jarring, but visible
  - New card: appears in the destination column with row flash glow
  - Column count badge briefly highlights when its number changes

STAT / GAUGE / PROGRESS
  - Meta slot: time-since-update ("3s ago" — refreshes every second) + LIVE DOT
  - On value change: the number digit briefly transitions in color (--status-info @ 70% → --fg-default over 400ms). NO odometer flip, NO count-up animation.
  - Delta value (↑ 12.4%) recomputes silently — no flash on delta

CHARTS (line, bar)
  - Meta slot: window label + LIVE DOT
  - New data point: line smoothly extends to it over 200ms ease-out. NO redraw flash.
  - Bar that changes value: smooth 200ms transition on height (CSS or SVG attribute)

DISCONNECT BANNER (page-level)

When global SSE is disconnected, a thin banner appears just below the chrome:

  - Full-width, --status-warning-bg, 1px --status-warning-line top + bottom
  - Single row, 28-32px tall, mono 11px text:
      ⚠ Lost connection to aideck. Reconnecting every 4s. Last seen 47s ago.
  - Right-aligned: an icon-only "↺ retry now" ghost button

While disconnected, every widget's dot becomes amber (stale). When connection resumes, banner dismisses with 200ms fade and a single toast appears bottom-right: "↺ reconnected · 6 widgets refreshed" (auto-dismiss 3s).

VARIATIONS TO DESIGN

a) ATOMS gallery: live dot in its 4 states · scanline overlay on a Log body · row highlight flash captured mid-fade · trust pill in its 3 states
b) LOG FEED · live: full widget with streaming meta, scan overlay, 1 new line mid-flash
c) TIMELINE · live: top event mid-flash, spine dot sustained glow, "1 new event" micro-banner
d) TABLE · live: 1 new row inserted mid-flash, 1 cell mid-update-flash
e) KANBAN · card mid-move between columns
f) STAT · value transitioning (capture mid-fade)
g) CHART · line extended to a new point, with the previous frame ghosted behind
h) DISCONNECT BANNER · full page state with all widgets in stale (amber dot)
i) RECONNECT TOAST · bottom-right corner

INTERACTIONS

- Hover the live dot: tooltip "live · last update 2s ago"
- Click "↓ N new" pill in Log Feed: scrolls to bottom + resumes follow
- Click "↺ retry now" in disconnect banner: forces an immediate SSE reconnect attempt (idempotent if already attempting)
- prefers-reduced-motion: all flashes become solid 200ms color holds, no shimmer, no scan animation, no pulse. Information remains visible — just static.

NON-NEGOTIABLE CONSTRAINTS

- The live signal is INFORMATIONAL, not decorative. Every animation must communicate state, not delight.
- Reduced-motion compliant — flashes become static color holds, pulse stops.
- No SSE icon (lightning bolts, radio waves). The dot is the icon.
- No "you are live!" celebration toasts.
- Trust-signal pill in the chrome reflects global SSE state and is the source of truth — widget dots agree with it.
- All animations are ≤ 200ms unless they are passive (scan, dot pulse) and serve as ambient signal.

OUT OF SCOPE

- No WebSocket alternative (SSE only)
- No bandwidth or throughput meters in the UI (status bar's "sse · N clients" is enough)
- No event-history overlay (the Log Feed widget covers this)
```
