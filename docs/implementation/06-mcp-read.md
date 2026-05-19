# 06 — MCP bootstrap + read tools

## Objetivo

Subir servidor MCP em transport stdio usando `@modelcontextprotocol/sdk`, criar framework de registro de tools com validação Zod, implementar os 7 read tools (`get_state`, `get_plan`, `get_phase`, `get_initiative`, `get_task`, `get_next_action`, `get_dependencies`). Reusa as projections da etapa 05 — zero duplicação de lógica de leitura.

## Pré-requisitos

- Etapa 05 concluída (projections de state/inbox/consumers/next-action disponíveis).

## Gates F1-F13 cobertos

- **F4** (MCP server) — metade de leitura (7 dos 18 tools).

## Arquivos a criar/editar

- `src/mcp/index.ts` — substituir placeholder. Exporta `createMcpServer(opts)` e `startStdio(opts)`.
- `src/mcp/server.ts` — bootstrap usando `Server` do `@modelcontextprotocol/sdk/server` e `StdioServerTransport`.
- `src/mcp/registry.ts` — `registerTool({ name, description, inputSchema: ZodSchema, handler })` + helper que serializa output e erros conforme MCP spec.
- `src/mcp/tools/read.ts` — os 7 read tools (cada um chama a projection correspondente).
- `src/mcp/tools/dependencies.ts` — lógica de resolução de dependências (puxa de Plan.phases + Task.blockedBy).
- `src/mcp/types.ts` — `McpToolContext` (rootDir, projections, parsers).
- `tests/integration/mcp/read-tools.test.ts` — testes usando MCP test client.

## Passos

1. `server.ts`:
   - `createMcpServer(opts: { rootDir: string }): Server`.
   - Instanciar `new Server({ name: 'aideck', version: pkg.version }, { capabilities: { tools: {} } })`.
   - Compor contexto `McpToolContext` com projections (re-usar de `src/server/projections/`).
   - Registrar todos os tools (delegando para `registry.ts`).
   - Setup `tools/list` handler (lista todos tools registrados com `description` e `inputSchema` JSON Schema).
   - Setup `tools/call` handler que delega para `registry.invoke(toolName, args)`.
2. `registry.ts`:
   - Singleton de tools `Map<string, RegisteredTool>`.
   - `registerTool({ name, description, inputSchema, handler })`:
     - `name` precisa começar com `aideck_`.
     - Armazena tool com `inputSchema` (Zod) convertido para JSON Schema via `zod-to-json-schema` (adicionar dep se necessário; alternativa: escrever JSON Schema à mão por tool — mais explícito mas verboso).
   - `invoke(name, rawArgs)`:
     - Valida `rawArgs` com schema.
     - Falha → resposta MCP com `isError: true` e content text com JSON do `ErrorResponse`.
     - Sucesso → chama handler → encapsula return em `{ content: [{ type: 'text', text: JSON.stringify(result) }], isError: false }`.
3. `tools/read.ts` — cada tool:

   - `aideck_get_state`:
     - Input: `{ consumer: string; slug?: string }` (Zod).
     - Handler: chama `buildState(rootDir, consumer, slug)` da projection. Retorna `Plan | Initiative | ProjectStatusState` conforme caso.

   - `aideck_get_plan`:
     - Input: `{ consumer: string; slug: string }`.
     - Handler: parsea `plans/<slug>.md` via parser. Retorna `Plan`.

   - `aideck_get_phase`:
     - Input: `{ consumer: string; planSlug: string; phaseId: string }`.
     - Handler: chama `aideck_get_plan`; encontra phase em `plan.phases.find(p => p.id === phaseId)`. Não acha → `err({ code: 'path_not_found' })`.

   - `aideck_get_initiative`:
     - Input: `{ consumer: string; slug: string }`.
     - Handler: parsea `initiatives/<slug>.md`. Retorna `Initiative`.

   - `aideck_get_task`:
     - Input: `{ consumer: string; initiativeSlug: string; taskId: string }`.
     - Handler: parsea initiative; encontra task; retorna `Task`.

   - `aideck_get_next_action`:
     - Input: `{ consumer: string; planSlug?: string; initiativeSlug?: string }`.
     - Handler: chama `projections/next-action.computeNextAction(...)`.

   - `aideck_get_dependencies`:
     - Input: `{ consumer: string; planSlug: string; phaseId?: string; taskId?: string }`.
     - Lógica em `dependencies.ts`:
       - Se `phaseId` dado: retornar `{ resolved: phase.dependsOn.filter(donePhases), blocking: phase.dependsOn.filter(notDone), blockedBy: [] }`.
       - Se `taskId` dado: parsear initiative; resolver `task.blockedBy` (mesmo padrão).
       - Phases dependsOn é resolvido contra status de cada phase em `plan.phases`. Done = `status: 'done'`.

4. `index.ts`:
   - `startStdio({ rootDir })`:
     - Cria server, conecta `new StdioServerTransport()`, awaits.
     - Trata erro fatal → exit 1.
5. Testes:
   - Setup harness: criar tmp dir com `.atomic-skills/project-status/` + fixture; subir MCP server; usar MCP test client (`@modelcontextprotocol/sdk/client`) com `InMemoryTransport` ou similar.
   - Para cada tool: 1 happy + 1 erro (consumer unknown ou slug not found).
   - `aideck_get_next_action` em initiative com todas tasks done → mensagem "no next action".
   - `aideck_get_dependencies` em phase sem deps → `resolved: [], blocking: []`.

## Testes a escrever

~14 testes (7 happy + 7 erro), via MCP harness in-memory.

## Definition of Done

- [ ] Todos 7 tools registrados, descobertos via `tools/list`
- [ ] Cada tool valida input via Zod, erros viram `ErrorResponse` JSON text
- [ ] Cada tool retorna payload correto contra fixtures
- [ ] MCP server roda standalone via `aideck mcp` placeholder na etapa 09 (aqui só testamos in-process)
- [ ] Coverage ≥ 80% em `src/mcp/{server,registry,types}.ts` e `src/mcp/tools/read.ts`
- [ ] Commit: `feat(mcp): bootstrap server + 7 read tools with Zod-validated inputs`

## Notas/decisões

- **`zod-to-json-schema` (npm)**: pequena lib (~10KB) que converte Zod para JSON Schema, que é o formato `inputSchema` esperado pelo MCP `tools/list`. Adicionar como dep aqui. Alternativa de escrever JSON Schema à mão duplica trabalho com Zod.
- **Output sempre via `content: [{ type: 'text', text: JSON.stringify(...) }]`**: MCP suporta payloads ricos, mas v0.1 não usa structured content. Mais simples e portável.
- **Reuso de projections**: tools de leitura **chamam as mesmas funções** das rotas REST (etapa 05). Zero divergência entre o que browser vê e o que AI vê.
- **`aideck_get_next_action`**: depende de pinpoint de `currentPhase` no Plan. Em iniciativa standalone (sem `parentPlan`), basta a heurística local da iniciativa.
- **Sem `aideck_inbox` aqui** — é feedback tool, etapa 08.
- **`McpToolContext`**: passar como closure ao registrar handler, não como argumento explícito (mantém API do `registerTool` limpa).
