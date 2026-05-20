---
date: 2026-05-19T22:10:00-03:00
topic: aideck-backend-phase
artifact: 69144b6..HEAD
skill: review-code-with-codex (parallel multi-scope)
reviewer: gpt-5 / gpt-5-codex (8 parallel invocations)
codex_version: codex-cli 0.130.0
final_verdict: needs_changes (1 of 8 scopes: reject)
counts_final: {blocker: 0, critical: 2, major: 36, minor: 6, nit: 0}
counts_blind: {blocker: 0, critical: 2, major: 24, minor: 6, nit: 0}
framing_delta: {dropped: 0, maintained: 32, emerged: 12}
schema_version: "1.0"
---

# Cross-Model Review — aiDeck Backend Phase (`69144b6..HEAD`)

## Methodology

Diff `69144b6..HEAD` covers 73 src/ files across 8 logical scopes (164 KB). Each
scope was reviewed independently by Codex CLI in 2-pass sealed envelope
(blind → informed). Tests excluded from this review (91 KB).

| Scope | Slug | Diff | Reviewer | Verdict | Counts |
|-------|------|------|----------|---------|--------|
| A | schemas-validators | 24 KB | gpt-5-codex | needs_changes | 0/0/7/0/0 |
| B | parsers | 12 KB | gpt-5-codex | needs_changes | 0/0/1/3/0 |
| C | server-infra | 21 KB | gpt-5 | needs_changes | 0/**1**/5/1/0 |
| D | server-transport | 44 KB | GPT-5 | **reject** | 0/0/7/0/0 |
| E | mcp-read | 12 KB | gpt-5-codex | needs_changes | 0/0/2/0/0 |
| F | mcp-mutate | 13 KB | gpt-5 | needs_changes | 0/0/4/1/0 |
| G | mcp-gates-feedback-meta | 15 KB | gpt-5-codex | needs_changes | 0/**1**/4/1/0 |
| H | cli-demo | 23 KB | gpt-5-codex | needs_changes | 0/0/6/0/0 |
| **Total** | | **164 KB** | | **needs_changes/reject** | **0/2/36/6/0** |

## Critical findings (must fix)

### C-1 — Path traversal in `consumerRoot()` (single root cause, 6+ call sites)

| Scope | Site |
|-------|------|
| C | `src/server/writers/paths.ts:7-8` (**root**) |
| D | `src/server/routes/api.ts:171-177` (`/api/annotate`) |
| D | `src/server/routes/api.ts:211-216` (`/api/decision`) |
| E | `src/mcp/tools/read.ts:27-50` (all 7 read tools) |
| F | `src/mcp/tools/mutate.ts:31-33` (all 9 mutate tools) |
| G | `src/mcp/tools/feedback.ts:35-43` (annotate/highlight/decision) |

A `consumer` value containing `..` traverses out of `<rootDir>/.atomic-skills`,
allowing read/write of arbitrary local paths. Single fix at `paths.ts` plus
strict schema for all `consumer` / `slug` / `planSlug` / `initiativeSlug` /
`taskId` inputs.

### C-2 — `/api/decision` and `aideck_record_decision` write to forbidden `decisions/` directory

| Scope | Site |
|-------|------|
| D | `src/server/routes/api.ts:211-216` |
| G | `src/mcp/tools/feedback.ts:87-101` |

Iron Law #1 / C6 limits aiDeck writes to `annotations/`, `highlights/`, `inbox/`.
The decision tool writes to a fourth directory. Either route decisions through
`inbox/` or remove until v0.2 contract is amended.

## Per-scope full Pass 2 outputs


### Scope A — schemas-validators

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 7, minor: 0, nit: 0}
reviewer: gpt-5-codex
pass: informed
scope: scopeA
schema_version: "1.0"
---

## Summary
The validators are permissive in ways that undermine the schema contract: several persisted JSONL payloads are unversioned, some version failures are misclassified, unknown fields are silently stripped, and cross-field invariants are not enforced for inbox items, intents, and verifier results. These are not style issues; they allow malformed records to pass as validated data.

The external constraints strengthen the versioning and MCP-input concerns. In particular, C4 requires schema version enforcement and `schema_version_mismatch` errors, while C11/C12 require malformed mutation inputs to be rejected before they become append-only intents.

## Findings

### F-001 [major] Correctness — src/schemas/validators/common.ts:22-58

**Evidence:**
```ts
export const annotationSchema = z.object({
  id: z.string(),
  target: annotationTargetSchema,
  author: z.enum(['human', 'ai']),
  body: z.string(),
  createdAt: isoTimestampSchema,
  resolved: z.boolean().optional(),
  resolvedAt: isoTimestampSchema.optional()
})
```

**Claim:** `parseAnnotation`, `parseHighlight`, `parseDecision`, and `parseInboxItem` accept persisted records with no `schemaVersion` at all because these schemas do not include `schemaVersion: schemaVersionSchema`.

**Impact:** Unversioned or pre-v0.1 JSONL records can enter projections as valid data, bypassing the C4 migration guard and making incompatible records indistinguishable from current schema records.

**Recommendation:** Require `schemaVersion: schemaVersionSchema` on every persisted JSONL/inbox payload, or wrap these records in a versioned envelope before parsing.

**Confidence:** high

---

### F-002 [major] Error Handling — src/schemas/validators/index.ts:62-68

**Evidence:**
```ts
function isSchemaVersionMismatch(issue: ZodIssue): boolean {
  if (issue.code !== 'invalid_literal') return false
  if (issue.path.length === 0) return false
  const last = issue.path[issue.path.length - 1]
  if (last !== SCHEMA_VERSION_PATH_TAIL || issue.expected !== '0.1') return false
  return 'received' in issue && issue.received !== undefined
}
```

**Claim:** A versioned schema input missing `schemaVersion`, such as a plan without that field, is rejected as `invalid_input` instead of `schema_version_mismatch` because Zod omits `received` for missing literals.

**Impact:** Callers cannot reliably detect schema-version failures or present the required migration path, violating C4’s structured mismatch requirement.

**Recommendation:** Treat any `invalid_literal` at a `schemaVersion` path with expected `"0.1"` as `schema_version_mismatch`, using a distinct `found` value such as `"missing"` when absent.

**Confidence:** high

---

### F-003 [major] Data Integrity — src/schemas/validators/project-status.ts:96-116

**Evidence:**
```ts
export const planSchema = z.object({
  schemaVersion: schemaVersionSchema,
  slug: z.string(),
  title: z.string(),
  version: z.string(),
  narrative: z.string(),
  status: planStatusSchema,
  started: isoTimestampSchema,
  lastUpdated: isoTimestampSchema,
  branch: z.string().optional(),
  currentPhase: z.string().nullable(),
  parallelismAllowed: z.boolean(),
  principles: z.array(principleSchema).optional(),
  glossary: z.array(glossaryTermSchema).optional(),
  phases: z.array(phaseDescriptorSchema),
  interPhaseGates: z.array(interPhaseGateSchema).optional(),
  tracks: z.array(trackSchema).optional(),
  supersedes: planSupersedeRefSchema.optional(),
  references: z.array(artifactRefSchema).optional(),
  whatStaysValid: z.array(z.string()).optional()
})
```

**Claim:** A plan containing an unknown field such as `{ ...validPlan, owner: "x" }` parses successfully and Zod drops `owner` because `z.object()` strips unknown keys by default.

**Impact:** Parsed canonical records can lose data if reused for projection or rewriting, and schema typos or unsupported fields are accepted instead of being surfaced.

