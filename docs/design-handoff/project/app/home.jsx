/* eslint-disable */
/* aiDeck — Home page: consumer listing */

const CONSUMERS = [
  {
    id: "aideck-demo",
    title: "aiDeck Demo",
    iconKey: "rocket",
    tone: 1,
    dot: "var(--chart-1)",
    status: "ready",
    pages: 3,
    dataSourceCount: 3,
    version: "0.1.0",
    lastSeen: "2s ago",
  },
  {
    id: "code-health",
    title: "code-health",
    iconKey: "pulse",
    tone: 2,
    dot: "var(--chart-3)",
    status: "ready",
    pages: 5,
    dataSourceCount: 8,
    version: "0.3.1",
    lastSeen: "11s ago",
  },
  {
    id: "knowledge-vault",
    title: "knowledge-vault",
    iconKey: "database",
    tone: 3,
    dot: "var(--chart-2)",
    status: "loading",
    pages: null,
    dataSourceCount: null,
    version: null,
    lastSeen: "scanning…",
  },
  {
    id: "agent-runs",
    title: "agent-runs",
    iconKey: "bot",
    tone: 4,
    dot: "var(--chart-5)",
    status: "error",
    pages: 3,
    dataSourceCount: 4,
    version: "0.2.0",
    lastSeen: "47s ago",
    error: {
      path: "manifest.yaml:42",
      msg: "unexpected ',' — expected mapping key",
    },
  },
];

// ───── Status pill helper ────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === "ready") {
    return (
      <span className="pill success">
        <span className="dot" />
        <span>ready</span>
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span className="pill neutral loading">
        <span className="dot" />
        <span>loading</span>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="pill error">
        <span className="dot" />
        <span>parse error</span>
      </span>
    );
  }
  return null;
}

// ───── Consumer card ─────────────────────────────────────────────────
function ConsumerCard({ c }) {
  const isLoading = c.status === "loading";
  const isError   = c.status === "error";

  return (
    <a
      className={
        "cc tone-" + c.tone +
        (isError ? " is-error" : "") +
        (isLoading ? " is-loading" : "")
      }
      href={"#/" + c.id}
      tabIndex={0}
      aria-disabled={isLoading || undefined}
    >
      <div className="cc-head">
        <span className="cc-ico">{Icon[c.iconKey]}</span>
        <div className="cc-title">
          <span className="cc-name">{c.title}</span>
          <span className="cc-id">id · {c.id}</span>
        </div>
        <StatusPill status={c.status} />
      </div>

      <div className="cc-divide" />

      <div className="cc-meta">
        <div className="cc-kv">
          <span className="k">pages</span>
          <span className="v">{isLoading ? "" : c.pages}</span>
        </div>
        <div className="cc-kv">
          <span className="k">data sources</span>
          <span className="v">{isLoading ? "" : c.dataSourceCount}</span>
        </div>
        <div className="cc-kv">
          <span className="k">version</span>
          <span className="v mono muted">{isLoading ? "" : c.version}</span>
        </div>
        <div className="cc-kv">
          <span className="k">last seen</span>
          <span className={"v mono " + (isError ? "" : "success")}>
            {isLoading ? "" : c.lastSeen}
          </span>
        </div>
      </div>

      <div className="cc-filler" />

      {isError && c.error && (
        <div className="cc-err">
          <span className="err-ic">×</span>
          <span>
            <span className="err-path">{c.error.path}</span>{" "}
            <span className="err-msg">· {c.error.msg}</span>
          </span>
        </div>
      )}
    </a>
  );
}

// ───── Empty state composition ───────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-wrap">
      <div className="empty-note">// no consumers registered</div>
      <div className="empty-msg">
        Drop a <span className="em-path">manifest.yaml</span> into <span className="em-path">~/.aideck/consumers/</span> to begin.
      </div>
      <div className="empty-cmd">
        <span className="prompt">$</span>
        <span>aideck</span>
        <span style={{ color: "var(--fg-muted)" }}>init-consumer</span>
        <span className="arg">my-tool</span>
        <span className="copy" title="copy">⧉</span>
      </div>
      <div className="empty-hint">aideck watches the directory; new consumers appear within 2s.</div>
    </div>
  );
}

// ───── Home page ─────────────────────────────────────────────────────
function HomePage({ empty }) {
  const consumers = empty ? [] : CONSUMERS;
  const healthy   = consumers.filter((c) => c.status === "ready").length;
  const broken    = consumers.filter((c) => c.status === "error").length;

  return (
    <div data-screen-label="Home">
      <div className="home-head">
        <div>
          <div className="eyebrow">consumers</div>
          <h1>Registered runtimes</h1>
        </div>
        {!empty && (
          <div className="meta">
            <span>{consumers.length} registered</span>
            <span style={{ color: "var(--fg-faint)", margin: "0 6px" }}>·</span>
            <span className="ok">{healthy} healthy</span>
            {broken > 0 && (
              <>
                <span style={{ color: "var(--fg-faint)", margin: "0 6px" }}>·</span>
                <span className="err">{broken} broken</span>
              </>
            )}
          </div>
        )}
        <div className="actions">
          <button className="btn btn-ghost"><span className="gly">↻</span>refresh</button>
          <button className="btn btn-secondary"><span className="gly">+</span>init consumer</button>
        </div>
      </div>

      {empty ? (
        <EmptyState />
      ) : (
        <div className="consumer-grid">
          {consumers.map((c) => <ConsumerCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { HomePage, CONSUMERS });
