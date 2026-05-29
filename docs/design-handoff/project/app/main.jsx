/* eslint-disable */
/* aiDeck — app entry for 01 Home */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "demoBanner": false,
  "sidebar": false,
  "empty": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawer, setDrawer] = React.useState(false);
  const showSide = t.sidebar;

  return (
    <div className={"app" + (drawer ? " drawer-open" : "")}>
      <Chrome
        crumb={["home"]}
        hasSidebar={showSide}
        onToggleSidebar={() => setDrawer((d) => !d)}
      />
      {t.demoBanner && <DemoBanner />}
      <div className={"shell" + (showSide ? "" : " no-side")}>
        {showSide && (
          <>
            <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
            <Sidebar consumers={CONSUMERS} currentId={null} onClose={() => setDrawer(false)} />
          </>
        )}
        <main className="main">
          <HomePage empty={t.empty} />
        </main>
      </div>
      <StatusBar consumerCount={t.empty ? 0 : CONSUMERS.length} sseClients={4} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Shell" />
        <TweakToggle label="Sidebar" value={t.sidebar} onChange={(v) => setTweak('sidebar', v)} />
        <TweakToggle label="Demo banner" value={t.demoBanner} onChange={(v) => setTweak('demoBanner', v)} />
        <TweakSection label="Home state" />
        <TweakToggle label="Empty (0 consumers)" value={t.empty} onChange={(v) => setTweak('empty', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