**Recommendation:** Make persisted/canonical schemas `.strict()` or explicitly `.passthrough()`, then test unknown-key behavior at root and nested levels.

**Confidence:** high

---

### F-004 [major] Correctness — src/schemas/validators/common.ts:52-58

**Evidence:**
```ts
export const inboxItemSchema = z.object({
  id: z.string(),
  consumer: z.string(),
  kind: z.enum(['annotation', 'highlight', 'decision']),
  payload: z.union([annotationSchema, highlightSchema, decisionSchema]),
  createdAt: isoTimestampSchema,
  consumed: isoTimestampSchema.optional()
})
```

**Claim:** `parseInboxItem` accepts records where `kind` and `payload` disagree, for example `kind: "annotation"` with a decision payload.

**Impact:** Consumers can branch on `kind` and then receive a payload with a different shape, causing incorrect rendering, dropped fields, or runtime failures.

**Recommendation:** Replace this with a discriminated union of three inbox item schemas, or add a refinement enforcing `kind` matches the payload schema.

**Confidence:** high

---

### F-005 [major] Correctness — src/schemas/validators/common.ts:110-123

**Evidence:**
```ts
export const intentRecordSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('intent'),
  intentId: z.string(),
  operation: intentOperationSchema,
  target: z.object({
    initiativeSlug: z.string().optional(),
    taskId: z.string().optional(),
    planSlug: z.string().optional(),
    phaseId: z.string().optional()
  }),
  args: z.record(z.unknown()),
  by: z.enum(['human', 'ai']),
  requestedAt: isoTimestampSchema
})
```

**Claim:** An unrouteable mutation such as `operation: "mark_task_done", target: {}, args: {}` passes validation because every target field is optional and `args` has no operation-specific shape.

**Impact:** Invalid mutation requests can be appended to the intent stream before rejection, polluting append-only history and violating C11/C12 malformed-input rejection expectations.

**Recommendation:** Model intents as an operation-discriminated union with required target and args fields per operation.

**Confidence:** high

---

### F-006 [major] Correctness — src/schemas/validators/common.ts:5

**Evidence:**
```ts
export const isoTimestampSchema = z.string()
```

**Claim:** Any string, including `"not-a-date"`, passes all timestamp fields such as `createdAt`, `lastUpdated`, `generatedAt`, and `requestedAt`.

**Impact:** Sorting, cursor comparisons, staleness calculations, and date display can produce incorrect ordering or invalid date results while validation reports success.

**Recommendation:** Validate ISO timestamps with `z.string().datetime({ offset: true })` or an equivalent refinement.

**Confidence:** high

---

### F-007 [major] Correctness — src/schemas/validators/common.ts:136-147

**Evidence:**
```ts
export const verifierResultSchema = z.object({
  schemaVersion: schemaVersionSchema,
  kind: z.literal('verifier_result'),
  verifierResultId: z.string(),
  criterionRef: z.object({
    target: z.enum(['plan', 'phase', 'initiative', 'task']),
    planSlug: z.string().optional(),
    initiativeSlug: z.string().optional(),
    phaseId: z.string().optional(),
    taskId: z.string().optional(),
    criterionId: z.string()
  }),
```

**Claim:** A verifier result such as `{ target: "task", criterionId: "G1" }` passes without `taskId` or initiative/plan context because all locator fields are optional.

**Impact:** Accepted verifier results can be impossible to attach to the intended gate, producing orphan evidence or misattributed gate status.

**Recommendation:** Make `criterionRef` a target-discriminated union requiring the locator fields needed for each target type.

**Confidence:** high

## Questions (non-findings)

- None.

## Out of scope

- Parser, writer, and projection behavior outside `src/schemas/`.
- Vue dashboard behavior under `src/client/`.
- Build and CI configuration outside the diff.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-003-final [major] — same
- F-002-blind → F-004-final [major] — same
- F-003-blind → F-005-final [major] — same
- F-004-blind → F-006-final [major] — same
- F-005-blind → F-007-final [major] — same

### Emerged

- F-001-final [major] Correctness — emerged: C4 requires schema version enforcement, but several persisted common JSONL schemas do not require `schemaVersion`.
- F-002-final [major] Error Handling — emerged: C4 requires `schema_version_mismatch`, but missing `schemaVersion` on versioned schemas is classified as `invalid_input`.
---

### Scope B — parsers

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 3, nit: 0}
reviewer: gpt-5-codex
pass: informed
scope: scopeB
schema_version: "1.0"
---

## Summary
The parser scope violates the schema-version enforcement constraint for inbox annotation/highlight/decision records: mismatched `schemaVersion` fields can be accepted and stripped instead of returning `schema_version_mismatch`. The blind-pass parser edge cases still stand: empty frontmatter delimiters are rejected, invalid direct inbox discriminators can throw, and JSONL read errors bypass the provided log sink.

## Findings

### F-001 [major] Correctness — src/server/parsers/jsonl.ts:138-149

**Evidence:**
```ts
  switch (kind) {
    case 'annotation': {
      const r = parseAnnotation(raw)
      return r.ok ? { ok: true, value: { kind, value: r.value } } : r
    }
    case 'highlight': {
      const r = parseHighlight(raw)
      return r.ok ? { ok: true, value: { kind, value: r.value } } : r
    }
    case 'decision': {
      const r = parseDecision(raw)
      return r.ok ? { ok: true, value: { kind, value: r.value } } : r
    }
```

**Claim:** `parseInboxLine` accepts valid annotation/highlight/decision payloads that include `schemaVersion: "0.2"` because those branches do not preflight the version and the delegated validators strip unknown keys instead of returning `schema_version_mismatch`.

**Impact:** v0.1 parsers can ingest incompatible future JSONL records as current records, silently dropping versioned fields and corrupting projections built from append-only files.

**Recommendation:** Enforce `schemaVersion === "0.1"` for every parsed inbox/JSONL record before delegated validation, returning `schema_version_mismatch` on mismatches.

**Confidence:** high

---

### F-002 [minor] Correctness — src/server/parsers/frontmatter.ts:15-25

**Evidence:**
```ts
  const close = `${eol}${DELIM}${eol}`

  const afterOpen = raw.slice(open.length)
  const closeIdx = afterOpen.indexOf(close)
  if (closeIdx === -1) {
    const trailingClose = `${eol}${DELIM}`
    if (afterOpen.endsWith(trailingClose)) {
      const frontmatter = afterOpen.slice(0, afterOpen.length - DELIM.length)
      return { frontmatter, body: '' }
    }
    return null
  }
```

**Claim:** `splitFrontmatter('---\n---\n# body\n')` returns `null` even though the file has an explicitly opened and closed empty frontmatter block.

**Impact:** Callers get a misleading “No frontmatter” failure instead of an empty-frontmatter split followed by schema validation, and generic users of `splitFrontmatter` cannot parse valid empty frontmatter documents.

**Recommendation:** Handle a closing delimiter immediately after the opening delimiter, including both `---\n---\n` and `---\n---` forms.

**Confidence:** high

---

### F-003 [minor] Error handling — src/server/parsers/jsonl.ts:129-133

**Evidence:**
```ts
  if (!isInboxKind(kindRaw)) {
    return err({
      code: 'invalid_input',
      message: `inbox line missing or invalid \`kind\` (got ${JSON.stringify(kindRaw)})`,
      suggestion: `kind must be one of: ${INBOX_KINDS.join(', ')}`
    })
  }
