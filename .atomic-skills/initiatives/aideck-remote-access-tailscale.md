---
schemaVersion: '0.1'
slug: aideck-remote-access-tailscale
title: 'Remote access via Tailscale (--expose)'
goal: 'Reach the aiDeck dashboard from another device (phone) over a private tailnet, without widening the 127.0.0.1 bind (Iron Law #4).'
status: in-progress
branch: feat/ds-v2.1-widgets
started: '2026-06-17T18:30:00Z'
lastUpdated: '2026-06-17T18:50:00Z'
nextAction: 'T-008 — manual cross-device E2E (host has Tailscale; open the ts.net URL from the phone).'

exitGates:
  - 'aideck serve --expose=tailscale prints Local + Remote, ts.net URL opens from a second device with live SSE.'
  - 'aiDeck socket still binds 127.0.0.1 only (ss -ltnp); Funnel never invoked.'
  - 'tsc --noEmit clean and full vitest suite green.'

stack: []

tasks:
  - { id: T-001, title: 'expose module (off/tailscale/external, Serve not Funnel, readback, fallback)', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-002, title: 'CLI flags --expose/--expose-port/--remote-base-url + help', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-003, title: 'Wire expose into dispatchServe (start, print, teardown, error handling)', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-004, title: 'CORS accepts resolved remote host; threaded via ServerOptions.remoteHost', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-005, title: 'env-file AIDECK_REMOTE_URL; client shows real window.location host', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-006, title: 'Unit tests: expose, cors, args, env-file (+29, all green)', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-007, title: 'Docs: decisions.md, Iron Law #4 reword, docs/remote-access.md', status: done, lastUpdated: '2026-06-17T18:50:00Z', closedAt: '2026-06-17T18:50:00Z' }
  - { id: T-008, title: 'Manual cross-device E2E (ts.net URL from phone, SSE live, teardown verified)', status: pending, lastUpdated: '2026-06-17T18:50:00Z' }

parked: []

emerged:
  - 'Optional: per-write loopback gate (--allow-remote-writes) mirroring mdprobe. Deferred — personal single-user tailnet, by decision (2026-06-17 round 5).'
---

# Remote access via Tailscale (`--expose`)

Standalone initiative (no parent plan). Lets the dashboard be opened from a phone over the
user's private tailnet while preserving Iron Law #4 — aiDeck keeps binding `127.0.0.1`; a
separate `tailscale serve` process proxies into loopback. **Serve only, never Funnel.**

## Scope

- `src/server/expose/index.ts` — providers `off` / `tailscale` / `external`; ported from
  `~/mdprobe/src/expose/index.js`. Operational failures degrade to local-only with warnings.
- CLI: `--expose`, `--expose-port` (default 8443), `--remote-base-url`; help + examples.
- Wiring in `dispatchServe`: expose before bind (CORS needs the host), print Local/Remote +
  warning, tear down on shutdown, cleanup if bind fails.
- CORS accepts exactly the resolved remote host's origin. Client was already proxy-safe.
- `AIDECK_REMOTE_URL` in the env-file; chrome shows the real host.
- Docs + Iron Law #4 reconciliation in CLAUDE.md.

## Status

Code, unit tests, and docs **done** (782/782 vitest green, tsc clean). Remaining: the manual
cross-device E2E (T-008), which needs the host's live Tailscale + a second device — see
`docs/remote-access.md`. Decision log: `docs/decisions.md` (2026-06-17 round 5).
