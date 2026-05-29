/* eslint-disable */
/* aiDeck — app entry for 04b Command Palette reference */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "demoBanner": false,
  "sidebar": false,
  "liveTry": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [drawer, setDrawer] = React.useState(false);
  const [livePalOpen, setLivePalOpen] = usePalette();
  const showSide = t.sidebar;

  return (
    <div className={"app" + (drawer ? " drawer-open" : "")}>
      <Chrome
        crumb={["aideck-demo", "Command Palette"]}
        hasSidebar={showSide}
        onToggleSidebar={() => setDrawer((d) => !d)}
        onOpenPalette={() => setLivePalOpen(true)}
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
          <PaletteReference />
        </main>
      </div>
      <StatusBar consumerCount={CONSUMERS.length} sseClients={4} />

      {/* Live palette — press ⌘K to actually try it */}
      {t.liveTry && (
        <CommandPalette
          open={livePalOpen}
          onClose={() => setLivePalOpen(false)}
          currentConsumerId="aideck-demo"
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Shell" />
        <TweakToggle label="Sidebar" value={t.sidebar} onChange={(v) => setTweak('sidebar', v)} />
        <TweakToggle label="Demo banner" value={t.demoBanner} onChange={(v) => setTweak('demoBanner', v)} />
        <TweakSection label="Interactive" />
        <TweakToggle label="Wire live ⌘K palette" value={t.liveTry} onChange={(v) => setTweak('liveTry', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
