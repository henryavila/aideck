/* eslint-disable */
/* aiDeck — demo data (projects, tasks, events) — used across pages */

const PROJECTS = [
  { id: "proj-1", title: "API Gateway Redesign",    status: "active", owner: "Alice", startDate: "2026-04-01", progress: 0.62 },
  { id: "proj-2", title: "Mobile App v3",           status: "active", owner: "Bob",   startDate: "2026-03-15", progress: 0.41 },
  { id: "proj-3", title: "Data Pipeline Migration", status: "paused", owner: "Carol", startDate: "2026-02-01", progress: 0.28 },
  { id: "proj-4", title: "Auth Service Rewrite",    status: "done",   owner: "Dave",  startDate: "2026-01-10", progress: 1.00 },
];

const TASKS = [
  { id: "T-001", title: "Design API schema",            status: "done",        priority: 3, project: "proj-1", tags: ["design", "api"] },
  { id: "T-002", title: "Implement rate limiting",      status: "in-progress", priority: 4, project: "proj-1", tags: ["backend", "security"] },
  { id: "T-003", title: "Write integration tests",      status: "todo",        priority: 2, project: "proj-1", tags: ["testing"] },
  { id: "T-004", title: "UI component library",         status: "in-progress", priority: 3, project: "proj-2", tags: ["frontend", "ui"] },
  { id: "T-005", title: "Push notification service",    status: "todo",        priority: 5, project: "proj-2", tags: ["backend", "mobile"] },
  { id: "T-006", title: "Migrate Postgres to BigQuery", status: "todo",        priority: 4, project: "proj-3", tags: ["data", "migration"] },
  { id: "T-007", title: "OAuth2 provider setup",        status: "done",        priority: 5, project: "proj-4", tags: ["auth", "security"] },
  { id: "T-008", title: "Session token rotation",       status: "done",        priority: 3, project: "proj-4", tags: ["auth", "backend"] },
];

const EVENTS = [
  { ts: "2026-05-26 14:00", kind: "done",    title: "Task T-001 marked done",     refId: "T-001", by: "Alice" },
  { ts: "2026-05-26 13:30", kind: "started", title: "Task T-002 started",         refId: "T-002", by: "Alice" },
  { ts: "2026-05-26 12:00", kind: "paused",  title: "Project proj-3 paused",      refId: "proj-3", by: "Carol" },
  { ts: "2026-05-25 16:00", kind: "done",    title: "Task T-007 marked done",     refId: "T-007", by: "Dave" },
  { ts: "2026-05-25 14:00", kind: "done",    title: "Task T-008 marked done",     refId: "T-008", by: "Dave" },
  { ts: "2026-05-25 10:00", kind: "started", title: "Task T-004 started",         refId: "T-004", by: "Bob" },
];

// Map consumer values onto the 5 semantic status tokens
const STATUS_MAP = {
  "active":      { tone: "info",    label: "active",      glyph: "◉" },
  "in-progress": { tone: "info",    label: "in-progress", glyph: "◉" },
  "done":        { tone: "success", label: "done",        glyph: "✓" },
  "paused":      { tone: "warning", label: "paused",      glyph: "!" },
  "blocked":     { tone: "warning", label: "blocked",     glyph: "!" },
  "todo":        { tone: "neutral", label: "todo",        glyph: "·" },
  "pending":     { tone: "neutral", label: "pending",     glyph: "·" },
  "failed":      { tone: "error",   label: "failed",      glyph: "×" },
  "error":       { tone: "error",   label: "error",       glyph: "×" },
};

const EVENT_TONE = {
  done:    "success",
  started: "info",
  paused:  "warning",
  failed:  "error",
};

function statusInfo(s) {
  return STATUS_MAP[s] || { tone: "neutral", label: s, glyph: "·" };
}

function relTime(ts) {
  // Anchor "now" to 2026-05-26 14:03 (3s after most recent event)
  const NOW = new Date("2026-05-26T14:03:00").getTime();
  const t = new Date(ts.replace(" ", "T")).getTime();
  const diff = Math.max(0, NOW - t);
  const m = Math.floor(diff / 60000);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
}

function shortTime(ts) {
  // "2026-05-26 14:00" → "14:00"
  return ts.slice(11, 16);
}

Object.assign(window, { PROJECTS, TASKS, EVENTS, STATUS_MAP, EVENT_TONE, statusInfo, relTime, shortTime });
