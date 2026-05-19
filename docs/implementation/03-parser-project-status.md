# 03 — Canonical parser (project-status)

## Objetivo

Ler arquivos `.md` (frontmatter YAML + body markdown) e `.jsonl` em `.atomic-skills/<consumer-id>/` e produzir objetos validados via helpers da etapa 02. Round-trip de frontmatter byte-equal. Performance: < 50ms para arquivo de 1000 linhas.

## Pré-requisitos

- Etapa 02 concluída (Zod validators + `parseOrError`).

## Gates F1-F13 cobertos

- **F1** (Canonical-data parser): completa a metade restante (lê arquivo, separa frontmatter+body, parseia JSONL, valida via etapa 02). Atende todos os bullets do success gate.

## Arquivos a criar/editar

- `src/server/parsers/frontmatter.ts` — split de `--- yaml --- markdown` (puro string)
- `src/server/parsers/project-status.ts` — `parsePlanFile(path)`, `parseInitiativeFile(path)` retornando `Result<Plan, ErrorResponse>` etc.
- `src/server/parsers/jsonl.ts` — `parseJsonlFile<T>(path, validate: (raw) => Result<T, ErrorResponse>)` retornando `{ items: T[]; errors: Array<{ line: number; error: ErrorResponse }> }`
- `src/server/parsers/serialize.ts` — `serializeFrontmatter(payload, body)` para round-trip (etapa 07 usará para mutação)
- `src/server/parsers/index.ts` — re-exports
- `tests/unit/parsers/frontmatter.test.ts`
- `tests/unit/parsers/project-status.test.ts` — parser tests + round-trip + perf
- `tests/unit/parsers/jsonl.test.ts`

## Passos

1. `frontmatter.ts`:
   - Função `splitFrontmatter(raw: string): { frontmatter: string; body: string } | null`
   - Regex/parse manual: arquivo deve começar com `---\n`, encontrar próximo `---\n`, retornar duas strings. Se não encontrar, retornar `null` (significa "sem frontmatter" — tratado como erro pelo chamador).
   - Preservar exato whitespace/newlines no body.
2. `serialize.ts`:
   - Função `serializeFrontmatter(frontmatterObject: unknown, body: string): string`
   - Usar `yaml.stringify(frontmatterObject, { indent: 2, lineWidth: -1 })` para evitar reflow.
   - Retornar `---\n<yaml>---\n<body>` — note que body já contém seu próprio leading newline se aplicável.
3. `project-status.ts`:
   - `parsePlanFile(path: string): Promise<Result<Plan, ErrorResponse>>`:
     - Ler arquivo com `fs/promises`.
     - `splitFrontmatter`. Se `null`: `err({ code: 'invalid_input', message: 'No frontmatter in file', suggestion: 'Add YAML frontmatter delimited by --- at top of file' })`.
     - `yaml.parse(frontmatterString)` → `unknown`.
     - Anexar `narrative: body` ao objeto parseado (porque `Plan.narrative` mora no body, não na frontmatter).
     - `parsePlan(combined)` → retornar `Result<Plan, ErrorResponse>`.
     - Capturar erro do `yaml.parse` e mapear para `ErrorResponse` com `code: 'invalid_input'`, suggestion `'YAML syntax error: <yaml message>'`.
   - `parseInitiativeFile(path)`: análogo, anexando `body: body` (não `narrative`, conforme schema `Initiative.body`).
4. `jsonl.ts`:
   - `parseJsonlFile<T>(path, validate)`:
     - Ler arquivo, split por `\n`.
     - Para cada linha não-vazia: `JSON.parse` (try/catch → registra erro, pula), depois `validate(raw)` (se erro → registra, pula).
     - Retornar `{ items, errors }`.
   - Cada `error` tem `{ line: number; error: ErrorResponse }`.
   - Linhas malformadas vão para `stderr` via `console.error` com path + line number (conforme parser rule 5 em data-format.md).
   - **Inbox heterogêneo**: arquivos em `inbox/*.jsonl` contêm objetos de tipos mistos (`Annotation`, `Highlight`, `Decision`, `Resolution`, `Acknowledgement`, `IntentRecord`, `IntentApplication`, `VerifierResult`). Cada linha tem `kind` que discrimina. Implementar `parseInboxLine(raw)` que detecta `kind` e delega ao parser correto (Zod discriminatedUnion sobre os 8 schemas). Para `annotations/` e `highlights/`, mantém os parsers específicos.