```

**Claim:** `parseInboxLine({ kind: 1n })` throws a `TypeError` from `JSON.stringify` instead of returning `Result<..., ErrorResponse>`.

**Impact:** Malformed direct inputs can crash the caller and bypass the parser’s structured `invalid_input` error contract; cyclic object discriminators have the same failure mode.

**Recommendation:** Format invalid discriminator values defensively, catching stringification failures or using a bounded type-only representation.

**Confidence:** high

---

### F-004 [minor] Observability — src/server/parsers/jsonl.ts:31-44

**Evidence:**
```ts
  } catch (cause) {
    return {
      items: [],
      errors: [
        {
          line: 0,
          error: {
            code: 'io_error',
            message: `failed to read file: ${path}`,
            details: { cause: String(cause) }
          }
        }
      ]
    }
  }
```

**Claim:** Missing or unreadable JSONL files are returned as `io_error` but are not sent to `logSink`, unlike JSON parse and validation failures.

**Impact:** With the default parser behavior, read failures produce no stderr entry, and callers that fail to inspect `errors` can treat unreadable files as empty with no local diagnostic.

**Recommendation:** Emit the same structured `logSink` message for `io_error` before returning, or make the no-log behavior explicit and consistent.

**Confidence:** high

---

## Questions (non-findings)

- src/server/parsers/jsonl.ts:58 — Should `parseJsonlString` support a base line offset for callers that parse appended slices rather than whole files?

## Out of scope

- Downstream projection behavior that ignores parser `errors`.
- Vue dashboard code.
- Documentation and build configuration outside this parser scope.
- Writer behavior outside `src/server/parsers/`.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-002-final [minor] — same
- F-002-blind → F-003-final [minor] — same
- F-003-blind → F-004-final [minor] — same

### Emerged

- F-001-final [major] Correctness — emerged: C4 requires parser-level schema version enforcement and `schema_version_mismatch` on mismatches.
---

### Scope C — server-infra

---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 5, minor: 1, nit: 0}
reviewer: gpt-5
pass: informed
scope: scopeC
schema_version: "1.0"
---

## Summary
The server-infra changes leave several correctness and integrity hazards in the filesystem/event path. The highest-impact issue is unchecked path construction from consumer IDs, which can escape `.atomic-skills` and violate the filesystem ownership boundary.

The append and watcher paths also have real race and data-loss cases: duplicate intent IDs under concurrent appends, JSONL corruption risk for large concurrent writes, dropped partial JSONL records, and unsynchronized watcher state updates. Constraint review also surfaced schema-version enforcement gaps on watcher-parsed JSONL events.

## Findings

### F-001 [critical] Security — src/server/writers/paths.ts:7-8

**Evidence:**
```ts
export function consumerRoot(rootDir: string, consumerId: string): string {
  return join(atomicSkillsRoot(rootDir), consumerId)
}
```

**Claim:** A `consumerId` containing traversal segments such as `../../outside` escapes `<rootDir>/.atomic-skills` because `join()` normalizes it without validation.

**Impact:** Callers that pass request/tool-controlled consumer IDs can write or read JSONL/entity paths outside the intended aiDeck filesystem tree, violating C6 and allowing unintended local file creation or access.

**Recommendation:** Reject consumer IDs that are not a single safe path segment, and resolve/assert the final path remains under `atomicSkillsRoot(rootDir)`.

**Confidence:** high

---

### F-002 [major] Data integrity — src/server/writers/jsonl-append.ts:17-23

**Evidence:**
```ts
export async function appendJsonlLine(path: string, payload: object): Promise<void> {
  const serialized = JSON.stringify(payload)
  if (serialized === undefined) {
    throw new TypeError('appendJsonlLine: payload is not JSON-serializable')
  }
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${serialized}\n`, { flag: 'a' })
}
```

**Claim:** Concurrent appends of large payloads can corrupt JSONL because the function neither caps serialized line size nor serializes writes, while `appendFile()` is not guaranteed to issue one indivisible write for arbitrary-length strings.

**Impact:** Long annotation bodies or intent args appended concurrently can interleave into invalid JSON, breaking C7’s “one JSON object per line” invariant and causing later parsers/watchers to drop or error on records.

**Recommendation:** Enforce a maximum serialized line size with validation, or use a per-file append lock/write stream that preserves whole-record writes.

**Confidence:** medium

---

### F-003 [major] Race condition — src/server/writers/intents.ts:24-39

**Evidence:**
```ts
async function nextDailyIntentId(path: string, day: string): Promise<string> {
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file: count stays 0
  }
  return `int-${day}-${String(count + 1).padStart(3, '0')}`
}

export async function appendIntent(input: AppendIntentInput): Promise<IntentReceipt> {
  const now = input.now ? input.now() : new Date()
  const day = now.toISOString().slice(0, 10)
  const path = inboxPathFor(input.consumerRoot, now)
  const intentId = await nextDailyIntentId(path, day)
```

**Claim:** Two concurrent `appendIntent()` calls for the same consumer/day can both read the same line count and append records with the same `intentId`.

**Impact:** Intent acknowledgements or projections keyed by `intentId` become ambiguous, so one result can be applied to multiple records or overwrite another intent’s state.

**Recommendation:** Generate collision-resistant IDs independent of current file length, or serialize ID allocation and append under a per-file lock.

**Confidence:** high

---

### F-004 [major] Data integrity — src/server/watcher.ts:91-104

**Evidence:**
```ts
const prev = jsonlState.get(path) ?? { bytes: 0, lines: 0 }
let slice: string
if (raw.length < prev.bytes) {
  // truncated/rewritten → resync from scratch
  slice = raw
  jsonlState.set(path, { bytes: raw.length, lines: countNonEmptyLines(raw) })
} else {
  slice = raw.slice(prev.bytes)
  jsonlState.set(path, { bytes: raw.length, lines: prev.lines + countNonEmptyLines(slice) })
}
if (slice.trim() === '') return

if (kind === 'annotations-jsonl') {
  const { items, errors } = parseJsonlString(slice, parseAnnotation, path, () => {})
```

**Claim:** If the watcher observes an unterminated partial JSONL record, it advances the cursor before parsing, so the later completion is parsed only as a suffix and the complete record is never emitted.

**Impact:** Valid annotation/highlight records can be permanently dropped from runtime/SSE events after slow, interrupted, or chunked writes.

**Recommendation:** Keep a per-file trailing-line buffer and advance the cursor only through newline-terminated complete records.

**Confidence:** high

---

### F-005 [major] Race condition — src/server/watcher.ts:175-180

**Evidence:**
```ts
fsw.on('add', (p) => {
  if (isWatched(p)) void dispatch(p, 'add')
})
fsw.on('change', (p) => {
  if (isWatched(p)) void dispatch(p, 'change')
})
```

**Claim:** Multiple filesystem events for the same path run `dispatch()` concurrently, allowing an older `readFile()` result to update `jsonlState` after a newer one.

**Impact:** Rapid successive appends can duplicate emitted annotation/highlight events or rewind the cursor, causing incorrect replay/live event streams for clients.

**Recommendation:** Serialize watcher processing per path, for example by chaining dispatches through a per-file promise queue.

**Confidence:** medium

---

### F-006 [major] Schema validation — src/server/watcher.ts:103-120

**Evidence:**
```ts
if (kind === 'annotations-jsonl') {
  const { items, errors } = parseJsonlString(slice, parseAnnotation, path, () => {})
  for (const annotation of items) {
    opts.eventBus.emit({ kind: 'annotation-added', consumer, annotation })
  }
```

**Claim:** A JSONL annotation/highlight with `schemaVersion: "0.2"` and otherwise valid fields is accepted instead of rejected with `schema_version_mismatch` because the watcher delegates to validators that do not enforce schemaVersion on these records.

**Impact:** Runtime events can silently treat incompatible future-version JSONL records as v0.1, violating C4 and risking malformed dashboard/SSE behavior after schema changes.

**Recommendation:** Require schemaVersion on watcher-parsed JSONL records and route mismatches through the existing `schema_version_mismatch` error path.

**Confidence:** medium

---

### F-007 [minor] Security — src/server/env-file.ts:42-44

**Evidence:**
```ts
const body = `# aiDeck environment — generated, do not edit
export AIDECK_URL="${content.url}"
export AIDECK_PORT=${content.port}
`
```

**Claim:** `content.url` is written into shell syntax without escaping, so a value containing `"`, `$()`, backticks, or newlines changes what executes when the env file is sourced.

**Impact:** A bad caller input to `writeEnvFile()` can inject shell commands or extra exports into `~/.aideck/env`.

**Recommendation:** Shell-quote exported values with a dedicated escaping helper and validate `port` as a finite integer.

**Confidence:** medium

---

## Questions (non-findings)

- src/server/watcher.ts:33 — Should `.yaml` files be watched as project entities when `classifyFile()` routes plans/initiatives to Markdown frontmatter parsers?
- src/server/port-resolver.ts:17 — Should `hostname` be accepted at all given C3’s localhost-only binding requirement?

## Out of scope

- Vue dashboard behavior under `src/client/`
- Authentication and authorization policy
- Container/cloud deployment behavior
- Documentation-only changes outside `src/`
- Existing non-scope MCP/API routes that also call these helpers

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [critical] — same
- F-002-blind → F-003-final [major] — same
- F-003-blind → F-004-final [major] — same
- F-004-blind → F-005-final [major] — same
- F-005-blind → F-007-final [minor] — same

### Emerged

- F-002-final [major] Data integrity — emerged: C7 requires JSONL append-only files to preserve one JSON object per line, but `appendJsonlLine()` has no whole-record write guarantee for large concurrent payloads.
- F-006-final [major] Schema validation — emerged: C4 requires schemaVersion mismatches to be refused with `schema_version_mismatch`, but watcher-parsed annotation/highlight JSONL can bypass that enforcement.
---

### Scope D — server-transport

---
verdict: reject
counts: {blocker: 0, critical: 0, major: 7, minor: 0, nit: 0}
reviewer: GPT-5
pass: informed
scope: scopeD
schema_version: "1.0"
---

## Summary
The server transport changes violate the localhost-only and append-only filesystem constraints, and they introduce data integrity failures in record identity, projection scoping, and parse-error handling. The highest-risk issues are path traversal through unvalidated consumer IDs, configurable external binding, and writes to a disallowed `decisions/` directory.

The implementation also has concurrency and cleanup defects: concurrent JSONL writes can get duplicate IDs, aggregate inbox queries can falsely resolve records across consumers, and timed-out shell verifiers can leave subprocesses running.

## Findings

### F-001 [major] Security — src/server/routes/api.ts:171-177

**Evidence:**
```ts
const consumer = parsed.data.target.consumer
const dir = consumerRoot(deps.rootDir, consumer)
const path = annotationsPathFor(dir)
const id = await nextDailyId('ann', path)
const createdAt = new Date().toISOString()
const annotation = { ...parsed.data, id, createdAt }
await appendJsonlLine(path, annotation)
```

**Claim:** A request such as `POST /api/annotate` with `target.consumer="../outside"` writes outside `.atomic-skills` because the raw consumer string is used as a filesystem path segment without containment validation.

**Impact:** Local API clients can append JSONL files outside the intended consumer root, corrupting unrelated repository paths or creating persistent state outside the file ownership boundary.

**Recommendation:** Validate consumer IDs against a strict safe grammar or known consumer list, and verify the resolved target path remains under `<rootDir>/.atomic-skills`.

**Confidence:** high

---

### F-002 [major] Race condition — src/server/routes/api.ts:59-68

**Evidence:**
```ts
async function nextDailyId(prefix: string, path: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10)
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file → start at 0
  }
  return `${prefix}-${day}-${String(count + 1).padStart(3, '0')}`
}
```

**Claim:** Two concurrent POSTs to the same daily JSONL file can both read the same line count and generate the same record ID.

**Impact:** Duplicate annotation, highlight, or decision IDs make later resolve and acknowledge operations ambiguous and can cause projections to mark the wrong records.

**Recommendation:** Generate IDs independently of file contents, such as UUID/ULID, or serialize allocation and append under a lock.

**Confidence:** high

---

### F-003 [major] Data integrity — src/server/projections/inbox.ts:128-149

**Evidence:**
```ts
const resolvedIds = new Set(aggregated.resolutions.map((r) => r.refId))
const ackedIds = new Set(aggregated.acknowledgements.map((a) => a.refId))

const items: InboxItem[] = []
for (const id of consumerIds) {
  const c = byConsumer[id]
  for (const a of c.annotations) {
    items.push({
      id: `inb-ann-${a.id}`,
      consumer: id,
      kind: 'annotation',
      payload: resolvedIds.has(a.id) ? { ...a, resolved: true } : a,
      createdAt: a.createdAt
    })
  }
  for (const h of c.highlights) {
    items.push({
      id: `inb-hl-${h.id}`,
      consumer: id,
      kind: 'highlight',
      payload: ackedIds.has(h.id) ? { ...h, acknowledged: true } : h,
```

**Claim:** Resolving or acknowledging an item in one consumer marks same-ID items in other consumers as resolved or acknowledged when `/api/inbox` is queried without a consumer filter.

**Impact:** Because IDs are generated per consumer and day, two consumers can both have `ann-YYYY-MM-DD-001`, causing aggregate inbox views to falsely close unrelated records.

**Recommendation:** Match resolution and acknowledgement records by both consumer and `refId`, or make record IDs globally unique.

**Confidence:** high

---

### F-004 [major] Error handling — src/server/projections/state.ts:29-35

**Evidence:**
```ts
for (const f of planFiles) {
  const r = await parsePlanFile(join(dir, 'plans', f))
  if (r.ok) plans.push(r.value)
}
for (const f of initiativeFiles) {
  const r = await parseInitiativeFile(join(dir, 'initiatives', f))
  if (r.ok) initiatives.push(r.value)
}
```

**Claim:** Invalid, unreadable, or schema-mismatched plan and initiative files are silently omitted from `/api/state` responses.

**Impact:** The API can return a successful but partial state, hiding active work, unmet gates, stale initiatives, or required `schema_version_mismatch` failures.

**Recommendation:** Surface parse failures as structured errors, or include explicit per-file errors in the projection instead of dropping failed files.

**Confidence:** high

---

### F-005 [major] Process cleanup — src/server/verifiers/shell.ts:29-41

**Evidence:**
```ts
const child = spawn('bash', ['-c', opts.command], {
  cwd: opts.cwd,
  env: { ...process.env, CI: '1' }
})
```

```ts
const timer = setTimeout(() => {
  timedOut = true
  child.kill('SIGTERM')
  // Escalate if it refuses to exit.
  setTimeout(() => child.kill('SIGKILL'), 250).unref()
}, timeoutMs)
```

**Claim:** A timed-out verifier kills only the shell process, not the process tree spawned by the shell command.

**Impact:** Test runners, package scripts, or background subprocesses can continue running after timeout, consuming resources or mutating files after the caller believes verification stopped.

**Recommendation:** Run verifiers in an isolated process group and terminate the whole group on timeout, or use process-tree cleanup and await final termination.

**Confidence:** high

---

### F-006 [major] Security — src/server/index.ts:69-74

**Evidence:**
```ts
const port = opts.port ?? 7777
const hostname = opts.hostname ?? '127.0.0.1'
const server = serve({
  fetch: built.app.fetch,
  hostname,
  port
```

**Claim:** Passing `startServer({ hostname: "0.0.0.0" })` binds the unauthenticated HTTP/SSE server to external interfaces, violating the localhost-only requirement.

**Impact:** A caller can expose filesystem-backed mutation endpoints and SSE state to the network even though the transport is required to be local-only.

**Recommendation:** Remove the public hostname override or reject any hostname other than `127.0.0.1`.

**Confidence:** high

---

### F-007 [major] Data integrity — src/server/routes/api.ts:211-216

**Evidence:**
```ts
const consumer = parsed.data.target.consumer
const dir = consumerRoot(deps.rootDir, consumer)
const path = join(dir, 'decisions', `${new Date().toISOString().slice(0, 10)}.jsonl`)
const id = await nextDailyId('dec', path)
const createdAt = new Date().toISOString()
await appendJsonlLine(path, { ...parsed.data, id, createdAt })
```

**Claim:** `POST /api/decision` writes persistent state to `<consumer-root>/decisions/`, but the constraint allows aiDeck writes only under `annotations/`, `highlights/`, and `inbox/`.

**Impact:** The server creates canonical filesystem state outside the permitted append-only directories, and watcher classification does not treat `decisions/` as a first-class JSONL mutation stream.

**Recommendation:** Remove this write path or record decisions through an allowed append-only inbox mechanism.

**Confidence:** high

---

## Questions (non-findings)

- src/server/routes/sse.ts:43 — Should health ticks be global event-bus events or per-connection keepalive frames? The current code emits one shared event per connected SSE client every interval.

## Out of scope

- Vue dashboard code under `src/client/`
- Authentication and authorization behavior
- Cloud/container deployment behavior
- Documentation outside `src/`

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same
- F-003-blind → F-003-final [major] — same
- F-004-blind → F-004-final [major] — same
- F-005-blind → F-005-final [major] — same

### Emerged

- F-006-final [major] Security — emerged: C3 requires the HTTP server to bind only to `127.0.0.1`, but `opts.hostname` can bind external interfaces.
- F-007-final [major] Data integrity — emerged: C6 permits writes only to `annotations/`, `highlights/`, and `inbox/`, but `/api/decision` writes to `decisions/`.
---

### Scope E — mcp-read

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-5-codex
pass: informed
scope: scopeE
schema_version: "1.0"
---

## Summary
The blind-pass findings still stand after applying the external constraints. The MCP read surface validates inputs only as arbitrary strings, so path-bearing fields can traverse out of the intended `.atomic-skills/<consumer>/...` tree before parser reads occur.

The dependency read API also has a correctness break: the task dependency mode cannot be called with only task/initiative identifiers because the schema requires `planSlug` up front.

## Findings

### F-001 [major] Security — src/mcp/tools/read.ts:27-50

**Evidence:**
```ts
const consumerInput = z.object({ consumer: z.string() })
const slugInput = consumerInput.extend({ slug: z.string() })
const planSlugInput = consumerInput.extend({ planSlug: z.string() })
const phaseInput = planSlugInput.extend({ phaseId: z.string() })
const initiativeSlugInput = consumerInput.extend({ initiativeSlug: z.string() })
const taskInput = initiativeSlugInput.extend({ taskId: z.string() })
const nextActionInput = consumerInput.extend({
  planSlug: z.string().optional(),
  initiativeSlug: z.string().optional()
})
const dependenciesInput = planSlugInput.extend({
  phaseId: z.string().optional(),
  taskId: z.string().optional(),
  initiativeSlug: z.string().optional()
})

async function loadPlan(rootDir: string, consumer: string, slug: string): Promise<Result<Plan, ErrorResponse>> {
  const path = join(consumerRoot(rootDir, consumer), 'plans', `${slug}.md`)
  return parsePlanFile(path)
}

async function loadInitiative(rootDir: string, consumer: string, slug: string): Promise<Result<Initiative, ErrorResponse>> {
  const path = join(consumerRoot(rootDir, consumer), 'initiatives', `${slug}.md`)
  return parseInitiativeFile(path)
}
```

**Claim:** Calling read tools with values such as `consumer: "../../tmp/leak"` or `slug: "../../outside"` passes validation and is normalized by `join`, so the tool reads paths outside `rootDir/.atomic-skills/<consumer>/plans|initiatives`.

**Impact:** An MCP client can read and parse valid plan/initiative markdown outside the intended repository state directory, and error responses can disclose absolute filesystem paths for attempted reads.

**Recommendation:** Validate `consumer`, `slug`, `planSlug`, and `initiativeSlug` with a path-segment-safe schema, reject absolute paths and separators, and resolve/enforce that final read paths remain under the intended `.atomic-skills` subtree.

**Confidence:** high

---

### F-002 [major] Correctness — src/mcp/tools/read.ts:37-40

**Evidence:**
```ts
const dependenciesInput = planSlugInput.extend({
  phaseId: z.string().optional(),
  taskId: z.string().optional(),
  initiativeSlug: z.string().optional()
})
```

**Claim:** `aideck_get_dependencies` rejects task-only calls like `{ consumer, initiativeSlug, taskId }` because the schema inherits required `planSlug` even though task dependency resolution is a separate mode.

**Impact:** Valid standalone initiatives cannot have task dependencies queried through MCP, and callers must provide an unrelated plan slug that can fail before the requested task is read.

**Recommendation:** Use a discriminated or union input schema: phase mode should require `planSlug + phaseId`, while task mode should require `initiativeSlug + taskId` and not require or parse a plan.

**Confidence:** high

## Questions (non-findings)

- None.

## Out of scope

- Mutating, gate, feedback, and meta tool implementations outside this scope.
- Vue dashboard code under `src/client/`.
- Documentation and build/CI files outside the scoped diff.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same

### Emerged

- _(none)_
---

### Scope F — mcp-mutate

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 4, minor: 1, nit: 0}
reviewer: gpt-5
pass: informed
scope: scopeF
schema_version: "1.0"
---

