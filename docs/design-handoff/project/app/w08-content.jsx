/* eslint-disable */
/* aiDeck — 08 · Content & Layout reference page */

const MD_RICH = `# Project Overview

The **API Gateway Redesign** project aims to modernize our API layer.

## Key Changes
- Rate limiting with token bucket algorithm
- OAuth2 provider integration
- Request/response logging

## Timeline
| Phase          | Status      |
|----------------|-------------|
| Design         | Done        |
| Implementation | In Progress |
| Testing        | Pending     |

> Note: All endpoints must maintain backwards compatibility.

See \`docs/api-spec.md\` for the full specification.`;

const MD_SHORT = `The runtime reads a \`manifest.yaml\` and projects whatever it declares. State stays in **files** — aiDeck never owns it. See [the spec](#) for details.`;

const MD_CODE = `## Quick start

Install and run on the default port:

\`\`\`shell
npm install -g aideck
aideck serve --port 7777
\`\`\`

Then open \`127.0.0.1:7777\`.`;

const TS_CODE = `export interface Consumer {
  id: string
  title: string
  icon?: string
  dataSourceCount: number
  pageCount: number
}`;

const YAML_CODE = `pages:
  - slug: overview
    layout: sections
    widgets:
      - type: stat
        source: tasks.yaml
        title: "Tasks done"
data:
  tasks:
    path: data/tasks.yaml
    schema: schemas/task.json`;

const SHELL_CODE = `# start the runtime on a custom port
aideck serve --port 7777 --no-telemetry

# validate a consumer manifest
aideck validate ~/.aideck/consumers/aideck-demo`;

const LONG_CODE = `import { createServer } from "http"
import { readManifest } from "./manifest"
import { validate } from "./schema"

// aiDeck runtime entrypoint
export async function serve(opts: ServeOptions) {
  const manifest = await readManifest(opts.consumerDir)
  const errors = validate(manifest)
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(\`\${e.path}: \${e.message}\`)
    }
    process.exit(1)
  }

  const server = createServer((req, res) => {
    if (req.url === "/_sse") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      })
      subscribe(res)
      return
    }
    res.writeHead(200)
    res.end(render(manifest))
  })

  server.listen(opts.port, "127.0.0.1", () => {
    console.log(\`aideck on 127.0.0.1:\${opts.port}\`)
  })
  return server
}`;

