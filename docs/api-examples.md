# HTTP API & SSE Examples

Concrete request/response examples for v0.1 endpoints. All responses include `schemaVersion`.

## Health

```http
GET /api/health
```

Response (200):

```json
{
  "schemaVersion": "0.1",
  "status": "ok",
  "uptimeMs": 12345,
  "consumerCount": 1,
  "version": "0.1.0"
}
```

## List consumers

```http
GET /api/consumers
```

Response (200):

```json
{
  "schemaVersion": "0.1",
  "consumers": [
    {
      "id": "project-status",
      "title": "Project Status",
      "rootPath": ".atomic-skills/project-status",
      "schemaVersion": "0.1",
      "state": "active"
    }
  ]
}
```

## Get state (all)

```http
GET /api/state/project-status
```

Response (200): full `ProjectStatusState` shape (see schemas).

## Get state (scoped)

```http
GET /api/state/project-status/v3-redesign
```

Response (200): single `Plan` payload.

```http
GET /api/state/project-status/v3-f0-foundation-repair
```

Response (200): single `Initiative` payload.

Resolution rule: aiDeck checks `plans/<slug>.md` first, then `initiatives/<slug>.md`.

## Help (skills metadata)

```http
GET /api/help
```

Response (200):

```json
{
  "schemaVersion": "0.1",
  "skills": [
    {
      "name": "project-status",
      "title": "Project Status",
      "purpose": "Track work via initiatives with stack, tasks, parked, emerged.",
      "whenToUse": [
        "Starting a new piece of work",
        "Resuming after break",
        "Pushing lateral findings"
      ],
      "whenNotToUse": [
        "One-shot questions",
        "Work that fits the current session entirely"
      ],
      "examples": [
        "/atomic-skills:project-status new my-feature",
        "/atomic-skills:project-status push 'investigating X'",
        "/atomic-skills:project-status done T-005"
      ],
      "related": ["fix", "review-code-with-codex"],
      "activeInRepo": true
    }
  ]
}
```

If skill frontmatter is missing for a skill, aiDeck falls back to first-paragraph extraction with `purpose` only.

## Inbox (aggregate)

```http
GET /api/inbox?since=2026-05-19T13:00:00Z&limit=50
```

Response (200):

```json
{
  "schemaVersion": "0.1",
  "items": [
    {
      "id": "ann-2026-05-19-002",
      "consumer": "project-status",
      "kind": "annotation",
      "payload": { /* Annotation */ },
      "createdAt": "2026-05-19T15:01:00Z"
    }
  ],
  "nextCursor": "2026-05-19T15:01:00Z"
}
```

## Write annotation

```http
POST /api/annotate
Content-Type: application/json

{
  "consumer": "project-status",
  "slug": "v3-redesign",
  "targetPath": "phases.F2.tasks.T-005",
  "body": "Verify unicode normalization for emoji edges.",
  "author": "ai"
}
```

Response (201):

```json
{
  "schemaVersion": "0.1",
  "id": "ann-2026-05-19-004",
  "createdAt": "2026-05-19T19:30:00Z"
}
```

Side effect: appends to `.atomic-skills/project-status/annotations/2026-05-19.jsonl`.

## Write highlight

```http
POST /api/highlight
Content-Type: application/json

{
  "consumer": "project-status",
  "slug": "v3-redesign",
  "targetPath": "phases.F3",
  "reason": "Drift detected.",
  "severity": "warn",
  "source": "ai"
}
```

Response (201):

```json
{ "schemaVersion": "0.1", "id": "hl-2026-05-19-003", "createdAt": "..." }
```

## Errors

All errors return JSON with `ErrorResponse` shape (from `@henryavila/aideck/schemas`).

Example: consumer not found.

```http
GET /api/state/unknown-consumer
```

Response (404):

```json
{
  "schemaVersion": "0.1",
  "code": "consumer_unknown",
  "message": "No registered consumer with id 'unknown-consumer'.",
  "suggestion": "Available consumers: project-status. Check spelling or register via consumer.yaml (v0.2+).",
  "details": { "consumerId": "unknown-consumer" }
}
```

Schema version mismatch:

```http
GET /api/state/project-status/old-plan
```

Response (500 — server cannot serve content):

```json
{
  "schemaVersion": "0.1",
  "code": "schema_version_mismatch",
  "message": "Plan 'old-plan' uses schemaVersion '0.0.9'; expected '0.1'.",
  "suggestion": "Run migration: aideck migrate --from=0.0.9 --to=0.1",
  "details": { "found": "0.0.9", "expected": "0.1" }
}
```

## SSE event stream

```http
GET /sse
Accept: text/event-stream
```

Response: `text/event-stream` with events as below. Each event is a separate SSE message.

### Event types

#### `state-change`

Emitted when an entity file changes (added/modified/deleted).

```
event: state-change
id: 1684509012345
data: {"consumer":"project-status","slug":"v3-f0-foundation-repair","kind":"initiative","changeType":"change","entity":{...full Initiative payload...}}
```

#### `annotation-added`

Emitted when a new annotation is appended.

```
event: annotation-added
id: 1684509013456
data: {"consumer":"project-status","annotation":{...Annotation payload...}}
```

#### `highlight-added`

```
event: highlight-added
id: 1684509014567
data: {"consumer":"project-status","highlight":{...Highlight payload...}}
```

#### `error`

Emitted when parsing fails for a watched file. UI displays a non-blocking toast; file path included.

```
event: error
id: 1684509015678
data: {"consumer":"project-status","path":".atomic-skills/project-status/plans/broken.md","code":"schema_version_mismatch","message":"...","suggestion":"..."}
```

#### `health-tick`

Heartbeat every 30s so clients can detect dead connection.

```
event: health-tick
id: 1684509016789
data: {"uptimeMs":12345}
```

### Reconnection

SSE has built-in `Last-Event-ID` reconnection. aiDeck retains events from the last 60 seconds. On reconnect with `Last-Event-ID`, aiDeck replays missed events. Older events are skipped (client must re-fetch full state via REST).

### Client-side handling (Vue)

```typescript
const sse = new EventSource('/sse')
sse.addEventListener('state-change', (event) => {
  const { consumer, slug, entity } = JSON.parse(event.data)
  store.applyStateChange(consumer, slug, entity)
})
sse.addEventListener('error', (event) => {
  const err = JSON.parse(event.data)
  toast.warning(`Parse error in ${err.path}: ${err.message}`)
})
```

## CORS policy

- `Access-Control-Allow-Origin`: `http://localhost:*` and `http://127.0.0.1:*` ONLY.
- Reject all other origins with `403 Forbidden`.
- Preflight: `OPTIONS` returns 204 with allowed methods (`GET, POST`).