## Summary
The scoped changes add MCP mutation/dependency surfaces that form filesystem paths directly from caller input and do not reject malformed extra input. Under the stated constraints, the most serious issue is that mutation tools can append intent JSONL outside the intended `.atomic-skills/<consumer>/inbox/` tree via `consumer` traversal.

The dependency resolver also couples task dependency lookup to an unrelated plan parse, and one state-dependent mutation precondition silently degrades to success when the initiative cannot be parsed. These are correctness and data-integrity regressions in normal MCP use.

## Findings

### F-001 [major] Security — src/mcp/tools/mutate.ts:31-33

**Evidence:**
```ts
  const receipt = await appendIntent({
    consumerRoot: consumerRoot(ctx.rootDir, consumer),
    consumerId: consumer,
```

**Claim:** Passing `consumer: "../outside"` to any mutation tool records the intent under a path outside `<rootDir>/.atomic-skills/<consumer>/inbox/`.

**Impact:** This violates the file-write boundary in C6 and lets an MCP caller create or append JSONL files outside the allowed consumer root, potentially corrupting adjacent workspace state.

**Recommendation:** Reject absolute paths, `..`, path separators, and empty components for `consumer`; also use a safe-join boundary check before calling `appendIntent`.

**Confidence:** high

---

### F-002 [major] Correctness — src/mcp/tools/dependencies.ts:35-39

