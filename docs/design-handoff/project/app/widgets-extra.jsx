/* eslint-disable */
/* aiDeck — additional widgets: TreeView · BarChart · Gauge · TagCloud · BadgeWidget */

// ───── Tree View ─────────────────────────────────────────────────────
// Maps tasks under their projects from the shared data.jsx fixtures.
function buildPlanTree() {
  return PROJECTS.map((p) => ({
    id: p.id,
    name: p.title,
    kind: "project",
    status: p.status,
    children: TASKS.filter((t) => t.project === p.id).map((t) => ({
      id: t.id,
      name: t.title,
      kind: "task",
      status: t.status,
      priority: t.priority,
    })),
  }));
}

function TreeRow({ node, depth, expanded, onToggle, active, onSelect }) {
  const hasKids = node.children && node.children.length > 0;
  const open = expanded[node.id] !== false; // default open
  const info = statusInfo(node.status);
  return (
    <>
      <div
        className={
          "tree-row" +
          (node.kind === "project" ? " is-project" : " is-task") +
          (active === node.id ? " is-active" : "")
        }
        tabIndex={0}
        onClick={() => onSelect(node.id)}
      >
        <span
          className={"caret" + (hasKids ? "" : " empty")}
          onClick={(e) => { e.stopPropagation(); if (hasKids) onToggle(node.id); }}
        >
          {hasKids ? (open ? "▾" : "▸") : "·"}
        </span>
        <span className="glyph">{node.kind === "project" ? "▣" : "▸"}</span>
        <span className="tree-id">{node.id}</span>
        <span className="tree-name">{node.name}</span>
        {node.kind === "task" && node.priority != null && (
          <span className="tree-meta">p{node.priority}</span>
        )}
        {hasKids && (
          <span className="tree-meta">{node.children.length} {node.children.length === 1 ? "task" : "tasks"}</span>
        )}
        <span className={"tree-chip " + info.tone}>
          <span className="dot" />
          <span>{info.label}</span>
        </span>
      </div>
      {hasKids && open && (
        <div className="tree-children">
          {node.children.map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              active={active}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TreeView({ nodes }) {
  const [expanded, setExpanded] = React.useState({});
  const [active, setActive] = React.useState("proj-1");
  const toggle = (id) => setExpanded((m) => ({ ...m, [id]: m[id] === false ? true : false }));

  const projectCount = nodes.length;
  const taskCount = nodes.reduce((n, p) => n + (p.children ? p.children.length : 0), 0);

  return (
    <div className="w" style={{ flex: 1, minHeight: 0 }}>
      <div className="w-head">
        <span className="w-title">
          <span className="w-ico">⊟</span>
          <span>Plan Detail · tree</span>
        </span>
        <span className="w-meta">
          <span>{projectCount} projects</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>{taskCount} tasks</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>depth 2</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>source · projects.yaml + tasks.yaml</span>
        </span>
      </div>
      <div className="w-body" style={{ padding: 8 }}>
        <div className="tree">
          {nodes.map((n) => (
            <TreeRow
              key={n.id}
              node={n}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              active={active}
              onSelect={setActive}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── Bar Chart ─────────────────────────────────────────────────────
// data: [{ label, value, colorIdx }]
function BarChart({ title, meta, data, span, gridlines = 4 }) {
  const max = Math.max(...data.map((d) => d.value));
  // Round up to nearest "nice" max for gridlines
  const niceMax = Math.ceil(max);
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 6) }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body">
        <div className="bar-chart">
          <div className="bar-axis">
            {Array.from({ length: gridlines + 1 }).map((_, i) => {
              const v = (niceMax / gridlines) * (gridlines - i);
              const pct = (i / gridlines) * 100;
              return (
                <React.Fragment key={i}>
                  <div className="gridline" style={{ top: pct + "%" }} />
                  <div className="gridline-label" style={{ top: pct + "%" }}>
                    {Number.isInteger(niceMax / gridlines * (gridlines - i))
                      ? Math.round(v)
                      : v.toFixed(1)}
                  </div>
                </React.Fragment>
              );
            })}
            <div className="bar-row" style={{ "--bar-count": data.length }}>
              {data.map((d, i) => {
                const h = (d.value / niceMax) * 100;
                return (
                  <div key={i} className={"bar c-" + (d.colorIdx || 1)}>
                    <span className="bar-val">{d.value}</span>
                    <span className="bar-rect" style={{ height: h + "%" }} />
                    <span className="bar-tip">{d.label}: {d.value}</span>
                    <span className="bar-lbl">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Gauge (canonical primitive — matches widget reference 05) ─────
// Anatomy: track + fill semicircle · centered value · "of N" sub ·
// 0 / mid / max tick legend below. SVG only. Color set via the
// `color` prop which becomes a class on .gauge-fill so the stroke
// resolves from foundations.css tokens.
function Gauge({ title, meta, value, max, color = "chart-2", sub, span }) {
  const R = 80, CX = 100, CY = 90;
  const trackPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const ratio = Math.max(0, Math.min(1, value / max));
  const len = Math.PI * R;
  const dash = `${(len * ratio).toFixed(2)} ${(len).toFixed(2)}`;
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 6) }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body">
        <div className="gauge-wrap gauge-ref">
          <svg className="gauge-svg" viewBox="0 0 200 108">
            <path className="gauge-track" d={trackPath} strokeWidth="14" />
            <path className={"gauge-fill c-" + color} d={trackPath} strokeWidth="14" strokeDasharray={dash} />
            <text x="100" y="78" textAnchor="middle" className="gauge-value">
              {Number(value).toFixed(value < 10 ? 1 : 0)}
            </text>
            <text x="100" y="100" textAnchor="middle" className="gauge-sub">
              of {max}
            </text>
          </svg>
          <div className="gauge-ticks">
            <span>0</span>
            <span>{(max / 2) % 1 === 0 ? max / 2 : (max / 2).toFixed(1)}</span>
            <span>{max}</span>
          </div>
          {sub && (
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-subtle)",
              letterSpacing: "0.04em",
              fontFeatureSettings: "'calt' 0",
              marginTop: 2,
            }}>{sub}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Tag Cloud ─────────────────────────────────────────────────────
function TagCloud({ title, meta, tagCounts, span }) {
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 6) }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body">
        <div className="tag-cloud">
          {sorted.map(([tag, count], i) => (
            <span key={tag} className={"tag-chip t-" + ((i % 8) + 1)}>
              <span>{tag}</span>
              {count > 1 && <span className="ct">·&nbsp;{count}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── Badge widget (status distribution) ────────────────────────────
function BadgeWidget({ title, meta, items, total, span }) {
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 6) }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body">
        <div className="badge-row">
          {items.map((it, i) => {
            const info = statusInfo(it.status);
            const pct = total ? Math.round((it.count / total) * 100) : 0;
            return (
              <div key={i} className={"badge " + info.tone}>
                <span className="dot" />
                <span className="b-name">{info.label}</span>
                <span className="b-bar"><i style={{ width: pct + "%" }} /></span>
                <span className="b-ct">{it.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TreeView, buildPlanTree, BarChart, Gauge, TagCloud, BadgeWidget });
