/* eslint-disable */
/* aiDeck — Group E widgets: kanban variants · timeline variants · log ·
   tree variants · breadcrumb · header-nav · drawer · search-filter */

// ───── Kanban (reference variants) ───────────────────────────────────
function KanbanRef({ columns, tasks, compact, rich }) {
  const grouped = columns.map((c) => ({ ...c, tasks: tasks.filter((t) => t.status === c.id) }));
  return (
    <div className="kb kb-ref kb-desktop" style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: 8 }}>
      {grouped.map((c) => {
        const tone = (KANBAN_TONE[c.id] || KANBAN_TONE.todo).tone;
        return (
          <div key={c.id} className="kb-col">
            <div className="kb-col-h">
              <span className={"accent tone-" + tone} />
              <span className={"name tone-" + tone}>{c.label}</span>
              <span className={"ct tone-" + tone}>{c.tasks.length}</span>
            </div>
            <div className="kb-cards">
              {c.tasks.length === 0 ? (
                <div className="kb-empty">// empty</div>
              ) : c.tasks.map((t) => (
                <div key={t.id} className={"kb-card " + (KANBAN_TONE[t.status]?.accent || "") + (compact ? " is-compact" : "")}>
                  <div className="row-top">
                    <span className="id">{t.id}</span>
                    {rich && <span className={"prio p-" + t.priority}><span className="pdot" /><span>p{t.priority}</span></span>}
                  </div>
                  <div className="ti">{t.title}</div>
                  {rich && t.tags && (
                    <div className="tags">
                      {t.tags.map((tag) => <span key={tag} className={"tk t-" + ((tag.length % 6) + 1)}>{tag}</span>)}
                    </div>
                  )}
                  {rich && (
                    <div className="kb-owner">
                      <span className="av">{(["Alice","Bob","Carol","Dave"][t.priority % 4] || "—")[0]}</span>
                      <span>{["Alice","Bob","Carol","Dave"][t.priority % 4]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───── Timeline (reference variants) ─────────────────────────────────
function TimelineRef({ events, compact, grouped }) {
  if (grouped) {
    const byDay = {};
    events.forEach((e) => {
      const day = e.ts.slice(0, 10);
      (byDay[day] = byDay[day] || []).push(e);
    });
    return (
      <div className="tl">
        {Object.entries(byDay).map(([day, evs]) => (
          <React.Fragment key={day}>
            <div className="tl-day-head">{day}</div>
            {evs.map((e, i) => <TLRow key={i} e={e} />)}
          </React.Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className={"tl" + (compact ? " tl-compact" : "")}>
      {events.map((e, i) => <TLRow key={i} e={e} compact={compact} />)}
    </div>
  );
}
function TLRow({ e, compact }) {
  const tone = EVENT_TONE[e.kind] || "neutral";
  return (
    <div className={"tl-row " + tone}>
      <div className="tl-head">
        <span className="tl-ts">{shortTime(e.ts)}</span>
        <span className={"tl-tag " + tone}>{e.kind}</span>
      </div>
      <div className="tl-ti">
        <span className="id">{e.refId}</span>
        <span>{e.title.replace(e.refId + " ", "").replace("Task ", "").replace("Project ", "")}</span>
      </div>
      {!compact && <div className="tl-sub"><span className="by">by</span> {e.by}</div>}
    </div>
  );
}

// ───── Log Feed (reference variants) ─────────────────────────────────
const LOG_LINES = [
  { ts: "14:00:00", lv: "ok",   msg: "Task ", key: "T-001", tail: " marked done", val: "Alice" },
  { ts: "13:30:00", lv: "info", msg: "Task ", key: "T-002", tail: " started",     val: "Alice" },
  { ts: "12:00:00", lv: "warn", msg: "Project ", key: "proj-3", tail: " paused",  val: "Carol" },
  { ts: "11:14:08", lv: "err",  msg: "validate ", key: "tasks.yaml:88", tail: " failed" },
  { ts: "10:02:51", lv: "ok",   msg: "Task ", key: "T-007", tail: " marked done", val: "Dave" },
  { ts: "09:48:12", lv: "info", msg: "sse client connected" },
];
function LogFeedRef({ lines, scroll }) {
  return (
    <div className="log" style={scroll ? { maxHeight: 150, overflowY: "auto" } : {}}>
      {lines.map((l, i) => (
        <span key={i} className="log-row">
          <span className="ts">{l.ts}</span>{" "}
          <span className={"lv " + l.lv}>{(l.lv + "   ").slice(0, 4)}</span>{" "}
          <span className="msg">{l.msg}</span>
          {l.key && <span className="key">{l.key}</span>}
          {l.tail && <span className="msg">{l.tail}</span>}
          {l.val && <span className="val"> {l.val}</span>}
        </span>
      ))}
    </div>
  );
}

// ───── Tree (reference variants) ─────────────────────────────────────
function buildDeepTree() {
  // category → project → task
  return [
    {
      id: "cat-product", name: "Product", kind: "category", status: "active",
      children: PROJECTS.slice(0, 2).map((p) => ({
        id: p.id, name: p.title, kind: "project", status: p.status,
        children: TASKS.filter((t) => t.project === p.id).map((t) => ({
          id: t.id, name: t.title, kind: "task", status: t.status, priority: t.priority,
        })),
      })),
    },
    {
      id: "cat-infra", name: "Infrastructure", kind: "category", status: "paused",
      children: PROJECTS.slice(2, 4).map((p) => ({
        id: p.id, name: p.title, kind: "project", status: p.status,
        children: TASKS.filter((t) => t.project === p.id).map((t) => ({
          id: t.id, name: t.title, kind: "task", status: t.status, priority: t.priority,
        })),
      })),
    },
  ];
}

// ───── Breadcrumb ────────────────────────────────────────────────────
function Breadcrumb({ segments, truncate }) {
  let segs = segments;
  let collapsed = false;
  if (truncate && segments.length > 3) {
    segs = [segments[0], { label: "…", ellip: true }, segments[segments.length - 1]];
    collapsed = true;
  }
  return (
    <div className={"crumbw" + (truncate ? " truncate" : "")}>
      {segs.map((s, i) => {
        const last = i === segs.length - 1;
        return (
          <React.Fragment key={i}>
            <span className={"seg" + (last ? " current" : (i > 0 && i < segs.length - 1 ? " mid" : "")) + (s.ellip ? " ellip" : "")}>
              {s.label}
            </span>
            {!last && <span className="sep">/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ───── Header Nav ────────────────────────────────────────────────────
function HeaderNav({ links, active, glyphs, wrap }) {
  return (
    <div className={"hnav" + (wrap ? " wrap" : "")}>
      {links.map((l) => (
        <span key={l.id} className={"hnav-link" + (l.id === active ? " on" : "")}>
          {glyphs && l.glyph && <span className="gly">{l.glyph}</span>}
          <span>{l.name}</span>
        </span>
      ))}
    </div>
  );
}
function VerticalNav({ links, active }) {
  return (
    <div className="vnav">
      {links.map((l) => (
        <span key={l.id} className={"vnav-link" + (l.id === active ? " on" : "")}>
          {l.glyph && <span className="gly">{l.glyph}</span>}
          <span className="vn-name">{l.name}</span>
          {l.count != null && <span className="vn-ct">{l.count}</span>}
        </span>
      ))}
    </div>
  );
}

// ───── Drawer ────────────────────────────────────────────────────────
function DrawerDemo({ side = "right", overlay, children, title }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className={"drawer-demo" + (open ? " open" : "")}>
      <span className="dd-hint">{side} drawer{overlay ? " · overlay" : ""}</span>
      <button className="btn btn-secondary dd-open-btn" onClick={() => setOpen(true)}>
        <span className="gly">⌗</span>open drawer
      </button>
      <div className="drawer-backdrop-local" onClick={() => setOpen(false)} />
      <div className={"drawer-panel from-" + side}>
        <div className="drawer-head">
          <span className="dh-title">{title || "Filters"}</span>
          <button className="dh-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

// ───── Search Filter ─────────────────────────────────────────────────
function SearchFilter({ placeholder = "Search…", chips, instant, rows }) {
  const [q, setQ] = React.useState("");
  const [activeChips, setActiveChips] = React.useState(chips || []);
  const filtered = instant && rows
    ? rows.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()))
    : null;
  return (
    <div>
      <div className="searchw">
        <span className="s-ico">⌕</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        {q && <button className="s-clear" onClick={() => setQ("")}>✕</button>}
      </div>
      {activeChips && activeChips.length > 0 && (
        <div className="filter-chips">
          {activeChips.map((c, i) => (
            <span key={i} className={"filter-chip " + (c.tone || "info")}>
              <span className="fc-k">{c.k}:</span>
              <span>{c.v}</span>
              <span className="fc-x" onClick={() => setActiveChips((cs) => cs.filter((_, j) => j !== i))}>×</span>
            </span>
          ))}
          <span className="filter-chip add">+ add filter</span>
        </div>
      )}
      {instant && (
        <div className="search-results">
          {filtered.length === 0 ? (
            <div className="search-empty">// no results for "{q}"</div>
          ) : (
            <div className="lst">
              {filtered.map((r) => (
                <div key={r.id} className="lst-row">
                  <span className="l-lead">{r.id}</span>
                  <span className="l-title">{r.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  KanbanRef, TimelineRef, LogFeedRef, buildDeepTree,
  Breadcrumb, HeaderNav, VerticalNav, DrawerDemo, SearchFilter, LOG_LINES,
});
