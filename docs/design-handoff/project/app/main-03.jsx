/* eslint-disable */
/* aiDeck — app entry for 03 Task Board */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "demoBanner": false,
  "sidebar": true,
  "multiWidget": false,
  "gridDebug": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawer, setDrawer] = React.useState(false);
  const showSide = t.sidebar;

  return (
    <div className={"app" + (drawer ? " drawer-open" : "")}>
      <Chrome
        crumb={["aideck-demo", "Task Board"]}
        hasSidebar={showSide}
        onToggleSidebar={() => setDrawer((d) => !d)}
      />
      {t.demoBanner && <DemoBanner />}
      <div className={"shell" + (showSide ? "" : " no-side")}>
        {showSide && (
          <>
            <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
            <Sidebar consumers={CONSUMERS} currentId="aideck-demo" onClose={() => setDrawer(false)} />
          </>
        )}
        <main className="main">
          <ConsumerBoard multi={t.multiWidget} debug={t.gridDebug} />
        </main>
      </div>
      <StatusBar consumerCount={CONSUMERS.length} sseClients={4} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Shell" />
        <TweakToggle label="Sidebar" value={t.sidebar} onChange={(v) => setTweak('sidebar', v)} />
        <TweakToggle label="Demo banner" value={t.demoBanner} onChange={(v) => setTweak('demoBanner', v)} />
        <TweakSection label="Grid layout demo" />
        <TweakToggle label="Multi-widget grid" value={t.multiWidget} onChange={(v) => setTweak('multiWidget', v)} />
        <TweakToggle label="Show slot overlay" value={t.gridDebug} onChange={(v) => setTweak('gridDebug', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
