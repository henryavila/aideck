/* eslint-disable */
/* aiDeck — 07 · Widget Group C: Charts & Visualization
   bar-chart · line-chart · graph-dag (Mermaid, lazy-loaded)
   Pure SVG · chart-N palette in order · semantic for status only.   */

// ───── nice-max helper: round a max up to a sensible step ───────────
function niceMax(v) {
  if (v <= 5) return Math.ceil(v);
  if (v <= 10) return Math.ceil(v / 2) * 2;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / (mag / 2)) * (mag / 2);
}

// ─────────────────────────────────────────────────────────────────────
// 1 · BAR CHART
// ─────────────────────────────────────────────────────────────────────
function BarVertical({ data, colorIdx = 1 }) {
  const [tip, setTip] = React.useState(null);
  const W = 320, H = 150, padL = 28, padB = 22, padT = 14;
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const innerW = W - padL, innerH = H - padB - padT;
  const bw = innerW / data.length;
  const gridlines = [0.25, 0.5, 0.75, 1];
  return (
    <div className="chart">
      {tip && (
        <div className="chart-tip show" style={{ left: tip.x, top: tip.y }}>
          {tip.label}: <span style={{ color: "var(--fg-default)" }}>{tip.value}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {gridlines.map((g, i) => {
          const y = padT + innerH * (1 - g);
          return (
            <g key={i}>
              <line className="chart-gridline" x1={padL} y1={y} x2={W} y2={y} />
              <text className="chart-svg-text" x={padL - 6} y={y + 3} textAnchor="end">
                {Math.round(max * g)}
              </text>
            </g>
          );
        })}
        <line className="chart-axisline" x1={padL} y1={padT + innerH} x2={W} y2={padT + innerH} />
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * innerH);
          const x = padL + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const y = padT + innerH - h;
          return (
            <g key={i}>
              <rect
                className="bar-rect-svg"
                x={x} y={y} width={w} height={h}
                rx="3" ry="3"
                fill={`var(--chart-${colorIdx})`}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.closest("svg").getBoundingClientRect();
                  const sx = (x + w / 2) / W * r.width;
                  const sy = y / H * r.height;
                  setTip({ x: sx, y: sy - 4, label: d.label, value: d.value });
                }}
                onMouseLeave={() => setTip(null)}
              />
              <text className="chart-svg-text" x={x + w / 2} y={padT + innerH + 14} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BarHorizontal({ data, colorIdx = 1 }) {
  const [tip, setTip] = React.useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const rowH = 30, padL = 36, padR = 30;
  const W = 320, H = data.length * rowH + 10;
  const innerW = W - padL - padR;
  return (
    <div className="chart" style={{ minHeight: H }}>
      {tip && (
        <div className="chart-tip show" style={{ left: tip.x, top: tip.y }}>
          {tip.label}: <span style={{ color: "var(--fg-default)" }}>{tip.value}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const w = Math.max(2, (d.value / max) * innerW);
          const y = i * rowH + 8;
          const bh = rowH - 12;
          return (
            <g key={i}>
              <text className="hbar-label" x={0} y={y + bh / 2 + 3.5}>{d.label}</text>
              <rect x={padL} y={y} width={innerW} height={bh} rx="3" fill="var(--bg-elevated)" />
              <rect
                className="bar-rect-svg"
                x={padL} y={y} width={w} height={bh} rx="3"
                fill={`var(--chart-${colorIdx})`}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.closest("svg").getBoundingClientRect();
                  setTip({ x: (padL + w) / W * r.width, y: (y) / H * r.height - 4, label: d.label, value: d.value });
                }}
                onMouseLeave={() => setTip(null)}
              />
              <text className="hbar-value" x={padL + w + 5} y={y + bh / 2 + 3.5}>{d.value}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BarGrouped({ groups, series }) {
  // groups: [{ label, values: [v1,v2,...] }]  series: [name,...]
  const [tip, setTip] = React.useState(null);
  const W = 340, H = 160, padL = 28, padB = 22, padT = 14;
  const allVals = groups.flatMap((g) => g.values);
  const max = niceMax(Math.max(...allVals, 1));
  const innerW = W - padL, innerH = H - padB - padT;
  const gw = innerW / groups.length;
  const n = series.length;
  const bw = (gw * 0.7) / n;
  const gridlines = [0.5, 1];
  return (
    <div className="chart">
      {tip && (
        <div className="chart-tip show" style={{ left: tip.x, top: tip.y }}>
          <div className="tt-row"><span className="tt-sw" style={{ background: `var(--chart-${tip.s + 1})` }} /><span className="tt-k">{series[tip.s]}</span><span className="tt-v">{tip.value}</span></div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {gridlines.map((g, i) => {
          const y = padT + innerH * (1 - g);
          return (
            <g key={i}>
              <line className="chart-gridline" x1={padL} y1={y} x2={W} y2={y} />
              <text className="chart-svg-text" x={padL - 6} y={y + 3} textAnchor="end">{Math.round(max * g)}</text>
            </g>
          );
        })}
        <line className="chart-axisline" x1={padL} y1={padT + innerH} x2={W} y2={padT + innerH} />
        {groups.map((grp, gi) => (
          <g key={gi}>
            {grp.values.map((v, si) => {
              const h = Math.max(2, (v / max) * innerH);
              const x = padL + gi * gw + gw * 0.15 + si * bw;
              const y = padT + innerH - h;
              return (
                <rect
                  key={si}
                  className="bar-rect-svg"
                  x={x} y={y} width={bw * 0.86} height={h} rx="2"
                  fill={`var(--chart-${si + 1})`}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.closest("svg").getBoundingClientRect();
                    setTip({ x: (x + bw * 0.43) / W * r.width, y: y / H * r.height - 4, s: si, value: v });
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              );
            })}
            <text className="chart-svg-text" x={padL + gi * gw + gw / 2} y={padT + innerH + 14} textAnchor="middle">{grp.label}</text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={s} className="le"><span className="sw" style={{ background: `var(--chart-${i + 1})` }} />{s}</span>
        ))}
      </div>
    </div>
  );
}

function BarSingle({ label, value, max, colorIdx = 1 }) {
  const m = niceMax(max || value);
  const W = 320, H = 150, padL = 28, padB = 22, padT = 14;
  const innerH = H - padB - padT;
  const h = Math.max(2, (value / m) * innerH);
  const bw = 64; // capped width so a single bar doesn't look broken
  const x = (W - bw) / 2 + padL / 2;
  const y = padT + innerH - h;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[0.5, 1].map((g, i) => {
          const gy = padT + innerH * (1 - g);
          return (
            <g key={i}>
              <line className="chart-gridline" x1={padL} y1={gy} x2={W} y2={gy} />
              <text className="chart-svg-text" x={padL - 6} y={gy + 3} textAnchor="end">{Math.round(m * g)}</text>
            </g>
          );
        })}
        <line className="chart-axisline" x1={padL} y1={padT + innerH} x2={W} y2={padT + innerH} />
        <rect className="bar-rect-svg" x={x} y={y} width={bw} height={h} rx="3" fill={`var(--chart-${colorIdx})`} />
        <text className="chart-svg-text" x={x + bw / 2} y={padT + innerH + 14} textAnchor="middle">{label}</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 2 · LINE CHART
// ─────────────────────────────────────────────────────────────────────
function LineChartSVG({ series, area, stacked, labels, showDots = true }) {
  // series: [{ name, data:[...] }]
  const [tip, setTip] = React.useState(null);
  const W = 340, H = 150, padL = 28, padB = 20, padT = 12, padR = 6;
  const innerW = W - padL - padR, innerH = H - padB - padT;
  const len = series[0].data.length;

  let stackTop = null;
  if (stacked) {
    stackTop = series[0].data.map(() => 0);
  }
  const allMax = stacked
    ? Math.max(...series[0].data.map((_, i) => series.reduce((s, ser) => s + ser.data[i], 0)))
    : Math.max(...series.flatMap((s) => s.data));
  const max = niceMax(allMax);

  const xAt = (i) => padL + (i / (len - 1)) * innerW;
  const yAt = (v) => padT + innerH - (v / max) * innerH;

  const gridlines = [0, 0.5, 1];

  // Build cumulative for stacked
  const cumulative = [];
  if (stacked) {
    let acc = series[0].data.map(() => 0);
    series.forEach((ser) => {
      const top = ser.data.map((v, i) => acc[i] + v);
      cumulative.push({ name: ser.name, bottom: [...acc], top });
      acc = top;
    });
  }

  return (
    <div className="chart">
      {tip && (
        <div className="chart-tip show" style={{ left: tip.x, top: tip.y }}>
          {tip.title && <div className="tt-title">{tip.title}</div>}
          {tip.rows.map((r, i) => (
            <div key={i} className="tt-row">
              <span className="tt-dot" style={{ background: r.color }} />
              <span className="tt-k">{r.name}</span>
              <span className="tt-v">{r.value}</span>
            </div>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--chart-${i + 1})`} stopOpacity={stacked ? 0.18 : 0.24} />
              <stop offset="100%" stopColor={`var(--chart-${i + 1})`} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {gridlines.map((g, i) => {
          const y = padT + innerH * (1 - g);
          return (
            <g key={i}>
              <line className="chart-gridline" x1={padL} y1={y} x2={W - padR} y2={y} />
              <text className="chart-svg-text" x={padL - 6} y={y + 3} textAnchor="end">{Math.round(max * g)}</text>
            </g>
          );
        })}

        {stacked
          ? cumulative.map((c, i) => {
              const topPts = c.top.map((v, idx) => `${xAt(idx)},${yAt(v)}`);
              const botPts = c.bottom.map((v, idx) => `${xAt(idx)},${yAt(v)}`).reverse();
              return (
                <g key={i}>
                  <polygon points={[...topPts, ...botPts].join(" ")} fill={`url(#grad-${i})`} />
                  <polyline className="line-path" points={topPts.join(" ")} stroke={`var(--chart-${i + 1})`} />
                </g>
              );
            })
          : series.map((s, i) => {
              const pts = s.data.map((v, idx) => `${xAt(idx)},${yAt(v)}`);
              return (
                <g key={i}>
                  {area && (
                    <polygon
                      points={`${padL},${padT + innerH} ${pts.join(" ")} ${W - padR},${padT + innerH}`}
                      fill={`url(#grad-${i})`}
                    />
                  )}
                  <polyline className="line-path" points={pts.join(" ")} stroke={`var(--chart-${i + 1})`} />
                  {showDots && s.data.map((v, idx) => (
                    <circle key={idx} className="line-dot" cx={xAt(idx)} cy={yAt(v)} r="3" fill={`var(--chart-${i + 1})`} />
                  ))}
                </g>
              );
            })}

        {/* hover bands */}
        {Array.from({ length: len }).map((_, idx) => (
          <rect
            key={idx}
            className="line-hover-band"
            x={xAt(idx) - innerW / (len - 1) / 2}
            y={padT}
            width={innerW / (len - 1)}
            height={innerH}
            onMouseEnter={(e) => {
              const r = e.currentTarget.closest("svg").getBoundingClientRect();
              const rows = series.map((s, si) => ({
                name: s.name, value: s.data[idx], color: `var(--chart-${si + 1})`,
              }));
              setTip({
                x: xAt(idx) / W * r.width,
                y: padT / H * r.height + 2,
                title: labels ? labels[idx] : null,
                rows,
              });
            }}
            onMouseLeave={() => setTip(null)}
          />
        ))}
      </svg>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s, i) => (
            <span key={s.name} className="le"><span className="sw" style={{ background: `var(--chart-${i + 1})` }} />{s.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 3 · GRAPH / DAG (Mermaid, lazy-loaded)
// ─────────────────────────────────────────────────────────────────────
let _mermaidPromise = null;
function loadMermaid() {
  if (_mermaidPromise) return _mermaidPromise;
  _mermaidPromise = new Promise((resolve, reject) => {
    if (window.mermaid) { resolve(window.mermaid); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    s.onload = () => {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          lineColor: "#5a6472",
          primaryColor: "#11151c",
          primaryBorderColor: "#3a4250",
          primaryTextColor: "#e6e9ef",
        },
        flowchart: { curve: "basis", htmlLabels: true, padding: 12 },
        securityLevel: "loose",
      });
      resolve(window.mermaid);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _mermaidPromise;
}

let _dagSeq = 0;
function DagWidget({ source, legend }) {
  const [svg, setSvg] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const idRef = React.useRef("dag-" + (_dagSeq++));

  React.useEffect(() => {
    let alive = true;
    loadMermaid()
      .then((m) => m.render(idRef.current, source))
      .then(({ svg }) => { if (alive) setSvg(svg); })
      .catch((e) => { if (alive) setErr(String(e)); });
    return () => { alive = false; };
  }, [source]);

  if (err) {
    return <div className="chart-empty" style={{ color: "var(--status-error)" }}>// graph render failed</div>;
  }
  if (!svg) {
    return (
      <div className="dag-loading">
        <div className="dl-bar" />
        <span>// loading mermaid…</span>
      </div>
    );
  }
  return (
    <>
      <div className="dag" dangerouslySetInnerHTML={{ __html: svg }} />
      {legend && (
        <div className="dag-legend">
          {legend.map((l) => (
            <span key={l} className="dl"><span className={"sw " + l} />{l}</span>
          ))}
        </div>
      )}
    </>
  );
}

Object.assign(window, {
  BarVertical, BarHorizontal, BarGrouped, BarSingle,
  LineChartSVG, DagWidget, niceMax,
});
