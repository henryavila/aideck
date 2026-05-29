/* eslint-disable */
/* aiDeck — app entry for 07 Charts & Visualization widget reference */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "demoBanner": false,
  "sidebar": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawer, setDrawer] = React.useState(false);
  const [palOpen, setPalOpen] = usePalette();
  const showSide = t.sidebar;

  return (
    <div className={"app" + (drawer ? " drawer-open" : "")}>
      <Chrome
        crumb={["aideck-demo", "Widgets · Charts & Viz"]}
        hasSidebar={showSide}
        onToggleSidebar={() => setDrawer((d) => !d)}
        onOpenPalette={() => setPalOpen(true)}
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
          <W07_Charts />
        </main>
      </div>
      <StatusBar consumerCount={CONSUMERS.length} sseClients={4} />

      <CommandPalette open={palOpen} onClose={() => setPalOpen(false)} currentConsumerId="aideck-demo" />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Shell" />
        <TweakToggle label="Sidebar" value={t.sidebar} onChange={(v) => setTweak('sidebar', v)} />
        <TweakToggle label="Demo banner" value={t.demoBanner} onChange={(v) => setTweak('demoBanner', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
