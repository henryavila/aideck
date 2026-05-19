# aiDeck MCP Tools (v0.1)

aiDeck exposes ~18 MCP tools organized into five categories. The full surface enables an AI agent to read state, mutate work tracking, verify exit gates, exchange feedback with humans, and discover the runtime.

## Tool index

### Read tools (AI ← aiDeck)

| Tool | Purpose |
|------|---------|
| `aideck_get_state` | Full state snapshot for a consumer or specific slug |
| `aideck_get_plan` | Read a Plan with its phase tree, principles, glossary |
| `aideck_get_phase` | Read a single phase descriptor with its exit gate |
| `aideck_get_initiative` | Read an Initiative (tasks, stack, parked, emerged) |
| `aideck_get_task` | Read a single task with verifier and outputs |
| `aideck_get_next_action` | Smart "what should I work on now?" projection |
| `aideck_get_dependencies` | Resolved dependency graph for a phase or task |

### Mutation tools (AI → aiDeck → files)

| Tool | Purpose |
|------|---------|
| `aideck_mark_task_done` | Close a task; triggers phase-completion check |
| `aideck_update_initiative_status` | Set initiative status (active/paused/done/archived) |
| `aideck_update_next_action` | Set the `next_action` string on an initiative |
| `aideck_push_frame` | Append a stack frame (task/research/validation/discussion) |
| `aideck_pop_frame` | Pop top frame with destination (resolve/park/emerge) |
| `aideck_park_item` | Park a side-finding within the current initiative |
| `aideck_emerge_item` | Emerge a finding as candidate for new initiative |
| `aideck_promote_parked` | Promote a parked item to a real task |
| `aideck_add_task` | Append a new task to an initiative |

### Exit-gate tools (AI ↔ aiDeck)

| Tool | Purpose |
|------|---------|
| `aideck_verify_exit_gate` | Run a verifier on a criterion (shell/query/test/manual) and update its status |

### Feedback channel (AI ↔ humans via dashboard)

| Tool | Purpose |
|------|---------|
| `aideck_annotate` | Attach a note to any target |
| `aideck_highlight` | Flag a target for attention with severity |
| `aideck_record_decision` | Log approve/reject/block/defer with optional reason |
| `aideck_inbox` | Receive human inputs from the dashboard since a cursor |

### Meta (discovery + compat)

| Tool | Purpose |
|------|---------|
| `aideck_list_consumers` | List registered consumers (v0.1: just `project-status`) |
| `aideck_health` | Repo health summary (stale initiatives, unmet gates, etc.) |
| `aideck_schema_version` | Report schema version + tool API version |

---

## Detailed schemas

### `aideck_get_state`

**Input**:
```typescript
{ consumer: string; slug?: string }
```

**Output**: Full `ProjectStatusState` (or scoped if slug provided).

**Errors**: `consumer_unknown`, `slug_not_found`, `schema_version_mismatch`.

---

### `aideck_get_plan`

**Input**:
```typescript
{ consumer: string; slug: string }
```

**Output**: `Plan` including narrative body, principles, glossary, phase tree, references.

---

### `aideck_get_phase`

**Input**:
```typescript
{ consumer: string; planSlug: string; phaseId: string }
```

**Output**: `PhaseDescriptor` with exit gate + criterion list.

---

### `aideck_get_initiative`

**Input**:
```typescript
{ consumer: string; slug: string }
```

**Output**: `Initiative` including tasks, stack, parked, emerged, body, references.

---

### `aideck_get_task`

**Input**:
```typescript
{ consumer: string; initiativeSlug: string; taskId: string }
```

**Output**: `Task` with verifier, outputs, tags.

---

### `aideck_get_next_action`

**Input**:
```typescript
{ consumer: string; planSlug?: string; initiativeSlug?: string }
```

**Output**: `NextActionProjection` — aiDeck computes from current_phase + task statuses + dependency graph. Returns "next pending task in current phase" by default, or surfaces the phase-complete prompt if all tasks done.

---

### `aideck_get_dependencies`

**Input**:
```typescript
{ consumer: string; planSlug: string; phaseId?: string; taskId?: string }
```

**Output**:
```typescript
{
  resolved: string[]      // satisfied dependencies
  blocking: string[]      // unsatisfied dependencies blocking start
  blockedBy: string[]     // upstream items
}
```

---

### `aideck_mark_task_done`

**Input**:
```typescript
{
  consumer: string
  initiativeSlug: string
  taskId: string
  verifierResult?: { passed: boolean; evidence?: string }
}
```

**Output**:
```typescript
{
  closed: boolean
  phaseCompletePrompt?: {
    phaseId: string
    pendingGates: ExitCriterion[]
    nextPhaseSuggestion?: string
  }
}
```

**Side effect**: writes to `<consumer-root>/initiatives/<slug>.md` (frontmatter mutation). If the closed task was the last pending task in the phase, the response includes a `phaseCompletePrompt` for the AI to confirm phase transition.

