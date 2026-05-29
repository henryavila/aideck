/* eslint-disable */
/* aiDeck — 05 · Widget Group A: Stats & Metrics
   stat · gauge · progress-bar · badge                              */

// ───── Stat ──────────────────────────────────────────────────────────
function StatRef({ label, value, color, delta, deltaTone, deltaArrow, sub }) {
  return (
    <div className="stat-centered">
      <span className="lbl">{label}</span>
      <span className={"v " + (color || "")}>{value}</span>
      {delta && (
        <span className={"d " + (deltaTone || "")}>
          {deltaArrow && <span>{deltaArrow}</span>}
          <span>{delta}</span>
        </span>
      )}
      {sub && !delta && (
        <span className="d">{sub}</span>
      )}
    </div>
  );
}

// ───── Gauge ─────────────────────────────────────────────────────────
function GaugeRef({ value, max, color, sub }) {
  const R = 80, CX = 100, CY = 90;
  const trackPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
  const ratio = Math.max(0, Math.min(1, value / max));
  const len = Math.PI * R;
  const dash = `${(len * ratio).toFixed(2)} ${(len).toFixed(2)}`;
  return (
    <div className="gauge-wrap gauge-ref" style={{ padding: "4px 0 6px" }}>
      <svg className="gauge-svg" viewBox="0 0 200 108" style={{ maxWidth: 200 }}>
        <path className="gauge-track" d={trackPath} strokeWidth="13" />
        <path className={"gauge-fill c-" + color} d={trackPath} strokeWidth="13" strokeDasharray={dash} />
        <text x="100" y="78" textAnchor="middle" className="gauge-value" style={{ fontSize: 26 }}>
          {Number(value).toFixed(value < 10 ? 1 : 0)}
        </text>
        <text x="100" y="98" textAnchor="middle" className="gauge-sub">
          of {max}
        </text>
      </svg>
      {sub && (
        <span className="gauge-ticks" style={{ maxWidth: 200, justifyContent: "center" }}>
          <span>{sub}</span>
        </span>
      )}
    </div>
  );
}

// ───── Progress bar ──────────────────────────────────────────────────
function PBar({ name, value, max, color, pct }) {
  const pctNum = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="pbar">
      {(name || value != null) && (
        <div className="pbar-head">
          <span className="name">{name}</span>
          <span className="frac">{pct ? pctNum + "%" : value + " / " + max}</span>
        </div>
      )}
      <span className={"pbar-track c-" + color}>
        <i style={{ width: pctNum + "%" }} />
      </span>
    </div>
  );
}
function PBarInline({ name, value, max, color }) {
  const pctNum = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="pbar">
      <div className="pbar-head"><span className="name">{name}</span></div>
      <div className="pbar-inline">
        <span className={"pbar-track c-" + color}><i style={{ width: pctNum + "%" }} /></span>
        <span className="pct">{pctNum}%</span>
      </div>
    </div>
  );
}

// ───── Badge ─────────────────────────────────────────────────────────
function Badge({ tone, label, glyph, count }) {
  return (
    <span className={"bdg-pill " + tone}>
      {glyph ? <span className="pgly">{glyph}</span> : <span className="pdot" />}
      <span>{label}</span>
      {count != null && <span className="pct">{count}</span>}
    </span>
  );
}

