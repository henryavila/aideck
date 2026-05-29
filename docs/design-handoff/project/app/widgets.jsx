/* eslint-disable */
/* aiDeck — canonical widget components: frame · stat · table · timeline · log · chip */

// ───── Status chip ───────────────────────────────────────────────────
function StatusChip({ status }) {
  const info = statusInfo(status);
  return (
    <span className={"schip " + info.tone}>
      <span className="dot" />
      <span>{info.label}</span>
    </span>
  );
}

// ───── Widget frame ──────────────────────────────────────────────────
function W({ title, icon, meta, live, footer, bodyClass, children }) {
  return (
    <div className="w">
      <div className="w-head">
        <span className="w-title">
          {icon && <span className="w-ico">{icon}</span>}
          <span>{title}</span>
        </span>
        <span className="w-meta">
          {live && <span className="live" />}
          {meta && <span>{meta}</span>}
        </span>
      </div>
      <div className={"w-body " + (bodyClass || "")}>{children}</div>
      {footer}
    </div>
  );
}

// ───── Stat widget ───────────────────────────────────────────────────
function StatWidget({ title, label, value, tone, deltaLabel, deltaTone, deltaArrow, sub, span }) {
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 3) }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        {sub && <span className="w-meta">{sub}</span>}
      </div>
      <div className="w-body">
        <div className="stat">
          <span className="lbl">{label}</span>
          <span className={"v " + (tone || "")}>{value}</span>
          {(deltaLabel || sub) && (
            <span className="d">
              {deltaLabel && (
                <span className={"delta " + (deltaTone || "")}>
                  {deltaArrow && <span>{deltaArrow}</span>}
                  <span>{deltaLabel}</span>
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ───── Projects table ────────────────────────────────────────────────
function ProjectsTable({ rows, span }) {
  const total = rows.length;
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 12) }}>
      <div className="w-head">
        <span className="w-title">
          <span className="w-ico">▤</span>
          <span>Projects</span>
        </span>
        <span className="w-meta">
          <span>source · projects.yaml</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>{total} rows</span>
        </span>
      </div>
      <div className="w-body flush">
        {/* DESKTOP — wide table */}
        <table className="tab tab-desktop">
          <thead>
            <tr>
              <th style={{ width: "84px" }}>id</th>
              <th>title</th>
              <th style={{ width: "120px" }}>status</th>
              <th style={{ width: "180px" }}>progress</th>
              <th style={{ width: "100px" }}>owner</th>
              <th style={{ width: "120px" }}>started</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td className="title">{r.title}</td>
                <td><StatusChip status={r.status} /></td>
                <td>
                  <span className="row-pct">
                    <span className="bar">
                      <i style={{
                        width: Math.round(r.progress * 100) + "%",
                        background: r.status === "done"
                          ? "var(--status-success)"
                          : r.status === "paused"
                          ? "var(--status-warning)"
                          : "var(--status-info)"
                      }} />
                    </span>
                    <span>{Math.round(r.progress * 100)}%</span>
                  </span>
                </td>
                <td className="owner">{r.owner}</td>
                <td className="mono">{r.startDate}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MOBILE — same data, card-list shape */}
        <ul className="tab-cards" role="list">
          {rows.map((r) => {
            const pct = Math.round(r.progress * 100);
            const info = statusInfo(r.status);
            const barColor = r.status === "done" ? "var(--status-success)"
                          : r.status === "paused" ? "var(--status-warning)"
                          : "var(--status-info)";
            return (
              <li key={r.id} className={"tc-row is-" + info.tone}>
                <div className="tc-top">
                  <span className="tc-id">{r.id}</span>
                  <StatusChip status={r.status} />
                </div>
                <div className="tc-title">{r.title}</div>
                <div className="tc-progress">
                  <span className="tc-bar"><i style={{ width: pct + "%", background: barColor }} /></span>
                  <span className="tc-pct">{pct}%</span>
                </div>
                <div className="tc-meta">
                  <span className="tc-owner">{r.owner}</span>
                  <span className="tc-dot">·</span>
                  <span className="tc-date">{r.startDate}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="table-foot">
          <span>{total} of {total} · filter · all</span>
          <a href="#">open table view ↗</a>
        </div>
      </div>
    </div>
  );
}

// ───── Timeline widget ───────────────────────────────────────────────
function TimelineWidget({ events, span }) {
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 8) }}>
      <div className="w-head">
        <span className="w-title">
          <span className="w-ico">⌖</span>
          <span>Recent Activity</span>
        </span>
        <span className="w-meta">
          <span className="live" />
          <span className="live-text">live</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>source · events.jsonl</span>
        </span>
      </div>
      <div className="w-body">
        <div className="tl">
          {events.map((e, i) => {
            const tone = EVENT_TONE[e.kind] || "neutral";
            return (
              <div key={i} className={"tl-row " + tone}>
                <div className="tl-head">
                  <span className="tl-ts">{shortTime(e.ts)}</span>
                  <span className={"tl-tag " + tone}>{e.kind}</span>
                  <span className="tl-ts" style={{ color: "var(--fg-faint)" }}>·</span>
                  <span className="tl-ts">{relTime(e.ts)}</span>
                </div>
                <div className="tl-ti">
                  <span className="id">{e.refId}</span>
                  <span>{e.title.replace(e.refId + " ", "").replace("Task ", "").replace("Project ", "")}</span>
                </div>
                <div className="tl-sub">
                  <span className="by">by</span> <span>{e.by}</span>
                  <span style={{ color: "var(--fg-faint)", margin: "0 4px" }}>·</span>
                  <span>{e.ts}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───── Log feed widget ───────────────────────────────────────────────
function LogFeed({ span }) {
  return (
    <div className="w" style={{ gridColumn: "span " + (span || 4) }}>
      <div className="w-head">
        <span className="w-title">
          <span className="w-ico">≡</span>
          <span>Log · stdout</span>
        </span>
        <span className="w-meta">
          <span className="live" />
          <span className="live-text">streaming</span>
        </span>
      </div>
      <div className="w-body" style={{ padding: 10 }}>
        <div className="log">
          <span className="row"><span className="ts">14:02:51</span> <span className="lv ok">ok  </span> <span className="msg">consumer </span><span className="key">aideck-demo</span><span className="msg"> ready</span></span>
          <span className="row"><span className="ts">14:02:52</span> <span className="lv info">load</span> <span className="msg">3 pages, 8 widgets, 3 sources</span></span>
          <span className="row"><span className="ts">14:02:54</span> <span className="lv info">sse </span> <span className="msg">client connected </span><span className="val">/_sse</span></span>
          <span className="row"><span className="ts">14:03:01</span> <span className="lv ok">ok  </span> <span className="msg">event </span><span className="key">T-001.done</span><span className="msg"> by </span><span className="val">Alice</span></span>
          <span className="row"><span className="ts">14:03:01</span> <span className="lv info">fs  </span> <span className="msg">change </span><span className="val">tasks.yaml</span></span>
          <span className="row"><span className="ts">14:03:02</span> <span className="lv ok">ok  </span> <span className="msg">re-validated </span><span className="key">tasks</span><span className="msg"> · 8 rows</span></span>
          <span className="row"><span className="ts">14:03:02</span> <span className="lv info">mcp </span> <span className="msg">tool </span><span className="key">page.get</span><span className="msg"> overview</span></span>
          <span className="row"><span className="ts">14:03:03</span> <span className="lv warn">warn</span> <span className="msg">slow file </span><span className="val">events.jsonl · 312ms</span></span>
          <span className="row"><span className="ts">14:03:03</span> <span className="lv ok">ok  </span> <span className="msg">stat </span><span className="key">tasks-done</span><span className="msg"> · 4</span></span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { W, StatusChip, StatWidget, ProjectsTable, TimelineWidget, LogFeed });

// ───── Kanban board ──────────────────────────────────────────────────
const KANBAN_TONE = {
  "todo":        { tone: "",        accent: "" },
  "in-progress": { tone: "info",    accent: "accent-info" },
  "done":        { tone: "success", accent: "accent-success" },
  "paused":      { tone: "warning", accent: "accent-warning" },
};

const TAG_TONE = {
  // Map tag families onto chart hues. Tags use chart palette (variety);
  // status colors are reserved for status itself.
  "design":     "t-3",
  "ui":         "t-3",
  "frontend":   "t-3",
  "backend":    "t-1",
  "api":        "t-1",
  "data":       "t-2",
  "migration":  "t-2",
  "auth":       "t-5",
  "security":   "t-5",
  "testing":    "t-4",
  "mobile":     "t-6",
};
function tagClass(t) { return "tk " + (TAG_TONE[t] || "t-1"); }

function KanbanCard({ task }) {
  const tone = KANBAN_TONE[task.status] || KANBAN_TONE.todo;
  return (
    <div className={"kb-card " + tone.accent} tabIndex={0}>
      <div className="row-top">
        <span className="id">{task.id}</span>
        <span className={"prio p-" + task.priority}>
          <span className="pdot" />
          <span>p{task.priority}</span>
        </span>
      </div>
      <div className="ti">{task.title}</div>
      {task.tags && task.tags.length > 0 && (
        <div className="tags">
          {task.tags.map((t) => (
            <span key={t} className={tagClass(t)}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ id, label, tasks }) {
  const tone = KANBAN_TONE[id] || KANBAN_TONE.todo;
  const ct = tasks.length;
  return (
    <div className="kb-col" data-col={id}>
      <div className="kb-col-h">
        <span className={"accent tone-" + tone.tone} />
        <span className={"name tone-" + tone.tone}>{label}</span>
        <span className={"ct tone-" + tone.tone}>{ct}</span>
      </div>
      <div className="kb-cards">
        {ct === 0 ? (
          <div className="kb-empty">// no cards · drop a task to begin</div>
        ) : (
          tasks.map((t) => <KanbanCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, columns, slot }) {
  const cols = columns || [
    { id: "todo",        label: "Todo" },
    { id: "in-progress", label: "In Progress" },
    { id: "done",        label: "Done" },
  ];
  const grouped = cols.map((c) => ({
    ...c,
    tasks: tasks.filter((t) => t.status === c.id),
  }));
  const total = tasks.length;
  // Mobile-only: which column is currently visible.
  // Default to "in-progress" so users see live work first.
  const [activeIdx, setActiveIdx] = React.useState(
    Math.max(0, grouped.findIndex((c) => c.id === "in-progress"))
  );

  return (
    <div className="w" data-slot={slot} style={{
      gridColumn: "1 / span 12",
      gridRow: "span 8",
    }}>
      <div className="w-head">
        <span className="w-title">
          <span className="w-ico">▦</span>
          <span>issues · this sprint</span>
        </span>
        <span className="w-meta">
          <span className="live" />
          <span className="live-text">live</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>{total} cards</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>source · tasks.yaml</span>
        </span>
      </div>
      <div className="w-body flush">
        {/* DESKTOP — 3-column grid */}
        <div className="kb kb-desktop">
          {grouped.map((c) => (
            <KanbanColumn key={c.id} id={c.id} label={c.label} tasks={c.tasks} />
          ))}
        </div>

        {/* MOBILE — segmented control + single column */}
        <div className="kb-mobile">
          <div className="kb-seg" role="tablist">
            {grouped.map((c, i) => {
              const tone = (KANBAN_TONE[c.id] || KANBAN_TONE.todo).tone;
              return (
                <button
                  key={c.id}
                  className={"seg" + (i === activeIdx ? " on tone-" + tone : "")}
                  onClick={() => setActiveIdx(i)}
                  role="tab"
                  aria-selected={i === activeIdx}
                >
                  <span className={"seg-dot tone-" + tone} />
                  <span className="seg-name">{c.label}</span>
                  <span className="seg-ct">{c.tasks.length}</span>
                </button>
              );
            })}
          </div>
          <div className="kb-mobile-list">
            {(() => {
              const c = grouped[activeIdx];
              const tone = (KANBAN_TONE[c.id] || KANBAN_TONE.todo).tone;
              return c.tasks.length === 0 ? (
                <div className="kb-empty kb-empty-lg">
                  <span className="ke-dot" />
                  <span className="ke-msg">// nothing in <em>{c.label.toLowerCase()}</em></span>
                  <span className="ke-hint">tasks land here when their status changes to <code>{c.id}</code>.</span>
                </div>
              ) : (
                <div className="kb-cards kb-cards-mobile">
                  {c.tasks.map((t) => <KanbanCard key={t.id} task={t} />)}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Mini chart (placeholder — full widget arrives in briefing 07) ─
function MiniLineChart({ title, meta, series, slot, gridColumn, gridRow }) {
  const W = 600, H = 180;
  const max = Math.max(...series.flatMap((s) => s.data));
  const min = Math.min(...series.flatMap((s) => s.data));
  const pts = (data) =>
    data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / (max - min || 1)) * (H - 12) - 6;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
  return (
    <div className="w" data-slot={slot} style={{ gridColumn, gridRow }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body" style={{ padding: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mini-chart-svg">
          <line x1="0" y1={H - 1} x2={W} y2={H - 1} className="mc-axis" />
          {series.map((s, i) => (
            <polyline key={i} className="mc-line" stroke={`var(--chart-${i + 1})`} points={pts(s.data)} />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ───── Key-Value (placeholder — full widget arrives in briefing 06) ──
function KVWidget({ title, meta, rows, slot, gridColumn, gridRow }) {
  return (
    <div className="w" data-slot={slot} style={{ gridColumn, gridRow }}>
      <div className="w-head">
        <span className="w-title">{title}</span>
        <span className="w-meta">{meta}</span>
      </div>
      <div className="w-body">
        <div className="kv-list">
          {rows.map((r, i) => (
            <div key={i} className="kv-row">
              <span className="kv-k">{r.k}</span>
              <span className={"kv-v " + (r.mono ? "mono" : "")}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { KanbanBoard, KanbanColumn, KanbanCard, MiniLineChart, KVWidget });