function W08_Content() {
  const [activeTab, setActiveTab] = React.useState("overview");

  const tabsDemo = [
    { label: "Summary", content: <Markdown source={MD_SHORT} /> },
    { label: "Tasks", count: 8, content: (
      <div className="lst">
        {TASKS.map((t) => (
          <div key={t.id} className="lst-row">
            <span className="l-lead">{t.id}</span>
            <span className="l-title">{t.title}</span>
            <span className="l-tail"><StatusChip status={t.status} /></span>
          </div>
        ))}
      </div>
    ) },
    { label: "Config", content: <CodeBlock code={YAML_CODE} lang="yaml" /> },
  ];

  const manyTabs = ["Overview", "Tasks", "Config", "Logs", "Schema", "Sources", "MCP", "About"].map((l, i) => ({
    label: l,
    content: <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-muted)", padding: 4 }}>// {l.toLowerCase()} panel · {i + 1} of 8</div>,
  }));

  const singleTab = [{ label: "Readme", content: <Markdown source={MD_SHORT} /> }];

  const buildPhases = [
    { title: "install deps",   tail: "✓ 142 pkgs · 0 vulns", tailTone: "success", open: true,  body: "142 packages installed · 0 vulnerabilities · cache hit (1.8s)" },
    { title: "type check",     tail: "✓ 0 errors",           tailTone: "success", open: true,  body: "tsc --noEmit · 0 errors across 348 files (4.1s)" },
    { title: "unit tests",     tail: "✓ 1,284 passed",       tailTone: "success", open: false, body: "1,284 passed · 0 failed · 0 skipped (12.4s)" },
    { title: "e2e tests",      tail: "! 2 flaky",            tailTone: "warning", open: true,  body: "re-running 2 of 3 flaky specs · checkout-flow, auth-redirect" },
    { title: "build artifact", tail: "queued",               tailTone: "neutral", open: false, body: "waiting for e2e to pass" },
  ];

  const nestedAcc = [
    { title: "frontend", tail: "3 steps", tailTone: "neutral", open: true, body: (
      <Accordion items={[
        { title: "vite build", tail: "✓ 2.1s", tailTone: "success", body: "dist/ · 412 KB gzipped" },
        { title: "type check", tail: "✓ 0 err", tailTone: "success", body: "vue-tsc · clean" },
      ]} />
    ) },
    { title: "backend", tail: "2 steps", tailTone: "neutral", open: false, body: "go build ./... · clean" },
  ];

  return (
    <div data-screen-label="08 Content & Layout">
      <PageTitleBar consumer="aiDeck Demo" page="Widgets · Content & Layout" layout="sections" />
      <TabsBar active={activeTab} onSelect={setActiveTab} tail={<><span>group D · 6 widgets</span></>} />

      <div className="wref-page">

        {/* ─── 1 · MARKDOWN ──────────────────────────────────────── */}
        <WRefSection num={1} name="markdown · formatted prose" sub="headings · lists · table · blockquote · inline code" src="markdown.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="rich · full document" span={2}>
              <WCell title="project overview" meta="source · overview.md">
                <Markdown source={MD_RICH} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="short · inline code + bold">
              <WCell title="description" meta="1 paragraph">
                <Markdown source={MD_SHORT} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="code-heavy · fenced block">
              <WCell title="quick start" meta="md + code fence">
                <Markdown source={MD_CODE} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="empty">
              <WCell title="notes" meta="no content">
                <Markdown source="" />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 2 · CODE BLOCK ────────────────────────────────────── */}
        <WRefSection num={2} name="code-block · syntax + copy" sub="semantic tokens · bg-sunken · sticky lang tag" src="code-block.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="typescript">
              <WCell title="Consumer interface" meta="types.ts">
                <CodeBlock code={TS_CODE} lang="typescript" lineNumbers />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="yaml">
              <WCell title="manifest snippet" meta="manifest.yaml">
                <CodeBlock code={YAML_CODE} lang="yaml" lineNumbers />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="shell">
              <WCell title="run the runtime" meta="bash">
                <CodeBlock code={SHELL_CODE} lang="shell" />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="long · scroll + line numbers">
              <WCell title="serve.ts" meta="35 lines · scroll">
                <CodeBlock code={LONG_CODE} lang="typescript" lineNumbers tall />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 3 · TABS ──────────────────────────────────────────── */}
        <WRefSection num={3} name="tabs · one panel at a time" sub="←/→ to switch · active underline · instant" src="tabs.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="3 tabs · default">
              <WCell title="project detail" meta="3 panels">
                <TabsWidget tabs={tabsDemo} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="many tabs · scroll overflow">
              <WCell title="consumer" meta="8 panels">
                <TabsWidget tabs={manyTabs} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="single tab · bar still renders" span={2}>
              <WCell title="readme" meta="1 panel">
                <TabsWidget tabs={singleTab} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 4 · ACCORDION ─────────────────────────────────────── */}
        <WRefSection num={4} name="accordion · expand / collapse" sub="caret · trailing status · Enter/Space toggles" src="accordion.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="default collapsed">
              <WCell title="build pipeline" meta="all closed">
                <Accordion items={buildPhases.map((p) => ({ ...p, open: false }))} />
              </WCell>
            </WRefCell>
            <WRefCell id="b" name="mixed · per-item open">
              <WCell title="build pipeline" meta="2 expanded">
                <Accordion items={buildPhases} />
              </WCell>
            </WRefCell>
            <WRefCell id="c" name="all open">
              <WCell title="build pipeline" meta="all expanded">
                <Accordion items={buildPhases.map((p) => ({ ...p, open: true }))} />
              </WCell>
            </WRefCell>
            <WRefCell id="d" name="nested · accordion in accordion">
              <WCell title="build · by surface" meta="depth 2">
                <Accordion items={nestedAcc} />
              </WCell>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 5 · CONTAINER ─────────────────────────────────────── */}
        <WRefSection num={5} name="container · invisible group" sub="no frame · optional eyebrow title · children carry frames" src="container.vue">
          <WRefGrid cols={2}>
            <WRefCell id="a" name="grouped stats · row">
              <Container row>
                <MiniStat label="active" value="2" tone="info" />
                <MiniStat label="done" value="3" tone="success" />
              </Container>
            </WRefCell>
            <WRefCell id="b" name="titled container">
              <Container title="this sprint">
                <MiniStat label="tasks" value="8" />
              </Container>
            </WRefCell>
            <WRefCell id="c" name="nested · depth 2" span={2}>
              <Container title="outer container">
                <Container title="inner container" nested>
                  <div className="grid-cols c-2">
                    <MiniStat label="opened" value="14" tone="info" />
                    <MiniStat label="merged" value="9" tone="success" />
                  </div>
                </Container>
              </Container>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

        {/* ─── 6 · GRID COLUMNS ──────────────────────────────────── */}
        <WRefSection num={6} name="grid-columns · multi-column layout" sub="invisible · collapses to 1 col ≤ 700px" src="grid-columns.vue">
          <WRefGrid cols={1}>
            <WRefCell id="a" name="2 columns · list + key-value">
              <GridColumns cols={2}>
                <WCell title="tasks" meta="list">
                  <div className="lst">
                    {TASKS.slice(0, 4).map((t) => (
                      <div key={t.id} className="lst-row"><span className="l-title">{t.title}</span></div>
                    ))}
                  </div>
                </WCell>
                <WCell title="project · proj-1" meta="key-value">
                  <KV2Subset rec={PROJECTS[0]} />
                </WCell>
              </GridColumns>
            </WRefCell>
            <WRefCell id="b" name="3 columns · three stats">
              <GridColumns cols={3}>
                <MiniStat label="opened" value="14" tone="info" />
                <MiniStat label="merged" value="9" tone="success" />
                <MiniStat label="blocked" value="2" tone="warning" />
              </GridColumns>
            </WRefCell>
            <WRefCell id="c" name="uneven · 2fr / 1fr">
              <GridColumns uneven>
                <WCell title="recent runs" meta="wide column" bodyClass="flush">
                  <TableConfigured rows={PROJECTS.slice(0, 3)} />
                </WCell>
                <MiniStat label="success rate" value="94%" tone="success" />
              </GridColumns>
            </WRefCell>
          </WRefGrid>
        </WRefSection>

      </div>
    </div>
  );
}

Object.assign(window, { W08_Content });
