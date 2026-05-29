/* eslint-disable */
/* aiDeck — 06 · Widget Group B: Data Display
   table · list · key-value · card · tag-chip                       */

// ── Wide-table fixture (lots of columns) ────────────────────────────
const WIDE_RUNS = [
  { id: "run-2381", build: "main",   author: "Alice",  branch: "main",            commit: "9f3a01b", agent: "claude-sonnet-4", duration: "2m 14s", tokensIn: 24_812, tokensOut: 18_201, status: "done",        startedAt: "14:02:51" },
  { id: "run-2382", build: "pr-142", author: "Bob",    branch: "feature/api",     commit: "412dd9c", agent: "claude-sonnet-4", duration: "1m 38s", tokensIn: 12_402, tokensOut:  8_811, status: "done",        startedAt: "14:03:12" },
  { id: "run-2383", build: "pr-143", author: "Carol",  branch: "fix/cache",       commit: "8c1ef02", agent: "claude-opus-4",   duration: "—",      tokensIn:  3_201, tokensOut:    412, status: "in-progress", startedAt: "14:03:48" },
  { id: "run-2384", build: "nightly",author: "system", branch: "main",            commit: "7a9b020", agent: "claude-sonnet-4", duration: "4m 02s", tokensIn: 42_881, tokensOut: 32_018, status: "done",        startedAt: "13:58:01" },
  { id: "run-2385", build: "pr-141", author: "Dave",   branch: "feature/auth",    commit: "33ccaa1", agent: "claude-opus-4",   duration: "1m 51s", tokensIn: 14_201, tokensOut: 12_412, status: "failed",      startedAt: "13:55:32" },
  { id: "run-2386", build: "pr-139", author: "Eve",    branch: "docs/migration",  commit: "11bb22e", agent: "claude-sonnet-4", duration: "0m 47s", tokensIn:  6_402, tokensOut:  5_201, status: "done",        startedAt: "13:51:09" },
];

