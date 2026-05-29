/* eslint-disable */
/* aiDeck — Live / SSE indicator reference page (briefing 04c)
   Atoms gallery + per-widget live patterns + disconnect banner + toast.
   Animations actually tick so the language is observable, not implied. */

// ───── Hook: tick at an interval, return a counter ──────────────────
function useTick(ms) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

// ───── Atom gallery ──────────────────────────────────────────────────
function AtomsGallery() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Dots: 4 states */}
      <div className="sb-grid cols-4">
        {[
          { k: "live",         lbl: "live",         sub: "≤ 4s ago" },
          { k: "idle",         lbl: "idle",         sub: "no events" },
          { k: "stale",        lbl: "stale",        sub: "> 12s" },
          { k: "disconnected", lbl: "disconnected", sub: "reconnecting" },
        ].map((d) => (
          <div key={d.k} className="dot-tile">
            <span className={"live-dot " + d.k} />
            <span className="dt-lbl">{d.lbl}</span>
            <span className="dt-sub">{d.sub}</span>
          </div>
        ))}
      </div>

      {/* Scanline overlay + row flash captured */}
      <div className="sb-grid cols-2">
        <div className="scan-demo is-live">
          <div>14:33:08  <span style={{ color: "var(--status-success)" }}>ok</span>    sse heartbeat</div>
          <div>14:33:09  <span style={{ color: "var(--status-info)" }}>info</span>  fs change events.jsonl</div>
          <div>14:33:09  <span style={{ color: "var(--status-success)" }}>ok</span>    re-validated tasks</div>
          <div>14:33:10  <span style={{ color: "var(--status-info)" }}>info</span>  mcp page.get overview</div>
          <span style={{
            position: "absolute", top: 8, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--status-success)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>.is-live · scan overlay</span>
        </div>
        <div className="scan-demo">
          <div className="row-flash" style={{ padding: "2px 4px", margin: "-2px -4px" }}>
            14:33:11  <span style={{ color: "var(--chart-3)" }}>T-009</span> created  · 2s ago
          </div>
          <div style={{ marginTop: 4, color: "var(--fg-subtle)" }}>14:32:58  T-008 marked done</div>
          <div style={{ color: "var(--fg-subtle)" }}>14:32:42  T-001 marked done</div>
          <span style={{
            position: "absolute", top: 8, right: 12,
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--status-info)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>.row-flash · 1.2s</span>
        </div>
      </div>

      {/* Trust pills */}
      <div className="sb-grid cols-3">
        <div className="dot-tile">
          <span className="trust-pill healthy">
            <span className="td" />
            <span>127.0.0.1</span>
            <span className="tp-sep">·</span>
            <span className="tp-tag">no telemetry</span>
          </span>
          <span className="dt-sub">healthy + live</span>
        </div>
        <div className="dot-tile">
          <span className="trust-pill reconnecting">
            <span className="td" />
            <span>127.0.0.1</span>
            <span className="tp-sep">·</span>
            <span className="tp-tag">reconnecting…</span>
          </span>
          <span className="dt-sub">SSE retry</span>
        </div>
        <div className="dot-tile">
          <span className="trust-pill disconnected">
            <span className="td" />
            <span>127.0.0.1</span>
            <span className="tp-sep">·</span>
            <span className="tp-tag">offline · last seen 47s ago</span>
          </span>
          <span className="dt-sub">SSE lost</span>
        </div>
      </div>
    </div>
  );
}

