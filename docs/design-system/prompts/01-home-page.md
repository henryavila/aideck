# Briefing 1 — Home Page + Layout Shell

> Colar no chat do Claude Design apos o design system estar estabelecido.

```
This is the first screen briefing. Along with designing the Home page, please also establish the LAYOUT SHELL (top chrome, optional sidebar, main content area, optional banner slot, footer status bar) that all subsequent screens will sit inside.

WHAT THIS SCREEN SERVES

Home (path /) is the entry hub to all registered consumers. A consumer is any AI tool or data pipeline that has published a manifest.yaml declaring its pages, data sources, and widgets. Home shows the user which consumers are available and lets them jump into any one.

PERSONA AND MOMENT

A developer just ran `aideck serve` and a browser tab opened at http://127.0.0.1:7777. They have one or more AI tools installed that produce structured data, and they want to see which consumers are detected and healthy.

Alternatively: they ran `aideck demo` to evaluate the product. They've never used aiDeck before. They have 5 minutes to decide if this is worth setting up.

LAYOUT SHELL (visible on every screen)

The shell has four regions, top to bottom:

1. CHROME HEADER — 48px tall, glass-medium background with backdrop-filter blur. Contains:
   - aiDeck wordmark on the left (sans 14px / 600, plus a small cyan square that doubles as the "runtime live" indicator)
   - Breadcrumb after the wordmark: "/ consumer-name / page-name" (mono separators, muted intermediate segments, primary current segment)
   - Spacer (flex 1)
   - Command palette trigger in the center-right: a glass-thin pill ~260px wide, "⌕ jump anywhere" placeholder, ⌘K shortcut hint on the right. Cursor pointer.
   - 127.0.0.1 trust signal pill on the right: green dot (--status-success, with subtle glow) + monospace "127.0.0.1" + "· no telemetry". Always visible.
   - Two icon buttons at the far right: help (?) and menu (≡), each 28px square, ghost style.

2. OPTIONAL LEFT SIDEBAR — 200px wide, glass-thin background. Contains a consumer list (each row: colored dot + name + version meta) and, for the active consumer, its pages indented below. At the bottom, a compact "data sources" tree showing the consumer file paths. Sidebar can be hidden via a tweak.

3. MAIN CONTENT — fills remaining width. The page renders here. No fixed max-width (the design system is calibrated for 13" laptops to render densely).

4. FOOTER STATUS BAR — 26px, monospace 10px, muted. Shows: localhost dot + "127.0.0.1:7777" · "aideck v0.X.X" · "consumer · X v0.X.X" · "layout · sections" · spacer · "sse · N clients" · "read · N · write · 0" · "MIT". Like a status bar in iTerm2 or VS Code.

WHAT HOME RENDERS IN THE MAIN AREA

A header row: "consumers" eyebrow + count of registered consumers (e.g., "4 registered · 2 healthy"). Optional small action buttons on the right ("↻ refresh", "+ init consumer" — non-destructive guidance).

Below that, a responsive grid of CONSUMER CARDS. Each card:
- Standard widget frame (1px border-default, 8px radius, --shadow-ambient, --bg-surface)
- Padding ~14-16px
- Top row: a small icon (Lucide or emoji-ish glyph) + consumer title (sans 14px / 600) + a status pill on the right (--status-success "ready", --status-warning "parse error", --status-neutral "loading")
- Sub row: consumer ID in monospace (--font-mono 11px, --fg-subtle)
- A subtle horizontal divider (--border-subtle)
- Two-column meta block: "pages · N" / "data sources · M" / "version · 0.X.X" / "last seen · 2s ago" — each as a key-value pair (mono key in --fg-subtle, sans value in --fg-default)
- Hover: --shadow-sm + border --border-bright. Focus-visible: --shadow-focus.

For the EMPTY STATE (0 consumers): replace the grid with a centered block on the canvas-textured background:
- Small mono note "// no consumers registered" in --fg-subtle
- One-line message "Drop a manifest.yaml in ~/.aideck/consumers/ to begin."
- A monospace code line showing the init command: `aideck init-consumer my-tool`
- No illustrated graphic, no oversized hero. Terse.

For the ERROR STATE per card (manifest parse error): the card uses --status-error-line border and shows the error reason in --fg-muted mono below the meta block ("manifest.yaml:42 · unexpected ',' "). Do not hide broken consumers.

DEMO MODE BANNER (optional slot between chrome and main)

When aiDeck launches with `aideck demo`, a non-dismissible banner sits just below the chrome (full-width, --status-warning-bg background, --status-warning-line border, monospace text):

  ⚠ DEMO MODE — seeded fixtures, not your data. Quit (Ctrl+C) to clean.

DEMO DATA TO USE FOR THE PREVIEW

Show three consumer cards on Home (mix of states):

  1. id: aideck-demo
     title: "aiDeck Demo"
     icon: rocket (or 🚀)
     pages: 3 (Overview, Task Board, Analytics)
     dataSourceCount: 3
     version: "0.1.0"
     status: ready (--status-success)

  2. id: code-health
     title: "code-health"
     icon: heart-pulse
     pages: 5
     dataSourceCount: 8
     version: "0.3.1"
     status: ready

  3. id: agent-runs
     title: "agent-runs"
     icon: bot
     pages: 3
     dataSourceCount: 4
     version: "0.2.0"
     status: parse error (--status-error) — show the error reason below the meta

Also include a fourth state in the briefing: an EMPTY state composition with no cards.

INTERACTIONS

- Click a consumer card → navigate to /<consumer-id>/ (its default page)
- Hover and focus states as described
- Command palette opens on ⌘K (Ctrl+K on Win/Linux) — establish the empty trigger; the full palette is briefed later
- The trust signal is non-interactive (the trust is the message; no popover)

SCALE AND EDGE CASES

- Common: 1-4 consumers — grid renders as 2-4 cards per row
- Heavy: 10-20 consumers — wraps gracefully, no horizontal scroll
- Empty: 0 consumers — centered guidance block
- Error: a consumer with parse error — card shown with error state, not hidden

NON-NEGOTIABLE CONSTRAINTS

- Dark-first only. No light theme.
- The chrome header and (if visible) sidebar are glass surfaces with backdrop-filter blur. Widget bodies are solid surfaces — never glass.
- Body canvas wears the --texture-grid background (radial dots, 28px grid).
- No "edit" or "configure" affordances on consumer cards. Consumers are configured via files.
- Consumer cards show real meta (pages, sources, version) — no placeholder text.
- Cards respond to keyboard: Tab to focus, Enter to navigate, focus ring visible.
- The layout shell must accommodate a page tab bar inside the consumer page (briefings 2-4).

OUT OF SCOPE

- No search across consumers (the command palette covers global navigation later).
- No consumer settings or configuration UI.
- No drag-to-reorder cards.
- No light-mode toggle.
```
