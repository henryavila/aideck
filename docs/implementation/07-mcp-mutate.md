# 07 — MCP mutation tools

## Objetivo

Implementar os 9 tools que mutam `plans/<slug>.md` e `initiatives/<slug>.md` (frontmatter) preservando o body markdown verbatim. Inclui lógica delicada: `mark_task_done` com `phaseCompletePrompt`, push/pop de stack, park/emerge/promote, add_task. Todas as escritas vão através de um único helper `mutateFrontmatter` que faz read → modify → write atômico (escreve em `.tmp` + rename).

## Pré-requisitos

- Etapa 06 concluída (MCP bootstrap + read tools).
- Etapa 03 concluída (parser + `serializeFrontmatter`).

## Gates F1-F13 cobertos

- **F4** (MCP server) — metade de mutação (9 dos 18 tools).
- **F11** (Annotation panel) — pré-requisito de side effect da `aideck_annotate` (etapa 08).

## Arquivos a criar/editar

- `src/server/writers/frontmatter.ts` — `mutateFrontmatter(path, mutator: (current: T) => T): Promise<Result<T, ErrorResponse>>`. Atômico (write tmp + rename).
- `src/mcp/tools/mutate.ts` — os 9 mutation tools.
- `src/mcp/tools/phase-complete.ts` — lógica que detecta se phase completou após `mark_task_done` e produz `phaseCompletePrompt`.
- `tests/integration/mcp/mutate-tools.test.ts`
- `tests/unit/writers/frontmatter.test.ts` — round-trip + body preservation

## Passos

1. `frontmatter.ts`:
   - `async function mutateFrontmatter<T>(path, parse: (raw) => Result<T, ErrorResponse>, mutate: (current: T) => T, serialize: (mutated: T) => unknown): Promise<Result<T, ErrorResponse>>`.
   - Lê arquivo, split via `splitFrontmatter`, `parse` (do Zod), `mutate`, `serialize` (objeto frontmatter), `serializeFrontmatter` (string final).
   - Escreve em `${path}.tmp`, `fs.rename(tmp, path)` (atômico em POSIX).
   - Erros de read/write → `err({ code: 'io_error', ... })`.
   - **Crítico**: body markdown preservado byte-equal. Teste explícito.

2. `mutate.ts`:

   - `aideck_mark_task_done`:
     - Input: `{ consumer, initiativeSlug, taskId, verifierResult? }`.
     - Carrega initiative; encontra task; valida não já done.
     - Mutate: `task.status = 'done'`, `closedAt = now`, `lastUpdated = now`. Se `verifierResult.evidence`: anexar.
     - Após write: chamar `detectPhaseComplete(initiative)`:
       - Se `parentPlan` existe e todas tasks do initiative `done` e initiative associada a `phaseId` → retornar `phaseCompletePrompt`.
     - Output: `{ closed: true, phaseCompletePrompt?: { phaseId, pendingGates, nextPhaseSuggestion? } }`.

   - `aideck_update_initiative_status`:
     - Input: `{ consumer, slug, status, reason? }`.
     - Mutate: `initiative.status = status`, `lastUpdated = now`.
     - Se `status: 'paused'` e reason: anexar nota no body (último parágrafo).
     - Output: `{ updated: true, previousStatus }`.

   - `aideck_update_next_action`:
     - Input: `{ consumer, slug, nextAction: string | null }`.
     - Mutate: `initiative.nextAction = nextAction`, `lastUpdated = now`.
     - Output: `{ updated: true }`.

   - `aideck_push_frame`:
     - Input: `{ consumer, slug, title, type? = 'task' }`.
     - Mutate: `initiative.stack.push({ id: maxId+1, title, type, openedAt: now })`, `lastUpdated = now`.
     - Calcular `depth = stack.length`. Warning se > 5 (`maxStackDepthWarning`).
     - Output: `{ frameId, depth, warning? }`.

   - `aideck_pop_frame`:
     - Input: `{ consumer, slug, destination: 'resolve' | 'park' | 'emerge' }`.
     - Stack vazio → erro `precondition_failed`.
     - Mutate: `popped = stack.pop()`. Se `destination: 'park'` → `parked.push({ title: popped.title, surfacedAt: now, fromFrame: popped.id })`. Se `'emerge'` → análogo em `emerged`.
     - Output: `{ poppedFrameId, newDepth, movedTo? }`.

   - `aideck_park_item`:
     - Input: `{ consumer, slug, title }`.
     - Mutate: `parked.push({ title, surfacedAt: now, fromFrame: stack.at(-1)?.id ?? null })`.
     - Output: `{ parkedAt, fromFrame }`.

   - `aideck_emerge_item`:
     - Input: `{ consumer, slug, title }`.
     - Mutate: `emerged.push({ title, surfacedAt: now, promoted: false })`.
     - Sugestão de slug: derivar de title (kebab-case, prefix com `phaseId` se aplicável).
     - Output: `{ surfacedAt, suggestion: { newInitiativeSlug } }`.

   - `aideck_promote_parked`:
     - Input: `{ consumer, slug, parkedTitleOrIndex }`.
     - Encontra item parked (por título ou índice). Não acha → `precondition_failed`.
     - Mutate: remove de `parked`, gera `taskId = 'T-' + nextId` (próximo número após o maior T-NNN), append em `tasks` com `status: 'pending'`, `lastUpdated: now`.
     - Output: `{ newTaskId }`.

   - `aideck_add_task`:
     - Input: `{ consumer, slug, title, description?, verifier? }`.
     - Mutate: `taskId = 'T-' + nextId`; push em `tasks` com `status: 'pending'`, `lastUpdated: now`.
     - Output: `{ taskId }`.

