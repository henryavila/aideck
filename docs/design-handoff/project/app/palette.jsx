/* eslint-disable */
/* aiDeck — Command palette (⌘K)
   Glass-thick overlay. Keyboard-first. Filters across:
     PAGES / CONSUMERS / FILES / COMMANDS                          */

// ───── Fuzzy match + highlighter ─────────────────────────────────────
// Subsequence match with a tight-cluster requirement: every matched
// query char must fall within `query.length * 4` chars of the first
// one. Stops scattered false positives ("pul" matching p…u…l across
// a long path) while still allowing minor gaps inside a single word.
function fuzzy(query, text) {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const maxSpan = Math.max(query.length + 6, query.length * 4);
  let qi = 0;
  const indices = [];
  let firstMatch = -1;
  let prev = -2;
  let bonus = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      if (firstMatch === -1) firstMatch = i;
      if (i === prev + 1) bonus += 5;
      const isWordBoundary = i === 0 || /[\s\/_\-\.]/.test(t[i - 1]);
      if (isWordBoundary) bonus += 6;
      indices.push(i);
      prev = i;
      qi++;
    }
  }
  if (qi !== q.length) return null;
  const span = indices[indices.length - 1] - indices[0] + 1;
  if (span > maxSpan) return null;
  const score = firstMatch * 2 - bonus + span;
  return { score, indices, firstMatch };
}