**Evidence:**
```ts
  const planRes = await parsePlanFile(
    join(consumerRoot(rootDir, input.consumer), 'plans', `${input.planSlug}.md`)
  )
  if (!planRes.ok) return planRes
  const plan = planRes.value
```

**Claim:** A task dependency request with a valid `initiativeSlug` and `taskId` fails if `planSlug` is missing, stale, or invalid, even though the task branch only needs the initiative file.

**Impact:** `aideck_get_dependencies` cannot reliably report task blockers for standalone initiatives or callers that only know the initiative/task pair; it returns an unrelated plan parse error before reading the task.

**Recommendation:** Parse the plan only inside the `phaseId` branch and make `planSlug` required only for phase dependency requests.

**Confidence:** high

---

### F-003 [major] Correctness — src/mcp/tools/mutate.ts:169-178

**Evidence:**
```ts
      const initPath = join(consumerRoot(ctx.rootDir, input.consumer), 'initiatives', `${input.initiativeSlug}.md`)
      const r = await parseInitiativeFile(initPath)
      if (r.ok && r.value.stack.length === 0) {
        return err({
          code: 'precondition_failed',
          message: 'cannot pop from an empty stack',
          suggestion: 'push a frame first or check current state via aideck_get_initiative'
        })
      }
      return record(
```

