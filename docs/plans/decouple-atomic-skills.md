# Plano: Desacoplar aiDeck de atomic-skills

## Contexto

aiDeck foi construido com acoplamento profundo ao atomic-skills: o diretorio `.atomic-skills/` esta hardcoded, o consumer default e `'project-status'` (nome de uma skill especifica), e help cards referenciam skills do atomic-skills por nome. O objetivo e tornar aiDeck utilizavel com qualquer projeto, sem que o codigo-fonte mencione atomic-skills.

**Decisoes do usuario:**
- Diretorio raiz: `.aideck/` (substitui `.atomic-skills/`)
- Escopo: refactor completo

**Recomendacao de schema (baseada em evidencia):**
Manter Plan/Initiative/Task como modelo core built-in. Os tipos ja sao genericos (334 linhas, nenhum prefixo atomic-skills). Tornar pluggavel exigiria registry, validacao dinamica, UI dinamica — escopo enorme sem caso de uso real. O que muda: remover `PROJECT_STATUS_CONSUMER_ID`, relaxar `z.literal('project-status')` para `z.string()`, e usar o consumerId real em vez de hardcode.

## Numeros

- **37** referencias em `src/`
- **70** referencias em `tests/`
- **106** referencias em `docs/`
- **144+** testes passando (baseline)

## Tabela de renames

| Atual | Novo |
|---|---|
| `.atomic-skills/` (diretorio) | `.aideck/` |
| `atomicSkillsRoot()` | `dataRoot()` |
| `DEFAULT_CONSUMER = 'project-status'` | `DEFAULT_CONSUMER = 'default'` |
| `PROJECT_STATUS_CONSUMER_ID` | removido; usar `DEFAULT_CONSUMER` onde necessario |
| `z.literal('project-status')` (3 schemas) | `z.string()` |
| `consumer: 'project-status'` hardcoded no next-action.ts (6x) | `consumer: consumerId` (corrige bug) |
| `consumer: 'project-status' as const` em state.ts | `consumer: consumerId` |
| `STATIC_SKILL_CARDS` (3 cards) | array vazio `[]` |
| schema file `project-status.ts` | **mantem nome** (o conceito "project status" e generico) |

## Fases

### Fase 0: Baseline

Rodar `npm run typecheck` e `npm test`. Registrar contagem de testes.

### Fase 1: Foundation — paths.ts + re-export

**Arquivos:**
- `src/server/writers/paths.ts`
  - Renomear `atomicSkillsRoot()` → `dataRoot()`, body: `join(rootDir, '.aideck')`
  - `DEFAULT_CONSUMER` → `'default'`
  - Atualizar todos os comentarios (`.atomic-skills` → `.aideck`, remover mencoes a atomic-skills)
  - Manter `EntityKind` com `'discover-run'` (conceito util generico)
- `src/server/writers/index.ts`
  - Re-export `dataRoot` em vez de `atomicSkillsRoot`

**Testes:** `tests/unit/writers/paths.test.ts`
- Todas as strings `.atomic-skills/` → `.aideck/`
- `consumer: 'project-status'` nos testes de flat layout → `consumer: 'default'`

**Verificacao:** `npm test -- tests/unit/writers/paths.test.ts`

### Fase 2: project-registry

**Arquivos:**
- `src/server/project-registry.ts:143`
  - `.atomic-skills` → `.aideck`
  - Adicionar migration hint: se `.aideck/` nao existe mas `.atomic-skills/` sim, retornar mensagem sugerindo `mv .atomic-skills .aideck`

**Testes:** `tests/unit/server/project-registry.test.ts`
- Atualizar strings e assertions de `.atomic-skills` → `.aideck`

**Verificacao:** `npm test -- tests/unit/server/project-registry.test.ts`

### Fase 3: Watcher + projections

**Arquivos:**
- `src/server/watcher.ts` — import `dataRoot` em vez de `atomicSkillsRoot`
- `src/server/projections/state.ts`
  - Import `dataRoot`
  - Linha 29: `dirs.push(dataRoot(rootDir))`
  - Linha 82: `consumerId !== DEFAULT_CONSUMER` (em vez de string literal)
  - Linha 86: suggestion `.aideck/${consumerId}/plans/`
  - Linha 92: `consumer: consumerId` (em vez de `'project-status' as const`)
  - Atualizar comentarios linhas 20-25
- `src/server/projections/consumers.ts` — import `dataRoot`
- `src/server/projections/help.ts` — import `dataRoot`
- `src/server/projections/help-static.ts` — esvaziar `STATIC_SKILL_CARDS = []`, remover comentario sobre atomic-skills
- `src/server/projections/next-action.ts` — substituir 6x `consumer: 'project-status'` por `consumer: consumerId` (fix de bug: o parametro ja existia mas era ignorado)

