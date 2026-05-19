# 07 — MCP mutation tools (append-only intents)

## Objetivo

Implementar os 9 tools que **registram intenções de mutação** como linhas append-only em `<consumer-root>/inbox/<YYYY-MM-DD>.jsonl`. aiDeck **NÃO escreve em entity files** (`plans/*.md`, `initiatives/*.md`) — isso violaria a Iron Law 1 do CLAUDE.md ("aiDeck writing to entity files (...) — forbidden; mutations go through file write APIs that the consumer's skill picks up"). O consumer skill (ex.: atomic-skills:project-status) é o único que pode mutar arquivos canônicos; ele tail o inbox e aplica.

## Pré-requisitos

- Etapa 04 concluída (writer JSONL atômico + event bus).
- Etapa 06 concluída (MCP bootstrap + registry).
- Etapa 02 já registra os schemas `IntentRecord` e `VerifierResult` (adicionados lá).

## Gates F1-F13 cobertos

- **F4** (MCP server) — metade de mutação (9 dos 24 tools).

A semântica de F4 nestas tools muda: o success gate "subsequent `aideck_get_state` reflects change" deixa de ser obrigatório em v0.1 sem um consumer skill rodando. O que aiDeck garante: a intent foi gravada no inbox e o `intentId` foi retornado. Se um consumer skill estiver rodando, ele aplicará e o `state-change` SSE/state vai refletir; se não estiver, a intent fica pendente. Para o demo da etapa 09, embutimos um **demo consumer fake** que tail inbox e simula aplicação nos fixtures temporários.

## Arquivos a criar/editar

- `src/server/writers/intents.ts` — `appendIntent(consumerRoot, intent: IntentRecord): Promise<{ intentId, recordedAt }>` (wrapper sobre `appendJsonlLine` da etapa 04)
- `src/mcp/tools/mutate.ts` — os 9 mutation tools (thin wrappers: validate input → build IntentRecord → append → return receipt)
- `src/server/projections/intents.ts` — `listPendingIntents(consumerRoot): IntentRecord[]` (usado pelo demo consumer fake e por debug)
- `src/demo/fake-consumer.ts` — pequeno daemon que tail inbox em demo mode, lê intents pendentes, aplica nos arquivos temp do demo, marca intents `applied`. Só rodado em `aideck demo`.
- `tests/integration/mcp/mutate-tools.test.ts`
- `tests/unit/writers/intents.test.ts`
- `tests/unit/demo/fake-consumer.test.ts`

## Passos

1. `writers/intents.ts`:
   - `appendIntent(consumerRoot, intent)`:
     - `intentId = 'int-' + YYYY-MM-DD + '-' + NNN` (NNN sequencial por dia).
     - `recordedAt = now`.
     - Append em `<consumerRoot>/inbox/<YYYY-MM-DD>.jsonl` usando `appendJsonlLine`.
     - Emit event `intent-recorded` no event bus (novo tipo).
     - Retorna `{ intentId, recordedAt }`.
2. `mutate.ts` — cada tool tem o mesmo shape geral:
   - Valida input via Zod schema.
   - Constrói `IntentRecord` (schema em etapa 02): `{ schemaVersion, kind: 'intent', operation: '<nome>', target: {...}, args: {...}, by: 'ai' | 'human', requestedAt }`.
   - Chama `appendIntent`.
   - Retorna `{ intentId, recordedAt, accepted: true, note: "Intent recorded; consumer skill applies." }`.

   Mapping das 9 tools:

   - `aideck_mark_task_done` — operation `mark_task_done`, target `{ initiativeSlug, taskId }`, args `{ verifierResult? }`. Output extra: opcional `phaseCompleteHint` calculado por leitura (lendo o initiative atual) — se task era a última pendente e está prestes a fechar a phase, devolve hint sugerindo próximo passo. Hint é informacional; sem mutação.
   - `aideck_update_initiative_status` — operation `update_initiative_status`, args `{ status, reason? }`. Reason é registrada na própria intent (não anexada em body de arquivo, como antes).
   - `aideck_update_next_action` — operation `update_next_action`, args `{ nextAction }`.
   - `aideck_push_frame` — operation `push_frame`, args `{ title, type }`. Computa profundidade lendo stack atual; warning se já > 5.
   - `aideck_pop_frame` — operation `pop_frame`, args `{ destination }`. Pré-condição: stack não vazia (lê initiative; se vazia → `precondition_failed`).
   - `aideck_park_item` — operation `park_item`, args `{ title }`.
   - `aideck_emerge_item` — operation `emerge_item`, args `{ title }`. Output extra: `suggestion: { newInitiativeSlug }` (heurística por kebab-case).
   - `aideck_promote_parked` — operation `promote_parked`, args `{ parkedTitleOrIndex }`. Pré-condição: parked item existe (lê initiative).
   - `aideck_add_task` — operation `add_task`, args `{ title, description?, verifier? }`. Sem `taskId` (consumer atribui).
