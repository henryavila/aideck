/* eslint-disable */
/* aiDeck — states reference page (loading · empty · error · disconnected)
   One scrollable page that surfaces the cross-cutting vocabulary every
   widget and surface reuses.                                         */

// ───── Generic state primitives ──────────────────────────────────────
function StateBlock({ title, sub, cols = 2, children }) {
  return (
    <div className="state-block">
      <div className="sb-head">
        <h2>{title}</h2>
        <span className="sub">— {sub}</span>
      </div>
      <div className={"sb-grid cols-" + cols}>
        {children}
      </div>
    </div>
  );
}

// ───── Widget state wrappers ─────────────────────────────────────────
function StateWidget({ title, meta, children, kind, retry }) {
  const cls = "w" + (kind === "error" ? " is-error" : kind === "stale" ? " is-stale" : "");
  return (
    <div className={cls}>
      <div className="w-head">
        <span className="w-title">
          {kind === "error" && <span className="w-ico">×</span>}
          <span>{title}</span>
        </span>
        <span className="w-meta">
          {kind === "loading" && <span className="fetching-meta">fetching</span>}
          {kind === "stale" && (
            <span className="stale"><span className="stale-dot" /><span>stale · 14s</span></span>
          )}
          {kind === "error" && retry && (
            <span className="retry">↻ retry</span>
          )}
          {!kind && meta}
        </span>
      </div>
      <div className="w-body">{children}</div>
    </div>
  );
}