5. Testes de `frontmatter.test.ts`:
   - Split correto com `---\nfoo: 1\n---\n# body\n`.
   - Sem frontmatter retorna `null`.
   - Frontmatter sem fechamento retorna `null`.
   - Body com `---` interno (ex.: separador horizontal em markdown) NÃO confunde o splitter (só o segundo `---` do início conta).
6. Testes de `project-status.test.ts`:
   - Parsea `fixtures/plans/v3-redesign.demo.md` → success, conta phases, principles, refs.
   - Parsea `fixtures/initiatives/v3-f0-foundation-repair.demo.md` → success.
   - **Round-trip**: parse → `serializeFrontmatter(parsed, body)` → comparar frontmatter byte-equal com original (após normalização de chaves preservando ordem — usar `yaml.stringify` com `sortKeys: false` se necessário).
   - **Schema mismatch**: criar fixture inline com `schemaVersion: '0.0.9'` → erro `schema_version_mismatch`.
   - **Perf**: fixture sintética de 1000 linhas → parse < 50ms (loop 10x, média < 50ms para tolerar variância de CI).
7. Testes de `jsonl.test.ts`:
   - Parsea `fixtures/annotations/2026-05-19.jsonl` → 3 items, 0 errors.
   - Parsea `fixtures/highlights/2026-05-19.jsonl` → 2 items.
   - Linha JSON malformada no meio → item válido antes/depois OK; erro registrado em `errors`.
   - Linha JSON válida mas schema inválido → registrada em `errors`.

## Testes a escrever

Aproximadamente 14 testes:
- 4 frontmatter split
- 6 project-status (2 happy paths + round-trip + schema mismatch + perf + initiative)
- 4 jsonl (2 happy fixtures + malformed line + invalid schema line)

## Definition of Done

- [ ] `parsePlanFile` retorna `Plan` válido para o fixture `v3-redesign.demo.md`
- [ ] `parseInitiativeFile` retorna `Initiative` válido para `v3-f0-foundation-repair.demo.md`
- [ ] Round-trip frontmatter byte-equal (após normalização YAML determinística)
- [ ] Parser de fixture 1000 linhas roda < 50ms média
- [ ] JSONL parser pula linhas malformadas sem crashar, loga em stderr com `line:N path:...`
- [ ] Schema version mismatch retorna `ErrorResponse` com suggestion
- [ ] Todos os testes passam, coverage ≥ 85% em `src/server/parsers/**`
- [ ] Commit: `feat(parsers): YAML+MD frontmatter + JSONL canonical parsers`

## Notas/decisões

- **Por que anexar `body` no objeto antes do Zod**: `Plan.narrative` e `Initiative.body` são campos do schema. O parser de frontmatter separa, mas o validator espera os campos juntos. Anexar antes do Zod simplifica.
- **Round-trip byte-equal**: o teste é estrito, mas YAML libs tendem a normalizar (ex.: aspas, ordem de chaves). Usar `yaml@2` com `{ sortKeys: false, lineWidth: -1 }`. Se ainda assim houver drift inocente (ex.: `"foo"` vs `foo`), o teste compara após uma normalização canônica de ambos os lados (parse + re-stringify em referência). Documentar a tolerância exata aqui se for menor que byte-equal.
- **`yaml.stringify` vs `js-yaml`**: usamos `yaml` (npm `yaml@2`) que já está na dep da etapa 01. Mais correto para YAML 1.2.
- **Performance**: 50ms para 1000 linhas é folgado em hardware moderno. Caso falhe, perfilizar e considerar `yaml.parseDocument` em vez de `yaml.parse` (similar, mas com mais controle).
- **Loga em stderr**: parser não pode usar HTTP/SSE (não os conhece). Logar em stderr e devolver `errors[]` para o chamador escolher como propagar.
- **Não criar `Watcher` aqui** — é etapa 04. Este parser é puro: file path in, Result out.