---

### `aideck_update_initiative_status`

**Input**:
```typescript
{
  consumer: string
  slug: string
  status: 'active' | 'paused' | 'done' | 'archived'
  reason?: string
}
```

**Output**: `{ updated: boolean; previousStatus: string }`.

---

### `aideck_update_next_action`

**Input**:
```typescript
{ consumer: string; slug: string; nextAction: string | null }
```

**Output**: `{ updated: boolean }`.

---

### `aideck_push_frame`

**Input**:
```typescript
{
  consumer: string
  slug: string
  title: string
  type?: 'task' | 'research' | 'validation' | 'discussion'
}
```

**Output**: `{ frameId: number; depth: number; warning?: string }`.

Warning emitted when `depth > maxStackDepthWarning`.

---

### `aideck_pop_frame`

**Input**:
```typescript
{
  consumer: string
  slug: string
  destination: 'resolve' | 'park' | 'emerge'
}
```

**Output**: `{ poppedFrameId: number; newDepth: number; movedTo?: 'parked' | 'emerged' }`.

---

### `aideck_park_item`

**Input**:
```typescript
{ consumer: string; slug: string; title: string }
```

**Output**: `{ parkedAt: IsoTimestamp; fromFrame: number | null }`.

---

### `aideck_emerge_item`

**Input**:
```typescript
{ consumer: string; slug: string; title: string }
```

**Output**:
```typescript
{
  surfacedAt: IsoTimestamp
  suggestion?: { newInitiativeSlug: string }  // aiDeck hints at slug
}
```

---

### `aideck_promote_parked`

**Input**:
```typescript
{
  consumer: string
  slug: string
  parkedTitleOrIndex: string | number
}
```

**Output**: `{ newTaskId: string }`.

---

### `aideck_add_task`

**Input**:
```typescript
{
  consumer: string
  slug: string
  title: string
  description?: string
  verifier?: ExitCriterionVerifier
}
```

**Output**: `{ taskId: string }`.

---

### `aideck_verify_exit_gate`

Runs a criterion verifier (or accepts a manual ack) and updates status.

**Input**:
```typescript
{
  consumer: string
  target: 'plan' | 'phase' | 'initiative' | 'task'
  planSlug?: string
  initiativeSlug?: string
  phaseId?: string
  taskId?: string
  criterionId: string
  result?: 'met' | 'deferred' | 'pending'
  deferredReason?: string
  evidence?: string
}
```

**Output**:
```typescript
{
  status: GateStatus
  verifierRan: boolean
  verifierOutput?: string
  allGatesMet: boolean
}
```

If verifier exists and `result` not provided, aiDeck runs it (shell/query/test) and reports `verifierOutput`. If verifier is `manual`, `result` is required.

---

### `aideck_annotate`

**Input**:
```typescript
{
  consumer: string
  slug?: string
  targetPath: string
  body: string
  author: 'human' | 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

**Side effect**: appends to `<consumer-root>/annotations/<YYYY-MM-DD>.jsonl`.

---

### `aideck_highlight`

**Input**:
```typescript
{
  consumer: string
  slug?: string
  targetPath: string
  reason: string
  severity: 'info' | 'warn' | 'critical'
  source: 'human' | 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

---

### `aideck_record_decision`

**Input**:
```typescript
{
  consumer: string
  slug?: string
  targetPath: string
  decision: 'approve' | 'reject' | 'block' | 'defer'
  reason?: string
  by: 'human' | 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

---

### `aideck_inbox`

**Input**:
```typescript
{ consumer?: string; since?: IsoTimestamp; limit?: number }
```

**Output**:
```typescript
{
  items: InboxItem[]
  nextCursor?: IsoTimestamp  // pass as `since` in next call
}
```

If `consumer` omitted, returns inbox across all registered consumers.

---

### `aideck_list_consumers`

**Input**: `{}`

**Output**:
```typescript
{
  consumers: Array<{
    id: string
    title: string
    rootPath: string
    schemaVersion: string
    state: 'active' | 'empty' | 'error'
  }>
}
```

---

### `aideck_health`

**Input**: `{ consumer?: string }`

**Output**: `HealthReport` — stale initiatives, unmet gates, open highlights, inbox unread count.

---

### `aideck_schema_version`

**Input**: `{}`

**Output**:
```typescript
{
  schemaVersion: '0.1'
  apiVersion: '0.1'
  toolCount: number
  compatibleSchemas: string[]
}
```

---

## Versioning policy

- **Schema version** (data shape): bumps minor for additive fields, major for breaking.
- **API version** (tool surface): bumps minor when tools are added, major when signatures change.
- Both reported by `aideck_schema_version`.

Consumers should:
1. Call `aideck_schema_version` once at startup.
2. Compare against expected versions.
3. Refuse to operate on incompatible majors.
