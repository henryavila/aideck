/* eslint-disable */
/* aiDeck — Plan Detail page (single layout · tree-view) */

function ConsumerPlanDetail() {
  const [activeTab, setActiveTab] = React.useState("plan-detail");
  const tree = React.useMemo(() => buildPlanTree(), []);
  return (
    <div data-screen-label="04 Plan Detail">
      <PageTitleBar
        consumer="aiDeck Demo"
        page="Plan Detail"
        layout="single"
      />
      <TabsBar active={activeTab} onSelect={setActiveTab} />

      <div className="single-layout">
        <TreeView nodes={tree} />
      </div>
    </div>
  );
}

Object.assign(window, { ConsumerPlanDetail });