3. `phase-complete.ts`:
   - `detectPhaseComplete(initiative, plan?): PhaseCompletePrompt | undefined`.
   - Se `initiative.parentPlan` e `initiative.phaseId`: parsear plan, achar phase. Se todas tasks da initiative `done` E todos exit gates desta initiative met → retornar `{ phaseId, pendingGates: phase.exitGate.criteria.filter(c => c.status !== 'met'), nextPhaseSuggestion: heurística baseada em phase.dependsOn reverse }`.
4. Testes integration:
   - Para cada tool: 1 happy (mutação aplicada, arquivo atualizado, body preservado) + 1 erro (precondition).
   - `mark_task_done` na última task de um initiative com plan parent → retorna `phaseCompletePrompt`.
   - `push_frame` 6 vezes → último retorna `warning`.
   - `pop_frame` com stack vazio → `precondition_failed`.
   - `promote_parked` com índice fora de range → `precondition_failed`.
5. Testes unit `frontmatter.test.ts`:
   - `mutateFrontmatter` em arquivo com body de 200 linhas markdown → body byte-equal após mutação.
   - Mutate produz frontmatter normalizada (YAML válido).
   - Falha de write não corrompe arquivo (tmp deletado, original intacto).

## Testes a escrever

~22 testes (9 happy + 9 erro + 4 body-preservation/lifecycle).

## Definition of Done

- [ ] Todos 9 tools mutam corretamente
- [ ] Body markdown preservado byte-equal em TODAS as mutações
- [ ] Escrita atômica (tmp + rename) — falha de write não corrompe original
- [ ] `mark_task_done` produz `phaseCompletePrompt` no caso correto
- [ ] Stack push warning em depth > 5
- [ ] Coverage ≥ 80% em `src/server/writers/frontmatter.ts` e `src/mcp/tools/mutate.ts`
- [ ] Commit: `feat(mcp): 9 mutation tools with atomic frontmatter writer`

## Notas/decisões

- **Atomicidade via `rename`**: POSIX `rename` é atômica dentro do mesmo filesystem. `.tmp` + rename é o padrão. Em Windows é mais complicado (usar `fs.copyFile` + `fs.unlink`). v0.1 prioriza POSIX; Windows é v0.2.
- **Body preservation**: o serializer trabalha apenas com frontmatter; body passa intocado da `splitFrontmatter`. Teste explícito porque essa garantia é foundational (Iron Law 1 — aiDeck não muta entity files... exceto via frontmatter, que é a única exceção autorizada).
- **`taskId` generation**: parsear todos tasks existentes, achar `T-NNN` máximo, +1. Race condition entre mutações concorrentes existe mas é improvável (single user). Aceitar.
- **`nextPhaseSuggestion`**: heurística simples — encontrar phases que têm a phase atual em `dependsOn`. Se múltiplas, escolher por track ordem alfabética. NÃO faz transição automática — só sugere; AI/humano decide.
- **`reason` em `update_initiative_status`**: anexar ao body NÃO é mutação trivial — quebra a regra de body intocado. Decisão: NÃO anexar ao body. Em vez disso, criar annotation automaticamente (chamando `aideck_annotate` internamente). Ou simplesmente ignorar `reason` em v0.1 e documentar. **Decisão final v0.1**: ignorar `reason` (aceito como input, descartado). Sinalizar no doc. Refinar em v0.2.
- **`audience` ao criar task via `promote_parked`**: não copiar audience da initiative — task não tem `audience`. OK.
- **Validar que initiative existe** antes de tentar mutate — checkar arquivo. Retornar `slug_not_found` se ausente.