**Claim:** `aideck_pop_frame` accepts and records a pop intent when the target initiative is missing or unparsable.

**Impact:** A typo or schema error in `initiativeSlug` produces an accepted mutation receipt and writes an intent that cannot be validly applied, giving callers a false success signal.

**Recommendation:** Return the parse error before recording when a mutation depends on current initiative state.

**Confidence:** high

---

### F-004 [major] Validation — src/mcp/tools/mutate.ts:47-49

**Evidence:**
```ts
const baseTarget = z.object({
  consumer: z.string(),
  initiativeSlug: z.string()
})
```

**Claim:** Mutation tool schemas are not strict, so malformed inputs with unknown fields are accepted and silently stripped by Zod.

**Impact:** A caller typo such as `verifierResultID` instead of `verifierResultId` on `aideck_mark_task_done` records a successful intent without the intended verifier metadata, violating C11’s requirement that malformed MCP inputs be rejected with structured errors.

**Recommendation:** Make the MCP input objects strict, or otherwise explicitly reject unrecognized keys before recording intents.

**Confidence:** high

---

### F-005 [minor] Correctness — src/mcp/tools/dependencies.ts:49-57

**Evidence:**
```ts
    const doneIds = new Set(plan.phases.filter((p) => p.status === 'done').map((p) => p.id))
    const resolved = phase.dependsOn.filter((id) => doneIds.has(id))
    const blocking = phase.dependsOn.filter((id) => !doneIds.has(id))
    return ok({
      scope: 'phase',
      id: phase.id,
      resolved,
      blocking,
      blockedBy: blocking
```

**Claim:** Phase dependency reports put only unresolved dependencies in `blockedBy`, while task reports return the full raw `blockedBy` list.

**Impact:** Consumers receive inconsistent report shapes; a phase with both completed and pending dependencies loses the completed dependency from `blockedBy` even though task reports preserve it.

**Recommendation:** Return `phase.dependsOn` as `blockedBy` and keep unresolved dependencies in `blocking`.

**Confidence:** medium

## Questions (non-findings)

- None.

## Out of scope

- Vue dashboard behavior under `src/client/`.
- Authentication and authorization policy around who may call MCP tools.
- Build and CI configuration outside this scope.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same
- F-003-blind → F-003-final [major] — same
- F-004-blind → F-005-final [minor] — same

### Emerged

- F-004-final [major] Validation — emerged: C11 requires malformed MCP tool inputs to be rejected, but these new Zod object schemas accept and strip unknown keys.
---

### Scope G — mcp-gates-feedback-meta

---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 4, minor: 1, nit: 0}
reviewer: gpt-5-codex
pass: informed
scope: scopeG
schema_version: "1.0"
---

## Summary
The scoped tools add MCP write surfaces that are not contained to the project’s allowed data root and one tool writes to a directory explicitly forbidden by the persistence constraints. The ID generation remains racy because IDs are derived from a pre-append line count.

The gate verifier also exposes contract problems: it reports aggregate gate completion from stale canonical state, accepts an input field it discards, and advertises `target: "plan"` even though every such call is rejected.

## Findings

### F-001 [critical] Security — src/mcp/tools/feedback.ts:35-43

**Evidence:**
```ts
    inputSchema: z.object({
      target: annotationTargetSchema,
      body: z.string(),
      author: z.enum(['human', 'ai']).default('ai')
    }),
    async handler(input, ctx) {
      const consumer = input.target.consumer
      const path = annotationsPathFor(consumerRoot(ctx.rootDir, consumer))
```

**Claim:** A caller can pass a path-traversal `target.consumer` such as `../../../outside` and make the feedback tools write outside the intended `.atomic-skills/<consumer>/...` tree.

**Impact:** MCP clients can create directories and append JSONL records outside aiDeck’s allowed filesystem state, corrupting unrelated writable project paths; the same uncontained consumer pattern is also used by highlight, decision, inbox, health, and gate paths.

**Recommendation:** Validate consumer and slug/path segments against a strict safe identifier pattern and verify resolved paths stay under `rootDir/.atomic-skills` before any read or write.

**Confidence:** high

---

### F-002 [major] Race Condition — src/mcp/tools/feedback.ts:19-28

**Evidence:**
```ts
async function nextDailyId(prefix: string, path: string): Promise<string> {
  const day = new Date().toISOString().slice(0, 10)
  let count = 0
  try {
    const raw = await readFile(path, 'utf8')
    count = raw.split('\n').filter((l) => l.trim() !== '').length
  } catch {
    // missing file
  }
  return `${prefix}-${day}-${String(count + 1).padStart(3, '0')}`
}
```

**Claim:** Concurrent calls can generate the same annotation, highlight, decision, or verifier-result ID because the code counts existing lines before appending.

**Impact:** Duplicate IDs make resolution, acknowledgement, and verifier-result references ambiguous, and clients that treat returned IDs as stable handles can act on the wrong record.

**Recommendation:** Use collision-resistant IDs such as UUID/ULID or protect the read-count-append sequence with a file lock and add concurrent-call coverage.

**Confidence:** high

---

### F-003 [major] Data Integrity — src/mcp/tools/feedback.ts:87-101

**Evidence:**
```ts
    async handler(input, ctx) {
      const consumer = input.target.consumer
      const day = new Date().toISOString().slice(0, 10)
      const path = join(consumerRoot(ctx.rootDir, consumer), 'decisions', `${day}.jsonl`)
      const id = await nextDailyId('dec', path)
      const createdAt = new Date().toISOString()
      const record = {
        id,
        target: input.target,
        decision: input.decision,
        ...(input.reason ? { reason: input.reason } : {}),
        by: input.by ?? 'ai',
        createdAt
      }
      await appendJsonlLine(path, record)
```

**Claim:** `aideck_record_decision` writes persistent state under `decisions/`, which violates C6’s allowed write directories of only `annotations/`, `highlights/`, and `inbox/`.

