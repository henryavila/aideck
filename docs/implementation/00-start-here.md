# 00 — Start here

Guia de embarque para uma nova sessão de Claude Code começando a implementação do aiDeck v0.1. Leia este arquivo antes de qualquer outra coisa.

## O que é aiDeck (em 1 parágrafo)

Runtime local AI-native que projeta dados estruturados de skills (YAML+MD em `.atomic-skills/<consumer>/`) em três superfícies: dashboard Vue 3, REST+SSE HTTP API, e MCP server stdio. Bind exclusivo em `127.0.0.1:7777`, zero telemetria, MIT, dark-first. v0.1 está com ZERO código de produto — só `src/schemas/` (3 arquivos TS) e `fixtures/`. Tudo o resto é spec + plano de implementação.

Aprofundamento: [`docs/why.md`](../why.md).

## Estado atual do repo

- GitHub público: https://github.com/henryavila/aideck
- Branch único: `main`
- Última fase: planning + cross-model review + design briefings. Sem implementação iniciada.
- Plano de implementação: 15 etapas layered (`01-foundation-deps.md` a `15-smoke-publish.md`), descritas no [INDEX.md](./INDEX.md).
- UI design rola fora-de-banda em [claude.ai/design](https://claude.ai/design) seguindo [`ui-prompts.md`](./ui-prompts.md).

## Ordem de leitura antes de escrever uma linha de código

Sequencial. Não pule.

1. [`CLAUDE.md`](../../CLAUDE.md) — iron laws + code discipline (estricto)
2. [`docs/why.md`](../why.md) — motivação + anti-goals
3. [`docs/v0.1-scope.md`](../v0.1-scope.md) — o que ship e o que NÃO ship em v0.1
4. [`docs/feature-contracts.md`](../feature-contracts.md) — gates verificáveis F1-F13 (autoritativos)
5. [`docs/canonical-data-pattern.md`](../canonical-data-pattern.md) — Iron Law 1 detalhada
6. [`docs/decisions.md`](../decisions.md) — TODO o histórico de decisões com racional
7. [`docs/implementation/INDEX.md`](./INDEX.md) — visão geral das 15 etapas

Depois, para a etapa específica que você vai fazer:
- [`docs/implementation/NN-<slug>.md`](./) — o arquivo da etapa
- Qualquer doc que aquela etapa referencie

## Decisões load-bearing já resolvidas (NÃO relitigar sem ler decisions.md)

Sessões anteriores passaram por planning + revisão cross-model com Codex (2 passes, 6 fixes aplicados) + handoff de sessão paralela sobre detection + segunda rodada de pesquisa que pivotou a detection. As decisões abaixo foram firmemente estabelecidas:

### 1. Files são canonical. aiDeck NUNCA escreve em entity files

`plans/*.md` e `initiatives/*.md` são imutáveis pelo aiDeck. As 9 mutation tools (etapa 07) **gravam append-only IntentRecord JSONL em `inbox/`**. Um consumer skill (atomic-skills:project-status em produção, ou o demo `fake-consumer` da etapa 09 em demo mode) tail o inbox e aplica a mutação nos arquivos. Se você se vir escrevendo `mutateFrontmatter` ou similar — **pare**, releia decisions.md entry "Detection / lifecycle, revised". A interpretação anterior de que "frontmatter é exceção" foi descartada após Codex review (F-001 blocker).

### 2. 24 MCP tools, não 18

Docs antigos miscount (7+9+1+4+3 = 24, não 18). `aideck_schema_version.toolCount` retorna **24**. Verifique no schema_version test.

### 3. Detection = HTTP probe + env file mínimo (NÃO runtime.json)

A proposta original de `~/.aideck/runtime.json` foi superseded após pesquisa de produção (Ollama, LM Studio, Vite, Wrangler, n8n). v0.1 usa:
- `/api/health` retorna `service: "aideck"` como fingerprint (padrão Ollama)
- `~/.aideck/env` (3 linhas: comment + `export AIDECK_URL` + `export AIDECK_PORT`) para shell discovery quando porta não-default
- File mode `0o600` aplicado via `open(O_CREAT | O_WRONLY | O_EXCL, 0o600)` — NÃO chmod-after (vazamentos documentados em certbot/acme.sh/KeePassXC)
- Probe failure É o liveness signal — sem PID, sem fcntl, sem TOCTOU
- AI detection via MCP tool availability (não precisa file)

### 4. `serve` é HTTP-only; `mcp` é stdio-only

Dois process types independentes. Não há `--no-mcp` flag (removida no F-006 fix). `aideck demo` starta HTTP + fake-consumer em background; `aideck mcp` roda em foreground stdio sem HTTP.

### 5. Auto-port fallback APENAS para default

Se user NÃO passou `--port` e 7777 está ocupada, tenta 7778..7787 sequencialmente. Se passou `--port=N` explícito e N busy, exit 1 (sem fallback silencioso — surpresa quebra MCP config do IDE).

### 6. Resolution + Acknowledgement são schemas append-only

Não edita linha JSONL original. Schema definidos na etapa 02. Endpoints `POST /api/annotation/:id/resolve` e `POST /api/highlight/:id/acknowledge` na etapa 05. UI consome na etapa 14.

### 7. Router usa `createWebHistory`, não hash

URLs limpas (`/plans/v3-redesign`, sem `#`). SPA fallback configurado no Hono (etapa 05 — `src/server/routes/spa.ts`). Mudou no F-004 fix.

### 8. Erro `not_implemented` NÃO existe no enum

`ErrorResponse.code` é fechado em `src/schemas/common.ts`. Verifiers query/test stub retornam `precondition_failed` com mensagem mencionando v0.2 (F-005 fix).

## Como começar a primeira sessão

1. Leia os 7 docs acima (~30 min).
2. Abra [`docs/implementation/01-foundation-deps.md`](./01-foundation-deps.md).
3. Siga **Passos** literalmente.
4. Tique cada item de **Definition of Done**.
5. Commit conforme a linha **Commit** sugere.
6. Edite [`INDEX.md`](./INDEX.md): adicione `· done <YYYY-MM-DD>` na linha da etapa 01.
7. Próxima sessão: abra etapa 02. Repete.

## Calibração real

Plan/initiative parsing e rendering devem aguentar a escala do plano sda-v2 v3-redesign (repo separado em `/Volumes/External/code/sda-v2/`):
- 9 fases (F0-F8) em 8 trilhos (A-H)
- 61 sub-fases
- 1 par paralelo (F4∥F5)
- ~30 cross-doc refs
- External imports para `/Volumes/External/code/arch`

Fixtures em `fixtures/plans/` e `fixtures/initiatives/` são versões demo menores modeladas nessa realidade. Quando uma etapa exige testar contra "real-world scale", aponte para esses fixtures (ou, se o user fornecer e for OK, contra o sda-v2 real).

## Cross-model adversarial review

O plano foi revisado por OpenAI Codex em 2026-05-19 (two-pass sealed envelope, padrão `/atomic-skills:review-plan-with-codex`). Resultado:

- **Verdict blind**: needs_changes (0 blockers, 2 críticos, 3 majors)
- **Verdict informed**: reject (1 blocker, 0 críticos, 5 majors — escalou após constraints reveladas)
- **6 fixes aplicados**, 0 skipped
- Audit trail completo em [`.atomic-skills/reviews/2026-05-19-1130-aideck-v0.1-implementation-plan.md`](../../.atomic-skills/reviews/2026-05-19-1130-aideck-v0.1-implementation-plan.md)

Se você encontrar algo no plano que parece estranho/over-engineered, primeiro consulte essa review e o histórico de fixes — provavelmente a decisão atual reflete uma correção deliberada.

## UI fica em outro lugar

Etapas 10-14 são frontend. O design **não** é feito aqui — vem do Claude Design ([claude.ai/design](https://claude.ai/design)) seguindo [`ui-prompts.md`](./ui-prompts.md). NÃO inicie etapas 10-14 do zero — espere o bundle do "Handoff to Claude Code" chegar.

Etapas 01-09 são backend + CLI + demo + MCP. **Totalmente independentes da UI**. Podem rodar em paralelo enquanto o design rola.

## Tooling disponível no ambiente

- `rtk` (Rust Token Killer) — proxy CLI token-optimized. Hook-based, transparente.
- `gh` CLI — autenticado como `henryavila`, repo já criado e pushed.
- `codex` CLI — para reviews cross-model adicionais se precisar.
- `node >= 20`, `npm >= 10`, ESM-only, TypeScript strict.
- Skills atomic-skills + mdprobe disponíveis.

## Critério de "etapa concluída"

Uma etapa fecha quando:
- Todos os checkboxes de **Definition of Done** marcados
- `npm test -- <área>` passa (testes da etapa)
- `npm run typecheck` retorna 0
- Commit feito conforme padrão sugerido na etapa
- Linha da etapa em INDEX.md atualizada com `· done <YYYY-MM-DD>`

A v0.1 só fecha quando a etapa **15 (smoke + publish)** completa o composite gate de [`feature-contracts.md`](../feature-contracts.md).

## Padrão de colaboração esperado pelo user (observado em sessões anteriores)

- **Briefings, não specs prescritivas** — descrever contexto + restrições; deixar o executor decidir
- **Pesquisa real antes de propor** — WebSearch, ler fontes, citar — não deduzir
- **Honestidade sobre limitações** — não prometer capability que não tem
- **Perguntar antes de grandes refactors** — clarificações curtas evitam retrabalho
- **Iteração em loops curtos** — pequenas mudanças, então verificar
- **Ignorar lembrete de TaskCreate** quando o trabalho é linear/atômico — só usar Task tools quando tem multi-passo real que precisa de visibilidade

## Quando travar

Se o spec ambíguo: pergunte ao user antes de implementar sua interpretação. Custo de uma mensagem clarificadora é muito menor que retrabalho.

Se um gate de contrato parecer inalcançável como escrito: surface ANTES de construir em volta. Re-design > silent shortcut. (CLAUDE.md "When in doubt".)
