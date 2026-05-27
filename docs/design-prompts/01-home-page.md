# Briefing 1 — Home Page + Layout Shell

> Colar no chat do Claude Design apos o design system estar estabelecido.

```
This is the first screen briefing. Along with designing the Home page, please also establish the LAYOUT SHELL (top chrome, main content area, optional banner slot) that all subsequent screens will sit inside.

WHAT THIS SCREEN SERVES

Home (path /) is the entry hub to all registered consumers. A consumer is any AI tool or data pipeline that has published a manifest.yaml declaring its pages, data sources, and widgets. Home shows the user which consumers are available and lets them jump into any one.

PERSONA AND MOMENT

A developer just ran `aideck serve` and a browser tab opened at http://127.0.0.1:7778. They have one or more AI tools installed that produce structured data, and they want to see which consumers are detected and healthy.

Alternatively: they ran `aideck demo` to evaluate the product. They've never used aiDeck before. They have 5 minutes to decide if this is worth setting up.

INFORMATION THAT MUST BE ACCESSIBLE

On Home:
- Which consumers are registered and a summary for each: title, icon, number of data sources, number of pages.
- Quick visual health indicator: consumer loaded successfully vs. consumer has parse errors.
- For zero consumers: a clear, terse setup guidance ("No consumers registered. Run `aideck init-consumer` to create one.") — not an intimidating empty dashboard.

In the global layout shell (visible on every screen):
- Product name "aiDeck" linking back to home.
- Consumer navigation: when inside a consumer, tab bar or breadcrumb showing the consumer's pages.
- A subtle, persistent trust signal showing the localhost binding (e.g., "127.0.0.1:7778" somewhere in the chrome).
- An optional banner slot at the top for demo mode or system messages.
- Compact footer or chrome showing runtime info (version, consumer count).

DEMO DATA TO USE FOR THE PREVIEW

One consumer with these properties:
  id: aideck-demo
  title: "aiDeck Demo"
  icon: mdi:rocket (render as a rocket emoji or icon)
  dataSourceCount: 3
  pageCount: 3 (Overview, Task Board, Analytics)

Show both the populated state (1 consumer) and the empty state (0 consumers).

INTERACTIONS

- Click a consumer card → navigate to /<consumer-id>/ (its default page).
- Consumer card has subtle hover effect (border highlight or elevation change).
- In demo mode: a non-dismissible banner at the top reads "DEMO MODE — seeded fixtures, not your data."

SCALE AND EDGE CASES

- Common: 1-2 consumers.
- Heavy: 5-10 consumers — grid should wrap gracefully.
- Empty: 0 consumers — setup guidance.
- Error: a consumer with manifest parse error — card shows error state with reason, not hidden.

NON-NEGOTIABLE CONSTRAINTS

- Dark-first only.
- No "edit" or "configure" affordances on consumer cards — consumers are configured via files.
- Consumer cards must show real data counts, not placeholder text.
- Cards respond to keyboard: Tab to focus, Enter to navigate.
- The layout shell must accommodate a page tab bar for consumer pages (designed in briefings 2-4).

OUT OF SCOPE

- No search across consumers.
- No consumer settings or configuration UI.
- No drag-to-reorder consumer cards.
- No light-mode toggle.
```
