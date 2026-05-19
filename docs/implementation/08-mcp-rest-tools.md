# 08 — MCP exit-gate + feedback + meta + verifier execution

## Objetivo

Implementar os 9 tools restantes (1 exit-gate + 4 feedback + 3 meta — total 8, mas `verify_exit_gate` traz junto a execução shell+manual da F13). Reusar writers da etapa 04 para JSONL. Verifier shell roda em child process com timeout configurável.

## Pré-requisitos

- Etapa 04 concluída (writers JSONL + event bus).
- Etapa 06 concluída (registry MCP + projections).

## Gates F1-F13 cobertos

- **F4** (MCP server) — remainder (8 dos 24 tools).
- **F13** (Exit-gate verifier execution) — shell + manual completos; query/test stub.
- **F11** (Annotation panel) — data side de annotation/decision.
- **F12** (Highlight indicators) — data side de highlight.

Em F13, o success gate "criterion stays pending; error surfaces in response" e "evidence stored in criterion's frontmatter on update" mudam: aiDeck **não atualiza frontmatter** (Iron Law 1). Em vez disso, a tool grava um `VerifierResult` JSONL (schema em etapa 02) no inbox, e o consumer skill aplica ao criterion.status. A "evidence stored" significa "evidence persistida em JSONL", não mutação de entity file.

## Arquivos a criar/editar

- `src/server/verifiers/shell.ts` — `runShellVerifier({ command, expectExitCode, timeoutMs })` retornando `{ exitCode, stdout, stderr, durationMs }`
- `src/server/verifiers/index.ts` — dispatcher: shell → executa, manual → aceita resultado, query/test → erro `precondition_failed` com mensagem "not yet implemented"
- `src/mcp/tools/gates.ts` — `aideck_verify_exit_gate`
- `src/mcp/tools/feedback.ts` — `aideck_annotate`, `aideck_highlight`, `aideck_record_decision`, `aideck_inbox`
- `src/mcp/tools/meta.ts` — `aideck_list_consumers`, `aideck_health`, `aideck_schema_version`
- `src/server/projections/health.ts` — produz `HealthReport`
- `tests/integration/mcp/gates-feedback-meta.test.ts`
- `tests/unit/verifiers/shell.test.ts`

## Passos

1. `verifiers/shell.ts`:
   - `runShellVerifier({ command, expectExitCode = 0, timeoutMs = 30_000, cwd })`.
   - `child_process.spawn('bash', ['-c', command], { cwd })`.
   - Captura stdout/stderr (limitado a 256KB cada para não estourar memória).
   - Timeout: `setTimeout(() => child.kill('SIGTERM'), timeoutMs)`.
   - Retorna `{ passed: exitCode === expectExitCode, exitCode, stdout, stderr, durationMs, timedOut }`.
2. `verifiers/index.ts`:
   - `async function runVerifier(verifier, { cwd, timeoutMs }): Promise<{ passed: boolean; evidence?: string; error?: ErrorResponse }>`.
   - `shell` → delega; `evidence` = stdout truncado.
   - `manual` → erro `precondition_failed` ("manual verifier requires explicit result").
   - `query` / `test` → `err({ code: 'precondition_failed', message: 'Verifier kind <kind> not yet implemented (v0.2)', suggestion: 'Use manual verifier or wait for v0.2' })`. (`not_implemented` não está no enum fechado de `ErrorResponse.code`.)
3. `gates.ts`:
   - `aideck_verify_exit_gate`:
     - Input: `{ consumer, target, planSlug?, initiativeSlug?, phaseId?, taskId?, criterionId, result?, deferredReason?, evidence? }`.
     - Resolver entidade alvo via **leitura** (plan phase exit gate, initiative exit gate, ou task verifier).
     - Achar critério (`exitGate.criteria.find(c => c.id === criterionId)` ou análogo). Não achou → `path_not_found`.
     - Se `result` provido (`'met' | 'deferred' | 'pending'`): usar diretamente.
     - Senão: chamar `runVerifier(criterion.verifier)`. `passed` → `result: 'met'`; falha → `result: 'pending'`.
     - **Append `VerifierResult` JSONL** ao inbox: `{ schemaVersion, kind: 'verifier_result', criterionRef: { target, criterionId }, result, evidence?, verifierOutput?, ranAt, by }` (schema em etapa 02). NÃO muta frontmatter — Iron Law 1.
     - Após append: ler novamente o entity para checar `allGatesMet` (computação puramente sobre o estado lido + intents pendentes agregadas, se quiser ser preciso; em v0.1, OK aproximar lendo só o estado atual).
     - Output: `{ result, verifierRan, verifierOutput?, allGatesMet, verifierResultId }`.
