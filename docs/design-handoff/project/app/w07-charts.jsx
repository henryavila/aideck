/* eslint-disable */
/* aiDeck — 07 · Charts & Visualization reference page */

function W07_Charts() {
  const [activeTab, setActiveTab] = React.useState("overview");

  // Bar: tasks by priority
  const byPriority = {};
  TASKS.forEach((t) => { byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });
  const priorityBars = [2, 3, 4, 5].map((p) => ({ label: "p" + p, value: byPriority[p] || 0 }));

  // Grouped: tool tokens per day
  const toolGroups = [
    { label: "Mon", values: [42, 28, 12, 18] },
    { label: "Tue", values: [51, 34, 16, 22] },
    { label: "Wed", values: [38, 30, 10, 26] },
    { label: "Thu", values: [60, 41, 22, 31] },
    { label: "Fri", values: [47, 36, 14, 19] },
  ];
  const toolSeries = ["read", "write", "bash", "grep"];

  // Line: task completion running total
  const doneLine = [{ name: "done", data: [0, 1, 1, 2, 2, 3, 5] }];
  const labels = ["May 20", "May 21", "May 22", "May 23", "May 24", "May 25", "May 26"];

  const multiLine = [
    { name: "merged",  data: [12, 18, 14, 22, 19, 28, 24] },
    { name: "opened",  data: [10, 14, 12, 18, 16, 22, 20] },
    { name: "blocked", data: [4, 6, 5, 8, 7, 5, 6] },
  ];

  const areaLine = [{ name: "requests", data: [120, 180, 140, 260, 220, 340, 300] }];

  const stackedSeries = [
    { name: "read",  data: [20, 28, 22, 34, 30] },
    { name: "write", data: [12, 16, 14, 20, 18] },
    { name: "bash",  data: [6, 9, 7, 11, 8] },
  ];
  const stackedLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  // DAG sources
  const dagSmall = `graph TD
    proj4["Auth Service Rewrite"]:::done --> proj1["API Gateway Redesign"]:::active
    proj3["Data Pipeline Migration"]:::paused --> proj1
    proj1 --> proj2["Mobile App v3"]:::active
    classDef done fill:#0f2a1e,stroke:#1f8a5b,color:#e6e9ef;
    classDef active fill:#0d2438,stroke:#2a6fdb,color:#e6e9ef;
    classDef paused fill:#2e2410,stroke:#b8841f,color:#e6e9ef;`;

  const dagLinear = `graph LR
    a["Parse manifest"]:::done --> b["Validate schema"]:::done
    b --> c["Render widgets"]:::active
    c --> d["Serve /_sse"]:::queued
    classDef done fill:#0f2a1e,stroke:#1f8a5b,color:#e6e9ef;
    classDef active fill:#0d2438,stroke:#2a6fdb,color:#e6e9ef;
    classDef queued fill:#11151c,stroke:#3a4250,color:#9aa3b2;`;

  const dagWide = `graph TD
    root["events.jsonl"]:::active --> w1["Timeline"]:::done
    root --> w2["Log Feed"]:::done
    root --> w3["Stat: events"]:::done
    root --> w4["Kanban"]:::active
    root --> w5["Activity heatmap"]:::queued
    classDef done fill:#0f2a1e,stroke:#1f8a5b,color:#e6e9ef;
    classDef active fill:#0d2438,stroke:#2a6fdb,color:#e6e9ef;
    classDef queued fill:#11151c,stroke:#3a4250,color:#9aa3b2;`;

  const dagPipeline = `graph LR
    src["git push"]:::done --> lint["lint"]:::done
    src --> test["test"]:::done
    lint --> build["build"]:::active
    test --> build
    build --> e2e["e2e"]:::active
    build --> docker["docker"]:::queued
    e2e --> deploy["deploy"]:::error
    docker --> deploy
    classDef done fill:#0f2a1e,stroke:#1f8a5b,color:#e6e9ef;
    classDef active fill:#0d2438,stroke:#2a6fdb,color:#e6e9ef;
    classDef queued fill:#11151c,stroke:#3a4250,color:#9aa3b2;
    classDef error fill:#2e1416,stroke:#c0455a,color:#e6e9ef;`;

  return (
    <div data-screen-label="07 Charts & Viz">
      <PageTitleBar consumer="aiDeck Demo" page="Widgets · Charts & Viz" layout="sections" />
      <TabsBar active={activeTab} onSelect={setActiveTab} tail={<><span>group C · 3 widgets</span></>} />

      <div className="wref-page">

        {/* ─── 1 · BAR CHART ─────────────────────────────────────── */}
        <WRefSection num={1} name="bar-chart · categorical" sub="pure SVG · min bar 2px · 3 gridlines · hover tooltip" src="bar-chart.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="vertical · single color">
              <WCell title="tasks by priority" meta="count · chart-1">
                <BarVertical data={priorityBars} colorIdx={1} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="horizontal · labels left">
              <WCell title="tasks by priority" meta="rotated 90°">
                <BarHorizontal data={priorityBars} colorIdx={1} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="multi-series grouped">
              <WCell title="tool tokens · by day" meta="read · write · bash · grep">
                <BarGrouped groups={toolGroups} series={toolSeries} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="single bar · capped width">
              <WCell title="active sprints" meta="count">
                <BarSingle label="sprint 14" value={3} max={5} colorIdx={1} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 2 · LINE CHART ────────────────────────────────────── */}
        <WRefSection num={2} name="line-chart · sequential" sub="1.8px stroke · round caps · chart-N in order" src="line-chart.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="single line · 7 points">
              <WCell title="tasks done · running total" meta="7-day window">
                <LineChartSVG series={doneLine} labels={labels} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="multi-line · legend">
              <WCell title="PR activity · 7d" meta="merged · opened · blocked">
                <LineChartSVG series={multiLine} labels={labels} showDots={false} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="area fill · gradient">
              <WCell title="requests · 7d" meta="area · chart-1 → transparent">
                <LineChartSVG series={areaLine} area labels={labels} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="stacked area · 3 series">
              <WCell title="tool calls · stacked" meta="read · write · bash">
                <LineChartSVG series={stackedSeries} stacked labels={stackedLabels} showDots={false} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 3 · GRAPH / DAG ───────────────────────────────────── */}
        <WRefSection num={3} name="graph-dag · Mermaid (lazy-loaded)" sub="semantic node fills · auto-fit · pan if overflow" src="graph-dag.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="small · 4 nodes 3 edges">
              <WCell title="project dependencies" meta="source · projects.yaml">
                <DagWidget source={dagSmall} legend={["done", "active", "paused"]} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="linear chain">
              <WCell title="render pipeline" meta="manifest → sse">
                <DagWidget source={dagLinear} legend={["done", "active", "queued"]} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="wide · fan-out">
              <WCell title="events.jsonl consumers" meta="1 source → 5 widgets">
                <DagWidget source={dagWide} legend={["done", "active", "queued"]} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="pipeline DAG · parallel">
              <WCell title="CI pipeline" meta="status per step">
                <DagWidget source={dagPipeline} legend={["done", "active", "queued", "error"]} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

      </div>
    </div>
  );
}

Object.assign(window, { W07_Charts });