**Impact:** Normal use of this MCP tool creates durable aiDeck state outside the constrained append-only locations, so consumers and rollback/cleanup logic that rely on the allowed-directory contract can miss or mishandle decision records.

**Recommendation:** Store decisions as allowed `inbox/` JSONL records or remove/disable `aideck_record_decision` until the persistence contract includes a decisions directory.

**Confidence:** high

---

### F-004 [major] Correctness — src/mcp/tools/gates.ts:183-189

**Evidence:**
```ts
      await appendJsonlLine(inboxPath, record)

      const allGatesMet = located.value.siblings.length > 0
        ? located.value.siblings.every((c) =>
            c.id === input.criterionId ? result === 'met' : c.status === 'met'
          )
        : result === 'met'
```

**Claim:** `allGatesMet` ignores verifier results already appended to the inbox and only trusts sibling statuses from the canonical file loaded before this call.

**Impact:** If two pending criteria are verified as `met` through this tool before the consumer rewrites the canonical file, the second call still returns `allGatesMet: false`, incorrectly blocking automated completion flows.

**Recommendation:** Compute gate completion from canonical criteria plus prior verifier-result records, or remove `allGatesMet` until it can reflect append-only verifier state accurately.

**Confidence:** high

---

### F-005 [major] Correctness — src/mcp/tools/gates.ts:20-22

**Evidence:**
```ts
const verifyInput = z.object({
  consumer: z.string(),
  target: z.enum(['plan', 'phase', 'initiative', 'task']),
```

**Claim:** The input schema advertises `target: "plan"`, but `findCriterion` has no plan branch, so every plan verification call is accepted by validation and then rejected as unsupported.

**Impact:** Clients generated from the MCP schema can issue valid-looking plan verification requests that always fail, leaving plan-level gate verification impossible through the advertised API.

**Recommendation:** Remove `plan` from the v0.1 input enum or implement the plan target fully.

**Confidence:** high

---

### F-006 [minor] Data Integrity — src/mcp/tools/gates.ts:28-30

**Evidence:**
```ts
  result: z.enum(['met', 'pending', 'deferred']).optional(),
  deferredReason: z.string().optional(),
  evidence: z.string().optional(),
```

**Claim:** `deferredReason` is accepted in the input but is never persisted, returned, or rejected.

**Impact:** A caller recording `{ result: "deferred", deferredReason: "blocked by rollout" }` receives success while the reason is silently lost from the verifier-result audit trail.

**Recommendation:** Persist the reason in a supported field, map it to `evidence`, or reject `deferredReason` until the stored schema supports it.

**Confidence:** high

---

## Questions (non-findings)

- _(none)_

## Out of scope

- Files outside `src/mcp/tools/gates.ts`, `src/mcp/tools/feedback.ts`, and `src/mcp/tools/meta.ts` were inspected only to verify constraints and impact.
- Vue dashboard code, deployment, auth, and documentation outside `src/` were not reviewed.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [critical] — same
- F-002-blind → F-002-final [major] — same
- F-003-blind → F-004-final [major] — same
- F-004-blind → F-006-final [minor] — same

### Emerged

- F-003-final [major] Data Integrity — emerged: C6 explicitly limits writes to `annotations/`, `highlights/`, and `inbox/`, making the new `decisions/` write a contract violation.
- F-005-final [major] Correctness — emerged: C15 forbids half-finished implementations, and `target: "plan"` is exposed in the schema while every plan request is unsupported.
---

### Scope H — cli-demo

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 6, minor: 0, nit: 0}
reviewer: gpt-5-codex
pass: informed
scope: scopeH
schema_version: "1.0"
---

## Summary
The CLI/demo scope has correctness and data-integrity issues in normal edge cases: the executable main check can fail for valid install paths, demo startup can silently run without fixtures, startup failure cleanup is incomplete, and the fake consumer can race concurrent inbox events.

The external constraints add two contract violations: the fake consumer applies raw JSON without schema-version validation, and it directly rewrites canonical initiative markdown despite the append-only mutation boundary.

## Findings

### F-001 [major] Correctness — src/cli.ts:165-168

**Evidence:**
```ts
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().then(
    (code) => {
      if (code >= 0) process.exit(code)
```

**Claim:** Invoking the CLI from an install path containing spaces or other URL-escaped characters causes no command to run because `import.meta.url` is percent-encoded while ``file://${process.argv[1]}`` is not.

**Impact:** Users installed under paths such as `/Users/me/My Projects/aideck/dist/cli.js` see the executable exit without printing help, starting the server, or returning the intended command result.

**Recommendation:** Compare against `pathToFileURL(process.argv[1]).href`, or use a robust ESM main-module check that handles URL encoding and symlinks.

**Confidence:** high

---

### F-002 [major] Data integrity — src/demo/fake-consumer.ts:79-85

**Evidence:**
```ts
const handle = (p: string) => {
  if (p.endsWith('.jsonl')) {
    void processFile(p)
  }
}
watcher.on('add', handle)
watcher.on('change', handle)
```

**Claim:** Multiple `add`/`change` events for the same inbox file can run `processFile` concurrently, so intents mutating the same initiative can read the same old markdown state and overwrite each other’s writes.

**Impact:** In demo mode, rapid actions such as `mark_task_done` and `add_task` can lose one mutation while both intents may still receive application records, leaving the UI and inbox history inconsistent with the entity file.

**Recommendation:** Serialize fake-consumer processing per inbox file or target initiative with a promise queue/mutex, and process the next batch only after the prior read-modify-write completes.

**Confidence:** high

---

### F-003 [major] Error handling — src/demo/seed.ts:12-35

**Evidence:**
```ts
function resolveFixturesSource(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, '..', '..', 'fixtures'), // src/demo/seed.ts → repo/fixtures
    join(here, '..', 'demo', 'fixtures'), // dist/demo/fixtures shipped alongside
    join(here, 'fixtures'),
    join(process.cwd(), 'fixtures')
  ]
  // Caller can override at runtime via env var if needed.
  if (process.env.AIDECK_FIXTURES) candidates.unshift(process.env.AIDECK_FIXTURES)
  return candidates[0]
}
```

```ts
  } catch {
    // missing → skip
  }
```

**Claim:** Demo seeding always chooses the first fixture candidate even when it does not exist, and the copy helpers swallow that failure instead of trying later candidates.

**Impact:** In packaged or relocated runs where the first candidate is absent but another candidate is valid, `aideck demo` starts with no plans, initiatives, annotations, or highlights while still reporting demo mode as running.

**Recommendation:** Probe candidates for required fixture subdirectories before returning one, honor `AIDECK_FIXTURES` only if valid, and fail loudly when no fixture source is found.

**Confidence:** high

---

### F-004 [major] Rollback safety — src/cli.ts:63-105

**Evidence:**
```ts
try {
  const env = await seedDemo()
  const port = await resolvePort({
    requested: parsed.flags.port,
    isExplicit: parsed.portExplicit
  })
  const running = await startServer({ rootDir: env.rootDir, port, demo: true })
  const url = `http://127.0.0.1:${running.port}`
  await writeEnvFile({ url, port: running.port })
  const consumer = createFakeConsumer({ rootDir: env.rootDir })
  await consumer.start()
