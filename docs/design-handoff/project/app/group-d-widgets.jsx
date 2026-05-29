/* eslint-disable */
/* aiDeck — Group D widgets: Tabs · Accordion · Container · GridColumns */

// ───── Tabs ──────────────────────────────────────────────────────────
function TabsWidget({ tabs, initial = 0 }) {
  const [active, setActive] = React.useState(initial);
  const refs = React.useRef([]);
  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); const n = (active + 1) % tabs.length; setActive(n); refs.current[n]?.focus(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); const n = (active - 1 + tabs.length) % tabs.length; setActive(n); refs.current[n]?.focus(); }
  };
  return (
    <div className="tabw">
      <div className="tabw-bar" role="tablist" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={i}
            ref={(el) => (refs.current[i] = el)}
            className={"tabw-tab" + (i === active ? " on" : "")}
            role="tab"
            aria-selected={i === active}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            <span>{t.label}</span>
            {t.count != null && <span className="tw-ct">{t.count}</span>}
          </button>
        ))}
      </div>
      <div className="tabw-body" role="tabpanel">
        {tabs[active].content}
      </div>
    </div>
  );
}

// ───── Accordion ─────────────────────────────────────────────────────
function AccordionItem({ item, openDefault }) {
  const [open, setOpen] = React.useState(!!openDefault);
  return (
    <div className="acc-item">
      <button
        className="acc-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="acc-caret">{open ? "▾" : "▸"}</span>
        <span className="acc-title">{item.title}</span>
        {item.tail && <span className={"acc-tail " + (item.tailTone || "")}>{item.tail}</span>}
      </button>
      {open && <div className="acc-body">{item.body}</div>}
    </div>
  );
}
function Accordion({ items }) {
  return (
    <div className="acc">
      {items.map((it, i) => (
        <AccordionItem key={i} item={it} openDefault={it.open} />
      ))}
    </div>
  );
}

// ───── Container (invisible wrapper) ─────────────────────────────────
function Container({ title, row, nested, children }) {
  return (
    <div className={"container-w" + (nested ? " container-nested-mark" : "")}>
      {title && <div className="container-title">{title}</div>}
      <div className={"container-w" + (row ? " is-row" : "")} style={{ gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

// ───── Grid Columns (invisible) ──────────────────────────────────────
function GridColumns({ cols = 2, uneven, children }) {
  const cls = uneven ? "c-uneven" : "c-" + cols;
  return <div className={"grid-cols " + cls}>{children}</div>;
}

// Small inline stat for container/grid demos
function MiniStat({ label, value, tone }) {
  return (
    <div className="w">
      <div className="w-head"><span className="w-title">{label}</span></div>
      <div className="w-body">
        <div className="stat-centered" style={{ minHeight: 80 }}>
          <span className="lbl">{label}</span>
          <span className={"v " + (tone || "")}>{value}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TabsWidget, Accordion, AccordionItem, Container, GridColumns, MiniStat });
