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

**Input** (scope-discriminated):
```typescript
{
  scope: 'phase' | 'task'
  consumer: string
  // scope === 'phase': require planSlug + phaseId
  planSlug?: string
  phaseId?: string
  // scope === 'task': require initiativeSlug + taskId (plan is NOT read)
  initiativeSlug?: string
  taskId?: string
}
```

Phase-mode resolves phase dependencies against `Plan.phases[].status === 'done'`.
Task-mode parses only the initiative and resolves `Task.blockedBy` against
done sibling tasks. Missing required fields for the chosen scope return
`invalid_input`.

**Output**:
```typescript
{
  scope: 'phase' | 'task'
  id: string              // phase.id or task.id
  resolved: string[]      // satisfied dependencies
  blocking: string[]      // unsatisfied dependencies blocking start
  blockedBy: string[]     // full upstream list (shape consistent across scopes)
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
  verifierResultId?: string   // refId of a prior verifier_result inbox record
  by?: 'human' | 'ai'         // default: 'ai'
}
```

**Output**:
```typescript
{
  intentId: string
  recordedAt: IsoTimestamp
  accepted: true
  note: string
  phaseCompleteHint?: { initiativeSlug: string; remaining: number; lastTaskId: string }
}
```

**Side effect**: appends an `IntentRecord` JSONL line to
`<consumer-root>/inbox/<YYYY-MM-DD>.jsonl`. aiDeck does **NOT** mutate
`initiatives/<slug>.md` (Iron Law 1). The consumer skill tails inbox and
applies. Tool returns `precondition_failed` if the initiative file is missing
or unparsable. `phaseCompleteHint` is populated when the marked task was the
last non-done task in the initiative.

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

Runs a criterion verifier (or accepts a manual ack) and **appends a
`VerifierResult` JSONL record to `inbox/`**. aiDeck does not mutate the
entity file — the consumer skill projects the record into canonical state.

**Input**:
```typescript
{
  consumer: string
  target: 'phase' | 'initiative' | 'task'   // 'plan' removed in post-review fixes
  planSlug?: string         // required when target === 'phase'
  initiativeSlug?: string   // required when target === 'initiative' | 'task'
  phaseId?: string          // required when target === 'phase'
  taskId?: string           // required when target === 'task'
  criterionId: string
  result?: 'met' | 'pending' | 'deferred'
  deferredReason?: string   // required when result === 'deferred'
  evidence?: string
  timeoutMs?: number        // shell verifier ceiling; runs in own process group
  by?: 'human' | 'ai'       // default: 'ai'
}
```

**Output**:
```typescript
{
  result: 'met' | 'pending' | 'deferred'
  verifierRan: boolean
  verifierOutput?: string
  evidence?: string
  allGatesMet: boolean      // canonical status + prior inbox verifier_result records
  verifierResultId: string  // refId for downstream aideck_mark_task_done
}
```

If verifier exists and `result` not provided, aiDeck runs it. Shell verifiers
run in their own process group so timeout kills the whole tree. If verifier
is `manual`, `result` is required. `query` and `test` verifier kinds parse
but return `precondition_failed` (v0.2). `allGatesMet` is computed from
canonical siblings AND the latest prior `verifier_result` for each sibling
in inbox/, so a sequence of verifications converges to `true` without needing
the consumer to re-write the entity file between calls.

---

### `aideck_annotate`

**Input**:
```typescript
{
  target: { consumer: string; slug?: string; path: string }
  body: string
  author?: 'human' | 'ai'   // default: 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

**Side effect**: appends to `<consumer-root>/annotations/<YYYY-MM-DD>.jsonl`.

---

### `aideck_highlight`

**Input**:
```typescript
{
  target: { consumer: string; slug?: string; path: string }
  reason: string
  severity: 'info' | 'warn' | 'critical'
  source?: 'human' | 'ai'   // default: 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

**Side effect**: appends to `<consumer-root>/highlights/<YYYY-MM-DD>.jsonl`.

---

### `aideck_record_decision`

**Input**:
```typescript
{
  target: { consumer: string; slug?: string; path: string }
  decision: 'approve' | 'reject' | 'block' | 'defer'
  reason?: string
  by?: 'human' | 'ai'       // default: 'ai'
}
```

**Output**: `{ id: string; createdAt: IsoTimestamp }`.

**Side effect**: appends a `kind: 'decision'` line to
`<consumer-root>/inbox/<YYYY-MM-DD>.jsonl`. (Iron Law 1: only `annotations/`,
`highlights/`, and `inbox/` are writable. Decisions ride the inbox stream.)

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
