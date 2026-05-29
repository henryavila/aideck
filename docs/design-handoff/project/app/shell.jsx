/* eslint-disable */
/* aiDeck — shell components: Chrome · DemoBanner · Sidebar · StatusBar */

// ───── Lucide-style icons (1.5px stroke, currentColor) ───────────────
const Icon = {
  rocket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>
      <path d="M3.5 12.5h5l1-2 2 5 2-7 1.5 4h5"/>
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/>
      <rect width="16" height="12" x="4" y="8" rx="2"/>
      <path d="M2 14h2"/>
      <path d="M20 14h2"/>
      <path d="M15 13v2"/>
      <path d="M9 13v2"/>
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
      <path d="M3 12a9 3 0 0 0 18 0"/>
    </svg>
  ),
};

// ───── Chrome header ─────────────────────────────────────────────────
function Chrome({ crumb, onOpenPalette, onToggleSidebar, hasSidebar }) {
  return (
    <header className="chrome">
      {hasSidebar && (
        <button className="icon-btn drawer-tg" title="open sidebar" onClick={onToggleSidebar}>≡</button>
      )}
      <span className="wm">
        <span className="wm-ai">ai</span><span className="wm-deck">Deck</span>
        <i className="wm-dot" />
      </span>
      <div className="crumb">
        <span className="sep">/</span>
        {crumb && crumb.length > 0 ? (
          crumb.map((c, i) => {
            const last = i === crumb.length - 1;
            return (
              <React.Fragment key={i}>
                <span className={(last ? "now" : "") + (!last ? " crumb-hide-sm" : "")}>{c}</span>
                {!last && <span className="sep crumb-hide-sm">/</span>}
              </React.Fragment>
            );
          })
        ) : (
          <span className="now">home</span>
        )}
      </div>

      <span style={{ flex: 1 }} />

      <div className="pal" role="button" onClick={onOpenPalette}>
        <span className="pal-icon">⌕</span>
        <span className="ph">jump anywhere</span>
        <span className="kbd">⌘</span>
        <span className="kbd">K</span>
      </div>
      <button className="icon-btn pal-icon-btn" title="search" onClick={onOpenPalette} aria-label="search">⌕</button>

      <span className="lh">
        <i />
        <span className="lh-host">127.0.0.1</span>
        <span className="lh-sep">·</span>
        <span className="lh-tag">no telemetry</span>
      </span>

      <button className="icon-btn chrome-help" title="help">?</button>
      <button className="icon-btn chrome-menu" title="menu">⋯</button>
    </header>
  );
}

// ───── Demo banner ───────────────────────────────────────────────────
function DemoBanner() {
  return (
    <div className="banner">
      <span className="ic">⚠</span>
      <span className="b-emph">DEMO MODE</span>
      <span>—</span>
      <span className="b-muted">seeded fixtures, not your data.</span>
      <span className="b-cmd">
        <span>quit with</span>
        <span className="kbd">Ctrl</span>
        <span className="kbd">C</span>
        <span>to clean</span>
      </span>
    </div>
  );
}

// ───── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ consumers, currentId, onClose }) {
  return (
    <aside className="side">
      <div className="side-mobile-head">
        <span className="side-mobile-title">consumers</span>
        <button className="icon-btn" title="close" onClick={onClose}>×</button>
      </div>
      <div className="grp">
        <span>consumers</span>
        <span className="count">{consumers.length}</span>
      </div>
      {consumers.map((c) => {
        const isOn = c.id === currentId;
        return (
          <div
            key={c.id}
            className={"consumer-row" + (isOn ? " on" : "")}
            title={c.id}
          >
            <span className="dot" style={{ background: c.dot }} />
            <span className="name">{c.title}</span>
            {c.status === "error" ? (
              <span className="err-mark">×</span>
            ) : c.status === "loading" ? (
              <span className="ct">…</span>
            ) : (
              <span className="ct">{c.version}</span>
            )}
          </div>
        );
      })}

      <div className="grp" style={{ marginTop: 12 }}>
        <span>data sources</span>
      </div>
      <div className="fs-tree">
        <div className="fs-row"><span className="fs-name fs-root">~/.aideck/</span></div>
        <div className="fs-row lvl-2"><span className="fs-name fs-root">consumers/</span></div>
        <div className="fs-row lvl-3 dir">  <span className="fs-name">aideck-demo/</span><span className="fs-meta">3 srcs</span></div>
        <div className="fs-row lvl-3 dir-2"><span className="fs-name">code-health/</span><span className="fs-meta">8 srcs</span></div>
        <div className="fs-row lvl-3 dir-3"><span className="fs-name">agent-runs/</span><span className="fs-meta" style={{ color: 'var(--status-error)' }}>err</span></div>
        <div className="fs-row lvl-3 dir-4"><span className="fs-name">knowledge-vault/</span><span className="fs-meta">4 srcs</span></div>
      </div>

      <div className="side-foot">
        <span style={{ flex: 1 }}>collapse</span>
        <span className="kbd">⌘</span>
        <span className="kbd">B</span>
      </div>
    </aside>
  );
}

// ───── Status bar ────────────────────────────────────────────────────
function StatusBar({ consumerCount, sseClients }) {
  return (
    <footer className="statusbar">
      <span className="sb-item success"><span className="dot" />127.0.0.1:7777</span>
      <span className="sep sb-d-only">·</span>
      <span className="sb-item sb-d-only"><span className="sb-em">aideck</span> v0.4.0</span>
      <span className="sep sb-d-only">·</span>
      <span className="sb-item sb-d-only"><span className="sb-em">consumers</span> {consumerCount}</span>
      <span className="sep sb-d-only">·</span>
      <span className="sb-item sb-t-only"><span className="sb-em">view</span> home</span>

      <span className="grow" />

      <span className="sb-item"><span className="sb-em">sse</span> {sseClients} clients</span>
      <span className="sep sb-d-only">·</span>
      <span className="sb-item sb-d-only"><span className="sb-em">read</span> 142 <span className="sb-em">· write</span> 0</span>
      <span className="sep sb-d-only">·</span>
      <span className="sb-item sb-d-only">MIT</span>
    </footer>
  );
}

Object.assign(window, { Chrome, DemoBanner, Sidebar, StatusBar, Icon });
