/* eslint-disable */
/* aiDeck — Overview page (sections-layout composition only).
   Page-level chrome (tabs, title, sections) lives in app/page-shell.jsx. */

function ConsumerOverview() {
  const totalProjects = PROJECTS.length;
  const activeProjects = PROJECTS.filter((p) => p.status === "active").length;
  const doneTasks = TASKS.filter((t) => t.status === "done").length;
  const totalTasks = TASKS.length;
  const [activeTab, setActiveTab] = React.useState("overview");

  return (
    <div data-screen-label="02 Overview">
      <PageTitleBar consumer="aiDeck Demo" page="Overview" layout="sections" />
      <TabsBar active={activeTab} onSelect={setActiveTab} />

      <Section title="Project Stats" count={4} sub="24h window" kind="stats">
        <StatWidget
          title="total projects"
          label="all"
          value={totalProjects}
          deltaLabel="no change · last 7d"
          span={3}
        />
        <StatWidget
          title="active projects"
          label="status · active"
          value={activeProjects}
          tone="info"
          deltaLabel="+1 vs last week"
          deltaTone="up"
          deltaArrow="↑"
          span={3}
        />
        <StatWidget
          title="tasks done"
          label="status · done"
          value={doneTasks}
          tone="success"
          deltaLabel="+2 today"
          deltaTone="up"
          deltaArrow="↑"
          span={3}
        />
        <StatWidget
          title="total tasks"
          label="all"
          value={totalTasks}
          deltaLabel="50% complete"
          span={3}
        />
      </Section>

      <Section title="Projects" sub="source · projects.yaml">
        <ProjectsTable rows={PROJECTS} span={12} />
      </Section>

      <Section title="Recent Activity" count={2} sub="streaming · events.jsonl">
        <TimelineWidget events={EVENTS} span={8} />
        <LogFeed span={4} />
      </Section>
    </div>
  );
}

Object.assign(window, { ConsumerOverview });