// ── Skeleton patterns shaped like real widgets ──────────────────────
function StatSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      <span className="skel-line w-50" style={{ height: 9 }} />
      <span className="skel-line xtall w-70" style={{ height: 38 }} />
      <span className="skel-line w-60" style={{ height: 10 }} />
      <span style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        <span className="skel-line" style={{ flex: 1, height: 4 }} />
        <span className="skel-line" style={{ flex: 1, height: 10 }} />
        <span className="skel-line" style={{ flex: 1, height: 7 }} />
        <span className="skel-line" style={{ flex: 1, height: 14 }} />
        <span className="skel-line" style={{ flex: 1, height: 9 }} />
        <span className="skel-line" style={{ flex: 1, height: 18 }} />
        <span className="skel-line" style={{ flex: 1, height: 12 }} />
      </div>
    </div>
  );
}
function TableSkeleton() {
  return (
    <div style={{ padding: "2px 0", display: "flex", flexDirection: "column", gap: 1 }}>
      <div className="skel-row" style={{ paddingBottom: 8, borderBottom: "1px solid var(--border-default)" }}>
        <span className="skel-line" style={{ flex: "0 0 50px" }} />
        <span className="skel-line" />
        <span className="skel-line" style={{ flex: "0 0 70px" }} />
        <span className="skel-line" style={{ flex: "0 0 50px" }} />
      </div>
      {[...Array(6)].map((_, i) => {
        const titleW = [90, 70, 80, 65, 75, 60][i];
        return (
          <div key={i} className="skel-row">
            <span className="skel-line tall" style={{ flex: "0 0 50px" }} />
            <span className="skel-line tall" style={{ width: titleW + "%" }} />
            <span className="skel-line tall" style={{ flex: "0 0 70px" }} />
            <span className="skel-line tall" style={{ flex: "0 0 50px" }} />
          </div>
        );
      })}
    </div>
  );
}
function ChartSkeleton() {
  // Skeleton bars shaped like a real bar chart
  const heights = [50, 70, 35, 60, 45, 80, 55, 90, 65];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flex: 1, minHeight: 140 }}>
        {heights.map((h, i) => (
          <span key={i} className="skel-line" style={{ flex: 1, height: h + "%", borderRadius: "3px 3px 0 0" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {heights.map((_, i) => (
          <span key={i} className="skel-line" style={{ flex: 1, height: 7 }} />
        ))}
      </div>
    </div>
  );
}
function KanbanSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, height: "100%" }}>
      {[3, 2, 3].map((cards, c) => (
        <div key={c} style={{
          display: "flex", flexDirection: "column", gap: 6,
          background: "var(--bg-sunken)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: 8,
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <span className="skel-line" style={{ flex: 1, height: 8 }} />
            <span className="skel-line" style={{ flex: "0 0 22px", height: 12, borderRadius: 3 }} />
          </div>
          {[...Array(cards)].map((_, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column", gap: 4,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 10px",
            }}>
              <span className="skel-line" style={{ width: 36, height: 7 }} />
              <span className="skel-line" style={{ width: "92%", height: 10 }} />
              <span className="skel-line" style={{ width: "76%", height: 10 }} />
              <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                <span className="skel-line" style={{ flex: "0 0 28px", height: 11, borderRadius: 2 }} />
                <span className="skel-line" style={{ flex: "0 0 34px", height: 11, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Empty body patterns ─────────────────────────────────────────────
function EmptyBody({ note, msg, action }) {
  return (
    <div className="w-empty">
      <span className="we-note">{note}</span>
      <span className="we-msg">{msg}</span>
      {action && <span className="we-action">{action}</span>}
    </div>
  );
}

// ── Error body ──────────────────────────────────────────────────────
function ErrorBody({ desc, detail, suggestion }) {
  return (
    <div className="err-body">
      <span className="err-1">{desc}</span>
      {detail && <span className="err-2">{detail}</span>}
      <span className="err-3">
        <span className="arrow">→</span>
        <span>{suggestion}</span>
      </span>
    </div>
  );
}

// ── Compact widget body samples for the "stale" demos ───────────────
function StaleStatBody() {
  return (
    <div className="stat">
      <span className="lbl">requests · 24h</span>
      <span className="v">142,381</span>
      <span className="d"><span className="delta">last update 14s ago</span></span>
    </div>
  );
}
function StaleLogBody() {
  return (
    <div className="log" style={{ minHeight: 110 }}>
      <span className="row"><span className="ts">14:02:41</span> <span className="lv ok">ok  </span> <span className="msg">listening on </span><span className="key">127.0.0.1:7777</span></span>
      <span className="row"><span className="ts">14:02:48</span> <span className="lv info">sse </span> <span className="msg">client connected</span></span>
      <span className="row"><span className="ts">14:02:52</span> <span className="lv info">read</span> <span className="msg">tasks.yaml · </span><span className="val">8 rows</span></span>
      <span className="row"><span className="ts">14:02:56</span> <span className="lv warn">warn</span> <span className="msg">sse heartbeat missed (1/3)</span></span>
    </div>
  );
}
function StaleChartBody() {
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 100 }}>
      <polyline fill="none" stroke="var(--chart-1)" strokeWidth="1.6" points="0,60 30,45 60,50 90,30 120,38 150,22 180,28 200,20" />
      <polyline fill="none" stroke="var(--chart-3)" strokeWidth="1.6" points="0,68 30,62 60,55 90,58 120,50 150,52 180,42 200,38" opacity="0.6" />
    </svg>
  );
}

// ───── App-level chrome variants ─────────────────────────────────────
function ChromeVariant({ label, tag, mode, withBanner }) {
  return (
    <div className="chrome-variant">
      <div className="cv-head">
        <span>{label}</span>
        <span className={"badge-tag " + tag}>{tag}</span>
      </div>
      <div className="cv-bar">
        <span className="wm">aiDeck<i className="wm-dot" style={{
          display: "inline-block",
          width: 8, height: 8, marginLeft: 4,
          background: mode === "healthy"
            ? "var(--status-info)"
            : mode === "connecting"
            ? "var(--fg-faint)"
            : "var(--status-warning)",
          borderRadius: 1,
        }} /></span>
        <span className="crumb">/ aideck-demo / Overview</span>
        <span className="grow" />
        <span className={"lh " + mode}>
          <span className="ldot" />
          <span>127.0.0.1</span>
          <span style={{ color: "var(--fg-faint)" }}>·</span>
          <span>
            {mode === "healthy" ? "no telemetry"
              : mode === "connecting" ? "connecting…"
              : "offline"}
          </span>
        </span>
      </div>
      {withBanner && (
        <div className="cv-banner">
          <span>⚠</span>
          <span><span className="em">Lost connection to aideck.</span> Reconnecting every 4s. Last seen 47s ago.</span>
        </div>
      )}
    </div>
  );
}

// ───── The full reference page ───────────────────────────────────────
function StatesReference() {
  const [activeTab, setActiveTab] = React.useState("overview");
  return (
    <div data-screen-label="04a States Reference">
      <PageTitleBar
        consumer="aiDeck Demo"
        page="States Reference"
        layout="sections"
      />
      <TabsBar
        active={activeTab}
        onSelect={setActiveTab}
        tail={<><span>cross-cutting · 4 levels</span></>}
      />

      <div className="states-page">

        {/* ─── WIDGET · LOADING ──────────────────────────────────── */}
        <StateBlock title="Widget · loading" sub="skeleton shimmer · no spinners" cols={4}>
          <StateWidget title="total requests" kind="loading">
            <StatSkeleton />
          </StateWidget>
          <StateWidget title="recent builds" kind="loading">
            <TableSkeleton />
          </StateWidget>
          <StateWidget title="throughput · 7d" kind="loading">
            <ChartSkeleton />
          </StateWidget>
          <StateWidget title="issues · this sprint" kind="loading">
            <KanbanSkeleton />
          </StateWidget>
        </StateBlock>

        {/* ─── WIDGET · EMPTY ────────────────────────────────────── */}
        <StateBlock title="Widget · empty" sub="terse note + concrete next step" cols={4}>
          <StateWidget title="open issues" meta="filter · severity ≥ 3">
            <EmptyBody
              note="// 0 rows"
              msg="No open issues match this filter."
              action="clear filter →"
            />
          </StateWidget>
          <StateWidget title="builds" meta="filter · branch=feature/x">
            <EmptyBody
              note="// 0 of 142 matched"
              msg="No builds on this branch yet."
              action="view all 142 →"
            />
          </StateWidget>
          <StateWidget title="latency · today" meta="metric · p95">
            <EmptyBody
              note="// no samples"
              msg="No requests recorded in the current window."
              action="extend to 24h →"
            />
          </StateWidget>
          <StateWidget title="server log" meta="filter · level=err">
            <EmptyBody
              note="// quiet"
              msg="No errors in the last hour."
            />
          </StateWidget>
        </StateBlock>

        {/* ─── WIDGET · ERROR ────────────────────────────────────── */}
        <StateBlock title="Widget · error" sub="fact + suggestion · the contract" cols={2}>
          <StateWidget title="recent runs" kind="error" retry>
            <ErrorBody
              desc="Could not read runs.jsonl"
              detail="ENOENT · ~/.aideck/consumers/agent-runs/data/runs.jsonl"
              suggestion="touch runs.jsonl to initialize"
            />
          </StateWidget>
          <StateWidget title="schema validate · tasks" kind="error" retry>
            <ErrorBody
              desc="Task T-042 fails schema validation"
              detail="tasks.yaml:88 · expected enum [todo, in-progress, done] · got `inprogress`"
              suggestion={<>Fix the value or update the schema in <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>schemas/task.schema.json</code>.</>}
            />
          </StateWidget>
          <StateWidget title="tool · grep" kind="error" retry>
            <ErrorBody
              desc="Tool call timed out after 8s"
              detail="mcp · tool.grep · pattern=EventSource · root=src/"
              suggestion="Increase tool.timeout in manifest or narrow the search root."
            />
          </StateWidget>
          <StateWidget title="data source · prs" kind="error" retry>
            <ErrorBody
              desc="Data source `prs` is not declared"
              detail="manifest.yaml:14 · widget references missing source `prs`"
              suggestion="Add prs to data: {}, or change the widget binding."
            />
          </StateWidget>
        </StateBlock>

        {/* ─── WIDGET · DISCONNECTED ─────────────────────────────── */}
        <StateBlock title="Widget · disconnected" sub="last-known data · stale meta · amber outline" cols={3}>
          <StateWidget title="requests" kind="stale">
            <StaleStatBody />
          </StateWidget>
          <StateWidget title="server log · stdout" kind="stale">
            <StaleLogBody />
          </StateWidget>
          <StateWidget title="throughput · 7d" kind="stale">
            <StaleChartBody />
          </StateWidget>
        </StateBlock>

        {/* ─── PAGE · LOADING ────────────────────────────────────── */}
        <StateBlock title="Page · loading" sub="manifest is being parsed" cols={1}>
          <div className="page-state is-loading">
            <div className="skel-stack">
              <span className="skel-line tall w-50" />
              <span className="skel-line w-70" />
              <span className="skel-block" style={{ height: 140 }} />
            </div>
            <span className="we-note" style={{ alignSelf: "center", marginTop: 6 }}>// loading manifest…</span>
          </div>
        </StateBlock>

        {/* ─── PAGE · EMPTY ──────────────────────────────────────── */}
        <StateBlock title="Page · empty" sub="manifest is valid but the page has no widgets" cols={1}>
          <div className="page-state has-grid">
            <span className="we-note">// 0 widgets configured</span>
            <span className="ps-headline">This page has no widgets configured.</span>
            <span className="ps-sub">Edit <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-default)" }}>manifest.yaml</code> to add a widget binding under <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-default)" }}>pages.&lt;slug&gt;.widgets</code>.</span>
            <span className="ps-code">~/.aideck/consumers/aideck-demo/manifest.yaml</span>
            <span className="ps-actions">
              <button className="btn btn-ghost"><span className="gly">↗</span>open in editor</button>
              <button className="btn btn-ghost"><span className="gly">📖</span>see widget reference</button>
            </span>
          </div>
        </StateBlock>

        {/* ─── PAGE · ERROR ──────────────────────────────────────── */}
        <StateBlock title="Page · error" sub="page slug missing from manifest" cols={1}>
          <div className="page-error">
            <div className="pe-head">
              <span className="pe-x">×</span>
              <span>manifest error</span>
              <span className="pe-path">/ manifest.yaml:42</span>
            </div>
            <div className="pe-msg">
              Page slug <code style={{ fontFamily: "var(--font-mono)", color: "var(--status-error)" }}>analytics</code> is not declared in <code style={{ fontFamily: "var(--font-mono)" }}>manifest.yaml</code>.
            </div>
            <pre className="pe-code">
              <div><span className="line-num">39</span><span className="tk-key">pages</span>:</div>
              <div><span className="line-num">40</span>  - <span className="tk-key">slug</span>: <span className="tk-str">overview</span></div>
              <div><span className="line-num">41</span>  - <span className="tk-key">slug</span>: <span className="tk-str">task-board</span></div>
              <div className="err-line"><span className="err-arrow">▸ 42</span>  - <span className="tk-key">slug</span>: <span className="tk-str">__missing__</span></div>
              <div><span className="line-num">43</span>  - <span className="tk-key">slug</span>: <span className="tk-str">plan-detail</span></div>
              <div><span className="line-num">44</span><span className="tk-cm">    # analytics is referenced in routes but never declared here</span></div>
            </pre>
            <div className="pe-suggestion">
              <span>→</span>
              <span>Add the <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>analytics</code> page or remove the route from <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>pages:</code>.</span>
            </div>
            <div className="pe-actions">
              <button className="btn btn-secondary"><span className="gly">↻</span>reload</button>
              <button className="btn btn-ghost"><span className="gly">↗</span>open file</button>
              <span className="btn-log">view full server log →</span>
            </div>
          </div>
        </StateBlock>

        {/* ─── APP · CHROME STATES ───────────────────────────────── */}
        <StateBlock title="App · connecting · disconnected · reconnected" sub="trust-signal pill reflects state · banner appears only when offline" cols={1}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <ChromeVariant label="first paint · before /_sse is up" tag="connecting" mode="connecting" />
            <ChromeVariant label="server went away · 47s ago" tag="disconnected" mode="disconnected" withBanner />
            <ChromeVariant label="back online · banner fades" tag="reconnected" mode="healthy" />
            <div className="toast-demo-wrap">
              <div className="toast">
                <span className="toast-ic">↺</span>
                <span><span className="toast-em">reconnected</span> · 4 widgets refreshed</span>
                <span className="toast-meta">auto-dismiss · 3s</span>
              </div>
            </div>
          </div>
        </StateBlock>

      </div>
    </div>
  );
}

Object.assign(window, { StatesReference });