// Highlight matched chars inside a text node.
function Highlighted({ text, indices }) {
  if (!indices || indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  const out = [];
  let buf = "";
  let inMark = false;
  for (let i = 0; i < text.length; i++) {
    const m = set.has(i);
    if (m !== inMark) {
      if (buf) out.push(inMark ? <mark key={out.length}>{buf}</mark> : <span key={out.length}>{buf}</span>);
      buf = "";
      inMark = m;
    }
    buf += text[i];
  }
  if (buf) out.push(inMark ? <mark key={out.length}>{buf}</mark> : <span key={out.length}>{buf}</span>);
  return <>{out}</>;
}

// ───── Catalog of palette items ──────────────────────────────────────
function buildPaletteItems({ currentConsumerId }) {
  // PAGES — one per (consumer, page) pair.
  // For the demo we treat all 4 consumers as having the same 4 pages
  // (TABS) — in production each manifest declares its own.
  const recentPages = [
    { consumer: "code-health",     page: "overview",     name: "Overview",     pos: 1 },
    { consumer: "code-health",     page: "pull-requests",name: "Pull requests",pos: 2 },
    { consumer: "agent-runs",      page: "today",        name: "Today",        pos: 3 },
    { consumer: "agent-runs",      page: "errors",       name: "Errors",       pos: 4 },
    { consumer: "code-health",     page: "deploys",      name: "Deploys",      pos: 5 },
    { consumer: "aideck-demo",     page: "overview",     name: "Overview",     pos: 6 },
  ];
  // pin pages of the current consumer first
  const pages = [...recentPages].sort((a, b) => {
    const aCur = a.consumer === currentConsumerId ? 0 : 1;
    const bCur = b.consumer === currentConsumerId ? 0 : 1;
    if (aCur !== bCur) return aCur - bCur;
    return a.pos - b.pos;
  });

  const consumers = CONSUMERS.map((c) => ({
    id: c.id,
    title: c.title,
    pages: c.pages,
    version: c.version,
    dot: c.dot,
  }));

  const files = [
    { name: "manifest.yaml", consumer: "code-health", path: "~/.aideck/consumers/code-health/manifest.yaml" },
    { name: "prs.jsonl",     consumer: "code-health", path: "~/.aideck/consumers/code-health/data/prs.jsonl" },
    { name: "runs.jsonl",    consumer: "agent-runs",  path: "~/.aideck/consumers/agent-runs/data/runs.jsonl" },
    { name: "manifest.yaml", consumer: "aideck-demo", path: "~/.aideck/consumers/aideck-demo/manifest.yaml" },
    { name: "tasks.yaml",    consumer: "aideck-demo", path: "~/.aideck/consumers/aideck-demo/data/tasks.yaml" },
    { name: "projects.yaml", consumer: "aideck-demo", path: "~/.aideck/consumers/aideck-demo/data/projects.yaml" },
  ];

  const commands = [
    { name: "Reload manifests",                  short: ["⇧", "⌘", "R"] },
    { name: "Toggle sidebar",                    short: ["⌘", "B"] },
    { name: "Copy current page URL",             short: ["⇧", "⌘", "C"] },
    { name: "Open server log",                   short: null },
    { name: "View raw manifest of consumer",     short: null },
    { name: "Toggle demo mode",                  short: null },
  ];

  return { pages, consumers, files, commands };
}

// ───── Filter + rank ─────────────────────────────────────────────────
function filterItems(items, query, currentConsumerId) {
  const matchOne = (item) => {
    const text = item._haystackName + " " + item._haystackPath;
    const m = fuzzy(query, text);
    if (!m) return null;
    // Score separately on name vs path for highlighting
    const nameM = fuzzy(query, item._haystackName);
    const pathM = fuzzy(query, item._haystackPath);
    let baseScore = m.score;
    if (nameM && (!pathM || nameM.score <= pathM.score)) baseScore -= 6; // name match preferred
    if (item._consumer === currentConsumerId) baseScore -= 8;
    return { ...item, _score: baseScore, _nameIdx: nameM?.indices || [], _pathIdx: pathM?.indices || [] };
  };

  const filterGroup = (arr) => {
    if (!query) return arr.map((x) => ({ ...x, _score: 0, _nameIdx: [], _pathIdx: [] }));
    return arr.map(matchOne).filter(Boolean).sort((a, b) => a._score - b._score);
  };

  const pages = filterGroup(items.pages.map((p) => ({
    ...p,
    _kind: "page",
    _haystackName: p.name,
    _haystackPath: p.consumer + " / " + p.page,
    _consumer: p.consumer,
  })));
  const consumers = filterGroup(items.consumers.map((c) => ({
    ...c,
    _kind: "consumer",
    _haystackName: c.title,
    _haystackPath: c.id + " · v" + (c.version || "?"),
    _consumer: c.id,
  })));
  const files = filterGroup(items.files.map((f) => ({
    ...f,
    _kind: "file",
    _haystackName: f.name,
    _haystackPath: f.path,
    _consumer: f.consumer,
  })));
  const commands = filterGroup(items.commands.map((c) => ({
    ...c,
    _kind: "command",
    _haystackName: c.name,
    _haystackPath: "command",
    _consumer: null,
  })));

  return { pages, consumers, files, commands };
}

// ───── Row renderer ──────────────────────────────────────────────────
function PalRow({ item, active, onClick, shortcut }) {
  let icon = null;
  switch (item._kind) {
    case "page":
      icon = <span style={{ color: "var(--fg-subtle)" }}>⌑</span>;
      break;
    case "consumer":
      icon = <span className="dot" style={{ background: item.dot || "var(--chart-1)" }} />;
      break;
    case "file":
      icon = <span style={{ color: "var(--fg-subtle)" }}>≡</span>;
      break;
    case "command":
      icon = <span style={{ color: "var(--fg-subtle)" }}>⌘</span>;
      break;
  }
  return (
    <div
      className={"pal-row" + (active ? " is-active" : "")}
      onMouseDown={(e) => { e.preventDefault(); onClick && onClick(); }}
    >
      <span className="pal-icon">{icon}</span>
      <span className="pal-primary">
        <span className="pal-name">
          <Highlighted text={item._haystackName} indices={item._nameIdx} />
        </span>
        <span className="pal-path">
          {item._kind === "consumer" ? (
            <span>{item.pages} pages · v{item.version}</span>
          ) : (
            <Highlighted text={item._haystackPath} indices={item._pathIdx} />
          )}
        </span>
      </span>
      <span className="pal-tail">
        {shortcut && shortcut.map((k, i) => <span key={i} className="pal-kbd">{k}</span>)}
        {item._kind === "command" && item.short && item.short.map((k, i) => (
          <span key={i} className="pal-kbd">{k}</span>
        ))}
        {active && !shortcut && !(item._kind === "command" && item.short) && (
          <span className="pal-kbd">↵</span>
        )}
      </span>
    </div>
  );
}

// ───── The Palette ───────────────────────────────────────────────────
function CommandPalette({ open, onClose, initialQuery = "", currentConsumerId = null, embedded = false }) {
  const [query, setQuery] = React.useState(initialQuery);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setQuery(initialQuery); }, [initialQuery]);
  React.useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);
  React.useEffect(() => { setSelectedIdx(0); }, [query]);

  const items = React.useMemo(
    () => buildPaletteItems({ currentConsumerId }),
    [currentConsumerId]
  );

  const filtered = React.useMemo(
    () => filterItems(items, query.trim(), currentConsumerId),
    [items, query, currentConsumerId]
  );

  // Flat ordering for keyboard nav
  const flat = [
    ...filtered.pages.slice(0, query ? 8 : 6).map((r) => ({ ...r, _group: "pages" })),
    ...filtered.consumers.slice(0, query ? 8 : 4).map((r) => ({ ...r, _group: "consumers" })),
    ...filtered.files.slice(0, query ? 8 : 4).map((r) => ({ ...r, _group: "files" })),
    ...filtered.commands.slice(0, query ? 8 : 6).map((r) => ({ ...r, _group: "commands" })),
  ];
  const hasResults = flat.length > 0;
  const pageRows = flat.filter((r) => r._group === "pages");

  // ⌘1..⌘9 quick-jump map: position within visible PAGES.
  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose && onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onClose && onClose();
    } else if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const n = parseInt(e.key, 10) - 1;
      if (pageRows[n]) {
        // jump selection to this page
        const i = flat.indexOf(pageRows[n]);
        if (i >= 0) setSelectedIdx(i);
      }
    }
  };

  if (!open) return null;

  const groupRender = (key, label, rows, showShortcuts) => {
    if (rows.length === 0) return null;
    const startIdx = flat.findIndex((r) => r === rows[0]);
    return (
      <div className="pal-group" key={key}>
        <div className="pal-group-h">
          <span>{label}</span>
          {key === "pages" && currentConsumerId && (
            <span className="pin">{currentConsumerId} pinned</span>
          )}
        </div>
        {rows.map((r, i) => {
          const idx = startIdx + i;
          const sc = showShortcuts && key === "pages" && i < 9 ? ["⌘", String(i + 1)] : null;
          const rowKey = r._kind + "-" + (r.path || (r.consumer ? r.consumer + "/" + (r.page || r.name) : r.id || r.name || i));
          return (
            <PalRow
              key={rowKey}
              item={r}
              active={idx === selectedIdx}
              onClick={() => setSelectedIdx(idx)}
              shortcut={sc}
            />
          );
        })}
      </div>
    );
  };

  const overlay = (
    <div
      className="pal-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div className="pal-panel" onKeyDown={onKeyDown}>
        <div className="pal-head">
          <span className="pal-lead">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="jump to consumer, page, widget, file…"
          />
          <span className="pal-kbd">{query ? "↵" : "Esc"}</span>
        </div>

        <div className="pal-list">
          {hasResults ? (
            <>
              {groupRender("pages",     "Pages",     pageRows, true)}
              {groupRender("consumers", "Consumers", filtered.consumers.slice(0, query ? 8 : 4))}
              {groupRender("files",     "Files",     filtered.files.slice(0, query ? 8 : 4))}
              {groupRender("commands",  "Commands",  filtered.commands.slice(0, query ? 8 : 6))}
            </>
          ) : (
            <div className="pal-empty">
              <span className="pe-note">// no match for "{query}"</span>
              <span className="pe-hint">
                press <span className="kbd-i pal-kbd">⌘</span><span className="kbd-i pal-kbd">K</span> to clear
              </span>
            </div>
          )}
        </div>

        <div className="pal-foot">
          <span className="pf-item">
            <span className="pf-keys"><span className="pal-kbd">↑</span><span className="pal-kbd">↓</span></span>
            <span>navigate</span>
          </span>
          <span className="pf-sep">·</span>
          <span className="pf-item">
            <span className="pf-keys"><span className="pal-kbd">↵</span></span>
            <span>open</span>
          </span>
          <span className="pf-sep">·</span>
          <span className="pf-item">
            <span className="pf-keys"><span className="pal-kbd">⇥</span></span>
            <span>jump to group</span>
          </span>
          <span className="pf-spacer" />
          <span className="pf-item">
            <span className="pf-keys"><span className="pal-kbd">Esc</span></span>
            <span>close</span>
          </span>
        </div>
      </div>
    </div>
  );

  return overlay;
}

// ───── Global hook: ⌘K listener ──────────────────────────────────────
function usePalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return [open, setOpen];
}

Object.assign(window, { CommandPalette, usePalette, fuzzy });
