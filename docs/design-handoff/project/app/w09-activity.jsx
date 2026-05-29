/* eslint-disable */
/* aiDeck — 09 · Activity & Navigation reference page */

function W09_ActivityNav() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const tree = React.useMemo(() => buildPlanTree(), []);
  const deepTree = React.useMemo(() => buildDeepTree(), []);

  const cols3 = [
    { id: "todo", label: "Todo" },
    { id: "in-progress", label: "In Progress" },
    { id: "done", label: "Done" },
  ];
  const cols4 = [...cols3.slice(0, 2), { id: "blocked", label: "Blocked" }, cols3[2]];

  const navLinks = [
    { id: "overview", name: "Overview", glyph: "▤", count: 8 },
    { id: "task-board", name: "Task Board", glyph: "▦", count: 8 },
    { id: "analytics", name: "Analytics", glyph: "◵", count: 4 },
    { id: "plan-detail", name: "Plan Detail", glyph: "⊟", count: 1 },
  ];
  const manyNav = [...navLinks, ...["Logs", "Schema", "Sources", "MCP", "About"].map((n, i) => ({ id: "x" + i, name: n }))];

  return (
    <div data-screen-label="09 Activity & Nav">
      <PageTitleBar consumer="aiDeck Demo" page="Widgets · Activity & Nav" layout="sections" />
      <TabsBar active={activeTab} onSelect={setActiveTab} tail={<><span>group E · 8 widgets</span></>} />

      <div className="wref-page">

        {/* ─── 1 · KANBAN ────────────────────────────────────────── */}
        <WRefSection num={1} name="kanban-board · status columns" sub="display-only · empty column · compact / rich cards" src="kanban-board.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="3 columns · standard" span={2}>
              <WCell title="issues" meta="8 cards · 3 columns" bodyClass="flush">
                <KanbanRef columns={cols3} tasks={TASKS} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="4 col · empty column" span={2}>
              <WCell title="issues" meta="blocked = 0" bodyClass="flush">
                <KanbanRef columns={cols4} tasks={TASKS} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="compact cards">
              <WCell title="issues" meta="title only" bodyClass="flush">
                <KanbanRef columns={cols3} tasks={TASKS} compact />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="rich cards · tags + owner">
              <WCell title="issues" meta="full detail" bodyClass="flush">
                <KanbanRef columns={cols3} tasks={TASKS} rich />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 2 · TIMELINE ──────────────────────────────────────── */}
        <WRefSection num={2} name="timeline · chronological spine" sub="dot per event · semantic kind · newest first" src="timeline.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="standard · ts + title + actor">
              <WCell title="activity" meta="6 events">
                <TimelineRef events={EVENTS} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="compact · ts + title">
              <WCell title="activity" meta="dense">
                <TimelineRef events={EVENTS} compact />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="grouped by day">
              <WCell title="activity" meta="date headers">
                <TimelineRef events={EVENTS} grouped />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="single event">
              <WCell title="activity" meta="1 event">
                <TimelineRef events={EVENTS.slice(0, 1)} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 3 · LOG FEED ──────────────────────────────────────── */}
        <WRefSection num={3} name="log-feed · terminal tail" sub="mono · bg-sunken · level-colored · denser than timeline" src="log-feed.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="standard">
              <WCell title="log · stdout" meta="6 lines">
                <LogFeedRef lines={LOG_LINES} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="colored by level">
              <WCell title="log · stdout" meta="ok·info·warn·err">
                <LogFeedRef lines={LOG_LINES} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="auto-scroll · live">
              <WCell title="log · stdout" meta={<><span className="live" /><span className="live-text">streaming</span></>}>
                <LogFeedRef lines={LOG_LINES} scroll />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="many · 50+ scroll">
              <WCell title="log · stdout" meta="48 lines · scroll">
                <LogFeedRef
                  scroll
                  lines={Array.from({ length: 48 }).map((_, i) => {
                    const base = LOG_LINES[i % LOG_LINES.length];
                    return { ...base, ts: "14:" + String(48 - Math.floor(i / 2)).padStart(2, "0") + ":" + String((i * 7) % 60).padStart(2, "0") };
                  })}
                />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 4 · TREE VIEW ─────────────────────────────────────── */}
        <WRefSection num={4} name="tree-view · hierarchy" sub="caret · indent · status chip · ↑↓ →← keyboard" src="tree-view.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="expanded to depth 2">
              <WCell title="plan" meta="projects → tasks">
                <div className="tree" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {tree.map((n) => <TreeRow key={n.id} node={n} depth={0} expanded={{}} onToggle={() => {}} active="proj-1" onSelect={() => {}} />)}
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="collapsed · top level only">
              <WCell title="plan" meta="projects collapsed">
                <TreeCollapsedDemo nodes={tree} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="deep · 3 levels">
              <WCell title="plan · by category" meta="category → project → task">
                <div className="tree" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {deepTree.map((n) => <TreeRow key={n.id} node={n} depth={0} expanded={{}} onToggle={() => {}} active={null} onSelect={() => {}} />)}
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="with status badges">
              <WCell title="plan" meta="chips on every node">
                <div className="tree" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {tree.map((n) => <TreeRow key={n.id} node={n} depth={0} expanded={{}} onToggle={() => {}} active={null} onSelect={() => {}} />)}
                </div>
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 5 · BREADCRUMB ────────────────────────────────────── */}
        <WRefSection num={5} name="breadcrumb · path" sub="current segment bold · mono separators · middle collapses" src="breadcrumb.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="3 levels">
              <WCell title="path" meta="default">
                <div style={{ padding: "8px 4px" }}>
                  <Breadcrumb segments={[{ label: "Home" }, { label: "aiDeck Demo" }, { label: "Overview" }]} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="2 levels">
              <WCell title="path" meta="consumer landing">
                <div style={{ padding: "8px 4px" }}>
                  <Breadcrumb segments={[{ label: "Home" }, { label: "code-health" }]} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="4 levels · deep">
              <WCell title="path" meta="deep nav">
                <div style={{ padding: "8px 4px" }}>
                  <Breadcrumb segments={[{ label: "Home" }, { label: "aiDeck Demo" }, { label: "Plan Detail" }, { label: "proj-1" }]} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="truncated · middle ellipsis">
              <WCell title="path" meta="overflow → …">
                <div style={{ padding: "8px 4px" }}>
                  <Breadcrumb truncate segments={[{ label: "Home" }, { label: "aiDeck Demo" }, { label: "Knowledge Vault" }, { label: "Architecture Decisions" }, { label: "ADR-0042 Runtime SSE" }]} />
                </div>
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 6 · HEADER NAV ────────────────────────────────────── */}
        <WRefSection num={6} name="header-nav · link bar" sub="active always --status-info · horizontal or vertical" src="header-nav.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="horizontal tabs">
              <WCell title="consumer nav" meta="4 links">
                <HeaderNav links={navLinks} active="overview" />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="with glyphs">
              <WCell title="consumer nav" meta="leading glyphs">
                <HeaderNav links={navLinks} active="task-board" glyphs />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="many links · wraps">
              <WCell title="consumer nav" meta="9 links">
                <HeaderNav links={manyNav} active="overview" wrap />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="vertical sidebar">
              <WCell title="consumer nav" meta="sidebar variant">
                <VerticalNav links={navLinks} active="overview" />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 7 · DRAWER ────────────────────────────────────────── */}
        <WRefSection num={7} name="drawer · slide-in panel" sub="200ms slide · Esc closes · dimmed backdrop" src="drawer.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="right drawer">
              <DrawerDemo side="right" title="Filters">
                <SearchFilter placeholder="Filter tasks…" />
                <div style={{ marginTop: 12 }}>
                  <KV2Subset rec={PROJECTS[0]} />
                </div>
              </DrawerDemo>
            </WRefCell>
            <WRefCell id="b" name="left drawer">
              <DrawerDemo side="left" title="Sources">
                <div className="lst">
                  {["manifest.yaml", "tasks.yaml", "projects.yaml", "events.jsonl"].map((f) => (
                    <div key={f} className="lst-row"><span className="l-title" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{f}</span></div>
                  ))}
                </div>
              </DrawerDemo>
            </WRefCell>
            <WRefCell id="c" name="with content · list + kv">
              <DrawerDemo side="right" title="proj-1 detail">
                <KV2Vertical rec={PROJECTS[0]} withStatus />
              </DrawerDemo>
            </WRefCell>
            <WRefCell id="d" name="overlay · dimmed backdrop">
              <DrawerDemo side="right" overlay title="Details">
                <Markdown source={"**API Gateway Redesign**\n\nModernize the API layer with rate limiting and OAuth2.\n\n- 62% complete\n- owner Alice"} />
              </DrawerDemo>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 8 · SEARCH FILTER ─────────────────────────────────── */}
        <WRefSection num={8} name="search-filter · input atom" sub="⌕ glyph · focus ring · removable chips · instant filter" src="search-filter.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="basic search">
              <WCell title="filter" meta="text input">
                <div style={{ padding: "4px 0" }}>
                  <SearchFilter />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="with filter chips">
              <WCell title="filter" meta="active filters">
                <div style={{ padding: "4px 0" }}>
                  <SearchFilter
                    placeholder="Filter issues…"
                    chips={[
                      { k: "status", v: "open", tone: "success" },
                      { k: "label", v: "bug", tone: "c-3" },
                      { k: "priority", v: "≥ 4", tone: "warning" },
                    ]}
                  />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="instant filter · live" span={2}>
              <WCell title="tasks" meta="type to filter">
                <div style={{ padding: "4px 0" }}>
                  <SearchFilter placeholder="Type 'test', 'auth', 'api'…" instant rows={TASKS} />
                </div>
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="empty results">
              <WCell title="tasks" meta="no match">
                <div style={{ padding: "4px 0" }}>
                  <SearchFilter placeholder="Search…" instant rows={[]} />
                </div>
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

      </div>
    </div>
  );
}

// Collapsed tree: render only top-level nodes with a forced-closed state
function TreeCollapsedDemo({ nodes }) {
  const [expanded, setExpanded] = React.useState(
    Object.fromEntries(nodes.map((n) => [n.id, false]))
  );
  const toggle = (id) => setExpanded((m) => ({ ...m, [id]: m[id] === false ? true : false }));
  return (
    <div className="tree" style={{ maxHeight: 260, overflowY: "auto" }}>
      {nodes.map((n) => (
        <TreeRow key={n.id} node={n} depth={0} expanded={expanded} onToggle={toggle} active={null} onSelect={() => {}} />
      ))}
    </div>
  );
}

Object.assign(window, { W09_ActivityNav });
