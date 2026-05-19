# 02 — Runtime schema validators (Zod)

## Objetivo

Espelhar os types TypeScript existentes em `src/schemas/*.ts` como schemas Zod runtime, expondo helpers que produzem `Result<T, ErrorResponse>` em vez de jogar exceções. Esses helpers são a porta de entrada de qualquer dado vindo do disco (etapa 03), do HTTP (etapa 05) ou do MCP (etapas 06-08).

## Pré-requisitos

- Etapa 01 concluída (Zod instalado, vitest configurado).

## Gates F1-F13 cobertos

- **F1** (Canonical-data parser): a metade de "validação" — todo payload deve ser validado contra `@henryavila/aideck/schemas` antes de virar resultado. `schemaVersion ≠ '0.1'` retorna `schema_version_mismatch` com `suggestion`.
- Base para F3 (REST input validation) e F4 (MCP input validation).

## Arquivos a criar/editar

- `src/schemas/validators/common.ts` — Zod schemas para `ArtifactRef`, `Annotation`, `AnnotationTarget`, `Highlight`, `Decision`, `InboxItem`, `ErrorResponse`, `SchemaVersioned`, **`Resolution`** (refId → annotation/highlight resolved), **`Acknowledgement`** (refId → highlight acked), **`IntentRecord`** (MCP mutation intent), **`IntentApplication`** (consumer ack de aplicação), **`VerifierResult`** (exit-gate verifier output)
- `src/schemas/validators/project-status.ts` — Zod schemas para `Plan`, `PhaseDescriptor`, `PhaseExitGate`, `ExitCriterion`, `ExitCriterionVerifier` (discriminated union), `InterPhaseGate`, `PlanSupersedeRef`, `Principle`, `GlossaryTerm`, `Track`, `Initiative`, `InitiativeScope`, `StackFrame`, `Task`, `TaskOutput`, `ParkedItem`, `EmergedItem`, `CrossTaskRef`, `ProjectStatusState`, `AdHocSession`, `NextActionProjection`, `DriftReport`, `HealthReport`
- `src/schemas/validators/index.ts` — re-exports + `parseOrError<T>(schema, raw): Result<T, ErrorResponse>` helper + `Result<T, E>` type
- `src/schemas/validators/result.ts` — `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` + `ok()`/`err()` constructors
- `src/schemas/common.ts` — adicionar interfaces TS para os 5 novos types (espelhadas pelos validators)
- `tests/unit/schemas/validators.test.ts` — happy + error paths

**Novos tipos a adicionar em `src/schemas/common.ts`** (TS + Zod):

```ts
// Resolution — closes an annotation (append-only, never mutates original line)
export interface Resolution extends SchemaVersioned {
  kind: 'resolution'
  refId: string              // ann-XXX id
  by: 'human' | 'ai'
  resolvedAt: IsoTimestamp
  note?: string
}

// Acknowledgement — closes a highlight
export interface Acknowledgement extends SchemaVersioned {
  kind: 'acknowledgement'
  refId: string              // hl-XXX id
  by: 'human' | 'ai'
  acknowledgedAt: IsoTimestamp
}

// IntentRecord — MCP mutation tool intent (aiDeck appends, consumer skill applies)
export interface IntentRecord extends SchemaVersioned {
  kind: 'intent'
  intentId: string
  operation:
    | 'mark_task_done' | 'update_initiative_status' | 'update_next_action'
    | 'push_frame' | 'pop_frame' | 'park_item' | 'emerge_item'
    | 'promote_parked' | 'add_task'
  target: { initiativeSlug?: string; taskId?: string; planSlug?: string; phaseId?: string }
  args: Record<string, unknown>     // operation-specific
  by: 'human' | 'ai'
  requestedAt: IsoTimestamp
}

// IntentApplication — append from consumer skill confirming the intent was applied
export interface IntentApplication extends SchemaVersioned {
  kind: 'intent_application'
  refId: string              // IntentRecord.intentId
  appliedAt: IsoTimestamp
  by: string                 // consumer id (e.g., 'atomic-skills:project-status')
  result: 'applied' | 'rejected' | 'partial'
  note?: string
}

// VerifierResult — exit-gate verifier output, append-only
export interface VerifierResult extends SchemaVersioned {
  kind: 'verifier_result'
  verifierResultId: string
  criterionRef: {
    target: 'plan' | 'phase' | 'initiative' | 'task'
    planSlug?: string
    initiativeSlug?: string
    phaseId?: string
    taskId?: string
    criterionId: string
  }
  result: 'met' | 'pending' | 'deferred'
  evidence?: string          // truncated stdout for shell verifier
  verifierOutput?: string    // raw stderr+stdout summary
  ranAt: IsoTimestamp
  by: 'human' | 'ai'
}
```

## Passos

1. Criar `src/schemas/validators/result.ts` com o tipo discriminado `Result<T, E>` e construtores `ok(value)` e `err(error)`.
2. Criar `src/schemas/validators/common.ts`:
   - Importar `z` de `'zod'`.
   - Definir `schemaVersionSchema = z.literal('0.1')`.
   - Para cada interface em `src/schemas/common.ts`, escrever um `z.object({...})` correspondente. Enums viram `z.enum([...])`. Optional vira `.optional()`.
   - `ArtifactRef.kind` é `z.enum(['file', 'url', 'repo-path', 'section'])`.
