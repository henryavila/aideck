# 09 — CLI + demo seed

## Objetivo

Substituir o placeholder `src/cli.ts` por uma CLI completa (`aideck serve | demo | mcp | --help | --version`) com flags (`--port`, `--config`), tratamento de colisão de porta, e `aideck demo` que copia fixtures para tmp dir, sobe HTTP-only apontando lá, abre browser e limpa em SIGINT. **`serve` e `demo` são HTTP-only**; MCP roda em processo separado via `aideck mcp` (stdio). O transporte MCP é stdio (`@modelcontextprotocol/sdk`), incompatível com um daemon HTTP de longo running.

## Pré-requisitos

- Etapa 05 concluída (server pronto para `start`).
- Etapa 08 concluída (MCP completo, todos 24 tools).
- Fixtures válidos em `fixtures/` (já existem).

## Gates F1-F13 cobertos

- **F8** (Demo mode) — todos os bullets.
- **F10** (CLI) — todos os bullets.

## Arquivos a criar/editar

- `src/cli.ts` — substituir placeholder. Entry-point `#!/usr/bin/env node`.
- `src/cli/args.ts` — parser de argumentos usando `node:util.parseArgs`
- `src/cli/help.ts` — texto de help
- `src/cli/version.ts` — lê versão de `package.json`
- `src/demo/seed.ts` — substituir placeholder. `seedDemo(): Promise<{ rootDir: string; cleanup: () => Promise<void> }>`
- `src/demo/fixtures/` — copiar `fixtures/` para cá em build, OU referenciar `fixtures/` direto se shipping em dist (decisão abaixo)
- `tests/integration/cli/help.test.ts`
- `tests/integration/cli/serve.test.ts`
- `tests/integration/cli/demo.test.ts`

## Passos

1. `cli/args.ts`:
   - Usar `node:util.parseArgs({ options: { port: { type: 'string' }, config: { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } }, allowPositionals: true })`.
   - Retorna `{ subcommand?: 'serve'|'demo'|'mcp', flags: { port?, config?, help?, version? } }`.
   - Subcommand vem de `positionals[0]`.
   - Validate: porta numérica ≥ 1024 e ≤ 65535.
2. `cli/help.ts`:
   - String estática com:
     ```
     aideck — AI-native dashboard runtime

     USAGE
       aideck <command> [options]

     COMMANDS
       serve           Start HTTP server (dashboard + REST + SSE) on default port 7777
       demo            Run HTTP server with seeded fixtures (auto-opens browser)
       mcp             Run MCP server (stdio mode) — connect from Claude Code/Cursor via MCP config

     OPTIONS
       --port=<N>      Port for HTTP server (default 7777, ignored by 'mcp')
       --config=<path> Path to config file (default: none)
       -h, --help      Show this help
       -v, --version   Show version

     EXAMPLES
       aideck demo
       aideck serve --port=8080
       aideck mcp                 # run separately; HTTP and MCP are independent processes

     Docs: https://github.com/henryavila/aideck
     ```
3. `cli/version.ts`: leitura síncrona de `package.json` via `fs` (não importar JSON porque ESM + Node18+ é chato).
4. `cli.ts`:
   - Shebang `#!/usr/bin/env node`.
   - `try`: parse args; route:
     - `--help` ou sem subcommand → print help, exit 0.
     - `--version` → print version, exit 0.
     - `serve` → import `startServer` da etapa 05 (HTTP-only), passar port.
     - `demo` → chama `seedDemo()`, então `startServer({ rootDir: demoRootDir, demoMode: true })`, **starta `fake-consumer` (etapa 07) em background** para aplicar intents nos arquivos do demo, depois `open('http://localhost:<port>')` (via `open` package).
     - `mcp` → import `startStdio` da etapa 06. Roda em foreground stdio. Ignora `--port`. NÃO inicia HTTP server.
   - Tratamento de erro: `EADDRINUSE` → stderr "Port N in use. Try --port=<N+1>"; exit 1.
   - Validar argumentos: flag inválida → stderr usage hint; exit 1.
   - Performance: para `--help` / `--version`, lazy-load (não importar server/mcp).
5. `demo/seed.ts`:
   - `seedDemo(): Promise<{ rootDir, cleanup }>`:
     - Cria `<os.tmpdir()>/aideck-demo-<random>/`.
     - Cria `.atomic-skills/project-status/{plans,initiatives,annotations,highlights,inbox}` lá dentro.
     - Copia `fixtures/plans/*`, `fixtures/initiatives/*`, `fixtures/annotations/*`, `fixtures/highlights/*` para os subdirs correspondentes.
     - Renomeia fixtures `.demo.md` para `.md` (remove sufixo).
     - Retorna `rootDir` e `cleanup` (que faz `rm -rf` do dir).
   - **Decisão sobre shipping de fixtures**: copiar `fixtures/` para `dist/demo/fixtures/` no build (npm script extra ou via script Node). Atualizar `package.json` `files` para incluir `dist/demo/fixtures`. Reflectir em `tsconfig.server.json` (não compila .md, mas precisa copiar — adicionar script `prepublish` que faz `cp -r fixtures dist/demo/fixtures`).
   - Em runtime, `seed.ts` resolve caminho de fixtures relativo a `import.meta.url` (apontando para `dist/demo/fixtures`).