4. `feedback.ts`:
   - `aideck_annotate`:
     - Input: `{ consumer, slug?, targetPath, body, author }`.
     - Gerar `id` (`ann-YYYY-MM-DD-NNN`).
     - Append JSONL via writer; emit `annotation-added` no event bus.
     - Output: `{ id, createdAt }`.

   - `aideck_highlight`: análogo, prefix `hl-`, severity validada.
   - `aideck_record_decision`: análogo, prefix `dec-`, `decision` validada.

   - `aideck_inbox`:
     - Input: `{ consumer?, since?, limit? }`.
     - Chama `projections/inbox.buildInbox(...)` (etapa 05).
     - Output: `{ items, nextCursor }`.
5. `meta.ts`:
   - `aideck_list_consumers`: chama `projections/consumers.listConsumers()`. Output: `{ consumers }`.
   - `aideck_schema_version`: estático. Output: `{ schemaVersion: '0.1', apiVersion: '0.1', toolCount: 24, compatibleSchemas: ['0.1'] }`. (24 = 7 read + 9 mutate + 1 exit-gate + 4 feedback + 3 meta. O número 18 que aparecia em docs/mcp-tools.md e em outros lugares era erro de soma — atualizar todas as referências.)
   - `aideck_health`:
     - Input: `{ consumer? }`.
     - `projections/health.buildHealthReport(consumer?)`:
       - Stale initiatives: `lastUpdated` > 7 dias atrás e `status: 'active'`.
       - Unmet gates: scan plans + initiatives por critérios `status: 'pending'`.
       - Open highlights: JSONL highlights com `acknowledged !== true`.
       - Inbox unread: count items sem `consumed`.
     - Output: `HealthReport`.
6. Testes:
   - Cada tool happy + 1 erro principal.
   - Shell verifier: comando `true` → `passed: true`. Comando `false` → `passed: false, exitCode: 1`. Comando que excede timeout → `timedOut: true, passed: false`.
   - Query verifier → `precondition_failed` com mensagem mencionando v0.2.
   - `verify_exit_gate` shell happy → `VerifierResult` aparece no JSONL do inbox; entity file `plans/*` ou `initiatives/*` **não muda** (mtime inalterado).
   - Annotate → arquivo JSONL contém linha; event bus recebe `annotation-added`.
   - Inbox sem `since` → todos os items recentes.
   - Inbox com `since` → só pós-cursor.
   - Health: criar initiative com `lastUpdated` antiga → aparece em `staleInitiatives`.

## Testes a escrever

~20 testes (8 happy + 8 erro + 4 verifier-specific).

## Definition of Done

- [ ] 8 tools registrados e funcionando
- [ ] `verify_exit_gate` com shell verifier executa, captura output, **append VerifierResult no inbox** (não muta entity file)
- [ ] `verify_exit_gate` com manual exige `result`
- [ ] `verify_exit_gate` com query/test retorna `precondition_failed` com hint v0.2
- [ ] Timeout shell verifier respeitado (testado com sleep 60s vs timeout 1s)
- [ ] Annotation/highlight/decision criam JSONL + emit event bus
- [ ] Inbox retorna items ordenados + suporta `since` cursor (e agrega Resolution + IntentApplication)
- [ ] Health detecta stale + unmet gates + open highlights + inbox unread
- [ ] `schema_version` retorna `toolCount: 24`
- [ ] Entity files (`plans/*.md`, `initiatives/*.md`) NÃO mudam após nenhuma tool desta etapa (verificado via mtime nos testes)
- [ ] Coverage ≥ 75% em `src/server/verifiers/**`, `src/mcp/tools/{gates,feedback,meta}.ts`
- [ ] Commit: `feat(mcp): exit-gate verifier (append-only), feedback channel, meta tools`

## Notas/decisões

- **Shell sob `bash -c`**: aceita strings de comando como aparecem nos fixtures (`'bash scripts/full-pipeline.sh'`). Portabilidade Windows fica para v0.2.
- **Output truncado a 256KB**: limite arbitrário mas razoável. Verifiers que geram MB de output são suspeitos. Documentar.
- **`cwd`**: default = `rootDir` (working directory do `aideck serve`). Não rodar dentro de `.atomic-skills/` porque os scripts geralmente assumem repo root.
- **`evidence` em VerifierResult**: persistido no JSONL do inbox (parte do schema `VerifierResult` da etapa 02). Consumer skill pode propagar ao criterion.evidence ao aplicar — fora do escopo aiDeck.
- **Stub `query`/`test`**: aceitar input válido mas retornar erro estruturado, com suggestion mencionando v0.2. F13 success gate explicitamente permite isso. Código `precondition_failed` (não `not_implemented`, que não está no enum de `ErrorResponse.code`).
- **`schema_version` retorna `toolCount: 24`**: hardcoded. Conferir no teste. (Soma real: 7 read + 9 mutate + 1 exit-gate + 4 feedback + 3 meta = 24. O número 18 em docs antigos é erro a corrigir.)
- **Health stale threshold = 7 dias**: arbitrário. Configurável via env `AIDECK_STALE_DAYS` (v0.2).
- **Não emitir SSE de `decision-added`**: spec api-examples.md só lista `annotation-added` e `highlight-added`. Decisions vão para inbox mas não para SSE em v0.1 (UI não renderiza decisions live; v0.2 pode).
