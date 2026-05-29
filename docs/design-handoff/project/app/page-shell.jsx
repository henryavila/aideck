/* eslint-disable */
/* aiDeck — consumer-page shell: tabs · page-title · section
   Generic chrome that sits inside <main> on any consumer page,
   regardless of layout mode (sections · grid · single).            */

// The 4 pages every consumer-demo page exposes. Each page picks one.
const TABS = [
  { id: "overview",    name: "Overview",    count: 8, layout: "sections" },
  { id: "task-board",  name: "Task Board",  count: 8, layout: "grid" },
  { id: "plan-detail", name: "Plan Detail", count: 1, layout: "single" },
  { id: "analytics",   name: "Analytics",   count: 4, layout: "sections" },
];

// ───── Page title row (consumer name · page name + meta + actions) ──
function PageTitleBar({ consumer, page, layout = "sections", refreshed = "3s ago", actions }) {
  return (
    <div className="page-title">
      <h1>
        <span>{consumer}</span>
        <span className="pt-sep"> · </span>
        <span className="pt-page">{page}</span>
      </h1>
      <span className="meta">
        <span>refreshed </span><span className="ok">{refreshed}</span>
        <span style={{ color: "var(--fg-faint)", margin: "0 6px" }}>·</span>
        <span>{layout} layout</span>
      </span>
      <div className="actions">
        {actions || (
          <>
            <button className="btn btn-ghost"><span className="gly">↻</span>refresh</button>
            <button className="btn btn-ghost"><span className="gly">↗</span>open in editor</button>
          </>
        )}
      </div>
    </div>
  );
}

// ───── Tab bar (sub-navigation inside a consumer page) ───────────────
function TabsBar({ active, onSelect, tabs = TABS, tail }) {
  const activeTab = tabs.find((t) => t.id === active);
  const layoutLabel = activeTab ? activeTab.layout : null;
  return (
    <div className="tabs-bar" role="tablist">
      {tabs.map((t) => (
        <span
          key={t.id}
          className={"tb" + (t.id === active ? " on" : "")}
          onClick={() => onSelect && onSelect(t.id)}
          role="tab"
          aria-selected={t.id === active}
        >
          <span>{t.name}</span>
          {t.count != null && <span className="ct">{t.count}</span>}
        </span>
      ))}
      <span className="tabs-tail">
        {tail || (layoutLabel && (
          <>
            <span>layout · {layoutLabel}</span>
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <span>{tabs.length} pages</span>
          </>
        ))}
      </span>
    </div>
  );
}

// ───── Section (sections-layout building block) ──────────────────────
// `kind` controls the inner grid:
//   undefined  → repeat(12, 1fr) — desktop default
//   "stats"    → stays 2-col on mobile (instead of stacking)
function Section({ title, count, sub, kind, defaultOpen, children }) {
  const [open, setOpen] = React.useState(defaultOpen !== false);
  return (
    <div className={"section" + (open ? "" : " collapsed")}>
      <div className="sec-head">
        <span className="caret" onClick={() => setOpen(!open)}>
          {open ? "▾" : "▸"}
        </span>
        <h2>{title}</h2>
        <span className="sub">
          {count != null && (
            <>
              <span>— </span>
              <span>{count} widgets</span>
              {sub && <>
                <span style={{ color: "var(--fg-faint)", margin: "0 5px" }}>·</span>
                <span>{sub}</span>
              </>}
            </>
          )}
          {count == null && sub && <>— {sub}</>}
        </span>
      </div>
      <div className={"sec-grid" + (kind ? " is-" + kind : "")}>{children}</div>
    </div>
  );
}

Object.assign(window, { TABS, PageTitleBar, TabsBar, Section });
