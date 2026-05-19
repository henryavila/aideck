# 05 — Hono server: REST + SSE

## Objetivo

Subir servidor Hono em `127.0.0.1:7777`, expor todos os 10 endpoints da F3 com payloads `schemaVersion`-marcados e erros em formato `ErrorResponse`, e streamar `/sse` com event-bus da etapa 04. CORS estrito para `localhost`/`127.0.0.1`. Substitui o placeholder `src/server/index.ts` da etapa 01.

## Pré-requisitos

- Etapa 04 concluída (parsers + watcher + event bus + writers prontos).

## Gates F1-F13 cobertos

- **F2** (File watcher + SSE) — wire SSE no browser.
- **F3** (HTTP REST API) — todos os endpoints + CORS + errors.

## Arquivos a criar/editar

- `src/server/index.ts` — substituir placeholder. Lifecycle: parse args do programa, instancia watcher + event bus + Hono, bind 127.0.0.1:7777, signal handlers para shutdown limpo. Exporta `createServer(opts)` e `start(opts)`.
- `src/server/routes/api.ts` — rotas REST (inclui resolve/acknowledge endpoints)
- `src/server/routes/sse.ts` — rota SSE
- `src/server/routes/spa.ts` — fallback GET `*` → `dist/client/index.html` para suportar `createWebHistory` do client
- `src/server/cors.ts` — middleware CORS estrito
- `src/server/projections/state.ts` — agrega `Plan[] + Initiative[] + AdHocSession[]` em `ProjectStatusState` para o endpoint `/api/state/:consumer`
- `src/server/projections/inbox.ts` — agrega annotations+highlights+decisions em `InboxItem[]`, aplica `Resolution`/`Acknowledgement` por refId in-memory, cursor por `since`
- `src/server/projections/consumers.ts` — descobre consumers escaneando `.atomic-skills/*/` e classifica `state: active | empty | error`
- `src/server/projections/next-action.ts` — calcula `NextActionProjection` (usada por endpoint REST e por MCP tool na etapa 06)
- `src/server/projections/help.ts` — lê skills do atomic-skills se linkado, fallback static
- `tests/integration/server/api.test.ts` — testes via `fetch` contra `app.fetch`
- `tests/integration/server/sse.test.ts`
- `tests/integration/server/cors.test.ts`
- `docs/openapi.yaml` — OpenAPI 3.1 spec (F3 success gate exige)

## Passos

1. `cors.ts`:
   - Middleware Hono que valida `Origin`. Aceita `http://localhost:<porta>` e `http://127.0.0.1:<porta>`. Caso contrário, responde 403 com `ErrorResponse` `code: 'invalid_input'`.
   - Preflight OPTIONS retorna 204 com `Access-Control-Allow-Methods: GET, POST`, `Allow-Headers: Content-Type`.
2. `projections/consumers.ts`:
   - Escaneia `<rootDir>/.atomic-skills/*/` (apenas 1 nível). Cada diretório é um consumer candidato.
   - Para cada um: testar se tem `plans/` ou `initiatives/`. Se sim, `state: 'active'`. Se diretório vazio, `state: 'empty'`. Se erro de leitura, `state: 'error'`.
   - Retorna `Array<{ id, title, rootPath, schemaVersion, state }>`. Para v0.1, `title` = id capitalizado; `schemaVersion` = '0.1' fixo (vinda de `consumer.yaml` é v0.2+).
3. `projections/state.ts`:
   - `async function buildState(consumerId, slug?): Promise<Result<ProjectStatusState | Plan | Initiative, ErrorResponse>>`.
   - Se `slug` ausente: parsea todos os `plans/*.md` + `initiatives/*.md` + scan `adHocSessions` (vazio em v0.1; estrutura ainda não definida — pode retornar `[]`).
   - Se `slug` presente: tenta `plans/<slug>.md` primeiro, depois `initiatives/<slug>.md`. Não encontra → `err({ code: 'slug_not_found', ... })`.
   - Anexa `schemaVersion: '0.1'` no envelope.