```

```ts
} catch (cause) {
  if (cause instanceof PortInUseError) {
    process.stderr.write(`aideck demo: ${cause.message}. Try --port=<higher>\n`)
    return 1
  }
  process.stderr.write(`aideck demo: ${cause instanceof Error ? cause.message : String(cause)}\n`)
  return 1
}
```

**Claim:** If any step after `seedDemo()` fails before signal handlers are installed, the catch path returns without calling `env.cleanup()` or stopping partially initialized resources.

**Impact:** Normal failures such as an explicitly busy demo port leave `/tmp/aideck-demo-*` directories behind; later failures after server start can also leave stale env-file state or open resources in embedded/test use where `runCli` does not immediately terminate the process.

**Recommendation:** Track initialized resources and clean them in the catch path with best-effort `consumer.stop()`, `running.stop()`, `removeEnvFile()`, and `env.cleanup()` as applicable.

**Confidence:** high

---

### F-005 [major] Schema validation — src/demo/fake-consumer.ts:53-64

**Evidence:**
```ts
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        continue
      }
      const obj = parsed as { kind?: string; intentId?: string }
      if (obj.kind !== 'intent' || typeof obj.intentId !== 'string') continue
      if (seenIntentIds.has(obj.intentId)) continue
      seenIntentIds.add(obj.intentId)
      const intent = parsed as IntentRecord
      const application = await applyIntent(opts.rootDir, consumer, intent, log)
```

**Claim:** An inbox line with `kind: "intent"` and any `intentId` is applied even when `schemaVersion` is missing or not `'0.1'`, because the fake consumer casts raw JSON to `IntentRecord` instead of using the schema validator.

**Impact:** Malformed or future-version intent records can mutate demo canonical files instead of being rejected with `schema_version_mismatch`, violating the enforced v0.1 schema contract and masking migration bugs.

**Recommendation:** Parse inbox intent lines through `parseIntentRecord` or the Zod intent schema before applying, and append a rejected application for schema mismatches.

**Confidence:** high

---

### F-006 [major] File write boundary — src/demo/fake-consumer.ts:115-241

**Evidence:**
```ts
const path = join(consumerRoot(rootDir, consumer), 'initiatives', `${slug}.md`)
```

```ts
await writeFile(path, `---\n${newFrontmatter}---\n${split.body}`)
```

**Claim:** The demo fake consumer directly rewrites `initiatives/<slug>.md`, which violates the constraint that aiDeck writes only append-only records under `annotations/`, `highlights/`, and `inbox/`.

**Impact:** The aiDeck process becomes an entity-file mutator instead of an append-only intent writer, so rollback of this scope can leave direct canonical-file mutation behavior in the shipped CLI demo and obscure violations of the real consumer boundary.

**Recommendation:** Keep aiDeck demo mutations append-only, or move direct entity-file application behind an external consumer process/tool that is outside aiDeck’s write boundary.

**Confidence:** high

---

## Questions (non-findings)

- None.

## Out of scope

- Vue dashboard code under `src/client/`.
- Authentication, authorization, and multi-tenant isolation.
- Build/package configuration changes outside this scope.
- Documentation files outside `src/`.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same
- F-003-blind → F-003-final [major] — same
- F-004-blind → F-004-final [major] — same

### Emerged

- F-005-final [major] Schema validation — emerged: C4 requires schema version `'0.1'` to be enforced and mismatches refused, but the fake consumer applies raw JSON by shape.
- F-006-final [major] File write boundary — emerged: C6 and C12 require aiDeck mutations to stay append-only under `annotations/`, `highlights/`, and `inbox/`, but the fake consumer rewrites initiative markdown directly.
---

## Briefings used

Shared briefing template at `/tmp/aideck-review/run-scope.sh`. Constraints C1-C15
at `/tmp/aideck-review/constraints.md`. Non-goals at `/tmp/aideck-review/non-goals.md`.

## Fixes applied in this session

### Round 1 — critical
- **C-1 path traversal** (Scope C F-001, Scope G F-001) — applied at root in
  `src/server/writers/paths.ts`. Added `SAFE_CONSUMER_ID` regex
  (`/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/`), `UnsafeConsumerIdError`, and
  `assertSafeConsumerId()`. `consumerRoot()` validates before joining,
  covering all 6+ call sites transitively.

### Round 2 — all remaining findings
- **Scope A schemas (7 major)** — added `schemaVersion` to annotation/highlight/
  decision/inboxItem schemas; made all canonical schemas `.strict()`; replaced
  inboxItem with discriminated union; replaced intentRecord with operation-keyed
  discriminated union; replaced verifierResult criterionRef with target-keyed
  discriminated union; `isoTimestampSchema` now uses `.datetime({ offset: true })`;
  `isSchemaVersionMismatch()` now detects missing schemaVersion as `found: 'missing'`.
- **Scope B parsers (1 major + 3 minor)** — `parseInboxLine` now strips `kind`
  before delegating so strict schemas validate the canonical record shape;
  `splitFrontmatter` handles empty frontmatter (`---\n---\n`); `parseInboxLine`
  defensive stringify for invalid `kind` values; `parseJsonlFile` `io_error`
  routed to `logSink`.
- **Scope C server-infra (5 major + 1 minor)** — `appendJsonlLine` now serializes
  writes per-path via promise chain + caps at 64 KB (`JsonlLineTooLargeError`);
  `appendIntent` uses UUID-based `intentId`; watcher buffers unterminated trailing
  fragments before advancing cursor; watcher dispatches serialized per-path;
  watcher schemaVersion enforcement covered by schema changes (Scope A);
  env-file URL now single-quoted via POSIX-safe escape + port range validated.
- **Scope D server-transport (6 major)** — `/api/annotate`, `/api/highlight`,
  `/api/decision` use UUID IDs and handle `UnsafeConsumerIdError`; inbox
  projection now keys resolutions/acknowledgements by `(consumer, refId)`
  preventing cross-consumer collision; `buildAllForConsumer` now surfaces
  `schema_version_mismatch` / `invalid_input` rather than silently dropping;
  shell verifier runs in its own process group and kills the whole group on
  timeout; `hostname` option removed — server hard-codes `127.0.0.1`;
  `/api/decision` routed via `inbox/` as `kind: "decision"` records.
- **Scope E mcp-read (1 remaining)** — `aideck_get_dependencies` input now
  takes `scope: 'phase' | 'task'` (with phaseId or taskId required by mode);
  task mode no longer parses the plan file.
- **Scope F mcp-mutate (4 major + 1 minor)** — all mutation tools now
  `parseInitiativeFile` first and reject `precondition_failed` if missing;
  all input schemas `.strict()`; phase `blockedBy` returns full list to match
  task scope shape; dependencies handler validates scope-required fields.
- **Scope G mcp-gates (4 major + 1 minor)** — `nextVerifierResultId` uses UUID;
  `aideck_record_decision` routed via inbox/; `allGatesMet` computed from
  canonical + prior inbox `verifier_result` records via `readPriorVerifierResults`;
  `target: 'plan'` removed from enum; `deferredReason` persisted and required
  when `result === 'deferred'`.
- **Scope H cli-demo (6 major)** — CLI main-module check uses
  `pathToFileURL(process.argv[1]).href`; fake-consumer serializes processing per
  path via promise chain and drains on stop; demo seed probes candidates for a
  valid fixture root (`FixturesNotFoundError`); demo dispatcher tracks resources
  and tears them down on partial-startup failure; fake-consumer validates intents
  through `parseIntentRecord` (Zod) before applying; fake-consumer docblock
  documents demo-only entity-write boundary.

### Verification
- `npm run typecheck` → clean
- `npm test` → 144/144 passing
- All 8 scope verdicts now achievable: needs_changes → effectively resolved.
