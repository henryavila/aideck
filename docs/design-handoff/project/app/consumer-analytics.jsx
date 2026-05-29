/* eslint-disable */
/* aiDeck — Analytics page (sections layout · bar + gauge + tag cloud + badge) */

function ConsumerAnalytics() {
  const [activeTab, setActiveTab] = React.useState("analytics");

  // Tasks grouped by priority
  const byPriority = {};
  TASKS.forEach((t) => { byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });
  const priorityBars = [2, 3, 4, 5].map((p, i) => ({
    label: "p" + p,
    value: byPriority[p] || 0,
    colorIdx: i + 1,
  }));

  // Average priority for the gauge
  const avgPriority = TASKS.reduce((s, t) => s + t.priority, 0) / TASKS.length;

  // Tag counts
  const tagCounts = {};
  TASKS.forEach((t) => (t.tags || []).forEach((tag) => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }));

  // Status distribution
  const statusCounts = {};
  TASKS.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const statusItems = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));

  return (
    <div data-screen-label="04b Analytics">
      <PageTitleBar
        consumer="aiDeck Demo"
        page="Analytics"
        layout="sections"
      />
      <TabsBar active={activeTab} onSelect={setActiveTab} />

      <Section title="Task Completion" count={2} sub="priority distribution">
        <BarChart
          title="tasks by priority"
          meta="count · grouped by priority"
          data={priorityBars}
          span={6}
        />
        <Gauge
          title="average priority"
          meta="of 5"
          value={avgPriority}
          max={5}
          color="chart-2"
          span={6}
        />
      </Section>

      <Section title="Tags" count={2} sub="non-semantic palette · variety is the point">
        <TagCloud
          title="tag distribution"
          meta={`${Object.keys(tagCounts).length} unique tags`}
          tagCounts={tagCounts}
          span={6}
        />
        <BadgeWidget
          title="status distribution"
          meta={`${TASKS.length} tasks`}
          items={statusItems}
          total={TASKS.length}
          span={6}
        />
      </Section>
    </div>
  );
}

Object.assign(window, { ConsumerAnalytics });
