# 04 — Writers + watcher + event bus

## Objetivo

Três infraestruturas independentes mas relacionadas: (a) **JSONL appender** atômico para `annotations/`, `highlights/`, `inbox/`; (b) **chokidar watcher** que observa `.atomic-skills/**/*.{md,yaml,jsonl}` e emite eventos parseados; (c) **event bus** in-process com ring buffer de 60s suportando `Last-Event-ID` para reconexão SSE.

## Pré-requisitos

- Etapa 03 concluída (parsers de Plan/Initiative/JSONL disponíveis).

## Gates F1-F13 cobertos

- **F2** (File watcher + SSE) — plumbing server-side. O wire SSE em si vem na etapa 05.
- Base para F11 (annotation persistence) e F12 (highlight persistence).

## Arquivos a criar/editar

- `src/server/writers/jsonl-append.ts` — `appendJsonlLine(path, payload)`
- `src/server/writers/paths.ts` — helpers para derivar caminhos (`annotationsPathFor(consumer, date)`, etc.)
- `src/server/watcher.ts` — `createWatcher({ root, onEvent })` retornando `{ start, stop }`
- `src/server/event-bus.ts` — `createEventBus({ retentionMs })` retornando `{ emit, subscribe, replaySince }`
- `src/server/events/types.ts` — `StateChangeEvent`, `AnnotationAddedEvent`, `HighlightAddedEvent`, `ParseErrorEvent`, `HealthTickEvent` (uniões discriminadas em `kind`)
- `tests/unit/writers/jsonl-append.test.ts`
- `tests/unit/server/watcher.test.ts`
- `tests/unit/server/event-bus.test.ts`

## Passos

1. `paths.ts`:
   - `consumerRoot(rootDir, consumerId): string` — `rootDir/.atomic-skills/<id>`.
   - `annotationsPathFor(consumerRoot, date = new Date()): string` — `<root>/annotations/YYYY-MM-DD.jsonl`.
   - Análogos para `highlightsPathFor`, `inboxPathFor`.
   - Funções puras — só path join.
2. `jsonl-append.ts`:
   - `async function appendJsonlLine(path: string, payload: object): Promise<void>`.
   - `fs/promises.mkdir(dirname, { recursive: true })` para garantir diretório.
   - `fs/promises.appendFile(path, JSON.stringify(payload) + '\n', { flag: 'a' })`.
   - Não usar `writeFile` — risco de truncar.
   - Append é atômico em POSIX para escritas < PIPE_BUF (4KB+ na maioria). Documentar isso na nota.
3. `events/types.ts`:
   - Tipo união discriminada `RuntimeEvent` com `kind`:
     - `state-change` (consumer, slug, entityKind: 'plan' | 'initiative', changeType: 'add' | 'change' | 'unlink', entity?: Plan | Initiative)
     - `annotation-added` (consumer, annotation: Annotation)
     - `highlight-added` (consumer, highlight: Highlight)
     - `error` (consumer, path, code, message, suggestion?)
     - `health-tick` (uptimeMs)
   - Cada evento tem `id: number` (timestamp em ms) e `emittedAt: IsoTimestamp`.
4. `event-bus.ts`:
   - `createEventBus({ retentionMs = 60_000 })`.
   - Internamente: array circular de eventos.
   - `emit(event)` adiciona com id timestamp; remove eventos > retention; notifica subscribers.
   - `subscribe(listener: (event) => void): () => void` (retorna unsubscribe).
   - `replaySince(lastEventId: number): RuntimeEvent[]` — eventos com id > lastEventId ainda no buffer; se `lastEventId` é mais velho que retention, retorna `[]` (chamador deve full-refetch).