4. `projections/inbox.ts`:
   - Lê todos os JSONL em `annotations/`, `highlights/`, `inbox/` para o consumer (ou todos se `consumer` omitido).
   - Filtra por `since` (timestamp). Ordena cronológico ascendente. Aplica `limit` (default 50).
   - Retorna `{ items: InboxItem[]; nextCursor: lastItem.createdAt | undefined }`.
5. `projections/next-action.ts`:
   - Implementação inicial: se `initiativeSlug` dado → próxima task com `status: 'pending'` que não tem `blockedBy` com pendentes; rationale = "first unblocked pending task in initiative".
   - Se `planSlug` dado → recursivo via `currentPhase` + iniciativa daquela fase.
   - Se nada dado → primeira initiative `status: 'active'`, depois recurse.
   - Sem candidato → `description: "No next action — all done or all blocked"`, rationale apropriada.
6. `projections/help.ts`:
   - Se `<atomic-skills-repo>` estiver linkado (env `AIDECK_ATOMIC_SKILLS_PATH` ou auto-detect `~/.claude/skills/`): parsear cada `<skill>/SKILL.md` frontmatter.
   - Se ausente: retornar lista static (hardcoded em arquivo `src/server/projections/help-static.ts` com os 12 skills conhecidos).
   - Para cada skill: `{ name, title, purpose, whenToUse[], whenNotToUse[], examples[], related[], activeInRepo: boolean }`.
   - `activeInRepo` = true se há diretório `.atomic-skills/<skill-name>/` existindo.
7. `routes/api.ts`:
   - `GET /api/health` → `{ schemaVersion, status: 'ok', uptimeMs, consumerCount, version, demo: boolean }` (demo lê flag file).
   - `GET /api/consumers` → from `projections/consumers`.
   - `GET /api/state/:consumer` → from `buildState(consumer)`.
   - `GET /api/state/:consumer/:slug` → from `buildState(consumer, slug)`.
   - `GET /api/help` → from `projections/help`.
   - `GET /api/inbox?since=&limit=` → from `projections/inbox` (sem consumer = aggregate; já agrega Annotation/Highlight/Decision com suas Resolutions/Acknowledgements aplicadas in-memory).
   - `POST /api/annotate` → body validado por `parseAnnotationInput` (Zod). Gera `id` (`ann-YYYY-MM-DD-NNN`, NNN sequencial por dia), `createdAt` agora, appendJsonl, emit `annotation-added`. Retorna 201 com `{ schemaVersion, id, createdAt }`.
   - `POST /api/highlight` → análogo, prefix `hl-`.
   - `POST /api/decision` → análogo, prefix `dec-`.
   - `POST /api/annotation/:id/resolve` → body `{ by?: 'human' | 'ai' }` (default `'human'`). Append `Resolution` JSONL ao `annotations/YYYY-MM-DD.jsonl` ou `inbox/`. Emit `annotation-resolved`. Retorna 201.
   - `POST /api/highlight/:id/acknowledge` → análogo, append `Acknowledgement`. Emit `highlight-acknowledged`. Retorna 201.
   - **SPA fallback**: para qualquer GET cuja path NÃO inicie com `/api/` nem `/sse`, servir `dist/client/index.html` (em produção; em dev, Vite já faz isso). Habilita rotas Vue (`/plans/:slug`, `/initiatives/:slug`, `/help`) sob `createWebHistory()` da etapa 10.
   - Todos os erros → JSON `ErrorResponse` com status apropriado (400 input inválido, 404 not found, 500 io_error).
8. `routes/sse.ts`:
   - `GET /sse` retorna stream `text/event-stream`.
   - Suporta cabeçalho `Last-Event-ID` (HTTP) — se presente: `eventBus.replaySince(parseInt(header))` envia todos os retidos antes de assinar.
   - Subscribe ao event-bus; cada `RuntimeEvent` vira mensagem SSE: `event: <kind>\nid: <event.id>\ndata: <JSON>\n\n`.
   - Timer a cada 30s emite `health-tick`.
   - Cleanup: ao fechar conexão, unsubscribe.