3. `projections/intents.ts`:
   - `listPendingIntents(consumerRoot)`: lê todos os JSONL em `inbox/`, filtra `kind === 'intent'` e sem flag `applied`. Aplicações são representadas por linhas de tipo `IntentApplication` (schema em etapa 02) que referenciam `intentId`.
4. `demo/fake-consumer.ts`:
   - Setup: file watcher em `<demoRootDir>/.atomic-skills/project-status/inbox/`.
   - Em cada `intent-recorded` (ou append de JSONL), tentar aplicar a operação correspondente nos arquivos `plans/*.md` / `initiatives/*.md` em memória:
     - Para v0.1 demo: lê arquivo, aplica mutação no objeto frontmatter, escreve de volta. (Esse fake consumer **substitui** o consumer real só para o demo funcionar visualmente — está em `src/demo/`, separado do server.)
   - Após aplicar, append `IntentApplication { intentId, appliedAt }` ao mesmo arquivo JSONL.
   - Documentar claramente que **isso é demo-only** — não vai para produção. Em produção, atomic-skills:project-status faz isso (fora do escopo v0.1).
5. Testes integration `mutate-tools.test.ts`:
   - Para cada tool: input válido → intent recorded em JSONL com schema correto + receipt retornado.
   - `mark_task_done` na última task → response inclui `phaseCompleteHint` (sem mutar arquivo).
   - `push_frame` 6 vezes (precisa fake consumer aplicar entre cada, ou intent depende de leitura inicial): warning se depth observado > 5.
   - `pop_frame` em initiative com stack vazia → `precondition_failed`.
   - `promote_parked` com índice fora de range → `precondition_failed`.
   - **Nenhum teste deve verificar mutação direta de `plans/*.md` ou `initiatives/*.md` por aiDeck** — esse é o ponto.
6. Testes unit `writers/intents.test.ts`:
   - `appendIntent` cria arquivo JSONL se ausente, append correto.
   - `intentId` é único por dia (sequência incrementa).
   - Event bus recebe `intent-recorded`.
7. Testes `fake-consumer.test.ts`:
   - Append intent `mark_task_done` → fake consumer aplica em < 200ms → arquivo target tem `task.status === 'done'`.
   - Append intent inválida (target inexistente) → fake consumer não aplica + loga warning.

## Testes a escrever

~24 testes (9 tool happy paths + 9 erro/precondition + 3 intent writer + 3 fake-consumer).

## Definition of Done

- [ ] Todos 9 mutation tools registrados, validam input, gravam IntentRecord no inbox
- [ ] **Nenhum tool muta entity files diretamente** (asserção via teste: após chamar tool, mtime de `plans/*.md` e `initiatives/*.md` inalterado)
- [ ] `intentId` único e retornado em receipt
- [ ] Event `intent-recorded` emitido no event bus
- [ ] `mark_task_done` calcula `phaseCompleteHint` sem mutar arquivo
- [ ] Demo `fake-consumer` aplica intents em arquivos do tmp dir (apenas demo)
- [ ] Coverage ≥ 80% em `src/server/writers/intents.ts`, `src/mcp/tools/mutate.ts`, `src/demo/fake-consumer.ts`
- [ ] Commit: `feat(mcp): 9 mutation tools as append-only intents (preserves Iron Law 1)`

## Notas/decisões

- **Por que NÃO mutar arquivo direto**: CLAUDE.md Iron Law 1 é literal — aiDeck nunca escreve em entity files. A nota anterior ("frontmatter é exceção autorizada") foi inventada pelo plano original e não tem base em CLAUDE.md. Codex pegou no Pass 2. Correção atomic.
- **Quem aplica intents em produção**: o consumer skill (atomic-skills:project-status) é responsável. aiDeck só grava intent. Esse é o contrato — consistente com integration-spec.md Tier 2.
- **Demo precisa do fake-consumer**: sem ele, demo seria estático (intents recorded mas nada visível mudaria). Como demo é a forma principal de visualizar v0.1 sem atomic-skills migrado, o fake é necessário.
- **`phaseCompleteHint` em vez de `phaseCompletePrompt`**: o hint é só informação (computada por leitura), não promete que o phase complete (que dependerá do consumer aplicar a intent). Renomeado para deixar claro.
- **`reason` em update_initiative_status**: registrada NA INTENT JSONL. Não anexada em body de arquivo. Consumer pode optar por refletir no body ao aplicar — ou não.
- **Validação de pré-condição (`stack vazia`, `parked não existe`)**: feita por leitura (sem mutação). Lê arquivo, valida, retorna `precondition_failed` se aplicável. Não compromete Iron Law 1.
- **Race condition** entre append e leitura: o consumer real (e o fake demo) precisa ser tolerante a ler arquivo, processar intent, escrever — possíveis writes concorrentes pelo usuário humano editando manualmente. Estratégia: consumer relê arquivo imediatamente antes de aplicar; falha se stale (timestamp mudou). Fora do escopo aiDeck.
- **`IntentApplication` JSONL**: append-only resolution model — mesma estratégia da etapa 14 para resolutions de annotations. Inbox aggregator agrupa intent + application por id.
