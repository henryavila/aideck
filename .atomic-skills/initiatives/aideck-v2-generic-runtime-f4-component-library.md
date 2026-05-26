---
schemaVersion: '0.1'
slug: aideck-v2-generic-runtime-f4-component-library
title: 'Component Library'
goal: 'Implement 25 built-in widgets with props contracts, data binding, and responsive behavior.'
status: pending
branch: null
started: '2026-05-26T15:58:39Z'
lastUpdated: '2026-05-26T15:58:39Z'
nextAction: null

parentPlan: aideck-v2-generic-runtime
phaseId: F4

exitGates: []

stack: []

tasks: []

parked: []

emerged: []
---

# F4 — Component Library

Depends on F3 (Frontend Foundation). Requires Claude Design prompts for visual validation.

## 25 Built-in Components

**Data display (4):** Table, Stat/Metric, List, Key-Value
**Charts (4):** Line Chart, Bar Chart, Gauge, Progress Bar
**Text/Content (2):** Markdown, Code Block
**Navigation/Layout (4):** Tabs, Grid/Columns, Accordion, Container
**Status (1):** Badge/Status
**AI-tool specific (3):** Kanban Board, Timeline/History, Log/Activity Feed
**From gap analysis (7):** Tree View, Card, Tag/Chip, Breadcrumb, Drawer/Sidebar, Header/Nav Bar, Search/Filter
**Specialized (1):** Graph/DAG (Mermaid)

Each component ships with:
- Vue SFC with typed props
- configSchema (validated against manifest widget config)
- Data binding via source.ref resolution
- Responsive behavior