// ───── Table variations ──────────────────────────────────────────────
function TableFull({ rows }) {
  return (
    <table className="tab">
      <thead>
        <tr>
          <th style={{ width: 84 }}>id <span className="sort-caret">▴▾</span></th>
          <th>title <span className="sort-caret active">▾</span></th>
          <th style={{ width: 100 }}>status <span className="sort-caret">▴▾</span></th>
          <th style={{ width: 100 }}>owner <span className="sort-caret">▴▾</span></th>
          <th style={{ width: 110 }}>started <span className="sort-caret">▴▾</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="mono">{r.id}</td>
            <td className="title">{r.title}</td>
            <td><StatusChip status={r.status} /></td>
            <td className="owner">{r.owner}</td>
            <td className="mono">{r.startDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableConfigured({ rows }) {
  return (
    <table className="tab">
      <thead>
        <tr>
          <th>title</th>
          <th style={{ width: 110 }}>status</th>
          <th style={{ width: 100 }}>owner</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="title">{r.title}</td>
            <td><StatusChip status={r.status} /></td>
            <td className="owner">{r.owner}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableWide() {
  return (
    <div className="tab-wide-wrap">
      <table className="tab tab-sticky-first">
        <thead>
          <tr>
            <th style={{ minWidth: 90 }}>id</th>
            <th style={{ minWidth: 84 }}>build</th>
            <th style={{ minWidth: 100 }}>author</th>
            <th style={{ minWidth: 150 }}>branch</th>
            <th style={{ minWidth: 90 }}>commit</th>
            <th style={{ minWidth: 140 }}>agent</th>
            <th style={{ minWidth: 92 }}>duration</th>
            <th style={{ minWidth: 90, textAlign: "right" }}>tokens in</th>
            <th style={{ minWidth: 96, textAlign: "right" }}>tokens out</th>
            <th style={{ minWidth: 110 }}>status</th>
            <th style={{ minWidth: 90 }}>started</th>
          </tr>
        </thead>
        <tbody>
          {WIDE_RUNS.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.id}</td>
              <td className="mono">{r.build}</td>
              <td className="owner">{r.author}</td>
              <td className="mono">{r.branch}</td>
              <td className="mono">{r.commit}</td>
              <td className="mono">{r.agent}</td>
              <td className={"mono " + (r.duration === "—" ? "em-dash" : "")}>{r.duration}</td>
              <td className="num">{r.tokensIn.toLocaleString()}</td>
              <td className="num">{r.tokensOut.toLocaleString()}</td>
              <td><StatusChip status={r.status} /></td>
              <td className="mono">{r.startedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableEmpty() {
  return (
    <div>
      <table className="tab">
        <thead>
          <tr>
            <th style={{ width: 84 }}>id</th>
            <th>title</th>
            <th style={{ width: 100 }}>status</th>
            <th style={{ width: 100 }}>owner</th>
          </tr>
        </thead>
      </table>
      <div className="tab-empty">
        <span className="te-note">// 0 rows · filter applied</span>
        <span className="te-msg">No projects match status = <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-default)" }}>archived</code></span>
        <span className="te-action">clear filter →</span>
      </div>
    </div>
  );
}

// ───── List variations ───────────────────────────────────────────────
function ListBasic({ rows }) {
  return (
    <div className="lst">
      {rows.map((r) => (
        <div key={r.id} className="lst-row">
          <span className="l-title">{r.title}</span>
        </div>
      ))}
    </div>
  );
}
function ListChip({ rows }) {
  return (
    <div className="lst">
      {rows.map((r) => (
        <div key={r.id} className="lst-row">
          <span className="l-title">{r.title}</span>
          <span className="l-tail"><StatusChip status={r.status} /></span>
        </div>
      ))}
    </div>
  );
}
function ListMonoLead({ rows }) {
  // Use task id as a fake "due" mono token
  return (
    <div className="lst">
      {rows.map((r) => (
        <div key={r.id} className="lst-row">
          <span className="l-lead">2026-05-{(28 - r.priority).toString().padStart(2, "0")}</span>
          <span className="l-title">{r.title}</span>
        </div>
      ))}
    </div>
  );
}
function List3Col({ rows }) {
  return (
    <div className="lst">
      {rows.map((r) => (
        <div key={r.id} className="lst-row">
          <span className="l-lead">{r.id}</span>
          <span className="l-title">{r.title}</span>
          <span className="l-tail"><StatusChip status={r.status} /></span>
        </div>
      ))}
    </div>
  );
}
function ListEmpty() {
  return (
    <div className="lst-empty">
      <span>// 0 items</span>
      <span style={{ color: "var(--fg-muted)", fontSize: 12, fontFamily: "var(--font-sans)", letterSpacing: "-0.005em" }}>
        No tasks under this status.
      </span>
      <span style={{ color: "var(--accent-link)", fontSize: 11, marginTop: 4, cursor: "pointer" }}>add a task →</span>
    </div>
  );
}

// ───── Key-Value variations ──────────────────────────────────────────
function KV2Vertical({ rec, withStatus }) {
  const rows = [
    { k: "id",         v: rec.id,       mono: true },
    { k: "title",      v: rec.title },
    { k: "status",     v: rec.status,   tone: withStatus ? "info" : null, statusChip: true },
    { k: "owner",      v: rec.owner },
    { k: "startDate",  v: rec.startDate, mono: true },
  ];
  return (
    <div className="kv2">
      {rows.map((r) => (
        <div key={r.k} className="kv2-row">
          <span className="k">{r.k}</span>
          <span className={"v " + (r.mono ? "mono " : "") + (r.tone || "")}>
            {r.statusChip && withStatus ? <StatusChip status={r.v} /> : r.v}
          </span>
        </div>
      ))}
    </div>
  );
}

function KV2Grid({ rec }) {
  const pairs = [
    ["id",        rec.id,      "mono"],
    ["title",     rec.title,   ""],
    ["status",    rec.status,  ""],
    ["owner",     rec.owner,   ""],
    ["startDate", rec.startDate, "mono"],
    ["progress",  Math.round(rec.progress * 100) + "%", "mono"],
  ];
  return (
    <div className="kv2 is-grid">
      {pairs.map(([k, v, m]) => (
        <React.Fragment key={k}>
          <span className="k">{k}</span>
          <span className={"v " + m}>{v}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
function KV2Subset({ rec }) {
  return (
    <div className="kv2">
      <div className="kv2-row"><span className="k">title</span><span className="v">{rec.title}</span></div>
      <div className="kv2-row"><span className="k">status</span><span className="v"><StatusChip status={rec.status} /></span></div>
      <div className="kv2-row"><span className="k">owner</span><span className="v">{rec.owner}</span></div>
    </div>
  );
}

// ───── Card grid variations ──────────────────────────────────────────
function CardGrid({ rows, fields }) {
  return (
    <div className="cards-grid">
      {rows.map((r) => (
        <a key={r.id} className="subcard" href="#" onClick={(e) => e.preventDefault()}>
          <div className="sc-title">{r.title}</div>
          <div className="sc-sub">{r.owner} · {r.id}</div>
          {fields && fields.length > 0 && (
            <div className="sc-fields">
              {fields.map((f) => {
                const v = f === "progress" ? Math.round(r[f] * 100) + "%" : r[f];
                const mono = f === "startDate" || f === "progress" || f === "id";
                return (
                  <div key={f} className="sf-row">
                    <span className="sf-k">{f}</span>
                    <span className={"sf-v " + (mono ? "mono" : "")}>
                      {f === "status" ? <StatusChip status={r.status} /> : v}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </a>
      ))}
    </div>
  );
}

function CardSingle({ rec }) {
  return (
    <div className="subcard is-single">
      <div className="sc-title">{rec.title}</div>
      <div className="sc-sub">{rec.owner} · {rec.id}</div>
      <div className="sc-fields">
        <div className="sf-row"><span className="sf-k">status</span><span className="sf-v"><StatusChip status={rec.status} /></span></div>
        <div className="sf-row"><span className="sf-k">started</span><span className="sf-v mono">{rec.startDate}</span></div>
        <div className="sf-row"><span className="sf-k">progress</span><span className="sf-v mono">{Math.round(rec.progress * 100)}%</span></div>
      </div>
    </div>
  );
}

// ───── Tag chip variations ───────────────────────────────────────────
function TagChipsAll({ tagCounts, hideCounts, take }) {
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const list = take ? sorted.slice(0, take) : sorted;
  return (
    <div className="tag-cloud">
      {list.map(([tag, count], i) => (
        <span key={tag} className={"tag-chip t-" + ((i % 8) + 1)}>
          <span>{tag}</span>
          {!hideCounts && count > 1 && <span className="ct">·&nbsp;{count}</span>}
        </span>
      ))}
    </div>
  );
}

// Generated cloud for variation D (many tags)
const MANY_TAGS = (() => {
  const base = "api backend frontend ui ux design data migration testing security auth performance refactor docs ci cd deploy mobile ios android web monitoring observability search graphql rest grpc db cache queue worker streaming sse mcp claude review build release nightly".split(" ");
  const out = {};
  base.forEach((t, i) => out[t] = 1 + ((i * 3) % 5));
  return out;
})();

// ───── Page ──────────────────────────────────────────────────────────
function W06_DataDisplay() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const proj = PROJECTS[0];

  const tagCounts = {};
  TASKS.forEach((t) => (t.tags || []).forEach((tag) => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }));

  return (
    <div data-screen-label="06 Data Display">
      <PageTitleBar consumer="aiDeck Demo" page="Widgets · Data Display" layout="sections" />
      <TabsBar
        active={activeTab}
        onSelect={setActiveTab}
        tail={<><span>group B · 5 widgets</span></>}
      />

      <div className="wref-page">

        {/* ─── 1 · TABLE ─────────────────────────────────────────── */}
        <WRefSection num={1} name="table · sortable rows" sub="sticky header · semantic chips · mono ids" src="table.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="full · all columns">
              <WCell title="projects" meta="source · projects.yaml · 4 rows" bodyClass="flush">
                <TableFull rows={PROJECTS} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="configured columns">
              <WCell title="projects" meta="fields · [title, status, owner]" bodyClass="flush">
                <TableConfigured rows={PROJECTS} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="wide · sticky first col" span={2}>
              <WCell title="agent runs" meta="source · runs.jsonl · 11 cols · scroll →" bodyClass="flush">
                <TableWide />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="empty · filter applied" span={2}>
              <WCell title="projects" meta="filter · status=archived" bodyClass="flush">
                <TableEmpty />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 2 · LIST ──────────────────────────────────────────── */}
        <WRefSection num={2} name="list · vertical rows" sub="title · optional lead/tail · 1 or 2 fields" src="list.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="basic · titles only">
              <WCell title="tasks" meta="field · title">
                <ListBasic rows={TASKS.slice(0, 5)} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="with trailing status chip">
              <WCell title="tasks" meta="title + status">
                <ListChip rows={TASKS.slice(0, 5)} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="leading mono date">
              <WCell title="upcoming · by due date" meta="date + title">
                <ListMonoLead rows={TASKS.slice(0, 5)} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="3-column · id · title · chip">
              <WCell title="tasks" meta="id + title + status">
                <List3Col rows={TASKS.slice(0, 5)} />
              </WCell>
            </WRefCell>
            <WRefCell id="e" name="empty list" span={2}>
              <WCell title="tasks" meta="filter · status=blocked">
                <ListEmpty />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 3 · KEY-VALUE ────────────────────────────────────── */}
        <WRefSection num={3} name="key-value · single record" sub="vertical · grid · subset · status-colored" src="key-value.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="vertical pairs">
              <WCell title="project · proj-1" meta="all fields">
                <KV2Vertical rec={proj} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="2-col horizontal grid">
              <WCell title="project · proj-1" meta="all fields">
                <KV2Grid rec={proj} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="subset of fields">
              <WCell title="project · proj-1" meta="fields · [title, status, owner]">
                <KV2Subset rec={proj} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="status row · semantic chip">
              <WCell title="project · proj-1" meta="status colored">
                <KV2Vertical rec={proj} withStatus />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 4 · CARD ──────────────────────────────────────────── */}
        <WRefSection num={4} name="card · records as cards" sub="auto-fill minmax(200, 1fr)" src="card.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="basic · title + subtitle" span={2}>
              <WCell title="projects" meta="source · projects.yaml">
                <CardGrid rows={PROJECTS} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="with fields" span={2}>
              <WCell title="projects" meta="fields · [status, startDate, progress]">
                <CardGrid rows={PROJECTS} fields={["status", "startDate", "progress"]} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="single record">
              <WCell title="project · proj-1" meta="card · 1 record">
                <CardSingle rec={proj} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="many records · wraps">
              <WCell title="tasks" meta="source · tasks.yaml · 8 records">
                <CardGrid
                  rows={TASKS.map((t) => ({
                    id: t.id, title: t.title, owner: "—",
                    status: t.status, startDate: "p" + t.priority,
                    progress: t.status === "done" ? 1 : t.status === "in-progress" ? 0.5 : 0,
                  }))}
                />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 5 · TAG CHIP ──────────────────────────────────────── */}
        <WRefSection num={5} name="tag-chip · outlined chips · chart-N rotation" sub="square radius · variety reads as data variety" src="tag-chip.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="all tags · with counts">
              <WCell title="task tags" meta={Object.keys(tagCounts).length + " unique"}>
                <TagChipsAll tagCounts={tagCounts} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="no counts">
              <WCell title="task tags" meta="display-only">
                <TagChipsAll tagCounts={tagCounts} hideCounts />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="few · 3 tags">
              <WCell title="active tags" meta="filter · top-3">
                <TagChipsAll tagCounts={tagCounts} take={3} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="many · 40+ wraps">
              <WCell title="repo topics" meta={Object.keys(MANY_TAGS).length + " unique · wraps"}>
                <TagChipsAll tagCounts={MANY_TAGS} hideCounts />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

      </div>
    </div>
  );
}

Object.assign(window, { W06_DataDisplay });
