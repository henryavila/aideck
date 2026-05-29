/* eslint-disable */
/* aiDeck — Task Board page (grid layout).
   Two views via Tweaks: a full-bleed kanban (default) and a
   multi-widget grid demo that shows the same explicit-grid
   positioning vocabulary with a different widget mix.        */

function ConsumerBoard({ multi, debug }) {
  const [activeTab, setActiveTab] = React.useState("task-board");
  return (
    <div data-screen-label="03 Task Board">
      <PageTitleBar
        consumer="aiDeck Demo"
        page="Task Board"
        layout="grid"
      />
      <TabsBar active={activeTab} onSelect={setActiveTab} />

      <div className={"grid-layout grid-fill" + (debug ? " grid-debug" : "")}>
        {multi ? <MultiWidgetGrid /> : <BoardGrid />}
      </div>
    </div>
  );
}

// ── Default: kanban fills the entire grid ────────────────────────────
function BoardGrid() {
  return (
    <KanbanBoard
      tasks={TASKS}
      slot="1·1 / 12·8"
    />
  );
}

// ── Bonus: multi-widget grid showcasing positioning vocabulary ───────
function MultiWidgetGrid() {
  // Throughput series for the line chart (sparkline-style)
  const throughput = [
    { name: "merged",  data: [12, 18, 14, 22, 19, 28, 24, 32, 30, 38, 34, 42] },
    { name: "opened",  data: [10, 14, 12, 18, 16, 22, 20, 24, 22, 28, 26, 30] },
    { name: "blocked", data: [ 4,  6,  5,  8,  7,  9,  6, 10,  8, 11,  9, 12] },
  ];

  const subset = PROJECTS.slice(0, 4);

  const kv = [
    { k: "runtime",      v: "aideck v0.4.0",     mono: true },
    { k: "consumer",     v: "aideck-demo v0.1.0",mono: true },
    { k: "layout",       v: "grid · 12 cols",    mono: true },
    { k: "row height",   v: "48 px",             mono: true },
    { k: "data sources", v: "3" },
    { k: "widgets",      v: "4" },
    { k: "sse clients",  v: "4" },
    { k: "uptime",       v: "00:42:18",          mono: true },
  ];

  return (
    <>
      {/* 4-col stat — top left */}
      <div
        className="w"
        data-slot="1·1 / 4·3"
        style={{ gridColumn: "1 / span 4", gridRow: "span 3" }}
      >
        <div className="w-head">
          <span className="w-title">in progress</span>
          <span className="w-meta">tasks</span>
        </div>
        <div className="w-body">
          <div className="stat">
            <span className="lbl">status · in-progress</span>
            <span className="v info">2</span>
            <span className="d">
              <span className="delta up">↑ +1 vs yesterday</span>
            </span>
          </div>
        </div>
      </div>

      {/* 8-col chart — top right */}
      <MiniLineChart
        slot="5·1 / 8·3"
        gridColumn="5 / span 8"
        gridRow="span 3"
        title="task throughput · 12 weeks"
        meta="merged · opened · blocked"
        series={throughput}
      />

      {/* 7-col table — middle left */}
      <div
        className="w"
        data-slot="1·4 / 7·5"
        style={{ gridColumn: "1 / span 7", gridRow: "span 5" }}
      >
        <div className="w-head">
          <span className="w-title">
            <span className="w-ico">▤</span>
            <span>Projects</span>
          </span>
          <span className="w-meta">source · projects.yaml · {subset.length} rows</span>
        </div>
        <div className="w-body flush">
          <table className="tab tab-desktop">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>id</th>
                <th>title</th>
                <th style={{ width: "110px" }}>status</th>
                <th style={{ width: "150px" }}>progress</th>
                <th style={{ width: "90px" }}>owner</th>
              </tr>
            </thead>
            <tbody>
              {subset.map((r) => {
                const pct = Math.round(r.progress * 100);
                const barColor = r.status === "done" ? "var(--status-success)"
                              : r.status === "paused" ? "var(--status-warning)"
                              : "var(--status-info)";
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.id}</td>
                    <td className="title">{r.title}</td>
                    <td><StatusChip status={r.status} /></td>
                    <td>
                      <span className="row-pct">
                        <span className="bar"><i style={{ width: pct + "%", background: barColor }} /></span>
                        <span>{pct}%</span>
                      </span>
                    </td>
                    <td className="owner">{r.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <ul className="tab-cards" role="list">
            {subset.map((r) => {
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* 5-col KV — middle right */}
      <KVWidget
        slot="8·4 / 5·5"
        gridColumn="8 / span 5"
        gridRow="span 5"
        title="runtime info"
        meta="read-only"
        rows={kv}
      />
    </>
  );
}

Object.assign(window, { ConsumerBoard });