// ───── Page ──────────────────────────────────────────────────────────
function W05_StatsMetrics() {
  const [activeTab, setActiveTab] = React.useState("overview");
  return (
    <div data-screen-label="05 Stats & Metrics">
      <PageTitleBar consumer="aiDeck Demo" page="Widgets · Stats & Metrics" layout="sections" />
      <TabsBar
        active={activeTab}
        onSelect={setActiveTab}
        tail={<><span>group A · 4 widgets</span></>}
      />

      <div className="wref-page">

        {/* ─── STAT ──────────────────────────────────────────────── */}
        <WRefSection num={1} name="stat · large number + label" sub="centered · tabular-nums · optional delta" src="stat.vue">
          <WRefGrid cols={4}>
            <WRefCell id="a" name="basic count">
              <WCell title="total projects" meta="all">
                <StatRef label="all projects" value="4" />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="info color">
              <WCell title="active projects" meta="status · active">
                <StatRef label="active" value="2" color="info" delta="+1 vs last week" deltaTone="up" deltaArrow="↑" />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="success color">
              <WCell title="tasks done" meta="status · done">
                <StatRef label="tasks done" value="3" color="success" delta="+2 today" deltaTone="up" deltaArrow="↑" />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="large value">
              <WCell title="lines of code" meta="src · tokei">
                <StatRef label="LoC" value="1,247,381" delta="↑ 12.4%" deltaTone="up" />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── GAUGE ─────────────────────────────────────────────── */}
        <WRefSection num={2} name="gauge · semicircular arc" sub="track + fill · color from config · SVG only" src="gauge.vue">
          <WRefGrid cols={4}>
            <WRefCell id="a" name="low value · 40%">
              <WCell title="avg priority" meta="of 5">
                <GaugeRef value={2} max={5} color="chart-4" sub="amber · chart-4" />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="mid · 65%">
              <WCell title="coverage %" meta="of 100">
                <GaugeRef value={65} max={100} color="chart-2" sub="emerald · chart-2" />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="high · 92%">
              <WCell title="uptime %" meta="of 100">
                <GaugeRef value={92} max={100} color="success" sub="status-success" />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="critical · 96%">
              <WCell title="load avg" meta="of 5">
                <GaugeRef value={4.8} max={5} color="error" sub="status-error" />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── PROGRESS BAR ──────────────────────────────────────── */}
        <WRefSection num={3} name="progress-bar · horizontal completion" sub="track 7px · fill animates 200ms" src="progress-bar.vue">
          <WRefGrid cols={4}>
            <WRefCell id="a" name="0% · empty">
              <WCell title="tasks completed" meta="0 / 8">
                <div style={{ padding: "20px 4px" }}>
                  <PBar name="this sprint" value={0} max={8} color="info" />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="37% · partial">
              <WCell title="tasks completed" meta="3 / 8">
                <div style={{ padding: "20px 4px" }}>
                  <PBar name="this sprint" value={3} max={8} color="info" />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="100% · done">
              <WCell title="tasks completed" meta="8 / 8">
                <div style={{ padding: "20px 4px" }}>
                  <PBar name="this sprint" value={8} max={8} color="success" />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="inline %">
              <WCell title="test coverage" meta="of 100">
                <div style={{ padding: "20px 4px" }}>
                  <PBarInline name="coverage" value={65} max={100} color="info" />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="e" name="stacked · packages" span={4}>
              <WCell title="package coverage" meta="source · coverage.json · 5 rows">
                <div className="pbar-stack">
                  {[
                    { n: "@aideck/runtime", v: 92, c: "success" },
                    { n: "@aideck/widgets", v: 78, c: "info" },
                    { n: "@aideck/parser",  v: 64, c: "info" },
                    { n: "@aideck/mcp",     v: 41, c: "warning" },
                    { n: "@aideck/cli",     v: 22, c: "error" },
                  ].map((r) => (
                    <div key={r.n} className="pbar">
                      <div className="pbar-head">
                        <span className="name">{r.n}</span>
                        <span className="frac">{r.v} / 100</span>
                      </div>
                      <span className={"pbar-track c-" + r.c}><i style={{ width: r.v + "%" }} /></span>
                    </div>
                  ))}
                  <div className="pbar-stack-foot">
                    <span>weighted avg</span>
                    <span className="ok">59.4%</span>
                    <span style={{ marginLeft: "auto", color: "var(--fg-faint)" }}>5 of 5 packages</span>
                  </div>
                </div>
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── BADGE ─────────────────────────────────────────────── */}
        <WRefSection num={4} name="badge · pills with counts" sub="semantic for status · chart-N for categories" src="badge.vue">
          <WRefGrid cols={4}>
            <WRefCell id="a" name="status distribution">
              <WCell title="task status" meta="field · status">
                <div className="bdg-row" style={{ padding: "8px 0" }}>
                  <Badge tone="success" label="done"        count={3} />
                  <Badge tone="info"    label="in-progress" count={2} />
                  <Badge tone="neutral" label="todo"        count={3} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="priority · chart-N">
              <WCell title="task priority" meta="field · priority">
                <div className="bdg-row" style={{ padding: "8px 0" }}>
                  <Badge tone="c-1" label="p2" count={1} />
                  <Badge tone="c-2" label="p3" count={3} />
                  <Badge tone="c-3" label="p4" count={2} />
                  <Badge tone="c-4" label="p5" count={2} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="single value">
              <WCell title="release stage" meta="field · stage">
                <div className="bdg-single">
                  <Badge tone="info" label="release candidate" />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="with glyph prefix">
              <WCell title="task status" meta="glyph mode">
                <div className="bdg-row" style={{ padding: "8px 0" }}>
                  <Badge tone="success" glyph="✓" label="done"        count={3} />
                  <Badge tone="info"    glyph="◉" label="in-progress" count={2} />
                  <Badge tone="neutral" glyph="·" label="todo"        count={3} />
                </div>
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

      </div>
    </div>
  );
}

Object.assign(window, { W05_StatsMetrics });