6. Em `cli.ts` para `demo`:
   - Após `seedDemo`, banner ASCII em stdout: "🚀 aiDeck DEMO — http://localhost:7777".
   - Setup SIGINT handler que chama `cleanup()` antes de exit.
   - `open(`http://localhost:${port}`)` no `open` (já na dep).
7. Testes integration:
   - `aideck --help` → contém "USAGE", "COMMANDS", exit 0. Tempo < 100ms.
   - `aideck --version` → match `/^\d+\.\d+\.\d+$/`. Tempo < 100ms.
   - `aideck` (sem args) → mesma saída de `--help`.
   - `aideck --bogus` → exit 1, stderr contém "usage".
   - `aideck --no-mcp` → exit 1 (flag não existe), stderr aponta ausência da flag.
   - `aideck serve --port=99999` → exit 1, stderr contém "Port".
   - `aideck serve --port=<porta-livre>` → starta HTTP-only, `curl /api/health` retorna 200, SIGINT encerra.
   - `aideck mcp` → starta stdio sem HTTP. Verificar que porta 7777 ainda livre (server não levantou). Encerrar com kill.
   - `aideck demo` (com `AIDECK_DEMO_NO_OPEN=1` para não abrir browser em CI):
     - Verificar tmp dir criado, fixtures copiadas.
     - Bater em `/api/state/project-status/v3-redesign` → retorna Plan válido.
     - Disparar mutation tool MCP via processo separado (subprocess `aideck mcp` + stdio test client) → intent gravada → fake-consumer aplica → arquivo atualizado em < 500ms.
     - SIGINT → tmp dir removido.

## Testes a escrever

~10 testes. Spawn de `node dist/cli.js <args>` via `child_process` (após build) OU testar `cli.ts` invocando a função `main` exportada (mais rápido, não exige build em CI). Preferir o segundo, com testes E2E mínimos do CLI binary.

## Definition of Done

- [ ] `aideck --help` lista subcomandos + flags, exit 0
- [ ] `aideck --version` imprime versão de `package.json`, exit 0
- [ ] `aideck serve --port=<porta-livre>` levanta HTTP-only, responde `/api/health` (sem porta MCP)
- [ ] Port collision → exit 1 + suggestion
- [ ] `aideck mcp` roda stdio-only, ignora `--port`, sem HTTP
- [ ] `aideck demo` cria tmp dir, copia fixtures, levanta HTTP + fake-consumer, abre browser, limpa em Ctrl+C
- [ ] Mutation flow no demo funciona end-to-end: chamar MCP mutate tool (via processo separado) → intent JSONL no tmp dir → fake-consumer aplica em `plans/*` ou `initiatives/*` → SSE atualiza browser
- [ ] Banner "DEMO MODE" visível (no banner do CLI + banner UI da etapa 10)
- [ ] `--help` / `--version` rodam em < 100ms (medido)
- [ ] Coverage ≥ 70% em `src/cli/**` e `src/demo/**`
- [ ] Commit: `feat(cli): serve(HTTP-only)/demo/mcp(stdio) subcommands + demo fixture seed`

## Notas/decisões

- **MCP é stdio, separado de HTTP**: o transporte `StdioServerTransport` do `@modelcontextprotocol/sdk` consome stdin/stdout do processo. Um daemon HTTP de longo running não pode também ser o servidor MCP de um IDE — o IDE spawn `aideck mcp` como seu próprio child process, com pipes próprios. Por isso `--no-mcp` não faz sentido e foi removida: `serve`/`demo` já são HTTP-only, e `mcp` é stdio-only. Documentar em README como configurar Claude Code/Cursor para spawnar `aideck mcp`.
- **`node:util.parseArgs` vs commander/yargs**: standard library; zero deps; suficiente para 3 subcommands + 3 flags. Manter footprint.
- **Lazy load**: importar `server/index.ts` (Hono pesado) apenas dentro do branch `serve`/`demo`. Manter `cli.ts` topo enxuto para `--help`/`--version` rápidos.
- **`AIDECK_DEMO_NO_OPEN` env var**: testes (e CI) precisam do `demo` rodar sem abrir browser. Documentar mas não em help público.
- **Banner DEMO no UI**: a marca visual "DEMO MODE" no dashboard vem de uma variável passada do server: o `seedDemo` cria `<rootDir>/.aideck-demo` flag file; o endpoint `/api/health` lê isso e retorna `demo: true`. O client (etapa 10) checa e renderiza banner. Isso evita acoplar CLI ao client.
- **Demo precisa do fake-consumer (etapa 07)**: sem ele, intents seriam gravadas mas nenhuma mutação visível ocorre. `aideck demo` starta `fake-consumer` em background — exclusivo do demo, não vai para produção.
- **Shipping fixtures**: `dist/demo/fixtures/` precisa estar no tarball npm. Atualizar `package.json` `files: ["dist", "README.md"]` — já cobre `dist/demo/fixtures/`. Script `prebuild` ou `postbuild`: `cp -r fixtures dist/demo/fixtures` (cross-platform via Node script para evitar `cp` em Windows — usar `fs.cp` recursive). Implementar como `scripts/copy-fixtures.mjs` e chamar de `build:server`.
- **Cleanup em SIGINT**: além do tmp dir, fechar watcher + http server (já tratado no `server/index.ts`) + fake-consumer.
- **CLI testing**: testar invocando `main()` exportada de `cli.ts`, NÃO spawn de processo (mais rápido + cobrável). Só 1 E2E real do binary no smoke (etapa 15).