5. `watcher.ts`:
   - `createWatcher({ rootDir, eventBus, parsers })`:
     - chokidar.watch(`${rootDir}/.atomic-skills/**/*.{md,yaml,jsonl}`, { ignoreInitial: false, awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 } }).
     - On `add` / `change`: derivar `consumer` do path, decidir se é plan/initiative/jsonl, chamar parser correspondente.
       - Sucesso parser → emit `state-change` com entity.
       - Erro parser → emit `error` (não silent — gate F2).
     - On `unlink`: emit `state-change` com `entity: undefined`.
     - On JSONL change: re-parse incremental NÃO é necessário em v0.1; basta emitir `annotation-added` ou `highlight-added` para a última linha adicionada (manter ponteiro de bytes ou fazer diff de linhas — simpler: diff de linhas).
   - `start()` / `stop()` retornados. `stop()` chama `watcher.close()`.
6. Testes `jsonl-append`:
   - Append cria arquivo + diretórios faltantes.
   - 100 appends concorrentes (Promise.all) resultam em 100 linhas distintas (ordem qualquer).
   - JSON inválido lança (não swallow).
7. Testes `event-bus`:
   - Emit + subscribe entrega.
   - `replaySince(id)` retorna eventos mais novos.
   - Eventos > retention são evictados.
   - `subscribe` retornado unsubscribe funciona.
8. Testes `watcher`:
   - Usar tmpdir + criar `.atomic-skills/test/plans/foo.md` válido → watcher emite `state-change` com `entityKind: 'plan'` em < 200ms.
   - Edit do mesmo arquivo → segundo `state-change`.
   - Delete → `state-change` com `entity: undefined`.
   - Criar arquivo malformado (yaml inválido) → emit `error`.
   - Append linha em `annotations/YYYY-MM-DD.jsonl` → emit `annotation-added`.
   - Cleanup: `stop()` libera watchers (verificar com `fs.watch` count ou marker).

## Testes a escrever

~14 testes:
- 4 jsonl-append
- 4 event-bus
- 6 watcher

## Definition of Done

- [ ] `appendJsonlLine` cria diretórios + escreve atomicamente
- [ ] Watcher emite `state-change` < 200ms em mudança de arquivo (medido)
- [ ] Watcher emite `error` em parse failure (nunca silencia)
- [ ] Watcher emite `annotation-added` / `highlight-added` ao detectar linhas novas em JSONL
- [ ] Event bus retém 60s de eventos, `replaySince` funciona
- [ ] `stop()` libera todos os recursos
- [ ] Testes passam, coverage ≥ 80% em `src/server/{writers,watcher,event-bus,events}.ts`
- [ ] Commit: `feat(server): JSONL writer, chokidar watcher, in-process event bus with replay`

## Notas/decisões

- **Append atomicity**: POSIX garante atomicidade de `write()` apenas para tamanhos pequenos (< PIPE_BUF, tipicamente 4KB). Linhas JSONL típicas são < 1KB, então `appendFile` é seguro mesmo concorrente. Documentar no top do arquivo. Se algum dia uma linha exceder 4KB (anotação enorme), considerar lock cooperativo — fora do escopo v0.1.
- **`awaitWriteFinish`**: chokidar opção que segura o evento até o arquivo parar de mudar por 50ms — evita reagir a writes parciais. Trade-off: latência mínima de 50ms. Aceitável dentro de 200ms target.
- **Diff de linhas JSONL** (para detectar quais linhas foram adicionadas): manter, por arquivo watched, o último `length` lido. Quando arquivo muda, ler do `length` em diante. Simples, suficiente para append-only. Se o arquivo for truncado/reescrito (caso anômalo), resetar e re-emitir todas as linhas.
- **`health-tick` emit**: NÃO emitido pelo watcher; emitido por timer no servidor Hono (etapa 05) a cada 30s.
- **Não acoplar event-bus a SSE**: o bus é puro, SSE é só um subscriber. MCP poderia ser outro (não é em v0.1, mas a API permite).
- **Path derivation**: o consumer id vem do segmento de path após `.atomic-skills/`. Ex.: `.atomic-skills/project-status/plans/foo.md` → consumer `project-status`. Manter isso isolado em uma função `extractConsumerId(filePath, rootDir)` para teste.