9. `src/server/index.ts`:
   - `createServer({ rootDir, port = 7777 })` → cria event bus, parsers, watcher, monta Hono app (`new Hono()`), aplica CORS middleware, registra `/api/*` e `/sse`.
   - `start(opts)` → `serve({ fetch: app.fetch, hostname: '127.0.0.1', port })` (de `@hono/node-server`). Tratamento de `EADDRINUSE` → console.error + exit 1 + suggestion `"Port <N> in use. Try: aideck serve --port=<N+1>"`.
   - Signal handlers: SIGINT/SIGTERM → `watcher.stop()`, `server.close()`, exit 0.
10. `docs/openapi.yaml`:
    - OpenAPI 3.1 cobrindo os 10 endpoints. Schemas referenciam `ProjectStatusState`, `Plan`, etc., mas inline (não gerado de TS — só documentação consumível por terceiros).
11. Testes integration:
    - Para cada endpoint: 200 happy + 4xx erros (404 unknown consumer, 400 body inválido em POST, 403 CORS mau origin).
    - SSE: open `/sse`, escreva arquivo, esperar evento `state-change`, fechar.
    - SSE com `Last-Event-ID` antigo: receber backfill.
    - CORS: OPTIONS preflight, GET com origin malicioso (`evil.com`) → 403.

## Testes a escrever

~20 testes:
- 10 routes (1 happy + 1 erro por endpoint, condensados)
- 4 SSE (basic, backfill, error event, health-tick)
- 4 CORS (OPTIONS, allow localhost, allow 127.0.0.1, deny external)
- 2 lifecycle (port collision, SIGINT cleanup)

## Definition of Done

- [ ] Todos 10 endpoints respondem conforme `api-examples.md`
- [ ] CORS rejeita origin externo
- [ ] SSE entrega evento < 200ms após file change (teste medido)
- [ ] SSE backfill via `Last-Event-ID` funciona
- [ ] `EADDRINUSE` → exit 1 com mensagem de suggestion
- [ ] SIGINT shutdown limpo (watcher fechado, server fechado, exit 0)
- [ ] OpenAPI YAML escrita e válida (validar com `openapi-spec-validator` ou similar via npm — opcional, OK skip se demorar)
- [ ] Nenhum endpoint muta entity files
- [ ] Coverage ≥ 75% em `src/server/{routes,projections,index}.ts`
- [ ] Commit: `feat(server): Hono REST API + SSE stream + CORS + lifecycle`

## Notas/decisões

- **`@hono/node-server` `serve`**: aceita `hostname: '127.0.0.1'` para satisfazer Iron Law 4.
- **`Last-Event-ID` via header HTTP**, não query string — SSE standard. EventSource reenvia automaticamente em reconexão.
- **Geração de IDs (`ann-YYYY-MM-DD-NNN`)**: sequência por dia — contar linhas existentes no `<consumer>/annotations/YYYY-MM-DD.jsonl` e adicionar 1. Concorrência: race condition baixíssima em single-process; aceitar. Se duas requests simultâneas gerarem mesmo ID, append não corrompe (linhas distintas); na pior hipótese dois items diferentes têm mesmo ID — log warning. v0.2 pode usar UUID.
- **Decoupling**: `routes/api.ts` chama `projections/*`. Não inlinear lógica de leitura dentro das rotas — permite reuso na etapa 06 (MCP read tools).
- **`schemaVersion` em toda resposta**: incluir literalmente `'0.1'`. Helper `respond(data, status = 200)` que envelopa com `schemaVersion` automaticamente.
- **Help static fallback**: lista hardcoded vive em `src/server/projections/help-static.ts` para isolar atualização (próxima vez que skills mudarem). Conteúdo extraído da pasta `~/.claude/skills/` real do usuário se disponível na hora de implementar (consultar manualmente).
- **Não gerar OpenAPI dinamicamente** — escrever à mão como referência. Mais simples e mais legível; ferramentas tipo `hono-openapi` adicionam dep e complexidade.
- **`POST` retornam 201, `GET` 200** — convenção REST.