3. Criar `src/schemas/validators/project-status.ts`:
   - `ExitCriterionVerifier` é `z.discriminatedUnion('kind', [shellSchema, querySchema, testSchema, manualSchema])`.
   - `Plan.phases` é `z.array(phaseDescriptorSchema)`.
   - Cuidado: `Plan.currentPhase` é `string | null` (não optional) — usar `z.string().nullable()`.
   - `Initiative.parentPlan` é optional (string ou ausente). Standalone initiatives não têm parent.
   - `ProjectStatusState.consumer` é `z.literal('project-status')`.
4. Criar `src/schemas/validators/index.ts` com helper:
   ```ts
   export function parseOrError<T>(schema: z.ZodType<T>, raw: unknown, context?: { entity?: string; slug?: string }): Result<T, ErrorResponse>
   ```
   - Tenta `schema.safeParse(raw)`.
   - Sucesso → `ok(value)`.
   - Falha → mapear primeiro `ZodError.issues[0]` em `ErrorResponse`:
     - Se path inclui `schemaVersion` e issue é `invalid_literal`: code `schema_version_mismatch`, suggestion `"Run migration: aideck migrate --from=<found> --to=0.1"`.
     - Caso contrário: code `invalid_input`, mensagem com path JSON pointer, suggestion com hint do campo esperado.
5. Adicionar helpers tipados por entidade no `index.ts`: `parsePlan(raw)`, `parseInitiative(raw)`, `parseAnnotation(raw)`, `parseHighlight(raw)`, `parseDecision(raw)`, `parseInboxItem(raw)`, `parseProjectStatusState(raw)`, **`parseResolution(raw)`**, **`parseAcknowledgement(raw)`**, **`parseIntentRecord(raw)`**, **`parseIntentApplication(raw)`**, **`parseVerifierResult(raw)`**. Cada um delega ao `parseOrError` com o schema correto.
6. Escrever testes em `tests/unit/schemas/validators.test.ts`. Casos mínimos:
   - **Happy (12)**: Plan completo, Plan mínimo (só required), Initiative com parent, Initiative standalone, Task pendente, Task com verifier, Annotation human, Annotation ai, Highlight critical, Decision approve, ExitCriterion shell, ExitCriterion manual.
   - **Erro (8)**: Plan sem `schemaVersion` → `invalid_input`; Plan com `schemaVersion: '0.0.9'` → `schema_version_mismatch` com suggestion contendo "migrate"; PhaseDescriptor sem `goal` → `invalid_input` apontando path `phases.0.goal`; ExitCriterion com `verifier.kind: 'unknown'` → `invalid_input`; Initiative com status inválido; Annotation com author `'bot'` → `invalid_input`; Highlight com severity `'extreme'` → `invalid_input`; payload `null` → `invalid_input`.

## Testes a escrever

20 testes (12 happy + 8 erro) cobrindo cada entidade descrita em F1 success gate ("12 happy paths, 8 error paths"). Fixtures usam objetos JS in-line para isolar do parser de arquivo (etapa 03).

## Definition of Done

- [ ] Todos os schemas Zod compilam com `npm run typecheck` zero erros
- [ ] Todos os 20 testes passam (`npm test`)
- [ ] Cobertura ≥ 90% em `src/schemas/validators/**` (esses arquivos são puros — fácil cobrir)
- [ ] Para cada interface em `src/schemas/common.ts` e `src/schemas/project-status.ts` existe um schema Zod correspondente em `validators/`
- [ ] `parseOrError` retorna `ErrorResponse` com `code: 'schema_version_mismatch'` quando `schemaVersion` diverge
- [ ] Helpers por entidade exportados de `src/schemas/validators/index.ts`
- [ ] Commit: `feat(schemas): Zod runtime validators for all canonical types`

## Notas/decisões

- **Por que mirror manual em vez de gerar Zod a partir dos types**: gerar de TS para Zod (via tooling tipo `ts-to-zod`) acopla validação a artefato gerado, complicando review e quebrando em refinements. Manual é mais código mas mantém os types TS como verdade visível e os Zod schemas como contrato runtime explícito.
- **`Result` em vez de throw**: APIs (REST e MCP) precisam retornar `ErrorResponse` estruturado, nunca exceções. Centralizar em `Result` evita try/catch repetido em cada rota/tool.
- **`schema_version_mismatch` distinto de `invalid_input`**: o usuário precisa saber rapidamente que o problema é versão, não payload errado. A suggestion menciona o comando `aideck migrate` que não existe em v0.1 — é OK, é a mensagem futura.
- **`safeParse` em vez de `parse`**: nunca queremos exceção zod escapando do helper.
- **Discriminated union para `ExitCriterionVerifier`**: o `kind` discrimina; Zod pode validar shell vs query vs test vs manual sem ambiguidade.
- **Não validar `unknown` strings (slugs, ids)** com regex em v0.1 — qualquer string serve. v0.2 pode adicionar `slugSchema` se necessário.
