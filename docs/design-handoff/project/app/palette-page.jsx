/* eslint-disable */
/* aiDeck — Command Palette reference page (4 states embedded) */

function PaletteDemo({ label, query, currentConsumerId }) {
  // Each demo is a non-interactive snapshot:
  //  - `embedded` puts the overlay inside its shell instead of `fixed`
  //  - palette state is kept open, no close behavior
  return (
    <div className="pal-demo-shell">
      <div className="behind" />
      <CommandPalette
        open={true}
        onClose={() => {}}
        initialQuery={query || ""}
        currentConsumerId={currentConsumerId}
        embedded
      />
      <div style={{
        position: "absolute",
        left: 12, top: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--fg-subtle)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFeatureSettings: "'calt' 0",
        zIndex: 1,
        background: "var(--bg-canvas)",
        padding: "2px 8px",
        border: "1px solid var(--border-subtle)",
        borderRadius: 4,
      }}>{label}</div>
    </div>
  );
}

function PaletteReference() {
  const [activeTab, setActiveTab] = React.useState("overview");
  return (
    <div data-screen-label="04b Command Palette">
      <PageTitleBar
        consumer="aiDeck Demo"
        page="Command Palette"
        layout="single"
      />
      <TabsBar
        active={activeTab}
        onSelect={setActiveTab}
        tail={<><span>⌘K · keyboard-first nav</span></>}
      />

      <div className="states-page">

        <StateBlock title="A · open · empty input" sub="default groups: pages · consumers · files · commands" cols={1}>
          <PaletteDemo
            label="state · open"
            query=""
            currentConsumerId={null}
          />
        </StateBlock>

        <StateBlock title="B · filtered · query &lsquo;pul&rsquo;" sub="fuzzy match across name + path, matched chars cyan-underlined" cols={1}>
          <PaletteDemo
            label="state · filtered"
            query="pul"
            currentConsumerId={null}
          />
        </StateBlock>

        <StateBlock title="C · empty results · query &lsquo;xyzqq&rsquo;" sub="terse mono note + secondary line" cols={1}>
          <PaletteDemo
            label="state · empty results"
            query="xyzqq"
            currentConsumerId={null}
          />
        </StateBlock>

        <StateBlock title="D · invoked inside `code-health`" sub="current consumer&rsquo;s pages pinned at top of PAGES" cols={1}>
          <PaletteDemo
            label="state · pinned"
            query=""
            currentConsumerId="code-health"
          />
        </StateBlock>

      </div>
    </div>
  );
}

Object.assign(window, { PaletteReference, PaletteDemo });
