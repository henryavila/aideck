---
date: 2026-05-28T23:04:40-03:00
topic: aideck-v2-hybrid-review
artifact: main..HEAD (feat/aideck-v2-generic-runtime)
skill: review-code (hybrid: same-model workflow + codex cross-model)
reviewer: claude-opus (same-model fan-out, 13 domains) + gpt-5-codex (cross-model 2-pass)
codex_version: codex-cli 0.134.0
final_verdict: reject
counts_codex_final: {blocker: 0, critical: 5, major: 2, minor: 0, nit: 0}
counts_codex_blind: {blocker: 0, critical: 3, major: 2, minor: 0, nit: 0}
counts_samemodel: {blocker: 6, critical: 5, major: 14, minor: 31, nit: 1}
framing_delta: {dropped: 0, maintained: 5, emerged: 3}
reviewed_commit: 9775301f3d810ac980acffa0b831e5571c97a96c
schema_version: "1.0"
---

# Hybrid Cross-Model Review — aiDeck v2 (`main..HEAD`)

## Headline

The v2 backend has a **systemic boundary-enforcement gap**: `script.ts` validates write/source paths via `validateWritePath`, but the parallel write/read/exec surfaces do **not**. Both models independently converged on a family of path-traversal escapes; each also caught issues the other missed.

- **Write/read/exec boundary escapes** (path traversal): `mcp/tools/generic.ts` (aideck_write), `routes/api-v2.ts` (HTTP write), `handlers/file-mutation.ts`, `handlers/script.ts` (source import), `handlers/shell-exec.ts` (arbitrary command), `data-source-reader.ts` (read). The server binds 127.0.0.1 with **no auth**, so any local process / MCP client reaches these.
- **DoS**: `project-registry.ts` `resolveCollision()` infinite loop on a 64-char id collision (reachable via `/api/projects/register`, used by `aideck up`).
- **XSS**: `MarkdownWidget.vue` injects unsanitized URL into `href` (quote/scheme not escaped).
- **Packaging**: `seed-demo.ts` copies demo assets that `tsc` never emits — `aideck demo` ships broken from a clean build.
- **Schema law**: `validators/normalize.ts` fabricates `schemaVersion`/timestamps before validation — violates Iron Law #3 (must refuse mismatches, never coerce).
- **API contract**: v2 router mounted on `/` shadows the legacy v0.1 routes; `/api/health` loses `rootDir`/`modes`/`projects`, which also makes `cli/up.ts` rootDir-mismatch detection dead code.

## Cross-model agreement (highest confidence — both models, independently)

| Issue | Same-model | Codex | Verdict |
|---|---|---|---|
| `mcp/tools/generic.ts` aideck_write traversal | blocker | critical (F-002) | **blocker** |
| `routes/api-v2.ts` HTTP write traversal | critical | critical (F-003) | **critical** |
| `handlers/shell-exec.ts` arbitrary exec / injection | critical | critical (F-005) | **critical** |
| v2 router shadows legacy v0.1 (`index.ts`/`up.ts`) | critical | major (F-006) | **critical** |

**Same-model unique (codex missed or out of scope):** `file-mutation.ts` traversal (blocker), `project-registry.ts` DoS (blocker), `MarkdownWidget.vue` XSS (blocker), `seed-demo.ts` packaging (blocker), test-coverage gaps for traversal/injection.

**Codex unique (same-model did not surface at this severity):** `data-source-reader.ts` read traversal (F-001 critical), `handlers/script.ts` source-path traversal + unsandboxed `import()` (F-004 critical), `validators/normalize.ts` schemaVersion fabrication (F-007 major).

## Part 1 — Same-model workflow (Claude, 13 domains: finder → adversarial verifier)

Confirmed **57** findings (6 blocker / 5 critical / 14 major / 31 minor / 1 nit) after refute-by-default verification. Scope: server, mcp, schemas, cli, client (core/composables/widgets/styles), demo, tests.

### BLOCKER (6)

#### B1 · `src/client/components/widgets/MarkdownWidget.vue:534-535` — client-widgets-B (security, conf: high)
- **Claim:** The hand-rolled markdown link rule `html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')` injects the captured URL ($2) into an href attribute without sanitizing the quote character or the URL scheme. escapeHtml() (lines 507-512) only escapes & < >, NOT double-quotes. The result is rendered via v-html (line 3). Two concrete payloads in consumer-controlled markdown (`_body` field of any *.md data source, read raw by src/server/data-source-reader.ts:79): (1) attribute breakout — `[x](" onmouseover="alert(document.cookie))` produces `<a href="" onmouseover="alert(document.cookie)" ...>` and fires JS on hover with no click; (2) scheme injection — `[click](javascript:fetch('/api/...'))` produces a clickable javascript: link.
- **Impact:** Stored XSS in the aiDeck browser origin (127.0.0.1). A consumer markdown file (or any upstream that writes one) executes arbitrary JS in the dashboard session: it can read same-origin /api/state data and invoke the REST write endpoints (annotations/highlights/inbox) on the user's behalf. Markdown is explicitly wired in (WidgetRenderer.vue:84, demo manifest.yaml uses field: _body) so this is on the normal path.
- **Recommendation:** Do not build markdown via string-replace + v-html. Use a vetted renderer (e.g. markdown-it with html:false) piped through DOMPurify before v-html, or at minimum: HTML-escape the href value AND reject any URL whose scheme is not http/https/mailto (e.g. only allow `^(https?:|mailto:|/|#)`). Add a test feeding the two payloads above and asserting no onmouseover/javascript: survives in renderedHtml.
- **Verify (skeptic, refute-by-default):** CONFIRMED. The cited code exists verbatim, only the line numbers are stale (file is 74 lines, finding cited 507-512/534-535/3; actual: escapeHtml at lines 36-41, link rule at line 64, v-html at line 3). The substance is fully correct:

1. escapeHtml() (MarkdownWidget.vue:36-41) escapes only & < >, NOT the double-quote character.
2. The link rule at line 64 is exactly the cited regex, injecting captured URL ($2) into an href attribute unsanitized, rendered via v-html (line 3).
3. I reproduced both payloads against the real render logic: payload 1 `[x](" onmouseover="alert(document.cookie))` pro…