// ───── Live Log Feed: prepends a new line every 3s ──────────────────
function LiveLogFeed() {
  const seedLines = [
    { ts: "14:32:08", lv: "ok",   msg: "consumer ", key: "aideck-demo", tail: " ready" },
    { ts: "14:32:09", lv: "info", msg: "loaded 3 pages, 8 widgets" },
    { ts: "14:32:12", lv: "info", msg: "sse client connected" },
  ];
  const samples = [
    { lv: "ok",   msg: "event ", key: "T-001.done",  tail: " by Alice" },
    { lv: "info", msg: "fs change ", val: "tasks.yaml" },
    { lv: "ok",   msg: "re-validated ", key: "tasks", tail: " · 8 rows" },
    { lv: "info", msg: "mcp tool ", key: "page.get", tail: " overview" },
    { lv: "warn", msg: "slow file ", val: "events.jsonl · 312ms" },
    { lv: "ok",   msg: "stat ", key: "tasks-done", tail: " · 4" },
  ];

  const [lines, setLines] = React.useState(seedLines);
  const [flashKey, setFlashKey] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      const s = samples[i % samples.length];
      i++;
      const now = new Date("2026-05-26T14:33:00Z");
      now.setSeconds(now.getSeconds() + (i * 3));
      const hh = String(14).padStart(2, "0");
      const mm = String(33).padStart(2, "0");
      const ss = String((i * 3) % 60).padStart(2, "0");
      setLines((cur) => [{ ts: `${hh}:${mm}:${ss}`, ...s }, ...cur].slice(0, 8));
      setFlashKey((k) => k + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w log-live">
      <div className="w-head">
        <span className="w-title"><span className="w-ico">≡</span><span>server log · stdout</span></span>
        <span className="live-meta">
          <span className="live-word">streaming</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body is-live" style={{ padding: 10 }}>
        <div className="log" style={{ minHeight: 200 }}>
          {lines.map((l, idx) => (
            <span
              key={flashKey + "-" + idx + "-" + l.ts}
              className={"log-row " + (idx === 0 ? "row-flash row-flash-bar" : "")}
            >
              <span className="ts">{l.ts}</span>{" "}
              <span className={"lv " + l.lv}>{(l.lv + "   ").slice(0, 4)}</span>{" "}
              <span className="msg">{l.msg}</span>
              {l.key && <span className="key">{l.key}</span>}
              {l.tail && <span className="msg">{l.tail}</span>}
              {l.val && <span className="val">{l.val}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── Live Timeline ────────────────────────────────────────────────
function LiveTimeline() {
  const [events, setEvents] = React.useState(EVENTS.slice(0, 5));
  const [newest, setNewest] = React.useState(0);
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    let i = 0;
    const seq = [
      { kind: "started", title: "Task T-009 started",     refId: "T-009", by: "Alice" },
      { kind: "done",    title: "Task T-002 marked done", refId: "T-002", by: "Alice" },
      { kind: "started", title: "Task T-006 started",     refId: "T-006", by: "Carol" },
    ];
    const id = setInterval(() => {
      const next = seq[i % seq.length];
      i++;
      const ts = `2026-05-26 14:${String(33 + i).padStart(2, "0")}:00`;
      setEvents((cur) => [{ ts, ...next }, ...cur].slice(0, 5));
      setNewest((n) => n + 1);
      setShowBanner(true);
      const t = setTimeout(() => setShowBanner(false), 4000);
      return () => clearTimeout(t);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w tl-live">
      <div className="w-head">
        <span className="w-title"><span className="w-ico">⌖</span><span>Recent Activity</span></span>
        <span className="live-meta">
          <span className="live-word">live</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body">
        {showBanner && (
          <span className="tl-banner">
            <span className="tlb-arrow">↑</span>
            <span>1 new event · just now</span>
          </span>
        )}
        <div className="tl">
          {events.map((e, i) => {
            const tone = EVENT_TONE[e.kind] || "neutral";
            return (
              <div
                key={newest + "-" + i + "-" + e.ts}
                className={"tl-row " + tone + (i === 0 ? " is-newest row-flash" : "")}
              >
                <div className="tl-head">
                  <span className="tl-ts">{shortTime(e.ts)}</span>
                  <span className={"tl-tag " + tone}>{e.kind}</span>
                </div>
                <div className="tl-ti">
                  <span className="id">{e.refId}</span>
                  <span>{e.title.replace(e.refId + " ", "").replace("Task ", "").replace("Project ", "")}</span>
                </div>
                <div className="tl-sub">
                  <span className="by">by</span> {e.by}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───── Live Table (row insert + cell flash) ─────────────────────────
function LiveTable() {
  const [rows, setRows] = React.useState(PROJECTS);
  const [flashCellIdx, setFlashCellIdx] = React.useState({ row: -1, col: -1 });
  const [insertedKey, setInsertedKey] = React.useState(0);
  const newRow = {
    id: "proj-5",
    title: "Search re-index pipeline",
    status: "active",
    owner: "Eve",
    startDate: "2026-05-26",
    progress: 0.05,
  };

  React.useEffect(() => {
    const id1 = setInterval(() => {
      // cycle insert / remove the new row every 6s
      setRows((cur) => cur.find((r) => r.id === "proj-5")
        ? cur.filter((r) => r.id !== "proj-5")
        : [newRow, ...cur]);
      setInsertedKey((k) => k + 1);
    }, 6000);

    const id2 = setInterval(() => {
      setFlashCellIdx({ row: 1 + (Date.now() % 3), col: 3 });
      setTimeout(() => setFlashCellIdx({ row: -1, col: -1 }), 700);
    }, 4000);

    return () => { clearInterval(id1); clearInterval(id2); };
  }, []);

  const hasNew = rows.some((r) => r.id === "proj-5");
  return (
    <div className="w">
      <div className="w-head">
        <span className="w-title"><span className="w-ico">▤</span><span>Projects</span></span>
        <span className="live-meta">
          <span>{rows.length} rows</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body flush">
        <table className="tab tab-desktop">
          <thead>
            <tr>
              <th style={{ width: "80px" }}>id</th>
              <th>title</th>
              <th style={{ width: "110px" }}>status</th>
              <th style={{ width: "150px" }}>progress</th>
              <th style={{ width: "80px" }}>owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = Math.round(r.progress * 100);
              const isNew = r.id === "proj-5";
              const barColor = r.status === "done" ? "var(--status-success)"
                            : r.status === "paused" ? "var(--status-warning)"
                            : "var(--status-info)";
              return (
                <tr
                  key={insertedKey + "-" + r.id}
                  className={isNew ? "row-flash" : ""}
                >
                  <td className="mono">{r.id}</td>
                  <td className="title">{r.title}</td>
                  <td><StatusChip status={r.status} /></td>
                  <td className={flashCellIdx.row === i && flashCellIdx.col === 3 ? "cell-flash" : ""}>
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
          {rows.map((r) => {
            const info = statusInfo(r.status);
            const isNew = r.id === "proj-5";
            const pct = Math.round(r.progress * 100);
            const barColor = r.status === "done" ? "var(--status-success)"
                          : r.status === "paused" ? "var(--status-warning)"
                          : "var(--status-info)";
            return (
              <li
                key={insertedKey + "-" + r.id}
                className={"tc-row is-" + info.tone + (isNew ? " row-flash" : "")}
              >
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
      </div>
    </div>
  );
}

// ───── Live Stat (value transition) ─────────────────────────────────
function LiveStat() {
  const [val, setVal] = React.useState(142381);
  const [key, setKey] = React.useState(0);
  const [secAgo, setSecAgo] = React.useState(2);
  React.useEffect(() => {
    const id1 = setInterval(() => {
      setVal((v) => v + Math.floor(Math.random() * 80) + 20);
      setKey((k) => k + 1);
      setSecAgo(0);
    }, 4000);
    const id2 = setInterval(() => setSecAgo((s) => s + 1), 1000);
    return () => { clearInterval(id1); clearInterval(id2); };
  }, []);
  return (
    <div className="w">
      <div className="w-head">
        <span className="w-title">requests</span>
        <span className="live-meta">
          <span>{secAgo}s ago</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body">
        <div className="stat">
          <span className="lbl">total · 24h window</span>
          <span key={key} className="v value-fade">{val.toLocaleString()}</span>
          <span className="d"><span className="delta up">↑ +2.1% vs prev hour</span></span>
        </div>
      </div>
    </div>
  );
}

// ───── Live Chart (line extended) ───────────────────────────────────
function LiveChart() {
  const initial = [12, 18, 14, 22, 19, 28, 24];
  const [series, setSeries] = React.useState(initial);
  React.useEffect(() => {
    const id = setInterval(() => {
      setSeries((s) => {
        const next = s[s.length - 1] + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 5);
        return [...s.slice(1), Math.max(5, next)];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const W = 400, H = 120;
  const max = Math.max(...series) + 4;
  const min = Math.min(...series) - 4;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * (H - 12) - 6;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return (
    <div className="w">
      <div className="w-head">
        <span className="w-title">throughput · 7d</span>
        <span className="live-meta">
          <span>7-day window</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body" style={{ padding: 10 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 140 }}>
          <polyline
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="1.6"
            points={pts}
            style={{ transition: "all 200ms var(--ease-out)" }}
          />
          {/* leading dot at latest sample */}
          {(() => {
            const last = pts.split(" ").pop().split(",");
            return <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--chart-1)" />;
          })()}
        </svg>
      </div>
    </div>
  );
}

// ───── Live Kanban (card moves between columns) ─────────────────────
function LiveKanban() {
  const [moveTick, setMoveTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setMoveTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  // Move T-003 between todo → in-progress every other tick
  const phase = moveTick % 2;
  const tasks = TASKS.map((t) =>
    t.id === "T-003" && phase === 1 ? { ...t, status: "in-progress" } : t
  );
  return (
    <KanbanBoardLive tasks={tasks} movingId="T-003" />
  );
}

// Variant of KanbanBoard that flashes the moving card.
function KanbanBoardLive({ tasks, movingId }) {
  const cols = [
    { id: "todo",        label: "Todo" },
    { id: "in-progress", label: "In Progress" },
    { id: "done",        label: "Done" },
  ];
  const grouped = cols.map((c) => ({
    ...c,
    tasks: tasks.filter((t) => t.status === c.id),
  }));
  const total = tasks.length;
  return (
    <div className="w">
      <div className="w-head">
        <span className="w-title"><span className="w-ico">▦</span><span>issues · this sprint</span></span>
        <span className="live-meta">
          <span>{total} cards</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span className="live-dot live" />
        </span>
      </div>
      <div className="w-body flush">
        <div className="kb kb-desktop">
          {grouped.map((c) => (
            <KanbanColumnLive key={c.id} col={c} movingId={movingId} />
          ))}
        </div>
        {/* mobile segmented view stays static for the demo */}
        <div className="kb-mobile">
          <div className="kb-empty kb-empty-lg" style={{ padding: 24 }}>
            <span className="ke-msg">// see desktop for the live card-move demo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function KanbanColumnLive({ col, movingId }) {
  const tone = (KANBAN_TONE[col.id] || KANBAN_TONE.todo).tone;
  return (
    <div className="kb-col" data-col={col.id}>
      <div className="kb-col-h">
        <span className={"accent tone-" + tone} />
        <span className={"name tone-" + tone}>{col.label}</span>
        <span className={"ct tone-" + tone}>{col.tasks.length}</span>
      </div>
      <div className="kb-cards">
        {col.tasks.length === 0 ? (
          <div className="kb-empty">// no cards</div>
        ) : col.tasks.map((t) => (
          <div key={t.id} className={
            "kb-card " +
            (KANBAN_TONE[t.status]?.accent || "") +
            (t.id === movingId ? " is-moving row-flash" : "")
          }>
            <div className="row-top">
              <span className="id">{t.id}</span>
              <span className={"prio p-" + t.priority}>
                <span className="pdot" />
                <span>p{t.priority}</span>
              </span>
            </div>
            <div className="ti">{t.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───── All-stale snapshot (disconnect banner page state) ─────────────
function DisconnectBannerDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="disc-banner">
        <span>⚠</span>
        <span><span className="em">Lost connection to aideck.</span> Reconnecting every 4s. Last seen 47s ago.</span>
        <button className="retry-now">↺ retry now</button>
      </div>
      <div className="sb-grid cols-3">
        <div className="w is-stale">
          <div className="w-head">
            <span className="w-title">requests</span>
            <span className="live-meta">
              <span className="stale-word">stale · 14s</span>
              <span className="live-dot stale" />
            </span>
          </div>
          <div className="w-body">
            <div className="stat">
              <span className="lbl">total · 24h</span>
              <span className="v">142,381</span>
              <span className="d"><span className="delta">last update 14s ago</span></span>
            </div>
          </div>
        </div>
        <div className="w is-stale">
          <div className="w-head">
            <span className="w-title">server log · stdout</span>
            <span className="live-meta">
              <span className="stale-word">stale · 47s</span>
              <span className="live-dot stale" />
            </span>
          </div>
          <div className="w-body" style={{ padding: 10 }}>
            <div className="log" style={{ minHeight: 110 }}>
              <span className="log-row"><span className="ts">14:32:08</span> <span className="lv ok">ok  </span> <span className="msg">listening on </span><span className="key">127.0.0.1:7777</span></span>
              <span className="log-row"><span className="ts">14:32:48</span> <span className="lv info">sse </span> <span className="msg">client connected</span></span>
              <span className="log-row"><span className="ts">14:33:14</span> <span className="lv warn">warn</span> <span className="msg">sse heartbeat missed</span></span>
            </div>
          </div>
        </div>
        <div className="w is-stale">
          <div className="w-head">
            <span className="w-title">throughput · 7d</span>
            <span className="live-meta">
              <span className="stale-word">stale · 47s</span>
              <span className="live-dot stale" />
            </span>
          </div>
          <div className="w-body" style={{ padding: 10 }}>
            <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 100 }}>
              <polyline fill="none" stroke="var(--chart-1)" strokeWidth="1.6"
                        points="0,60 30,45 60,50 90,30 120,38 150,22 180,28 200,20" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Reconnect toast snapshot ──────────────────────────────────────
function ReconnectToastDemo() {
  return (
    <div className="toast-demo-wrap" style={{ height: 100 }}>
      <div className="toast">
        <span className="toast-ic">↺</span>
        <span><span className="toast-em">reconnected</span> · 4 widgets refreshed</span>
        <span className="toast-meta">auto-dismiss · 3s</span>
      </div>
    </div>
  );
}

// ───── Full reference page ───────────────────────────────────────────
function LiveReference() {
  const [activeTab, setActiveTab] = React.useState("overview");
  return (
    <div data-screen-label="04c Live Indicators">
      <PageTitleBar consumer="aiDeck Demo" page="Live Indicators" layout="single" />
      <TabsBar
        active={activeTab}
        onSelect={setActiveTab}
        tail={<><span>SSE · 4 atoms · 6 patterns</span></>}
      />

      <div className="states-page">
        <StateBlock title="A · atoms gallery" sub="4 dot states · scan · row flash · trust pill" cols={1}>
          <AtomsGallery />
        </StateBlock>

        <StateBlock title="B · log feed · live" sub="streaming · scanline overlay · new line flashes for 1.2s" cols={1}>
          <LiveLogFeed />
        </StateBlock>

        <StateBlock title="C · timeline · live" sub="banner above spine · new entry highlight · spine dot sustained" cols={1}>
          <LiveTimeline />
        </StateBlock>

        <StateBlock title="D · table · live" sub="row insert + cell update flash (cycles every 4–6s)" cols={1}>
          <LiveTable />
        </StateBlock>

        <StateBlock title="E · kanban · card mid-move" sub="T-003 moves todo ↔ in-progress every 5s with glow" cols={1}>
          <LiveKanban />
        </StateBlock>

        <StateBlock title="F · stat · value transition" sub="value-fade · 400ms info → default · time-since-update meta" cols={2}>
          <LiveStat />
          <LiveChart />
        </StateBlock>

        <StateBlock title="H · disconnect banner" sub="page-level banner · all widgets in stale (amber dot)" cols={1}>
          <DisconnectBannerDemo />
        </StateBlock>

        <StateBlock title="I · reconnect toast" sub="bottom-right · auto-dismiss 3s · 200ms fade-rise" cols={1}>
          <ReconnectToastDemo />
        </StateBlock>
      </div>
    </div>
  );
}

Object.assign(window, { LiveReference });