**Testes:** `tests/unit/server/watcher.test.ts`
- `.atomic-skills` → `.aideck` em todas as paths

**Verificacao:** `npm test -- tests/unit/server/`

### Fase 4: Schema types + validators

**Arquivos:**
- `src/schemas/project-status.ts`
  - Remover `export const PROJECT_STATUS_CONSUMER_ID = 'project-status' as const`
  - Linhas 293, 310, 319: `consumer: typeof PROJECT_STATUS_CONSUMER_ID` → `consumer: string`
- `src/schemas/validators/project-status.ts`
  - 3 schemas: `z.literal('project-status')` → `z.string()`
  - Limpar qualquer import de `PROJECT_STATUS_CONSUMER_ID`

**Verificacao:** `npm run typecheck && npm test -- tests/unit/schemas/`

### Fase 5: Routes, MCP, CLI, demo

**Arquivos:**
- `src/server/routes/api.ts` — 3x `?? 'project-status'` → `?? DEFAULT_CONSUMER` (importar de paths)
- `src/mcp/tools/meta.ts` — description `.atomic-skills/` → `.aideck/`
- `src/cli/help.ts` — exemplo generico
- `src/server/routes/spa.ts` — comentario generico
- `src/server/index.ts` — comentario generico
- `src/demo/seed.ts` — `.atomic-skills/project-status` → `.aideck/default`
- `src/demo/fake-consumer.ts` — comentario + default `'default'`

**Testes de integracao (todos: `.atomic-skills` → `.aideck`, `project-status` consumer → `default`):**
- `tests/integration/server/api.test.ts`
- `tests/integration/server/projects.test.ts`
- `tests/integration/server/project-scoped-routes.test.ts`
- `tests/integration/server/multi-watcher.test.ts`
- `tests/integration/server/sse-project-filter.test.ts`
- `tests/integration/server/static-dir.test.ts`
- `tests/integration/mcp/gates-feedback-meta.test.ts`
- `tests/integration/mcp/read-tools.test.ts`
- `tests/integration/mcp/mutate-tools.test.ts`
- `tests/integration/mcp/smoke-all-tools.test.ts`
- `tests/integration/mcp/stdio-subprocess.test.ts`

**Testes unitarios restantes:**
- `tests/unit/cli/build-discover-run.test.ts`
- `tests/unit/demo/fake-consumer.test.ts`
- `tests/unit/parsers/jsonl.test.ts`
- `tests/unit/schemas/validators.test.ts` — `by: 'atomic-skills:project-status'` → `by: 'external-consumer'`

**Verificacao:** `npm run typecheck && npm test` (TODOS devem passar)

### Fase 6: Documentacao

**Estrategia:** Find-and-replace sistematico + reescrita manual onde necessario.

**Find-and-replace global:** `.atomic-skills` → `.aideck` em todos os .md

**Reescrita manual necessaria:**
- `CLAUDE.md` — Iron Law #1 e regras de diretorio
- `README.md` — remover secao de integracao com atomic-skills, reescrever como generico
- `docs/why.md` — manter historia como motivacao mas deixar claro que aiDeck e agnostico agora
- `docs/data-format.md` — exemplos de paths
- `docs/feature-contracts.md` — F7 help page, refs a skills
- `docs/canonical-data-pattern.md` — paths
- `docs/integration-spec.md` — toda a integracao
- Arquivos em `docs/implementation/`

**Fixtures:**
- `tests/fixtures/discover-run.fixture.json` — paths internas

**Verificacao:** `grep -rn 'atomic.skills\|atomicSkills' src/ tests/ docs/ --include='*.ts' --include='*.md' --include='*.json'` → zero resultados

### Fase 7: Verificacao final

1. `npm run typecheck` passa
2. `npm test` passa (mesma contagem ou mais que baseline)
3. Grep retorna zero hits de "atomic-skills"
4. `aideck demo` funciona (cria `.aideck/default/`)

## Migracao para usuarios existentes

- **NAO auto-migrar.** Viola Iron Law #1.
- `validateRootDir()` detecta `.atomic-skills/` sem `.aideck/` e sugere: `mv .atomic-skills .aideck`
- Consumer name `project-status` continua valido como consumer explicito (subdir). So o flat layout muda de default `project-status` para `default`.

## Riscos

| Risco | Mitigacao |
|---|---|
| Esquecer string literal em test setup | Grep final fase 7 |
| `ProjectStatusState.consumer` muda de literal para string (breaking para consumidores que narrowam no tipo) | Aceitavel — nao ha consumidores externos em v0.1 |
| Flat layout com dados antigos atribuido a `'default'` em vez de `'project-status'` | Documentar no migration hint |
| `next-action.ts` bug fix muda comportamento da API | E uma correcao — o consumer param era aceito mas ignorado |