#### B2 · `src/demo/seed-demo.ts:6-7` — demo (data integrity / packaging, conf: high)
- **Claim:** seed-demo.ts hardcodes DEMO_SOURCE = join(__dirname, 'consumer') and copies it with cp(DEMO_SOURCE, target, {recursive:true}). The build is pure `tsc -p tsconfig.server.json` (package.json scripts.build) with no asset-copy step and no prepare/prepack hook. tsc only emits .js/.d.ts from .ts files; it does NOT copy the non-TS assets under src/demo/consumer/ (manifest.yaml, data/*.yaml, data/events.jsonl, schema.json). I verified `dist/demo/` contains only seed-demo.js/.d.ts and NO `consumer/` subdirectory, and `npm pack --dry-run` ships dist/demo/seed-demo.js but zero consumer data files (files=["dist","README.md"] excludes src/demo/consumer). At runtime in any built/published context, __dirname is dist/demo, so DEMO_SOURCE resolves to dist/demo/consumer which does not exist; node:fs/promises cp on a missing source throws ENOENT (verified empirically: 'ENOENT: no such file or directory, ls…
- **Impact:** `aideck demo` (the package's only bin entry, ./dist/cli.js) is completely broken for end users. cli.ts:107 calls seedDemoConsumer() inside the demo startup try block; the ENOENT propagates to the catch at cli.ts:160 and the command exits with code 1 printing 'aideck demo: ... no such file or directory'. The headline single-command demo UX never starts. The smoke-publish checklist (docs/implementation/15-smoke-publish.md step 3) explicitly runs `node dist/cli.js demo`, which would fail. The unit…
- **Recommendation:** Either (a) add a build asset-copy step so src/demo/consumer/** lands in dist/demo/consumer (e.g. a copy script run after tsc, and ensure it is included by the files/package contents), OR (b) make seed-demo.ts resolve the consumer source from multiple candidate paths the way src/demo/seed.ts's resolveFixturesSource() does (try dist-relative, src-relative, and process.cwd()), and throw a loud typed error (like FixturesNotFoundError) if none is found instead of relying on a single hardcoded __dirna…
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. All claims empirically verified against the code and build.

seed-demo.ts:6-7 hardcodes DEMO_SOURCE = join(__dirname, 'consumer') and copies it via cp(DEMO_SOURCE, target, {recursive:true}) at line 14 — exact match. package.json build is pure `tsc -p tsconfig.server.json` with no postbuild/prepack/prepare/copy hook (grep confirmed zero). A fresh `rm -rf dist && npm run build` produced dist/demo/ containing only seed-demo.js/.d.ts(+maps) and NO consumer/ subdirectory. src/demo/consumer/ holds only non-TS assets (manifest.yaml, schema.json, data/*.yaml, data/events.jsonl) — `find…

#### B3 · `src/mcp/tools/generic.ts:143-163` — mcp (security/path-traversal, conf: high)
- **Claim:** The aideck_write tool guards the write target only with `input.target.startsWith('data/')` (line 144), then does `join(consumer.dir, input.target)` (line 161) and appends. A target of `data/../../../../tmp/evil.jsonl` passes the startsWith check (verified: returns true) and node:path.join normalizes it to a path OUTSIDE the consumer directory (verified: `join('/root/.atomic-skills/consumers/foo','data/../../../../tmp/evil.jsonl')` -> `/root/tmp/evil.jsonl`). No call to resolve() + containment check is made, unlike script.ts which uses validateWritePath().
- **Impact:** Any MCP client can write attacker-controlled JSONL content to arbitrary paths on the host filesystem (subject to process permissions) — e.g. overwriting config, dropping files into autostart dirs, or escaping the consumer sandbox. This is a sandbox escape and directly violates Iron Law #1 (aiDeck writes ONLY to annotations/highlights/inbox within scope) and feature-contracts.md line 19 ('aiDeck never writes to entity files').
- **Recommendation:** Reuse the existing containment logic from src/server/handlers/script.ts: compute `resolvedTarget = resolve(consumer.dir, input.target)`, then reject unless it is within `resolve(consumer.dir)` AND within a declared/default writable path (validateWritePath/computeWritablePaths already exist). Do NOT rely on a startsWith('data/') string check. Add a regression test that a `data/../` target is rejected.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. All claims verified against the code.

1. Citation accurate: src/mcp/tools/generic.ts:144 guards with only `input.target.startsWith('data/')`; line 161 does `const absolutePath = join(consumer.dir, input.target)` and line 162 `await appendJsonlLine(absolutePath, input.record)`. No resolve()+containment check (read directly).

2. Bypass reproduced: `'data/../../../../tmp/evil.jsonl'.startsWith('data/')` === true, and node:path.join(consumerDir, that) normalizes OUTSIDE the consumer dir (ran node: join('/var/folders/fakeconsumer/dir','data/../../../../tmp/evil.jsonl') -> '/var/tm…

#### B4 · `src/server/handlers/file-mutation.ts:28` — server-handlers (security, conf: high)
- **Claim:** executeFileMutation builds the write path as join(consumerDir, renderTemplate(decl.target, args)) and passes it straight to appendJsonlLine with NO write-scope validation. decl.target supports {{ var }} substitution from args (the shipped test uses target: 'data/events/{{ date }}.jsonl'), and args is AI/MCP-controlled input (dispatchHandler passes input as Record<string,unknown> verbatim). Setting an arg to a value containing ../ escapes the consumer directory: join('/app/.atomic-skills/proj', 'data/events/' + '../../../../tmp/evil' + '.jsonl') resolves to /app/tmp/evil.jsonl (verified via node). appendJsonlLine then mkdir -p's the parent and writes the record. The sibling script handler carefully calls validateWritePath; this declarative handler has no equivalent guard.
- **Impact:** Arbitrary file write outside the consumer directory (anywhere the server process can write), with attacker-influenced JSONL content and auto-created parent directories. Violates Iron Law 1 (aiDeck writes ONLY to declared writable subdirs) and is a path-traversal sandbox escape reachable in normal use whenever a manifest templates target with an arg.
- **Recommendation:** Resolve the target and run it through validateWritePath (as script.ts does) before calling appendJsonlLine. Thread the consumer dataSources / writablePaths into executeFileMutation (and through executeComposite) and reject targets outside declared writable paths with an io_error/invalid_input ErrorResponse.
- **Verify (skeptic, refute-by-default):** Finding is REAL and accurately described. Verified against source:

1. file-mutation.ts:28 is exactly `const targetPath = join(consumerDir, renderTemplate(decl.target, args))`, passed straight to appendJsonlLine at line 37 with no validation. The module imports only `join` (not `resolve`) and never references validateWritePath/computeWritablePaths.

2. template.ts:11-16 — renderTemplate substitutes `{{ var }}` arg values verbatim via regex replace, zero sanitization. A value containing `../` flows directly into the path.

3. args is AI/MCP-controlled: consumer-tools.ts:72 passes `input as Reco…

#### B5 · `src/server/project-registry.ts:51-54` — server-infra (correctness, conf: high)
- **Claim:** resolveCollision() enters an infinite loop when baseId is exactly 64 characters and already registered. The loop builds `${baseId}-${i}`.slice(0, 64); for a 64-char baseId the slice always strips the `-N` suffix and yields baseId itself, so `entries.has(candidate)` is forever true and the function never returns. baseId reaches 64 chars because deriveProjectId() does `.slice(0, 64)` (line 20) and isValidProjectId allows up to 64 chars (regex `^[a-z][a-z0-9-]{0,63}$`). Trigger via POST /api/projects/register: register one project, then register a second project (different rootDir) whose derived/explicit id is the same 64-char string (two dir basenames sharing the first 64 sanitized chars, or an explicit 64-char projectId that is already taken).
- **Impact:** A reachable HTTP endpoint (/api/projects/register, called by `aideck up`) drives the single-threaded server into a synchronous infinite loop at 100% CPU, hanging the request and all subsequent request handling. Effective DoS / full server hang.
- **Recommendation:** Bound the suffix construction so the appended counter is always preserved within the 64-char limit, e.g. truncate the base before appending: `const candidate = `${baseId.slice(0, 64 - String(i).length - 1)}-${i}``, and/or add a hard iteration cap that falls back to a random/uuid suffix. Add a unit test registering two projects with a 64-char colliding id.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Read src/server/project-registry.ts:49-55. resolveCollision is entered only when entries.has(baseId) is true (line 50). The loop body (line 52) computes `const candidate = `${baseId}-${i}`.slice(0,64)`. I reproduced the arithmetic with node: for a 64-char baseId, `(baseId + "-" + i).slice(0,64)` returns exactly baseId (the `-N` suffix is sliced off), so candidate === baseId for every i. Since baseId is already in the map, `entries.has(candidate)` is forever true and the for-loop (which has no termination condition, `for (let i = 2; ; i++)`) never returns — a synchronous infinit…

#### B6 · `tests/unit/server/routes/api-v2.test.ts:159-180` — tests (security/coverage-gap, conf: high)
- **Claim:** The only test for POST /api/consumers/:id/write/:target exercises the happy path with target='data/events.jsonl'. There is NO test for a traversal target. The production handler (src/server/routes/api-v2.ts:157,177) validates only `target.startsWith('data/')` then does `join(consumer.dir, target)` with no path resolution/containment check. A target like `data/../../../../../../tmp/evil.jsonl` passes the startsWith check but `join` normalizes the `..` segments to escape the consumer directory entirely (verified: join('/app/consumers/x','data/../../../../../../tmp/evil.jsonl') === '/tmp/evil.jsonl').
- **Impact:** An authenticated HTTP caller can append attacker-controlled JSONL content to ANY file the server process can write (e.g. crontabs, shell rc files, the consumer's own canonical YAML/manifest, violating Iron Law #1 that aiDeck never writes entity files). The test suite gives false confidence the write path is safe; the vulnerability ships undetected.
- **Recommendation:** Add tests asserting the write endpoint rejects (a) `data/../<escape>` traversal targets, (b) targets resolving to non-writable in-dir paths like `data/../manifest.yaml` or `data/items.yaml`. Drive a fix that resolves the target and runs it through validateWritePath (or equivalent containment + writable-allowlist) before appendJsonlLine.
- **Verify (skeptic, refute-by-default):** CONFIRMED. Every technical claim checks out against the code.

1. Test coverage gap (tests/unit/server/routes/api-v2.test.ts:159-180): The only test for the write endpoint posts target='data/events.jsonl' (line 165) and asserts the happy path (status 200, file written). I grepped all of tests/ for "/write/" — this single test in api-v2.test.ts is the ONLY one. No traversal/rejection test exists.

2. Unprotected production handler (src/server/routes/api-v2.ts:148-186): The handler validates ONLY `target.startsWith('data/')` (line 157) then does `const filePath = join(consumer.dir, target)` (lin…


### CRITICAL (5)

#### C1 · `src/cli/up.ts:111-130` — cli (correctness, conf: high)
- **Claim:** The rootDir-mismatch detection in `runUp` is dead code because the health response it reads never contains `rootDir`. Two `/api/health` routes are registered in src/server/index.ts: the v2 router (api-v2.ts:34) is mounted FIRST (line 82) and its handler returns `c.json({...})` with NO `rootDir` field; the legacy handler (api.ts:113) that DOES include `rootDir` is registered second (line 90) and never runs because Hono dispatches to the first matching route handler that returns a response. `probeHealth` therefore always yields a body with `rootDir === undefined`. At up.ts:113 the guard `if (!health.rootDir || health.rootDir === rootDir)` is thus always true.
- **Impact:** Running `aideck up` from project B while a server started for project A is already healthy prints A's URL and returns 0 instead of registering B (lines 117-124) or restarting (lines 126-130). The user is silently handed a dashboard URL pointing at the wrong project's data. The entire multi-project register/restart feature wired to `/api/projects/register` is unreachable via `up`.
- **Recommendation:** Add `rootDir` to the v2 `/api/health` response in src/server/routes/api-v2.ts (it has no access to rootDir today, so thread it through createApiV2Router deps), or have `up.ts` probe a dedicated endpoint that reliably carries rootDir. Add a test that starts a server for one rootDir and asserts `runUp` from a different rootDir triggers registration/restart.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Verified every load-bearing claim.

ROUTING (the core claim) — proven empirically. I built an isolated reproduction matching index.ts:82 (v2 mounted first via app.route('/', createApiV2Router(...))) and index.ts:90 (legacy mounted second). Two Hono sub-apps each registering GET /api/health, both mounted at '/'. Result: app.fetch('/api/health') returned the FIRST-mounted (v2) handler's body and the second never ran. So Hono dispatches to the first sub-app's matching handler that returns a Response, exactly as the finding states.

rootDir PRESENCE — api-v2.ts:34-47 (mounted first…

#### C2 · `src/server/handlers/shell-exec.ts:22-29` — server-handlers (security, conf: high)
- **Claim:** command = renderTemplate(decl.command, args) performs raw, unescaped substitution of args values into the command string, which is then executed via execFile('bash', ['-c', command]). renderTemplate (template.ts) does no shell escaping — string values are spliced verbatim. args is AI/MCP-controlled. A manifest command like 'git log {{ ref }}' invoked with args.ref = '; rm -rf $HOME #' yields bash -c 'git log ; rm -rf $HOME #', i.e. full shell command injection. The spec (2026-05-26 design, line 95) explicitly defines {{ }} as 'variable interpolation from args only, no expressions' — treating args as data — but splicing into bash -c turns AI-supplied data into executable shell code.
- **Impact:** AI-supplied tool arguments can execute arbitrary shell commands with the server process's privileges (cwd is the consumer dir but the shell has full process capabilities). Remote-ish code execution via the MCP surface; escalates AI input into host command execution.
- **Recommendation:** Do not splice args into a bash -c string. Either (a) forbid template vars in shell-exec command and pass fixed argv to execFile without a shell, or (b) shell-escape each substituted arg value (e.g. single-quote-wrap with embedded-quote escaping) before interpolation, and document the trust boundary. At minimum, escape values rendered into shell-exec commands distinctly from file/record rendering.
- **Verify (skeptic, refute-by-default):** Confirmed REAL by reading the code directly. (1) src/server/handlers/template.ts:11-16 — renderTemplate does verbatim, unescaped substitution; for string values it returns the value as-is (line 14: `if (typeof value === 'string') return value`), with zero shell escaping. (2) src/server/handlers/shell-exec.ts:22,26 — the rendered string is passed to `execFile('bash', ['-c', command], ...)`, which invokes a real shell that interprets the spliced text as shell code. (3) src/mcp/tools/consumer-tools.ts:71-73 — the MCP tool handler passes `input` verbatim as `args` to executeShellExec; the input sc…

#### C3 · `src/server/routes/api-v2.ts:148-186` — server-routes-manifest (security, conf: high)
- **Claim:** The write route POST /api/consumers/:id/write/:target{.+} only validates `target.startsWith('data/')` (line 157) and then does `join(consumer.dir, target)` (line 177) with no `..` rejection or containment check. A request to /api/consumers/<id>/write/data/../../../../etc/cron.d/evil.jsonl passes the prefix check; node:path.join collapses the `..` segments and resolves OUTSIDE consumer.dir. I verified with node: join('/home/u/.aideck/consumers/foo','data/../../../../../../etc/cron.d/evil.jsonl') === '/etc/cron.d/evil.jsonl'. appendJsonlLine then mkdir -p's the parent dir and appends arbitrary JSON to that path.
- **Impact:** Arbitrary file write (append, with dir auto-creation) anywhere the server process has write permission, from any localhost origin allowed by CORS (and any local process). This is a sandbox escape violating Iron Law #1 (aiDeck writes ONLY to annotations/highlights/inbox) and a path-traversal write primitive (e.g. append to shell rc files, cron, ssh authorized_keys with JSON-shaped content).
- **Recommendation:** After computing filePath, resolve it and assert it is contained: `const resolved = resolve(consumer.dir, target); if (resolved !== join(consumer.dir,'data') && !resolved.startsWith(join(consumer.dir,'data')+sep)) reject 400`. Also reject any target containing a '..' path segment before joining. Add a regression test posting `data/../../escape.jsonl` and asserting 400 + no file written outside consumer.dir.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL via end-to-end PoC. Cited code matches exactly: src/server/routes/api-v2.ts:148 route POST /api/consumers/:id/write/:target{.+}; line 157 only checks target.startsWith('data/'); line 177 does join(consumer.dir, target) with no containment/.. check; appendJsonlLine (src/server/writers/jsonl-append.ts:35-36) does mkdir(dirname,{recursive:true}) then appendFile. I verified node:path.join collapses .. (join('/home/u/.aideck/consumers/foo','data/../../../etc/evil.jsonl') === '/home/u/.aideck/etc/evil.jsonl'). 

I ran a real vitest PoC against createApiV2Router with the actual Consume…

#### C4 · `tests/unit/server/handlers/file-mutation.test.ts:15-41` — tests (security/coverage-gap, conf: high)
- **Claim:** executeFileMutation tests use fixed or benign template targets ('data/events/{{ date }}.jsonl' with date='2026-05-26', 'data/config.json', 'log.jsonl'). No test passes a malicious template value that escapes the consumer dir. Production src/server/handlers/file-mutation.ts:28 does `join(consumerDir, renderTemplate(decl.target, args))` with NO validateWritePath call (unlike script.ts which guards files.append). args flow directly from MCP tool input (src/mcp/tools/consumer-tools.ts:43,72) and composite steps (src/server/handlers/composite.ts:20).
- **Impact:** An MCP tool whose manifest declares e.g. target 'data/{{ slug }}.jsonl' lets the caller pass slug='../../../../etc/cron.d/x' to write outside the consumer dir, or target a canonical YAML/manifest file. Path-traversal write reachable from the authoritative AI surface, completely untested.
- **Recommendation:** Add file-mutation tests with traversal in both the static target and a template-injected arg, asserting rejection. Drive a fix to validate the resolved target against the consumer dir + writable allowlist before writing (reuse computeWritablePaths/validateWritePath).
- **Verify (skeptic, refute-by-default):** Every concrete claim in the finding is verified against the code.

PRODUCTION GAP (real): src/server/handlers/file-mutation.ts:28 builds the write target as `join(consumerDir, renderTemplate(decl.target, args))` and at line 37 calls `appendJsonlLine(targetPath, rendered)` with NO containment check — no validateWritePath, no consumer-dir clamp. By contrast, the sibling handler src/server/handlers/script.ts DOES guard: its files.append wrapper (script.ts:108-114) computes writablePaths via computeWritablePaths and calls validateWritePath(resolvedTarget, consumerDir, writablePaths) before appendi…

#### C5 · `tests/unit/server/handlers/shell-exec.test.ts:47-58` — tests (security/coverage-gap, conf: high)
- **Claim:** The 'substitutes template vars in command' test only checks benign substitution (greeting='hello', name='world'). Production shell-exec.ts:22,26 renders the template into the command string and runs `execFile('bash',['-c', command])`. renderTemplate performs raw string interpolation with no shell escaping, so an arg like name='world; touch /tmp/INJECTED' yields the command `echo world; touch /tmp/INJECTED` which bash executes (verified). args originate from MCP tool input via dispatchHandler.
- **Impact:** Arbitrary shell command injection through any template var in a shell-exec handler, reachable from the MCP tool surface. No test exercises metacharacter neutralization, so the injection ships undetected.
- **Recommendation:** Add a test asserting that shell metacharacters in template args do not execute (e.g. an arg containing '; touch <file>' must not create the file / must be treated as literal). Drive a fix that passes args as positional argv or shell-quotes interpolated values rather than splicing into a bash -c string.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Every claim verified against code and reproduced empirically.

Test file (tests/unit/server/handlers/shell-exec.test.ts:48-58): the 'substitutes template vars in command' test only uses benign values (greeting='hello', name='world') and asserts stdout equals 'hello world'. No test in the file exercises shell metacharacters — the four tests cover stdout, non-zero exit, timeout, and benign substitution only. The coverage gap claim is accurate.

Production path verified line-by-line:
- shell-exec.ts:22 — command = renderTemplate(decl.command, args)
- shell-exec.ts:26 — execFile('b…


### MAJOR (14)

#### M1 · `src/cli/down.ts:44-60` — cli (correctness, conf: medium)
- **Claim:** Strategy 1 reads a PID from the env file (parsePidFromEnvContent) and sends SIGTERM then SIGKILL to it (lines 46,56) after only checking `isProcessAlive(pid)` (process.kill(pid,0)). It does not verify the PID actually belongs to an aideck process. The env file is left stale after a hard crash / SIGKILL / power loss (writeEnvFile is only removed on graceful shutdown in cli.ts:63/150).
- **Impact:** If the OS reuses the stale PID for an unrelated process, `aideck down` will SIGTERM and then SIGKILL that arbitrary process, terminating unrelated work on the machine.
- **Recommendation:** Before signalling, confirm the PID is aideck: e.g. cross-check the env file URL's `/api/health` (service==='aideck') and only fall to PID-kill when that confirms the same instance, or record a start-time/identity token and verify it. At minimum verify health before SIGKILL escalation.
- **Verify (skeptic, refute-by-default):** Confirmed against the code. down.ts:44 gates Strategy 1 only on `pid && isProcessAlive(pid)`; isProcessAlive (down.ts:12-19) is `process.kill(pid,0)`, a pure liveness check with no identity verification. SIGTERM is sent at down.ts:46 and SIGKILL at down.ts:56 to that PID. The PID comes from parsePidFromEnvContent (down.ts:7-10) reading AIDECK_PID out of ~/.aideck/env. The stale-file premise holds: removeEnvFile runs only on graceful paths — cli.ts:63 (serve SIGINT/SIGTERM), cli.ts:150 (demo), and startup-failure catches (cli.ts:166, up.ts:131). There is no removeEnvFile on SIGKILL/power-loss/u…

#### M2 · `/Volumes/External/code/aideck/src/client/components/WidgetRenderer.vue:148-183` — client-core (correctness, conf: high)
- **Claim:** loadData() reads route.params[paramName] only AFTER `await fetchDataSource(...)`. Because it is driven by `watchEffect(loadData)`, Vue only tracks reactive dependencies accessed synchronously before the first await. route.params is read post-await, so it is never registered as a dependency. WHAT: navigating from /c/p/itemA to /c/p/itemB (same consumer/page/source, only :routeParam changes) does not re-run loadData, so the param filter never re-applies. WHY: watchEffect stops dependency tracking at the first await boundary; the only tracked deps (props.binding.source.ref, props.consumerId) are unchanged on a param-only navigation, and the components are reused (keyed by index in GridLayout/SectionsLayout), not remounted. IMPACT: master-detail navigation via source.param shows stale data for the previously-selected entity; the declared :routeParam route + source.param feature is broken for…
- **Impact:** Param-filtered widgets render the wrong entity after param-only route changes; the source.param / :routeParam master-detail feature silently fails to update.
- **Recommendation:** Do not rely on watchEffect to track route.params across an await. Either read all reactive deps (route.params[paramName], props.binding.source) synchronously into locals before the first await, or replace with an explicit `watch([() => props.binding, () => props.consumerId, () => route.params], loadData, { immediate: true })`. Add a test that mounts once then router.push to a new :routeParam and asserts the filtered records change.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL and reproduced empirically. The finding's mechanism and impact both hold.

Code facts (WidgetRenderer.vue):
- Line 150: `await fetchDataSource(props.consumerId, props.binding.source.ref)` — the synchronous deps tracked before this await are only `props.binding.source?.ref` (149) and `props.consumerId` (150).
- Line 164: `route.params[paramName]` is read AFTER the await; lines 154 (filter) and 162 (param) are likewise post-await and untracked.
- Line 183: `watchEffect(loadData)` drives it. Vue stops dependency tracking at the first await boundary, so `route.params` is never regis…

#### M3 · `/Volumes/External/code/aideck/src/client/api.ts:126-131` — client-core (error-handling, conf: high)
- **Claim:** fetchDataSource returns [] on any non-OK response (`if (!res.ok) return []`). WHAT: when /api/consumers/:id/data/:dataSourceId returns 404 (data_source_not_found) or 500 (parse/io_error with code+message+suggestion), the client receives an empty array indistinguishable from a genuinely empty data source. WHY: the error body (which carries error.code/message/suggestion) is discarded; WidgetRenderer never inspects it and only assigns sourceData/repeatGroups. IMPACT: real failures (mistyped source.ref, malformed YAML/JSON in the canonical file, server io_error) render as 'no data' instead of an error, masking misconfiguration. WidgetFrame even has a dedicated error/retry state that can never be reached through this path.
- **Impact:** Backend data-source errors are swallowed and shown as empty widgets, hiding broken consumer manifests and parse failures from users.
- **Recommendation:** Have fetchDataSource surface failures (throw a typed error or return a discriminated result with the ErrorResponse body) and have WidgetRenderer set WidgetFrame state='error' with message/suggestion. At minimum distinguish 404/500 from empty results.
- **Verify (skeptic, refute-by-default):** Finding is REAL. The cited line numbers (126-131) are stale — api.ts is only 43 lines — but the substantive target is unambiguous and matches exactly: src/client/api.ts:38-43, `fetchDataSource`, with `if (!res.ok) return []` at line 40.

Verified the full chain:
1. Server (src/server/routes/api-v2.ts:71-99) genuinely returns structured error bodies for this endpoint: `consumer_not_found`/`data_source_not_found` at 404 (lines 77, 82-88) and `io_error`/parse errors at 500 with code+message+suggestion+details (lines 91-96). So real failures (mistyped source.ref, malformed YAML/JSON, io errors) do…

#### M4 · `src/client/components/widgets/CodeBlockWidget.vue:611-625` — client-widgets-A (correctness, conf: high)
- **Claim:** The default/ts/js tokenizer iterates `while ((m = re.exec(work)) !== null)` and pushes only `m[0]` for each match, but the regex `/(\s+|[{}()[\]<>:;,.?=|&]+|"..."|'...'|`...`|[A-Za-z_$][\w$]*|\d+)/g` has NO alternative for the operators `+ - * / % ! @ ~ ^`. Characters that fall between consecutive matches (the unmatched gap) are never emitted, so they vanish from the rendered output. Verified: `i++` -> `i`; `total = a - b * c` -> `total = a  b  c`; `arr.map(n => n + 1)` -> `arr.map(n => n  1)`; and critically `if (a !== b)` -> `if (a == b)` (the `!` is dropped, inverting the visible logic).
- **Impact:** Any TypeScript/JavaScript/default-language code sample containing arithmetic, increment/decrement, or negation operators renders with corrupted, misleading content. The `!==` -> `==` case shows the logical opposite of the real code. This widget exists to faithfully display code, so the corruption defeats its purpose. (Display-only: no data is written to files, so no on-disk corruption.) The demo's typescript sample happens to avoid these operators (`??` and `=` survive because `?`/`=` are in the…
- **Recommendation:** Make the tokenizer emit gap characters: track the index after each match and push `work.slice(lastEnd, m.index)` as an untyped token before each match (and the trailing remainder after the loop), OR widen the punctuation character class to include `+\-*/%!@~^`. Add a round-trip unit test asserting `tokenizeLine(line,'ts').map(t=>t.t).join('') === line` for representative operator-containing lines.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. The cited line numbers (611-625) are stale — the file is only 177 lines — but the described code is unambiguously present at src/client/components/widgets/CodeBlockWidget.vue:161-174. The ts/js/default tokenizer uses regex `/(\s+|[{}()[\]<>:;,.?=|&]+|"[^"]*"|'[^']*'|`[^`]*`|[A-Za-z_$][\w$]*|\d+)/g` (line 161) and loops `while ((m = re.exec(work)) !== null)` pushing only `m[0]` (lines 163-172). The punctuation class `[{}()[\]<>:;,.?=|&]` omits `+ - * / % ! @ ~ ^`; with a global-regex exec loop, characters in the gap between consecutive matches are never emitted.

I reproduced th…

#### M5 · `src/client/components/widgets/MarkdownWidget.vue:1-73` — client-widgets-B (testing, conf: high)
- **Claim:** MarkdownWidget (and all 12 other widgets in this change set) ship with zero tests — grep across tests/ for any of the 13 new widget names or `renderMarkdown` returns nothing. CLAUDE.md mandates at least one test per feature success gate and a 70% coverage target on client paths. The markdown renderer in particular has security-relevant branches (escapeHtml ordering, code-block vs inline-code precedence, link href handling) that are entirely unexercised.
- **Impact:** The XSS-prone link/escape logic and the various field-fallback code paths can regress silently; no gate would catch a reintroduced injection or a broken escape-ordering change.
- **Recommendation:** Add unit tests (vitest + @vue/test-utils) for at least MarkdownWidget (escaping, link sanitization, code blocks) and the field-resolution logic of TableWidget/ListWidget/KeyValueWidget. Include the XSS payloads as regression fixtures.
- **Verify (skeptic, refute-by-default):** Confirmed against the code. (1) MarkdownWidget.vue:3 renders via `v-html="renderedHtml"`, and renderMarkdown (lines 43-70) has the cited security-relevant branches: escapeHtml ordering (36-41), code-block-before-inline-code precedence (47, 61), and an unsanitized link path at line 64 that inserts the captured URL straight into `href="$2"` with no javascript:/data: scheme filtering. (2) `grep -rln "components/widgets/"` across tests/ returns nothing — no test imports or mounts any widget SFC. Grep for renderMarkdown/MarkdownWidget/TableWidget/ListWidget/KeyValueWidget/escapeHtml = NO MATCHES. (…

#### M6 · `src/mcp/tool-list-watcher.ts:26-56` — mcp (race-condition, conf: high)
- **Claim:** handleManifestChange() is invoked fire-and-forget (line 31, `void handleManifestChange()`) from a synchronous EventBus listener, with no per-run lock or serialization. consumer_manifest_changed events are emitted WITHOUT debounce (consumer-watcher.ts:151-160 emits directly; only data_changed is debounced), so a single editor save that produces add+change (or two rapid saves) yields two overlapping async runs. Interleaving: run A awaits consumers.scan(), run B awaits consumers.scan() (both snapshot oldNamespaces before either scan resolves), A unregisters+re-registers (registry.register, which THROWS on duplicate — registry.ts:25-27), then B unregisters using its stale oldNamespaces snapshot which may omit a namespace A just registered, and B's registerConsumerTools then calls register() on a tool name that is still present -> throws 'MCP tool already registered'.
- **Impact:** The thrown error is swallowed by the .catch() (line 31-35) and only logged to stderr; B's `server.sendToolListChanged()` (line 55) never fires and the registry is left in a partially-updated, inconsistent state. Connected MCP clients see a stale or incoherent tool list after a manifest change — the feature (live tool-list refresh) silently fails under realistic multi-event file writes.
- **Recommendation:** Serialize handleManifestChange via a single in-flight promise chain (await the previous run before starting the next), or coalesce rapid consumer_manifest_changed events. Also make re-registration idempotent: have registerConsumerTools/registerTool tolerate or replace existing names (e.g. unregister-then-register atomically, or use a safeRegister that overwrites) instead of throwing on duplicate.
- **Verify (skeptic, refute-by-default):** CONFIRMED. I verified every load-bearing premise against the code:

1. Fire-and-forget synchronous listener: tool-list-watcher.ts:26-36 subscribes a synchronous callback that does `void handleManifestChange().catch(...)`. event-bus.ts:48-54 invokes listeners synchronously inside `emit()`. So each event starts an async run with no awaiting of prior runs — no in-flight lock or coalescing anywhere (cli.ts:210-215 wires it once with nothing extra).

2. consumer_manifest_changed is NOT debounced: consumer-watcher.ts:150-158 (`handleManifestChange`) emits the event directly via `opts.eventBus.emit(.…

#### M7 · `src/mcp/tools/consumer-tools.ts:13-22` — mcp (correctness/validation, conf: high)
- **Claim:** jsonSchemaToZod maps every required property to `z.unknown()` and optional ones to `z.unknown().optional()` (lines 18-19). In Zod, `z.unknown()` accepts a missing key — verified: `z.object({ item_id: z.unknown(), status: z.unknown() }).passthrough().safeParse({})` SUCCEEDS with data `{}`. Therefore the manifest's `required: [...]` array is NOT enforced for consumer-declared tools.
- **Impact:** A consumer tool declaring required fields (e.g. update_status requires item_id+status) accepts a call with those fields missing. For file-mutation handlers the unresolved template `{{item_id}}` is written literally (renderTemplate returns the match unchanged when the var is absent — template.ts:13), silently appending corrupt records like `{item_id:'{{item_id}}'}` to the JSONL data source instead of returning invalid_input. Data integrity loss with no error surfaced.
- **Recommendation:** Make required fields non-optional with a present-value check (e.g. for required keys use `z.unknown().refine(v => v !== undefined)` or build the shape so missing required keys fail safeParse). Add a test asserting a consumer tool with `required:[x]` rejects `{}`.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL via end-to-end execution. Verified each link of the claim:

1. consumer-tools.ts:18-19 (Read) maps required props to `z.unknown()` and optional to `z.unknown().optional()`, then `z.object(shape).passthrough()` — exactly as claimed.

2. The Zod premise is true on the project's actual version (zod 3.25.76). Ran jsonSchemaToZod({required:['item_id','status']}).safeParse({}) → success:true data:{}; safeParse({item_id:'x'}) → success:true (missing `status` accepted). `z.unknown()` does NOT reject a missing key.

3. registry.ts:69 is the sole validation gate — `tool.inputSchema.safePa…

#### M8 · `src/schemas/validators/normalize.ts:234-236` — schemas (schema-version / data-integrity, conf: high)
- **Claim:** normalizeInitiative silently injects `schemaVersion: '0.1'` for any initiative object that lacks a schemaVersion but has a slug or title (`if (!obj.schemaVersion && (obj.slug || obj.title)) obj.schemaVersion = '0.1'`). normalizePlan does NOT do this. Confirmed at runtime: an initiative payload with no schemaVersion is ACCEPTED with sv='0.1', whereas tests/unit/schemas/validators.test.ts:250 asserts a Plan missing schemaVersion is REJECTED with schema_version_mismatch, and docs/data-format.md:355-356 state records without schemaVersion are rejected with schema_version_mismatch (found: "missing").
- **Impact:** A version-less or future/legacy initiative file is silently treated as schema 0.1 instead of being rejected. This directly violates Iron Law #3 ('Parser refuses mismatches... Never silently coerce versions') and creates an inconsistency where Plans reject missing versions but Initiatives accept them. A genuinely incompatible initiative (e.g., a 0.2 file authored without the version key) would be misparsed against the 0.1 schema rather than surfacing schema_version_mismatch.
- **Recommendation:** Remove the schemaVersion auto-injection from normalizeInitiative. Let missing/mismatched schemaVersion flow to zod so parseOrError emits schema_version_mismatch, matching Plan behavior and the documented contract. If legacy files truly need acceptance, do it explicitly and symmetrically (and document the decision in decisions.md), not via a silent default on one entity only.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. The cited code exists verbatim. src/schemas/validators/normalize.ts:234-236 contains `if (!obj.schemaVersion && (obj.slug || obj.title)) { obj.schemaVersion = '0.1' }` inside normalizeInitiative. The diff (main..HEAD) shows this file is net-new and normalizePlan (lines 216-228) has NO equivalent injection, confirming the asymmetry. index.ts:131-135 routes both parsePlan and parseInitiative through their normalizers BEFORE zod, so the injection bypasses the schemaVersionSchema (z.literal('0.1')) gate.

Runtime verification (via vitest, importing parseInitiative): a COMPLETE init…

#### M9 · `src/server/handlers/script.ts:124-130` — server-handlers (correctness, conf: high)
- **Claim:** The 30s timeout is implemented as a setTimeout-backed Promise raced against the handler, but the timer is never cleared (no clearTimeout) and not .unref()'d. On the normal success path (handler resolves first) the timer remains armed and keeps the Node event loop alive for the full remaining TIMEOUT_MS. Verified empirically: a process whose only pending work is such a raced timer exits ~TIMEOUT_MS late (1502ms for a 1500ms timer). Additionally, Promise.race does not cancel the losing promise: a runaway/looping handler keeps executing after the 'timeout' rejection is returned (no child process / worker to kill), so the timeout reports failure but does not actually stop the work — contradicting the spec's 'Handler timeouts kill the process group on expiry'.
- **Impact:** (1) Process shutdown / clean exit (e.g. aideck mcp one-shot runs, server teardown) is delayed by up to 30s per successful script handler still inside its timeout window. (2) A misbehaving script handler that hangs or busy-loops is not actually terminated, leaking CPU/event-loop occupancy for the process lifetime; the timeout is cosmetic for non-cooperative scripts.
- **Recommendation:** Capture the timer handle, clearTimeout it in a finally after Promise.race settles, and call .unref() on the timer so it never blocks exit. For real cancellation of runaway scripts, run handlers in a worker_thread / child process that can be forcibly terminated on timeout, per the spec's process-group-kill requirement.
- **Verify (skeptic, refute-by-default):** Verified against src/server/handlers/script.ts:124-130 and the spec.

Claim 1 (timer not cleared/unref'd): TRUE as written. Lines 124-126 create `setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)` whose handle is never captured, never clearTimeout'd, never .unref()'d, and there is no finally block (lines 128-145 end the function without cleanup). A non-unref'd pending timer keeps the Node event loop alive, so any natural-drain exit path is held open up to ~30s after a successful handler. Note: the main daemon paths call process.exit(0) explicitly (cli.ts:225, mcp/index.ts:19), which f…

#### M10 · `src/server/consumer-registry.ts:36-68` — server-infra (race condition, conf: high)
- **Claim:** scan() synchronously runs `registered.clear()` (line 37) then `await readdir(...)` (line 42) and `await Promise.all(...)` (line 48) before repopulating the map. Because scan() is async and yields the event loop at the first await, any concurrent read — get()/list() from api-v2 handlers (e.g. GET /api/consumers, GET /api/consumers/:id at routes/api-v2.ts:35,50,64,75,106,152) or from MCP tools — that runs during this window observes a fully cleared registry. scan() is invoked at runtime by tool-list-watcher.ts on every consumer_manifest_changed event while HTTP/MCP traffic is live.
- **Impact:** While a consumer edits/saves its manifest.yaml (a normal action with the dashboard open), in-flight requests transiently see an empty registry: /api/consumers returns [], /api/consumers/:id returns 404 consumer_not_found, MCP tool calls fail. Intermittent, hard-to-reproduce failures during normal use.
- **Recommendation:** Build the new state in a local Map and swap it in atomically at the end of scan() (assign `registered`/`loadErrors` only after Promise.all resolves), instead of clearing the live map up front.
- **Verify (skeptic, refute-by-default):** Confirmed REAL by reading the code. consumer-registry.ts:36-68: scan() synchronously runs registered.clear() (line 37) and loadErrors.length = 0 (line 38), then yields the event loop at `await readdir(consumersPath)` (line 42) and `await Promise.all(...)` (line 48) before repopulating. registered is a closure-captured Map shared by the synchronous get() (line 71) and list() (line 75) accessors, so any read during the await window sees an empty registry.

Concurrent readers exist and are uncoordinated with scan(): api-v2 handlers read via deps.consumers.list()/get() at routes/api-v2.ts:35, 50,…

#### M11 · `src/server/consumer-registry.ts:52-58` — server-infra (data integrity, conf: high)
- **Claim:** scan() processes consumer directories with `await Promise.all(entries.map(...))` and stores each via `registered.set(result.value.id, consumer)`. Two directories whose manifests declare the same `id` collide on the Map key: the later set() wins and silently overwrites the earlier, with no ConsumerLoadError recorded. Because Promise.all completion order is nondeterministic, which directory survives is effectively random across restarts.
- **Impact:** Two consumers configured with the same manifest id silently collapse into one; one consumer's pages/tools/data vanish from the dashboard and MCP surface with no diagnostic, and which one disappears can change between restarts. Hard-to-diagnose data loss for the operator.
- **Recommendation:** Detect duplicate ids during scan: if `registered.has(result.value.id)`, push a ConsumerLoadError (duplicate id) instead of overwriting, and skip the duplicate. Add a test with two dirs declaring the same id.
- **Verify (skeptic, refute-by-default):** Confirmed against the code. In src/server/consumer-registry.ts the manifest `id` is the Map key: line 54/58 build the entry from `result.value.id` and call `registered.set(result.value.id, consumer)` with no `registered.has(...)` guard, inside `await Promise.all(entries.map(async (entry) => ...))` (lines 48-67). The key is the manifest-declared id, NOT the directory name (`entry` is only used to build the path on line 50 and as the error `consumerId` on line 61). The manifest schema (src/server/manifest-schema.ts:184) defines `id: z.string().min(1).max(64)` — a free-form string independent of…

#### M12 · `src/server/lockfile.ts:34-59` — server-infra (correctness, conf: medium)
- **Claim:** acquireLock() treats any lock whose recorded PID is alive (isPidAlive via process.kill(pid, 0), lines 34-40) as a live aiDeck instance and throws InstanceAlreadyRunningError (lines 57-59). The lock content carries no aiDeck-specific identity marker. If aiDeck previously exited uncleanly (SIGKILL, crash, machine reboot) leaving a stale lock, and the recorded PID was subsequently recycled by the OS to an unrelated live process, every future `aideck serve`/`demo` start permanently fails with 'another aiDeck instance is already running'.
- **Impact:** Server becomes un-startable until the user manually deletes ~/.aideck/lock, with a misleading error pointing at a port/pid that is not aiDeck. Realistic after an unclean shutdown plus PID reuse (common after reboot).
- **Recommendation:** Record a process-identity discriminator (e.g. a magic 'aideck' field and/or process start-time) and verify it before honoring the lock; or cross-check the recorded port is actually bound by an aiDeck health endpoint before declaring an instance running. Treat unverifiable locks as stale and overwrite.
- **Verify (skeptic, refute-by-default):** Verified against the actual code. src/server/lockfile.ts lines 34-40 define isPidAlive() via process.kill(pid,0), and lines 57-59 throw InstanceAlreadyRunningError whenever the recorded PID is alive. LockfileContent (lines 11-15) carries only pid/port/startedAt — no aiDeck identity marker and no port-binding cross-check, so any live process holding the recycled PID is treated as a running aiDeck. The stale-lock premise holds: releaseLock() is only invoked from the graceful stop() path (src/server/index.ts:152, reached via SIGINT/SIGTERM handlers). There is no process.on('exit')/atexit cleanup,…

#### M13 · `src/server/data-source-reader.ts:15-40` — server-routes-manifest (correctness, conf: high)
- **Claim:** expandGlob is a single-level prefix/suffix matcher, not a glob. For any pattern with a directory wildcard such as `data/*/items.yaml`: starIdx points at the '*', slashBefore is the '/' after 'data', dirPart='data', filePart='*/items.yaml', split('*') yields prefix='' suffix='/items.yaml'. It then readdir('<dir>/data') and filters entries by endsWith('/items.yaml'); no flat entry name contains '/', so the filter ALWAYS returns []. Patterns with '*' in a non-final segment, or recursive '**', silently resolve to zero files.
- **Impact:** Any consumer manifest whose dataSource.path uses a directory-level wildcard returns an empty record set with ok:true and no error — silent data loss / blank widgets that look 'working'. Hard to diagnose because no io_error is surfaced.
- **Recommendation:** Either restrict/validate dataSource.path patterns to a single trailing-filename wildcard at schema level (reject '*' before the last '/'), or replace the hand-rolled matcher with a real glob (e.g. fast-glob/picomatch) and add tests for `data/*/x.yaml` and `**`.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Read src/server/data-source-reader.ts:15-40 (the cited expandGlob). The algorithm is exactly as the finding describes: it finds the FIRST '*' (line 16 indexOf), computes dirPart as everything before the last '/' preceding that star (lines 21-22), and treats the remainder as a flat filePart split on a single '*' into prefix/suffix (lines 26-27), then readdir(dir) + filter by startsWith(prefix)/endsWith(suffix) on FLAT entry names (lines 37-39).

I traced it (node /tmp/glob-test.mjs) on the finding's example and the documented one:
- `data/*/items.yaml` -> dirPart='data', filePar…

#### M14 · `src/server/data-source-reader.ts:64-70` — server-routes-manifest (error-handling, conf: high)
- **Claim:** readJsonlFile maps every non-blank line through JSON.parse with no per-line try/catch. A single malformed line in a JSONL data source throws, which propagates to readDataSource's catch (line 113) and aborts the ENTIRE data source with io_error 500. JSONL append targets (e.g. inbox/highlights, and the v2 write route) are exactly the files most likely to accumulate a partially-written or hand-edited bad line.
- **Impact:** One corrupt/partial line makes the whole data source unreadable: the v2 GET /api/consumers/:id/data/:dataSourceId route and MCP consumer-tools/generic readers all return a 500 instead of the valid records, breaking the dashboard view for that source. Contradicts the 'files canonical, resilient read' posture.
- **Recommendation:** Wrap per-line JSON.parse and skip+log (stderr) malformed lines, or collect them into a diagnostics field, so valid records still load. Add a test with a JSONL file containing one invalid line asserting the valid records are returned.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Read src/server/data-source-reader.ts:64-70: readJsonlFile does raw.split('\n').filter(blank).map(line => JSON.parse(line)) with NO per-line try/catch. readDataSource (lines 94-121) wraps the per-file read in a single try/catch that returns err({code:'io_error'}) on any throw, so one malformed line aborts the entire data source. Verified propagation to HTTP 500 at src/server/routes/api-v2.ts:90-96 and :121-127 (errResp(..., 500)). Verified MCP consumers also call readDataSource (consumer-tools.ts:27, generic.ts:68/113). JSONL is genuinely an append target: script.ts:29-34 marks…


### MINOR (31)

#### M1 · `src/cli/init-consumer.ts:60-61` — cli (security, conf: high)
- **Claim:** `opts.id` comes straight from the `--id` CLI flag (cli.ts:295,312) with only a non-empty check (cli.ts:297) and is passed unvalidated into `join(baseDir, 'consumers', opts.id)`. A value like `--id=../../evil` or `--id=../foo` resolves outside `~/.aideck/consumers/`. The manifest schema only bounds `id` length (manifest-schema.ts:184 `z.string().min(1).max(64)`), not its characters, and that schema is never consulted before writing.
- **Impact:** `init-consumer` creates directories and writes manifest.yaml, schema.json, and data/items.yaml at an attacker/user-controlled path outside the declared writable scope. The `access`-based existence guard (line 64) does not prevent first-time creation, so files land in arbitrary locations (e.g. ~/foo) — a write-outside-scope / path-traversal gap.
- **Recommendation:** Validate `opts.id` against a strict slug pattern (e.g. /^[a-z0-9][a-z0-9-]{0,63}$/) before constructing the path; reject ids containing '/', '\', or '..' with a clear error. Add a test that `--id=../escape` is rejected.
- **Verify (skeptic, refute-by-default):** Verified all claims against the code.

CODE FACTS:
- src/cli/init-consumer.ts:60-61 (new file in this diff): `const baseDir = opts.baseDir ?? join(homedir(), '.aideck')` then `const consumerDir = join(baseDir, 'consumers', opts.id)`. opts.id is used verbatim — no slug/character check anywhere in the file (grep confirms no `..`, basename, sanitize, validate).
- src/cli.ts:295 `const { id, title, mcpNamespace } = parsed.flags`; :297 the only guard is `!id` (non-empty); :312 `return runInitConsumer({ id, title, mcpNamespace })`. No character validation between flag and path construction.
- src/cl…

#### M2 · `src/cli/init-consumer.ts:12-37` — cli (data-integrity, conf: high)
- **Claim:** `buildManifestYaml` builds YAML via raw string interpolation. `title` is wrapped as `'${title}'` (line 16) — a title containing a single quote (e.g. --title="It's mine") produces broken/injected YAML. `id` and `mcpNamespace` are interpolated UNQUOTED as `id: ${id}` / `mcpNamespace: ${mcpNamespace}` (lines 14-15) — a value containing a colon, '#', leading special char, or newline corrupts the document. No escaping/serializer (e.g. yaml stringify) is used.
- **Impact:** A consumer scaffolded with such values yields a manifest.yaml that either fails to parse or parses to wrong values, so the consumer silently fails to load later (loadManifest/parseManifest rejects it). The user gets a created-but-broken consumer with no error at creation time.
- **Recommendation:** Serialize the manifest object with the `yaml` library's stringify (already a dependency) instead of hand-built string concatenation, so all values are correctly quoted/escaped; or validate id/mcpNamespace against their schema patterns and reject titles with unescapable characters.
- **Verify (skeptic, refute-by-default):** Confirmed against source. src/cli/init-consumer.ts:12-37 `buildManifestYaml` builds YAML by raw string interpolation: line 15 `id: ${id}` and line 16 `mcpNamespace: ${mcpNamespace}` are unquoted; line 17 `title: '${title}'` wraps in single quotes with no escaping. A title containing an apostrophe (e.g. --title="It's mine") yields `title: 'It's mine'` (invalid YAML); a colon/#/newline in id or mcpNamespace corrupts the document. No yaml serializer is used. The caller src/cli.ts:297-312 only checks flag presence (truthiness), not content, before passing to runInitConsumer→buildManifestYaml, so n…

#### M3 · `/Volumes/External/code/aideck/src/client/composables/useSse.ts:16` — client-composables (correctness, conf: high)
- **Claim:** useSse builds its filtered URL as `/sse?consumer=${consumerFilter}`, but the SSE backend (src/server/routes/sse.ts:32) reads the filter from `c.req.query('project')`, not `consumer`. The `consumer` query param is silently ignored server-side. matchesProjectFilter (sse.ts:14-25) would then treat the connection as unfiltered (projectFilter=null) and apply the default-project filter instead of the requested consumer scope.
- **Impact:** When a caller passes a consumerFilter expecting a scoped stream, the backend ignores it and the client receives the default-project (effectively unfiltered) event stream. The composable currently has zero callers, so no user is hit today, but wiring it up later will produce a silent, hard-to-diagnose filtering failure that looks like it works (events arrive) while ignoring the requested scope.
- **Recommendation:** Change the URL to `/sse?project=${encodeURIComponent(consumerFilter)}` to match the backend query-param name, and URL-encode the value. Better: delete useSse.ts entirely since useLiveBus.ts is the shared, in-use SSE implementation and useSse is an orphaned near-duplicate that will drift from the backend contract.
- **Verify (skeptic, refute-by-default):** Confirmed by reading the code. useSse.ts:16 builds `/sse?consumer=${consumerFilter}` (no URL-encoding), while the backend at sse.ts:32 reads `c.req.query('project') ?? null`. The `consumer` query param is never read server-side — the backend filters on `projectId`, not `consumer`. matchesProjectFilter (sse.ts:14-25) receives `projectFilter=null` when only `consumer` is passed, falling into the lines 16-22 default-project branch and applying `registry.defaultProject()` scope instead of the requested scope. So a caller passing consumerFilter silently gets the default-project (effectively unfilte…

#### M4 · `/Volumes/External/code/aideck/src/client/composables/useDataSource.ts:8-15` — client-composables (error-handling, conf: medium)
- **Claim:** load() wraps the fetch in try/finally with no catch and no error ref. fetchDataSource (api.ts:38-43) returns [] on a non-ok HTTP response, but a genuine network failure makes the underlying fetch() reject, so load() rejects. It is invoked by `watch([...], load, { immediate: true })`, so the rejected promise becomes an unhandled rejection, records.value silently retains stale/empty data, and the caller has no signal that the load failed (no error ref, unlike useConsumers/useDemoMode).
- **Impact:** On a transient network error a consumer-data widget would show stale or empty data with no error surfaced and an unhandled-rejection logged to the console. The composable currently has zero callers, so this is latent rather than active.
- **Recommendation:** Add a catch that records the failure into an `error` ref (mirroring useConsumers.ts) and return it, or remove the orphaned composable if WidgetRenderer's own loadData path is the intended data-fetch surface.
- **Verify (skeptic, refute-by-default):** Verified all claims against the actual code. useDataSource.ts:8-15 wraps `await fetchDataSource(...)` in try/finally with no catch; the returned object (line 19) exposes only `{ records, loading, reload }` with no error ref. api.ts:38-43 confirms `if (!res.ok) return []` handles HTTP-error statuses, but the bare `await fetch(...)` at line 39 rejects on a genuine network failure, and that rejection propagates uncaught out of load(). load() is wired via `watch([consumerId, dataSourceId], load, { immediate: true })` at line 17, so a rejected promise from the watcher callback is unawaited by Vue -…

#### M5 · `/Volumes/External/code/aideck/src/client/components/CommandPalette.vue:241-309` — client-core (correctness, conf: high)
- **Claim:** buildIndex() runs once, guarded by `built.value`, and is never invalidated. WHAT: when a consumer manifest is added/changed/removed at runtime (the core premise of the file-watching runtime; server emits consumer_manifest_changed over SSE), the palette index stays stale until a full page reload. WHY: there is no subscription to lastEvent/consumer_manifest_changed to reset built.value or rebuild. IMPACT: newly added consumers/pages/files are not jumpable via ⌘K, and removed ones still appear and route to 404, until reload.
- **Impact:** Command palette shows a stale consumer/page/file index after live manifest changes until the user reloads.
- **Recommendation:** Watch useLiveBus().lastEvent for kind === 'consumer_manifest_changed' and reset built.value / rebuild the index (or rebuild on each open if cost is acceptable).
- **Verify (skeptic, refute-by-default):** Verified against the code. The cited line range (241-309) actually covers the visibleGroups computed and onKeyDown handler, not buildIndex() itself — buildIndex() is at CommandPalette.vue:120-172 and its guard is at the watch(isOpen) at lines 314-321. Despite this line-number imprecision, the substantive claim is correct:

1. buildIndex() (lines 120-172) populates the index from fetchConsumers() (124) and per-consumer fetchConsumerManifest() (141), covering consumers, pages, and dataSource files. It sets built.value = true at line 171.
2. Its sole caller is watch(isOpen) (314-321), guarded by…

#### M6 · `/Volumes/External/code/aideck/src/client/components/WidgetRenderer.vue:185-191` — client-core (performance, conf: medium)
- **Claim:** The live-refresh watcher re-fetches on every data_changed for the consumer regardless of payload.dataSourceHint. WHAT: a page bound to consumer X with N widgets triggers N simultaneous loadData() (one per widget) on a single file change, each issuing its own /data/:source request, even for sources unrelated to the changed file. WHY: the condition `e.consumer === props.consumerId` ignores dataSourceHint and every WidgetRenderer instance owns its own watcher. IMPACT: O(N) redundant fetches per change event on dashboards with many widgets; also concurrent fetches with no lock could land out of order (last-resolved-wins) though server-side per-consumer debounce mitigates burst frequency.
- **Impact:** Each file change fan-outs to one fetch per widget on the page, including widgets whose source did not change; potential out-of-order resolution.
- **Recommendation:** Gate the reload on matching the changed source (compare event.payload.dataSourceHint against props.binding.source.ref) and/or guard against overlapping in-flight loads with a request token so a later fetch result cannot be overwritten by an earlier one.
- **Verify (skeptic, refute-by-default):** Core claim is REAL and verified against the code. WidgetRenderer.vue:185-191 contains the live-refresh watcher; line 189 (`if (!e || e.consumer === props.consumerId) void loadData()`) gates ONLY on consumer match and ignores `e.payload.dataSourceHint`. Each WidgetRenderer instance owns its own watcher, and GridLayout.vue:9 mounts one WidgetRenderer per widget via v-for, so a page with N widgets bound to consumer X fires N watchers on a single data_changed event. loadData() (WidgetRenderer.vue:148-181) calls fetchDataSource (api.ts:38-43), which is an uncached raw `fetch` to /api/consumers/:id/…

#### M7 · `src/client/styles/live.css:83-84` — client-styles (maintainability, conf: high)
- **Claim:** Comments in live.css (lines 83-84) and the Group E header in widgets.css (~line 4464) assert that .is-live lives in 'foundations.css' and that kanban/timeline/log/tree atoms come from 'widgets-extra.css', and tokens.css (line 3132) calls the fonts 'Both Google Fonts'. None of foundations.css, aliases.css, or widgets-extra.css exist (confirmed via ls); .is-live is actually defined in tokens.css:440/452, and fonts are loaded locally via @fontsource packages in main.ts, not Google Fonts. The comments point maintainers at files and a font pipeline that do not exist.
- **Impact:** A future maintainer editing the live scanline or trying to override .is-live will search for foundations.css and find nothing, or will assume a Google Fonts CDN dependency (and possible privacy/telemetry surface) that is not present. Wastes time and can lead to wrong conclusions about the no-telemetry posture. No runtime effect — all referenced classes resolve correctly.
- **Recommendation:** Update the comments to reference the actual locations (tokens.css for .is-live; the relevant sections of widgets.css/board.css/sections.css for the reused atoms) and correct the 'Both Google Fonts' note to '@fontsource (bundled locally, no CDN)'.
- **Verify (skeptic, refute-by-default):** Verified the finding's substance is correct, though some cited line numbers are wrong.

CONFIRMED (primary citation, exact): live.css:83-84 reads "/* Atom 3: scanline overlay refinement (foundations.css has .is-live) */ /* .is-live is defined in foundations.css; ...". foundations.css does NOT exist — `ls src/client/styles/` shows only base, board, home, live, palette, responsive, sections, shell, states, tokens, widgets. `.is-live` is actually defined in tokens.css:440 (`.is-live::after`) and tokens.css:452 (`.is-live { position: relative; }`). So the comment points to a nonexistent file.

CON…

#### M8 · `src/client/components/widgets/CodeBlockWidget.vue:545-625` — client-widgets-A (testing, conf: high)
- **Claim:** None of the new widgets ship unit tests. The CodeBlockWidget tokenizer (custom per-language logic), BarChartWidget `niceMax`/geometry, KanbanBoardWidget `cardsByColumn` grouping, and GaugeWidget arc math are all non-trivial pure logic with edge cases, but `tests/unit/client/` contains no test files referencing any of them.
- **Impact:** Logic regressions like the character-dropping tokenizer bug above ship undetected. CLAUDE.md mandates a test per feature success gate and 70% coverage on covered areas; these new code paths have zero coverage.
- **Recommendation:** Add unit tests extracting the tokenizer (and ideally the chart/kanban pure functions) to a testable module, covering operator round-trip, empty input, and non-numeric values.
- **Verify (skeptic, refute-by-default):** Verified REAL with minor caveats. Confirmed via git diff --name-status main..HEAD that CodeBlockWidget.vue, BarChartWidget.vue, GaugeWidget.vue, KanbanBoardWidget.vue are all net-new (status A) on this branch. Confirmed each cited pure-logic function exists and is non-trivial: tokenizeLine/valueTokens (CodeBlockWidget.vue:82-175, custom per-language regex tokenizing for yaml/shell/ts with comment-splitting and value classification), niceMax (BarChartWidget.vue:83), cardsByColumn grouping (KanbanBoardWidget.vue:166), and semicircle arc geometry (GaugeWidget.vue:60-68 — arcLen=PI*R, ratio clamp,…

#### M9 · `src/client/components/widgets/GaugeWidget.vue:865-872` — client-widgets-A (correctness, conf: high)
- **Claim:** `fillColor` falls through to `chartColor(Number(c) - 1)` whenever `config.color` is any non-empty string that is not a known status token and does not match `chart-[1-8]`. For a value like `color: 'blue'` or `color: 'primary'`, `Number('blue')` is `NaN`, so it computes `chartColor(NaN)` which returns the literal string `var(--chart-NaN)` (since `Math.abs(NaN) % 8 + 1` is `NaN`).
- **Impact:** The gauge fill `stroke` is set to an undefined CSS custom property `var(--chart-NaN)`, so the colored arc renders with no/invalid color (browser falls back to default/none). Edge case driven by consumer config; cosmetic but produces a visibly broken gauge fill.
- **Recommendation:** Guard the numeric branch: only call `chartColor(Number(c) - 1)` when `Number.isFinite(Number(c))`; otherwise return the default `var(--chart-2)`.
- **Verify (skeptic, refute-by-default):** Technical claim is accurate, though the cited line range (865-872) is stale — the file is only 93 lines and the actual logic is at src/client/components/widgets/GaugeWidget.vue:84-91. The described fall-through behavior matches exactly.

fillColor (lines 84-91): `const c = String(props.config.color ?? '')`; checks STATUS_COLORS[c], then `c.match(/^chart-([1-8])$/)`, then `if (c) return chartColor(Number(c) - 1)`, else default `var(--chart-2)`. For `config.color: 'blue'` or `'primary'`: not in STATUS_COLORS, no chart-N match, but truthy, so it calls `chartColor(Number('blue') - 1)` = `chartColo…

#### M10 · `src/client/components/widgets/GaugeWidget.vue:831-849` — client-widgets-A (correctness, conf: medium)
- **Claim:** When the source value field is non-numeric (e.g. a string `'n/a'`), `value` is `Number(...)` = `NaN`. `displayValue` then renders the literal text `NaN` (because `NaN < 10` is false -> `String(Math.round(NaN))` = `'NaN'`), and `ratio` becomes `NaN`, producing `stroke-dasharray="NaN 251.33"` which is an invalid SVG attribute.
- **Impact:** The gauge displays the text `NaN` and an unpredictable/empty arc for non-numeric input. Edge case (consumer supplies a non-numeric value in a numeric field) and consistent with the `Number(...)` convention used by sibling widgets, but still a visibly broken render with no fallback.
- **Recommendation:** Coerce a non-finite `value` to 0 (or render an empty/em-dash state): e.g. `const n = Number(row?.[field]); return Number.isFinite(n) ? n : 0`.
- **Verify (skeptic, refute-by-default):** Cited line range (831-849) is wrong: GaugeWidget.vue is only 93 lines; the relevant code lives at lines 50-68. But the described logic is accurate. value (line 50-54) is Number(row?.[field] ?? 0): a non-numeric string like 'n/a' is not nullish, so ?? 0 does not fire, and Number('n/a') = NaN. displayValue (line 56-58): NaN < 10 is false, so String(Math.round(NaN)) = 'NaN' — renders literal "NaN". ratio (line 67): Math.max(0, Math.min(1, NaN/maxVal)) = NaN. dash (line 68): `${(arcLen*ratio).toFixed(2)} ${arcLen.toFixed(2)}` = 'NaN 251.33', bound to :stroke-dasharray on line 10 — an invalid SVG a…

#### M11 · `src/client/components/widgets/TimelineWidget.vue:1375-1377` — client-widgets-B (correctness, conf: high)
- **Claim:** When refId is truthy, the title is rewritten as `rawTitle.replace(`${refId} `, '').replace('Task ', '').replace('Project ', '')`. The `.replace('Task ', '')` and `.replace('Project ', '')` use literal string args and strip the FIRST occurrence anywhere in the title, not just a leading prefix. A legitimate title such as `Refactor Task Manager` (with any non-empty refId) renders as `RefactorManager`.
- **Impact:** Silent display corruption of timeline event titles for any consumer whose titles legitimately contain the substrings 'Task ' or 'Project '. Display-only, narrow trigger.
- **Recommendation:** Anchor the strip to the start (e.g. `rawTitle.replace(new RegExp('^' + escapeRegExp(refId) + '\\s*(Task |Project )?'), '')`) or drop the unconditional substring removals entirely.
- **Verify (skeptic, refute-by-default):** The cited line number (1375-1377) is stale — TimelineWidget.vue is only 89 lines (added new in this branch per `git diff main..HEAD`). However, the cited code exists verbatim at src/client/components/widgets/TimelineWidget.vue:69:

```
const title = refId
  ? rawTitle.replace(`${refId} `, '').replace('Task ', '').replace('Project ', '')
  : rawTitle
```

The claim is technically correct. In JavaScript, `String.prototype.replace` called with a STRING (not a global regex) replaces only the FIRST occurrence and is NOT anchored to the start. Tracing the finding's example with refId='T-001' and raw…

#### M12 · `src/client/components/widgets/ProgressBarWidget.vue:644-648` — client-widgets-B (correctness, conf: high)
- **Claim:** weightedAvg is rendered with the literal label 'weighted avg' (line 571) but computes a plain arithmetic mean of per-row pct values (`sum / rows.length`), giving every row equal weight regardless of its `max`. A row with max=1000 contributes the same as a row with max=10.
- **Impact:** The displayed 'weighted avg' is mathematically not weighted; for stacked bars with differing maxima the figure misrepresents aggregate progress.
- **Recommendation:** Either compute a true weighted average (sum(value)/sum(max)*100) or relabel the footer as 'avg' to match the actual computation.
- **Verify (skeptic, refute-by-default):** CONFIRMED. The cited line numbers are wrong — ProgressBarWidget.vue is only 176 lines, not 644-648/571 — but the substantive code the finding describes exists and is precisely identifiable. The literal label "weighted avg" is at src/client/components/widgets/ProgressBarWidget.vue:20 (`<span>weighted avg</span>`), and the `weightedAvg` computed at lines 94-98 does: `const sum = rows.value.reduce((acc, r) => acc + r.pct, 0); return (sum / rows.value.length).toFixed(1)`. This is a plain arithmetic mean of per-row `pct` values, giving every row equal weight regardless of `max`. Concretely, for row…

#### M13 · `src/client/components/widgets/LineChartWidget.vue:211-217` — client-widgets-B (correctness, conf: medium)
- **Claim:** `max` is `niceMax(Math.max(...all, 1))` and is always clamped to at least 1 with no handling of negative series values. For a series whose values are all negative, max becomes 1 and `yAt(v)` (line 222-224) yields y greater than the baseline (padT+innerH), drawing the polyline/points below the plotted area / outside the viewBox. Separately, `Math.max(...all)` spreads every value of every series as call arguments, which can hit the engine argument-count limit for very large sources.
- **Impact:** Negative-valued time series render incorrectly (line drawn off the chart). Pathologically large datasets could throw a RangeError on the spread. Both are edge cases for a localhost dashboard with file-sized data.
- **Recommendation:** Compute min/max via a reduce (avoid spread) and derive the y-domain from both bounds so negative values map into the plot area.
- **Verify (skeptic, refute-by-default):** CONFIRMED (REAL), severity unchanged at minor. The cited line numbers are stale/wrong — the file is only 197 lines, so lines 211-217 and 222-224 do not exist — but the exact code the finding describes is present: `max` is computed at src/client/components/widgets/LineChartWidget.vue:127-133 as `niceMax(Math.max(...all, 1))` (line 132), and `yAt(v)` is at lines 138-140 as `padT + innerH - (v / max.value) * innerH`.

The substantive claim holds. The y-domain is implicitly [0, max] with `max` clamped to >=1 (via `Math.max(...all, 1)`), and there is no handling of negative values (grep found no Ma…

#### M14 · `src/mcp/tools/consumer-tools.ts:33-58` — mcp (security/command-injection, conf: medium)
- **Claim:** dispatchHandler passes the raw MCP-caller-supplied `args` into executeShellExec (line 46), which renders them into the command string via renderTemplate (shell-exec.ts:22) and runs `bash -c <command>` (shell-exec.ts:26). renderTemplate performs plain string substitution with no shell escaping (template.ts:9-17). A manifest declaring e.g. `command: 'git log {{ref}}'` lets a caller pass `ref: '; rm -rf ~ #'` which is injected verbatim into the bash invocation.
- **Impact:** Arbitrary shell command execution on the host through any consumer tool whose shell-exec command interpolates caller-controlled args. This MCP dispatch (consumer-tools.ts) is the surface that newly exposes shell-exec to untrusted tool callers. Even though manifest authors opt in, the substitution is unsafe by construction and a single templated arg is a full RCE.
- **Recommendation:** Do not substitute caller args into a `bash -c` string. Pass templated args as separate argv to execFile, or shell-quote interpolated values, or restrict shell-exec template variables to a vetted allowlist with strict escaping. At minimum, document and validate that shell-exec commands must not interpolate caller args, and add a sanitization layer in the dispatch path.
- **Verify (skeptic, refute-by-default):** Code mechanism confirmed exactly as described. consumer-tools.ts:46 (dispatchHandler) passes raw caller args into executeShellExec; shell-exec.ts:22 renders decl.command via renderTemplate(decl.command, args); template.ts:11-16 substitutes string values verbatim with zero shell escaping; shell-exec.ts:26 runs execFile('bash', ['-c', command]). manifest-schema.ts:128-132 imposes no allowlist/escaping on command. So a manifest `command: 'git log {{ref}}'` with caller `ref: '; rm -rf ~ #'` does inject verbatim into bash. All files are newly added on this branch (170 insertions, absent on main) —…

#### M15 · `src/schemas/validators/normalize.ts:157-171` — schemas (data-integrity, conf: high)
- **Claim:** TASK_STATUS_COERCE maps `cancelled` -> `done` and `skipped` -> `done` (and `deferred` -> `blocked`). normalizeTask applies this before validation. Confirmed at runtime: a task with status 'cancelled' is returned with status 'done'. The canonical taskStatusSchema is ['pending','active','done','blocked'], where 'done' means completed successfully.
- **Impact:** Abandoned/cancelled work is reported to AI tools and the dashboard as successfully completed. This corrupts downstream logic: src/mcp/tools/mutate.ts:76 computes phase completion as `tasks.filter(t => t.status !== 'done')`, so cancelled tasks count as complete and can falsely trigger phaseCompleteHint; src/server/projections/health.ts treats them as not-pending. The runtime is supposed to faithfully project canonical files, not reclassify cancelled work as done.
- **Recommendation:** Map abandonment statuses to 'blocked' (or a status that does not imply success) rather than 'done', or leave them to fail validation with a clear invalid_input error so the file is fixed at source. Reclassifying cancelled/skipped as completed silently rewrites the meaning of the data the dashboard presents.
- **Verify (skeptic, refute-by-default):** The cited code is accurate. normalize.ts:157-161 defines TASK_STATUS_COERCE mapping `deferred->blocked`, `skipped->done`, `cancelled->done`, and normalizeTask (lines 163-171, specifically 168-170) applies it before zod validation. The canonical taskStatusSchema (src/schemas/validators/project-status.ts:8) is z.enum(['pending','active','done','blocked']) with no abandonment status, so a `cancelled` task is indeed validated and returned as `done`. The mutate.ts:76 impact is correct: `initiative.tasks.filter((t) => t.status !== 'done' && t.id !== input.taskId)` computes `remaining`, and `remainin…

#### M16 · `src/schemas/validators/normalize.ts:95-101` — schemas (data-integrity, conf: high)
- **Claim:** renameKeys rewrites keys via map[k] without guarding against collision with an already-present canonical key. Because it iterates Object.entries in insertion order, when a legacy file contains BOTH the legacy and canonical key (e.g. `slug` and `initiative_id`, or `lastUpdated` and `last_updated`), the result is order-dependent. Verified: renameKeys({slug:'real', initiative_id:'legacy'}) yields {slug:'legacy'} — the legacy value overwrites the canonical slug.
- **Impact:** A transitional or hand-edited initiative file containing both old and new key spellings can have its canonical field (slug, lastUpdated, nextAction, etc.) silently overwritten by the stale legacy value, which then drives file lookups and projections. Edge case (requires duplicate keys) but produces silent wrong data rather than an error.
- **Recommendation:** In renameKeys, only apply the rename when the target key is not already present (e.g. `const target = map[k] ?? k; if (target !== k && target in out) continue` or prefer the canonical key). Alternatively, detect collisions and emit an invalid_input error so duplicates are surfaced rather than silently resolved by ordering.
- **Verify (skeptic, refute-by-default):** CONFIRMED REAL. Code matches the citation exactly: src/schemas/validators/normalize.ts:95-101 implements renameKeys as `out[map[k] ?? k] = v` over Object.entries with no collision guard.

I reproduced the exact claimed behavior empirically (ran a script against the repo's yaml dep): renameKeys({slug:'real', initiative_id:'legacy'}, {initiative_id:'slug'}) yields {slug:'legacy'} — the legacy value overwrites the canonical slug, order-dependent. The claim's specific example is accurate.

The premise (both legacy and canonical keys coexisting) is valid: parseYaml on a frontmatter block with disti…

#### M17 · `src/schemas/validators/normalize.ts:45-55` — schemas (missing-tests, conf: high)
- **Claim:** normalize.ts is now invoked on EVERY plan and initiative parse (validators/index.ts:132,135), but the only tests (tests/unit/schemas/validators.test.ts:724-781) cover gate-status coercion and the initiative_id->slug rename. The higher-risk coercions are untested: TASK_STATUS_COERCE (cancelled/skipped->done), STACK_TYPE_COERCE (initiative/bug/feature->task, review->validation, etc.), coerceTimestamp epoch fallback (null/missing date -> 1970-01-01 which marks active initiatives maximally stale in health.ts), normalizeRef string/em-dash parsing, and the tasks-as-map -> array conversion.
- **Impact:** Behavioral changes to these lossy coercions (which silently rewrite canonical semantics seen by AI and the dashboard) would not be caught by the suite. Given finding #2 shows these coercions have real semantic consequences, the absence of regression tests is a real gap.
- **Recommendation:** Add unit tests in tests/unit/schemas/ exercising each coercion table and the timestamp/ref/tasks-map paths, asserting both the coerced output and that the result still validates. This locks down the contract and would have surfaced the cancelled->done and missing-schemaVersion behaviors for explicit review.
- **Verify (skeptic, refute-by-default):** Verified all concrete claims against the code:

1. normalize.ts is NEW on this branch (commit 88cf3db, not present on main) and is invoked on every plan/initiative parse via parsePlan/parseInitiative (src/schemas/validators/index.ts:132,135). Confirmed.

2. The ONLY normalization tests (tests/unit/schemas/validators.test.ts:724-781) are two describe blocks with three it cases: "passed"->"met" gate coercion (plan + initiative, lines 727/745) and initiative_id->slug rename with array defaults (line 759). Confirmed exactly as the finding states.

3. The cited higher-risk coercions are genuinely u…

#### M18 · `src/server/handlers/composite.ts:15-37` — server-handlers (data-integrity, conf: medium)
- **Claim:** executeComposite runs steps sequentially and returns on the first failure, but performs no rollback or compensation for already-committed steps. If step 0 is a file-mutation/script that appends a JSONL record (committed to disk via appendJsonlLine) and step 1 (e.g. shell-exec) fails, step 0's write is permanently persisted while the composite reports failure with only 'Composite step 1 failed'. There is no transaction, no atomic temp-then-rename across steps, and stepsCompleted is only returned on full success so callers cannot tell how far it got on failure.
- **Impact:** Partial application of a composite intent: a state-mutating record (e.g. push_frame / status_update / add_task) can be written while the overall operation is reported as failed, leaving canonical files in an inconsistent half-applied state. Callers retrying the tool may double-append.
- **Recommendation:** Document and enforce that composite steps must be append-only and idempotent, OR return partial progress (stepsCompleted) inside the error details so callers can reconcile. For non-idempotent sequences, stage writes and commit only after all steps validate, or order side-effecting steps last.
- **Verify (skeptic, refute-by-default):** REAL but severity overstated. Verified against the code and an existing test.

Code (src/server/handlers/composite.ts:15-37): executeComposite iterates steps; on the first non-ok result it returns err({...result.error, message: `Composite step ${i} failed: ...`}) (lines 29-34) with no rollback/compensation and no stepsCompleted in the error payload. stepsCompleted is only returned on the full-success path (line 37). The claim's "Composite step 1 failed" wording is accurate (it uses the real index `i`).

Premise confirmed: file-mutation steps commit to disk before later steps run. executeFileMu…

#### M19 · `src/server/handlers/script.ts:85` — server-handlers (correctness, conf: medium)
- **Claim:** Handler modules are loaded via await import(moduleUrl) using a plain pathToFileURL of a static path. ESM dynamic import is cached by the Node module loader for the process lifetime. The aideck serve / watcher is a long-running process; if a consumer edits handlers/<name>.js on disk, the watcher and any subsequent tool invocation will keep executing the originally-imported version. There is no cache-busting query (e.g. ?v=mtime) and no documented restart requirement.
- **Impact:** In the long-running server, consumer handler-script edits silently have no effect until the process restarts — surprising, hard-to-diagnose stale behavior. Contradicts the files-are-canonical / live-reload posture for everything else aiDeck watches.
- **Recommendation:** Either append a cache-busting query based on the file's mtime to moduleUrl before import (accepting the small per-version module-cache growth), or explicitly document that handler scripts require a server restart to reload. If cache-busting, bound growth by keying on mtime.
- **Verify (skeptic, refute-by-default):** Confirmed against the code. src/server/handlers/script.ts:79 builds moduleUrl = pathToFileURL(modulePath).href (a static path, no query), and line 85 does `mod = await import(moduleUrl)`. Node's ESM loader caches modules by resolved URL for the process lifetime, so a second invocation after an on-disk handler edit re-executes the originally-imported version. executeScript is called per-tool-invocation from the long-running server: consumer-tools.ts:50 (dispatchHandler -> registered MCP tool handler), so this is hot-path in a persistent process. I grepped src for cache-busting patterns (mtime/?…

#### M20 · `src/server/handlers/template.ts:11-16` — server-handlers (correctness, conf: medium)
- **Claim:** renderTemplate replaces {{ name }} when name in resolved. When an arg key exists but its value is undefined, the branch returns JSON.stringify(undefined) which is the JS value undefined (not a string); String.prototype.replace coerces that to the literal text 'undefined'. So passing { date: undefined } for target 'data/{{ date }}.jsonl' yields 'data/undefined.jsonl' rather than leaving the placeholder or erroring. Object/array arg values are JSON.stringified and spliced verbatim, injecting characters like {}":, into the rendered command/path.
- **Impact:** Silent generation of paths/commands containing the string 'undefined' or raw JSON, producing wrong file targets or malformed shell commands instead of a clear error. Minor because it requires the manifest to template a var the caller leaves undefined or passes a non-scalar for.
- **Recommendation:** Distinguish undefined (skip / leave placeholder or error) from defined values, and reject/encode non-string scalar coercion explicitly (numbers/booleans -> String, objects -> error or controlled encoding) so templated paths/commands are predictable.
- **Verify (skeptic, refute-by-default):** Cited lines 11-16 of src/server/handlers/template.ts are accurate and current (file is new on this branch per `git diff main..HEAD`). renderTemplate returns JSON.stringify(value) for any non-string value when the key is present. Runtime reproduction confirms every claimed coercion: object -> `{"a":1}`, array -> `[1,2]`, number -> `42`, null -> `null`. The input boundary does NOT narrow types: jsonSchemaToZod (src/mcp/tools/consumer-tools.ts:13-22) maps every property to z.unknown()/z.unknown().optional() with .passthrough(), and the manifest schema uses `properties: z.record(z.record(z.unknown…

#### M21 · `src/server/writers/paths.ts:122-124` — server-handlers (correctness, conf: low)
- **Claim:** The new discover-run.json classification matches only when entityDir === 'discover-run.json'. In the explicit layout (<consumer>/discover-run.json) head=<consumer>, parts[1]='discover-run.json' -> matches, which is the only path buildDiscoverState/hasDiscoverRun produce (consumerRoot(rootDir, consumerId)). But in the flat/DEFAULT_CONSUMER layout, a file at .atomic-skills/discover-run.json has head='discover-run.json' (not in ENTITY_DIRS), so consumer becomes 'discover-run.json', entityDir is undefined, and it falls through to kind:'other'. The watcher (watcher.ts:186) therefore emits no discover-run state-change for a flat-root discover-run.json.
- **Impact:** Low in practice: hasDiscoverRun/buildDiscoverState always use the explicit per-consumer path (even the default consumer uses .atomic-skills/project-status/discover-run.json), so the flat-root case does not currently arise. Only manifests/tooling that drop a discover-run.json directly at the atomic-skills root would be misclassified (consumer id 'discover-run.json', no live event).
- **Recommendation:** If flat-root discover-run.json is unsupported by design, no change needed; otherwise add a flat-layout branch (treat head==='discover-run.json' under DEFAULT_CONSUMER). At minimum confirm the explicit-layout-only assumption in a test.
- **Verify (skeptic, refute-by-default):** Verified against the actual code. The cited code at src/server/writers/paths.ts:122-124 exists verbatim (confirmed by git diff main..HEAD, added on this branch) and matches `discover-run` only when `entityDir === 'discover-run.json'`.

Classification trace confirms both layout claims:
- Explicit layout `<consumer>/discover-run.json`: head=`<consumer>` is not in ENTITY_DIRS (paths.ts:52-58), so consumer=head, entityDir=parts[1]='discover-run.json' → matches (line 122). Correct.
- Flat-root `.atomic-skills/discover-run.json`: parts=['discover-run.json'], head='discover-run.json' not in ENTITY_DI…

#### M22 · `src/server/consumer-watcher.ts:44` — server-infra (correctness, conf: high)
- **Claim:** classifyPath() derives the consumer identifier from the directory name (`parts[0]`, line 44) and emits it as `data_changed.consumer` (lines 141-148, 171-178). But the ConsumerRegistry keys consumers by the manifest's declared `id` (consumer-registry.ts:58 `registered.set(result.value.id, ...)`), and api-v2 looks consumers up by that id (routes/api-v2.ts:64 `deps.consumers.get(id)`). The manifest `id` is a free-form string (manifest-schema.ts:184 `z.string().min(1).max(64)`) with no constraint tying it to the directory name. When `manifest.id !== <dirname>`, the directory name in the event matches no registered consumer.
- **Impact:** A consumer whose manifest id differs from its directory name emits data_changed/consumer_manifest_changed events carrying a `consumer` value that, when the client uses it to refetch /api/consumers/<consumer>/data/..., returns 404. Live updates silently break for that consumer; nothing surfaces the mismatch.
- **Recommendation:** Either (a) enforce dirname === manifest.id at load time (record a ConsumerLoadError and skip otherwise), or (b) have the watcher resolve the directory name to the registered manifest id before emitting (share the registry), or (c) make the registry key by directory name. Add a test with id != dirname.
- **Verify (skeptic, refute-by-default):** Verified all cited lines and traced the full event chain. The core defect is REAL.

Confirmed premises:
- consumer-watcher.ts:44 `classifyPath` derives `consumer` from `parts[0]` = the directory name (relative(consumersDir, filePath).split(sep)[0]), emitted as `data_changed.consumer` (lines 141-148, 171-178) and `consumer_manifest_changed.consumer` (lines 154-158).
- consumer-registry.ts:58 keys the registry by `result.value.id` (the manifest id), and get(id) (line 70) / list() resolve by that id.
- routes/api-v2.ts:64,75,106,152 look consumers up by the manifest id (route param).
- manifest-s…

#### M23 · `src/server/watcher.ts:196-206` — server-infra (error handling, conf: high)
- **Claim:** For discover-run add/change, dispatch() calls parseDiscoverRunFile(path) and emits a state-change with `slug: res.ok ? res.value.runId : ''`, but discards res.error entirely — there is no `else` branch emitting a `kind: 'error'` event. parseDiscoverRunFile returns rich ErrorResponse on JSON syntax errors / schema mismatch (parsers/discover-run.ts:23-32). This contrasts with plan/initiative handling (handleMdAdd, lines 71-81), which emits an error event on parse failure.
- **Impact:** A malformed or schema-mismatched discover-run.json produces only a state-change with an empty slug and no diagnostic on the SSE stream. The dashboard cannot tell a valid discover run from a broken one; parse errors are silently swallowed, unlike every other watched entity.
- **Recommendation:** On `!res.ok`, emit a `kind: 'error'` event (consumer, path, code, message, suggestion, ...projectTag) mirroring handleMdAdd, instead of emitting an empty-slug state-change.
- **Verify (skeptic, refute-by-default):** Confirmed against the code. watcher.ts:196-206 (dispatch, discover-run add/change branch): it calls `const res = await parseDiscoverRunFile(path)` then unconditionally emits a single `state-change` event with `slug: res.ok ? res.value.runId : ''`, with no `else` branch and `res.error` discarded entirely. The parser at src/server/parsers/discover-run.ts (finding cited src/parsers/discover-run.ts — wrong path but the file/content exists) returns rich ErrorResponse on JSON syntax errors (lines 23-29) and on schema validation via parseDiscoverRun (line 31). The contrast with handleMdAdd (watcher.t…

#### M24 · `src/server/lockfile.ts:53-71` — server-infra (race condition, conf: medium)
- **Claim:** acquireLock() performs a non-atomic check-then-write: it reads/validates the existing lock (lines 53-64) then later writes with fs.writeFile (line 71), which truncates/creates without O_EXCL. Two near-simultaneous `aideck serve` invocations can both observe no-live-lock and both write, the second clobbering the first. (Note env-file.ts deliberately uses O_CREAT|O_EXCL for exactly this reason; lockfile.ts does not.)
- **Impact:** Two server processes can both believe they hold the instance lock and both bind/run, defeating the single-instance guarantee. Window is small and requires concurrent starts, so impact is limited.
- **Recommendation:** Acquire the lock atomically: open with O_CREAT|O_WRONLY|O_EXCL; on EEXIST, read the existing lock, and only if stale unlink+retry the exclusive create. Mirror the env-file.ts pattern.
- **Verify (skeptic, refute-by-default):** Verified against src/server/lockfile.ts:43-72. acquireLock reads/validates the existing lock at lines 53-64 (fs.readFile + JSON.parse + isPidAlive), then after multiple await points writes the new lock at line 71 via fs.writeFile, which opens with O_CREAT|O_WRONLY|O_TRUNC semantics — no O_EXCL. This is a genuine non-atomic check-then-write: two concurrent acquireLock calls can both observe no live lock (either file missing or stale PID via the catch at line 61-64) and both reach line 71, the second clobbering the first lockfile. The contrast cited in the finding is accurate: src/server/env-fil…

#### M25 · `src/server/index.ts:128-135` — server-infra (error handling, conf: medium)
- **Claim:** startServer() awaits built.consumerWatcher.start() (line 129) which spins up a chokidar FSWatcher, and only afterwards calls acquireLock({ port }) (line 135). If acquireLock throws (InstanceAlreadyRunningError or an mkdir/IO failure), startServer rejects without ever calling consumerWatcher.stop(); the returned object (whose stop() would close the watcher) is never produced. In the CLI the process exits with code 1 so the OS reaps it, but any in-process caller that catches the error and keeps running (tests, embedding hosts, the demo error path where `running` stays null) leaks an active watcher with open file handles and timers.
- **Impact:** Resource/handle leak on a failed start for non-exiting callers; can cause stuck file watches and flaky tests. Masked in the normal CLI path by process.exit.
- **Recommendation:** Wrap the post-start steps in try/catch: on failure, await consumerWatcher.stop() before rethrowing. Alternatively acquire the lock before starting the watcher.
- **Verify (skeptic, refute-by-default):** Verified against src/server/index.ts:122-155. startServer() calls `await built.consumerWatcher.start()` at lines 128-130 (which opens a chokidar FSWatcher per consumer-watcher.ts:212 `chokidar.watch(...)`), then calls `await acquireLock({ port })` at line 135. acquireLock can throw: InstanceAlreadyRunningError (lockfile.ts:58 when a live PID holds the lock) or an mkdir/writeFile IO error (lockfile.ts:50,71). On any such throw, startServer rejects before constructing/returning the RunningServer object. The only code path that ever calls consumerWatcher.stop() is the returned object's stop() at…

#### M26 · `src/server/env-file.ts:56` — server-infra (security, conf: medium)
- **Claim:** writeEnvFile() interpolates content.pid directly and unquoted into a shell-sourced file: `export AIDECK_PID=${content.pid}`. Unlike port, which is validated (`Number.isInteger`/range, lines 41-43) and url, which is shell-single-quoted (shellSingleQuote), pid receives no validation and no quoting. The env file is documented to be `. ~/.aideck/env` / `eval "$(aideck env)"` sourced (docs/integration-spec.md:119, docs/implementation/09-cli-demo.md). Today the only caller passes process.pid (always an integer), so it is currently safe, but the type is `pid?: number` with no runtime guard. Separately, docs/decisions.md:102 records an explicit decision that the env file has 'NO pid' — this change contradicts a recorded decision without updating it first (per CLAUDE.md docs-first rule).
- **Impact:** Latent shell-injection vector if any future caller passes a non-integer pid; immediate concern is the silent divergence from the recorded architecture decision (env file should carry no pid).
- **Recommendation:** Validate pid with Number.isInteger and a positive-range check (throw on invalid), symmetric with the port check; and update docs/decisions.md to record that the env file now carries AIDECK_PID and why (needed by `aideck down` for reliable PID-based shutdown).
- **Verify (skeptic, refute-by-default):** Verified against the actual code and docs. (1) src/server/env-file.ts:56 reads `const pidLine = content.pid ? \`export AIDECK_PID=${content.pid}\n\` : ''` — pid is interpolated directly and unquoted, confirmed identical in the main..HEAD diff (this line is added by the change). (2) Asymmetry is real: port is validated at lines 41-43 (`Number.isInteger(content.port) || content.port < 1 || content.port > 65535`) and url is shell-single-quoted via shellSingleQuote (lines 34-36, used at line 58); pid (type `pid?: number`, line 25) gets neither validation nor quoting. (3) The env file is shell-sour…

#### M27 · `src/server/routes/api.ts:131-134` — server-routes-manifest (security, conf: medium)
- **Claim:** New unauthenticated endpoint POST /api/shutdown kills the server process (process.kill(process.pid,'SIGTERM')). There is no Host-header check, no CSRF token, and the CORS policy allows any localhost http/https origin (cors.ts isAllowedOrigin). A simple form/fetch POST with no custom headers from a malicious web page the user visits, or any other local process, terminates aiDeck. Because the request needs no preflight (no custom headers required), CORS does not actually prevent the cross-site POST from being sent and processed.
- **Impact:** Denial of service: any web page the user opens, or any local process, can shut down the running aiDeck server. Repeated DOS prevents the dashboard from staying up.
- **Recommendation:** Gate /api/shutdown behind a same-origin/local-only confirmation (require a custom header that triggers CORS preflight, e.g. X-Aideck-Shutdown, or a per-instance token written to the lockfile), or remove the HTTP shutdown endpoint and rely on signals/CLI only.
- **Verify (skeptic, refute-by-default):** Confirmed the endpoint exists exactly as cited: src/server/routes/api.ts:131-134 registers `app.post('/api/shutdown', ...)` which calls `process.kill(process.pid, 'SIGTERM')` inside a setTimeout, with no auth token, no Host-header check, no CSRF protection. The diff (main..HEAD) shows this is newly added on this branch.

The CORS analysis in src/server/cors.ts is real but the finding's framing is partially imprecise. The middleware (mounted app-wide at index.ts:79 `app.use('*', corsMiddleware())`) does check `if (origin && !isAllowedOrigin(origin))` and returns 403 BEFORE calling next() for no…

#### M28 · `src/server/routes/api-v2.ts:129-134` — server-routes-manifest (correctness, conf: high)
- **Claim:** The entity lookup in GET /api/consumers/:id/data/:dataSourceId/:slug matches with `typeof r['_file']==='string' && r['_file'].startsWith(slug)` and returns records.find(...) — the FIRST prefix match. For slug 'a', a record with _file 'alpha.md' matches, but so would 'abc.md'; whichever appears first in the array is returned. There is no exact-match preference and no disambiguation.
- **Impact:** GET of an entity by slug can return the wrong record when one filename is a prefix of another (e.g. slug 'plan' matching 'plan-archive.md'), silently serving incorrect data to the dashboard/AI.
- **Recommendation:** Prefer exact matches: try `r['_file'] === slug` / `r['_file'] === slug+'.md'` and `r['slug']===slug` / `r['id']===slug` first; only fall back to startsWith if no exact match, or drop the startsWith branch entirely.
- **Verify (skeptic, refute-by-default):** Confirmed real by reading the cited code. src/server/routes/api-v2.ts:129-134 matches the finding verbatim: records.find((r) => r['slug']===slug || r['id']===slug || (typeof r['_file']==='string' && r['_file'].startsWith(slug))). .find() returns the first array element satisfying any branch, with no exact-match preference on the _file branch.

The premise is substantiated: src/server/data-source-reader.ts:80 sets _file to basename(filePath), i.e. the full filename including extension (e.g. 'plan.md', 'plan-archive.md'). A URL slug like 'plan' will satisfy startsWith for both 'plan.md' and 'pla…

#### M29 · `src/server/routes/sse.ts:14-25` — server-routes-manifest (correctness, conf: medium)
- **Claim:** matchesProjectFilter: when no `project` query param is given (projectFilter null) and a default project IS registered, an event whose payload has no projectId is allowed through (line 19-20 returns true on undefined eventProjectId), but an event WITH a projectId different from the default is filtered out. Conversely when projectFilter is set (line 23-24), events lacking a projectId are dropped. The asymmetry means a client passing ?project=X never receives global/unscoped runtime events (only health-tick is whitelisted), and a default-mode client receives unscoped events plus default-project events but not others.
- **Impact:** SSE clients that filter by project miss any event the watcher emits without a projectId field, so the dashboard can fail to refresh on file changes that aren't tagged with a projectId. Edge case dependent on watcher tagging events with projectId.
- **Recommendation:** Decide and document whether untagged events are global (always delivered) or project-scoped, and apply the same rule in both branches. Add SSE tests covering: project-filtered client + untagged event, and default-project client + foreign-project event.
- **Verify (skeptic, refute-by-default):** Confirmed REAL by reading the code. matchesProjectFilter in src/server/routes/sse.ts:14-25 has the exact asymmetry described:

- `!projectFilter` branch (lines 16-21): when a default project IS registered, an untagged event (no projectId) returns true (line 20), but a foreign-project event returns eventProjectId===defaultId → false (line 21).
- `projectFilter` set branch (lines 23-24): an untagged event evaluates `undefined === "X"` → false, so it is dropped, while only exact-match events pass.

So a `?project=X` client never receives untagged events, whereas a default-mode client does — the c…

#### M30 · `tests/unit/server/manifest-schema.test.ts:58-85` — tests (security/coverage-gap, conf: medium)
- **Claim:** parseManifest tests validate dataSource format/id but never assert rejection of traversal or absolute paths in dataSources[].path or handler source. Production manifest-schema.ts declares `path: z.string().min(1)` (no containment), and readDataSource (data-source-reader.ts:18,29) and executeScript (script.ts:78) join these straight onto consumerDir. A manifest path of '../../../../etc/passwd' is accepted and its content is then served over REST (/api/consumers/:id/data/:dsId) and MCP (aideck_list).
- **Impact:** A consumer manifest can read files outside its directory and expose them through the read API/MCP surface; a handler `source` of '../../x.js' can import code outside the consumer dir. Lower than the write findings since manifests are consumer-authored, but still an untested containment hole on the read/exec side.
- **Recommendation:** Add manifest-schema tests asserting dataSources[].path and handler source reject '..' segments and absolute paths; add a readDataSource test for a traversal path. Drive a fix that validates these paths stay within the consumer dir.
- **Verify (skeptic, refute-by-default):** Verified REAL. The cited test region manifest-schema.test.ts:58-85 tests dataSource formats ('accepts dataSources with all four formats', 'rejects unknown format') but has zero assertions rejecting '..' or absolute paths in dataSources[].path. No such test exists anywhere in the file.

Production code confirms the containment hole on the read/exec side:
- manifest-schema.ts:13 declares `path: z.string().min(1)` and :136 declares script handler `source: z.string().min(1)` — neither has a .refine() containment check (verified, no normalize/relative/startsWith in either schema field).
- data-sour…

#### M31 · `tests/unit/client/useBreakpoint.test.ts:56-74` — tests (anti-tautology, conf: medium)
- **Claim:** The 'detects lg breakpoint' assertion (expect bp.value==='lg') cannot distinguish a correctly-detected lg from the default fall-through, because the no-match default is ALSO 'lg' (line 36-40). The composable could entirely ignore the matched lg media query and this test would still pass. Additionally, the captured `listeners` map is never invoked, so no test exercises the reactive update path on a media-query change event (the onMounted/onUnmounted Vue warnings confirm the lifecycle wiring is not active under test) — only the initial synchronous read is covered.
- **Impact:** A regression where useBreakpoint stops honoring the lg query, or stops reacting to viewport changes after mount, would not be caught. Limited blast radius (responsive UI only).
- **Recommendation:** Change the default to a non-lg value or add a distinguishing assertion for the lg case; add a test that fires a stored listener with a changed match state and asserts bp.value updates reactively.
- **Verify (skeptic, refute-by-default):** Both parts of the finding are substantiated by the code I read.

Part 1 (lg tautology): In src/client/composables/useBreakpoint.ts, detectBreakpoint() returns 'lg' as the no-match fall-through (line 17 for missing matchMedia, line 21 after the QUERIES loop finds nothing). The "detects lg breakpoint" test (tests/unit/client/useBreakpoint.test.ts:56-61) sets only the lg media query to true and asserts bp.value === 'lg'. Because the default is also 'lg', removing or breaking the 'lg' entry in QUERIES (useBreakpoint.ts:7) would make the loop find no match and fall through to `return 'lg'`, so the…


### NIT (1)

#### N1 · `src/server/routes/api.ts:364-371` — server-routes-manifest (security, conf: medium)
- **Claim:** DELETE /api/projects/:id is registered, but corsMiddleware advertises Access-Control-Allow-Methods: 'GET, POST, OPTIONS' (cors.ts line 53) — DELETE is omitted. Same-origin and no-CORS callers can still issue DELETE (it is not blocked server-side), so this is not a security control; it is a contract inconsistency that will cause cross-origin browser DELETE preflights to fail while the server still honors any DELETE that bypasses CORS.
- **Impact:** Cross-origin dashboard code attempting project unregister gets a CORS error despite the route existing; meanwhile the route remains reachable to local/same-origin callers, so the missing method does not actually restrict it. Confusing and inconsistent.
- **Recommendation:** Add DELETE to Access-Control-Allow-Methods (and PUT if used) to match the routes actually exposed, or intentionally document that mutating project endpoints are local-CLI-only.
- **Verify (skeptic, refute-by-default):** Factual core confirmed by reading source. DELETE /api/projects/:id is registered at src/server/routes/api.ts:364-371 (only DELETE route; grep shows 1 delete, 17 get, 8 post, 0 put/patch). Access-Control-Allow-Methods is hardcoded to 'GET, POST, OPTIONS' at src/server/cors.ts:54 (finding says "cors.ts line 53" — off by one and slightly imprecise path label, but substantively correct), so DELETE is indeed omitted. The finding's own premise that this is "not a security control" is correct: corsMiddleware (cors.ts:15-50) only blocks by Origin (localhost/127.0.0.1 allow-list, cors.ts:3-13) and othe…


## Part 2 — Codex cross-model (`gpt-5-codex`, blind + informed)

Scope: src/server + src/mcp + src/schemas only (frontend/docs/tests out of scope). Pass 2 re-evaluated against the project's Iron Laws as external constraints.

### Pass 1 (blind)

---
verdict: reject
counts: {blocker: 0, critical: 3, major: 2, minor: 0, nit: 0}
reviewer: gpt-5-codex
pass: blind
schema_version: "1.0"
---

## Summary
The changes introduce new read/write and execution surfaces without consistently enforcing the stated consumer-directory and declared-writable boundaries. Several APIs accept manifest or request-controlled paths, join them to a base directory, and then read or append without resolving and rejecting traversal.

There is also a compatibility regression from mounting v2 handlers on existing v0.1 paths, plus schema normalization that silently fabricates required version/timestamp fields. The lockfile does not actually serialize concurrent startups.

## Findings

### F-001 [critical] security — src/server/data-source-reader.ts:15-18

**Evidence:**
```ts
async function expandGlob(consumerDir: string, pattern: string): Promise<string[]> {
  const starIdx = pattern.indexOf('*')
  if (starIdx === -1) {
    return [join(consumerDir, pattern)]
```

```ts
  const absDir = join(consumerDir, dirPart)
```

**Claim:** A manifest data source with a path such as `../../some-project/package.json` or `../../notes/*.md` is accepted and read outside the consumer directory.

**Impact:** Files outside `~/.aideck/consumers/<id>` can be exposed through `/api/consumers/:id/data/:dataSourceId` and the MCP read/list tools when they are parseable as the declared format, violating the consumer-directory read boundary.

**Recommendation:** Resolve every data source path against `consumerDir`, reject paths whose normalized relative path escapes the consumer directory, and apply the same check to glob directory expansion before reading.

**Confidence:** high

---

### F-002 [critical] security — src/mcp/tools/generic.ts:144-162

**Evidence:**
```ts
      if (!input.target.startsWith('data/')) {
        return err({
          code: 'invalid_input',
          message: `target must start with "data/" (got "${input.target}")`,
          suggestion: 'Only paths under data/ are writable via aideck_write'
        })
      }

      const consumer = consumers.get(input.consumer)
```

```ts
      const absolutePath = join(consumer.dir, input.target)
      await appendJsonlLine(absolutePath, input.record)
```

**Claim:** `aideck_write` accepts `target: "data/../../outside.jsonl"` because it only checks the string prefix before joining the path.

**Impact:** MCP callers can append JSONL outside the consumer directory. The same prefix-before-join pattern exists in the HTTP write route, so this can corrupt or create files outside declared writable paths.

**Recommendation:** Resolve the target path, verify it remains under `consumer.dir`, and verify it is inside an explicitly declared writable path before calling `appendJsonlLine`.

**Confidence:** high

---

### F-003 [critical] compatibility — src/server/index.ts:81-97

**Evidence:**
```ts
  app.route('/', createApiV2Router({
    consumers,
    version: opts.version ?? '0.0.1',
    startedAt,
    demo: opts.demo ?? false,
  }))

  // v0.1 API router (legacy routes: /api/state/*, /api/annotate, /api/inbox, etc.)
  app.route('/', createApiRouter({
```

**Claim:** Existing `/api/health` and `/api/consumers` requests are now handled by the v2 router, not the legacy router.

**Impact:** Existing clients that rely on rootDir-backed `.atomic-skills` consumers can see an empty or different consumer list from `~/.aideck/consumers`, and `/api/health` loses legacy fields such as `modes`, `rootDir`, and `projects`. This is a normal-use API regression.

**Recommendation:** Put v2 endpoints under a distinct namespace such as `/api/v2/*`, or preserve the legacy handlers for existing paths and add compatibility fields if shared paths must remain.

**Confidence:** high

---

### F-004 [major] schema-validation — src/schemas/validators/normalize.ts:234-246

**Evidence:**
```ts
  if (!obj.schemaVersion && (obj.slug || obj.title)) {
    obj.schemaVersion = '0.1'
  }

  // Legacy files often lack required scalar fields
  if (obj.title === undefined) obj.title = obj.slug ?? ''
  if (obj.goal === undefined) obj.goal = obj.title ?? ''
  if (obj.nextAction === undefined) obj.nextAction = null
  if (obj.branch === undefined) obj.branch = null

  // Coerce date-only and null timestamps
  obj.started = coerceTimestamp(obj.started)
  obj.lastUpdated = coerceTimestamp(obj.lastUpdated)
```

**Claim:** Initiative parsing silently turns missing `schemaVersion`, `started`, and `lastUpdated` into valid current-schema values.

**Impact:** Corrupt or pre-schema files are projected as valid current entities with fabricated epoch timestamps, hiding migration failures and breaking consumers that depend on schema-version refusal to detect incompatible data.

**Recommendation:** Reject missing or mismatched `schemaVersion` in `parseInitiative`; perform legacy migration in an explicit migration command or separate parser path that reports the migration.

**Confidence:** high

---

### F-005 [major] race-condition — src/server/lockfile.ts:52-71

**Evidence:**
```ts
  try {
    const raw = await fs.readFile(path, 'utf8')
    const existing: LockfileContent = JSON.parse(raw)

    if (isPidAlive(existing.pid)) {
      throw new InstanceAlreadyRunningError(existing)
    }
```

```ts
  await fs.writeFile(path, JSON.stringify(content, null, 2) + '\n', 'utf8')
```

**Claim:** `acquireLock` is a check-then-write sequence, so two processes starting concurrently can both observe no live lock and both write the lockfile.

**Impact:** The singleton instance guarantee can fail, especially when the processes use different ports. One process can overwrite the other process’s lock, and later `releaseLock` can remove a lock it no longer owns.

**Recommendation:** Acquire the lock atomically with exclusive create/open (`O_CREAT | O_EXCL`) or an atomic lock directory, include owner verification before release, and acquire it before starting watchers.

**Confidence:** high

## Questions (non-findings)

- src/server/handlers/shell-exec.ts:21 — Are manifest-declared `shell-exec` handlers intended to be unrestricted arbitrary shell execution, or should they be gated behind an allowlist/explicit opt-in?

## Out of scope

- Frontend Vue/CSS/client composables.
- Documentation and markdown changes.
- Test-file quality beyond identifying missing coverage for reviewed behavior.

### Pass 2 (informed — final)

---
verdict: reject
counts: {blocker: 0, critical: 5, major: 2, minor: 0, nit: 0}
reviewer: gpt-5-codex
pass: informed
schema_version: "1.0"
---

## Summary
The informed constraints strengthen the main blind-pass concerns: new v2 read/write/handler surfaces violate the mandated consumer read boundary and declared-writable write boundary. Several paths are joined after weak string checks or no checks, and script/shell handlers provide unsandboxed execution despite the absence of local authentication.

There is also a documented API regression on shared v0.1 routes and a schema-version enforcement regression caused by pre-validation normalization fabricating current-schema fields. The lockfile remains a real race but is lower priority than the boundary violations.

## Findings

### F-001 [critical] security — src/server/data-source-reader.ts:15

**Evidence:**
```ts
async function expandGlob(consumerDir: string, pattern: string): Promise<string[]> {
  const starIdx = pattern.indexOf('*')
  if (starIdx === -1) {
    return [join(consumerDir, pattern)]
```

```ts
  const absDir = join(consumerDir, dirPart)
```

**Claim:** A manifest data source with `path: ../../some-project/package.json` or `path: ../../notes/*.md` is accepted and read outside the consumer directory.

**Impact:** Files outside `~/.aideck/consumers/<id>` can be exposed through `/api/consumers/:id/data/:dataSourceId` and MCP read/list tools when parseable as the declared format, violating the consumer-directory read boundary.

**Recommendation:** Resolve each data-source path against `consumerDir`, reject normalized paths that escape it, and apply the same check to glob directory expansion before reading.

**Confidence:** high

---

### F-002 [critical] security — src/mcp/tools/generic.ts:144

**Evidence:**
```ts
      if (!input.target.startsWith('data/')) {
        return err({
          code: 'invalid_input',
          message: `target must start with "data/" (got "${input.target}")`,
          suggestion: 'Only paths under data/ are writable via aideck_write'
        })
      }
```

```ts
      const absolutePath = join(consumer.dir, input.target)
      await appendJsonlLine(absolutePath, input.record)
```

**Claim:** `aideck_write` accepts `target: "data/../../outside.jsonl"` because it only checks a string prefix before joining the path.

**Impact:** Any MCP client can append JSONL outside the consumer directory and outside declared-writable paths, which is a write-boundary escape on an unauthenticated local surface.

**Recommendation:** Resolve the target, verify it remains under `consumer.dir`, and verify it is inside an explicitly declared writable path before appending.

**Confidence:** high

---

### F-003 [critical] security — src/server/routes/api-v2.ts:149

**Evidence:**
```ts
    if (!target.startsWith('data/')) {
      return errResp(
        c,
        'validation_error',
        `write target must start with "data/", got "${target}"`,
        400
      )
    }
```

```ts
    const filePath = join(consumer.dir, target)
    try {
      await appendJsonlLine(filePath, body as object)
```

**Claim:** `POST /api/consumers/:id/write/data/../../outside.jsonl` passes validation and writes outside the consumer directory.

**Impact:** Any local process can write or corrupt files outside declared-writable paths through the unauthenticated HTTP API.

**Recommendation:** Use the same resolved-path and declared-writable validation required for MCP writes before calling `appendJsonlLine`.

**Confidence:** high

---

### F-004 [critical] security — src/server/handlers/script.ts:74

**Evidence:**
```ts
  const modulePath = join(consumerDir, decl.source)
  const moduleUrl = pathToFileURL(modulePath).href
```

```ts
    mod = await import(moduleUrl)
```

**Claim:** A manifest script handler with `source: ../../outside.js` imports and executes code outside the consumer directory.

**Impact:** Consumer tools can read or execute files outside the mandated read boundary; because imported Node modules are not sandboxed, invoked tools can also use `fs`/`child_process` directly and bypass the declared-writable path checks entirely.

**Recommendation:** Resolve `decl.source`, reject paths outside `consumerDir`, and run script handlers in a real restricted execution model or remove them from the boundary-enforced runtime.

**Confidence:** high

---

### F-005 [critical] security — src/server/handlers/shell-exec.ts:21

**Evidence:**
```ts
  const command = renderTemplate(decl.command, args)
  const timeout = decl.timeout ?? DEFAULT_TIMEOUT_MS

  try {
    const { stdout, stderr } = await execFile('bash', ['-c', command], {
      cwd: consumerDir,
      timeout,
    })
```

**Claim:** Manifest-declared `shell-exec` handlers execute arbitrary shell commands with no enforcement of the consumer read boundary or declared-writable write paths.

**Impact:** Any MCP client invoking such a tool can cause reads, writes, deletion, or command execution anywhere the server process has permission, contradicting the architecture’s boundary guarantees.

**Recommendation:** Remove unrestricted `shell-exec` from the boundary-enforced runtime or gate it behind an explicit unsafe mode that is disabled by default and not exposed as a normal declared tool.

**Confidence:** high

---

### F-006 [major] compatibility — src/server/index.ts:81

**Evidence:**
```ts
  app.route('/', createApiV2Router({
    consumers,
    version: opts.version ?? '0.0.1',
    startedAt,
    demo: opts.demo ?? false,
  }))

  // v0.1 API router (legacy routes: /api/state/*, /api/annotate, /api/inbox, etc.)
  app.route('/', createApiRouter({
```

**Claim:** Existing `/api/health` and `/api/consumers` requests are now handled by the v2 router instead of the documented v0.1 router.

**Impact:** Existing browser and AI clients that rely on rootDir-backed `.atomic-skills` consumers can receive an empty or different consumer list from `~/.aideck/consumers`, and `/api/health` no longer includes legacy fields such as `modes`, `rootDir`, and `projects`.

**Recommendation:** Put v2 routes under a distinct namespace such as `/api/v2/*`, or preserve the legacy handlers and add v2 data without changing the existing contract.

**Confidence:** high

---

### F-007 [major] schema-validation — src/schemas/validators/normalize.ts:234

**Evidence:**
```ts
  if (!obj.schemaVersion && (obj.slug || obj.title)) {
    obj.schemaVersion = '0.1'
  }

  // Legacy files often lack required scalar fields
  if (obj.title === undefined) obj.title = obj.slug ?? ''
  if (obj.goal === undefined) obj.goal = obj.title ?? ''
  if (obj.nextAction === undefined) obj.nextAction = null
  if (obj.branch === undefined) obj.branch = null
```

**Claim:** Initiative parsing silently fabricates `schemaVersion` and required fields before strict validation.

**Impact:** Missing-version or pre-schema files are projected as valid current entities, hiding incompatible data instead of producing the required `schema_version_mismatch` refusal.

**Recommendation:** Refuse missing or mismatched `schemaVersion` in `parseInitiative`; keep legacy conversion in an explicit migration path that reports the migration.

**Confidence:** high

## Questions (non-findings)

- src/mcp/tools/consumer-tools.ts:64 — Should consumer-declared tool names be rejected on collision rather than allowing later manifests with the same namespace/tool name to overwrite earlier registrations?
- src/server/lockfile.ts:52 — Should singleton locking be atomic and ownership-checked before release, or is best-effort duplicate detection acceptable for this local runtime?

## Out of scope

- Frontend Vue/CSS/client composables.
- Documentation and markdown changes.
- Test-file quality beyond identifying missing coverage for reviewed behavior.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind -> F-001-final [critical] — same.
- F-002-blind -> F-002-final [critical] — same, with the HTTP write route split into F-003-final because the unauthenticated local HTTP constraint raises it to an independently actionable boundary escape.
- F-003-blind -> F-006-final [major] — severity changed: was critical, now major; the documented v0.1 REST contract confirms the regression, but it is less severe than the boundary escapes.
- F-004-blind -> F-007-final [major] — same.
- F-005-blind [major] — maintained as a non-finding question because the lock race is real, but less directly tied to the externally mandated boundaries than the final quota-worthy issues.

### Emerged

- F-003-final [critical] security — emerged: the no-auth local HTTP constraint makes the `/api/consumers/:id/write/*` traversal an independent write-boundary violation.
- F-004-final [critical] security — emerged: the consumer-directory read boundary makes script `source` traversal and unsandboxed module import a forbidden boundary escape.
- F-005-final [critical] security — emerged: the declared-writable-path constraint makes unrestricted `shell-exec` incompatible with the runtime’s enforced write boundary.

## Briefings used

- Pass 1 briefing: `/tmp/aideck-codex-brief-pass1.md` (149 KB: backend diff + 8 highest-risk files)
- Pass 2 briefing: `/tmp/aideck-codex-brief-pass2.md` (159 KB: + Iron Law constraints + Pass 1 output)
- Same-model workflow: 72 agents, 2.48M tokens, run `wf_3b714493-8d6`

## Fixes applied in this session

Triaged scope: **all blocker + critical** (user choice). Anchored in initiative
`v2-security-remediation`. Verified: `npm run typecheck` clean; `582` tests pass
(`vitest run --no-file-parallelism`). Fixes are in the working tree (uncommitted).

- **Path-traversal family** — new `src/server/writers/path-guard.ts`
  (`isWithinDir`/`resolveWithinDir`, `relative`-based containment). Applied to:
  - `mcp/tools/generic.ts` `aideck_write` — reject targets escaping `<dir>/data`.
  - `server/routes/api-v2.ts` POST write — same containment (the unauthenticated HTTP surface).
  - `server/handlers/file-mutation.ts` — `resolveWithinDir` on the rendered target.
  - `server/handlers/script.ts` — `resolveWithinDir` on `decl.source` before `import()`.
  - `server/data-source-reader.ts` `expandGlob` — containment on both glob branches (read boundary).
- **shell-exec injection** — `handlers/template.ts` `renderTemplate` gains an optional
  value-escaper; `handlers/shell-exec.ts` passes POSIX `shellQuote` so templated args
  cannot inject commands.
- **DoS** — `server/project-registry.ts` `resolveCollision` truncates the base before
  appending the counter (+ iteration cap + unique fallback); no more infinite loop.
- **XSS** — `client/.../MarkdownWidget.vue` `sanitizeHref` blocks `javascript:`/`data:`/`vbscript:`
  schemes and escapes quotes; `rel="noopener noreferrer"`.
- **Packaging** — `scripts/copy-demo-assets.mjs` + `build` script now copy the demo consumer
  assets into `dist/` (tsc-only build shipped a broken `aideck demo`).
- **cli/up dead code** — `cli/up.ts` now always registers the current project with a running
  instance (idempotent) instead of the dead `health.rootDir` mismatch branch; removed `requestShutdown`.
- **Tests** — added `path-guard`, `project-registry-collision` (64-char no-loop),
  `markdown-widget-xss`, `copy-demo-assets`; extended file-mutation / shell-exec / script /
  api-v2 / generic-tools / data-source-reader with traversal/injection cases (each fails if the
  fix is reverted — G3).

Deferred (major, out of this triage): `validators/normalize.ts` schemaVersion fabrication
(F-007), v2 router namespacing root cause (F-006).
