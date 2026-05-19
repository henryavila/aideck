# 09 — CLI + demo seed

## Objetivo

Substituir o placeholder `src/cli.ts` por uma CLI completa (`aideck serve | demo | mcp | env | --help | --version`) com flags (`--port`, `--config`), auto-fallback de porta (default 7777→7787 quando user não passa `--port`; explicit `--port` falha loud), env-file writer em `~/.aideck/env` para discovery por shell consumers, subcomando `env` no estilo `mise activate`, e `aideck demo` que copia fixtures para tmp dir, sobe HTTP-only + fake-consumer, abre browser e limpa em SIGINT. **`serve` e `demo` são HTTP-only**; MCP roda em processo separado via `aideck mcp` (stdio). Detecção por consumers segue o spec em [integration-spec.md § Detection / lifecycle](../integration-spec.md): MCP tool availability para AI; `/api/health` probe + env file para shell scripts.

## Pré-requisitos

- Etapa 05 concluída (server pronto para `start`, `/api/health` com `service: 'aideck'`).
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
- `src/cli/env-cmd.ts` — implementação do subcomando `aideck env` (lê env file, imprime exports)
- `src/server/env-file.ts` — `writeEnvFile({ url, port })` e `removeEnvFile()`. Open atomic com `O_CREAT | O_WRONLY | O_EXCL`, modo `0o600`. Cria parent dir com mode `0o700` se ausente. Sobrescreve se existir (close+unlink+open).
- `src/server/port-resolver.ts` — `resolvePort({ requested, isExplicit }): Promise<number>` — se explicit, tenta uma porta; senão tenta 7777..7787 sequencial.
- `src/demo/seed.ts` — substituir placeholder. `seedDemo(): Promise<{ rootDir: string; cleanup: () => Promise<void> }>`
- `src/demo/fixtures/` — copiar `fixtures/` para cá em build, OU referenciar `fixtures/` direto se shipping em dist (decisão abaixo)
- `tests/integration/cli/help.test.ts`
- `tests/integration/cli/serve.test.ts`
- `tests/integration/cli/demo.test.ts`
- `tests/integration/cli/env.test.ts`
- `tests/unit/server/env-file.test.ts`
- `tests/unit/server/port-resolver.test.ts`

## Passos

1. `cli/args.ts`:
   - Usar `node:util.parseArgs({ options: { port: { type: 'string' }, config: { type: 'string' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } }, allowPositionals: true })`.
   - Retorna `{ subcommand?: 'serve'|'demo'|'mcp'|'env', flags: { port?, config?, help?, version? }, portExplicit: boolean }`.
   - Subcommand vem de `positionals[0]`.
   - `portExplicit = flags.port !== undefined` (controla auto-fallback vs fail loud).
   - Validate: porta numérica ≥ 1024 e ≤ 65535.
2. `cli/help.ts`:
   - String estática com:
     ```
     aideck — AI-native dashboard runtime

     USAGE
       aideck <command> [options]

     COMMANDS
       serve           Start HTTP server (dashboard + REST + SSE) on default port 7777
                       (auto-fallback to 7778..7787 if 7777 is busy and --port not given)
       demo            Run HTTP server with seeded fixtures (auto-opens browser)
       mcp             Run MCP server (stdio mode) — connect from Claude Code/Cursor via MCP config
       env             Print shell exports for AIDECK_URL/AIDECK_PORT (use: eval "$(aideck env)")

     OPTIONS
       --port=<N>      Port for HTTP server (default 7777, ignored by 'mcp' and 'env')
                       If set explicitly and the port is busy, aideck exits 1.
       --config=<path> Path to config file (default: none)
       -h, --help      Show this help
       -v, --version   Show version

     EXAMPLES
       aideck demo
       aideck serve --port=8080
       aideck mcp                 # run separately; HTTP and MCP are independent processes
       eval "$(aideck env)"       # source AIDECK_URL/AIDECK_PORT in current shell

     Docs: https://github.com/henryavila/aideck
     ```
3. `cli/version.ts`: leitura síncrona de `package.json` via `fs` (não importar JSON porque ESM + Node18+ é chato).
4. `cli.ts`:
   - Shebang `#!/usr/bin/env node`.
   - `try`: parse args; route:
     - `--help` ou sem subcommand → print help, exit 0.
     - `--version` → print version, exit 0.
     - `env` → import `cli/env-cmd.ts`; lê `~/.aideck/env`; se existir, imprime conteúdo (que já é shell-source-able) em stdout, exit 0. Se ausente, imprime nada, exit 0 (silencioso é melhor para `eval`).
     - `serve` → resolveu port via `port-resolver` (auto-fallback se NÃO explicit; fail se explicit + busy); import `startServer` da etapa 05; após bind ok, `writeEnvFile({ url, port })`; SIGINT/SIGTERM handler chama `removeEnvFile()` antes de fechar server.
     - `demo` → chama `seedDemo()`, idem `serve` flow (resolve port, start, write env file), starta `fake-consumer` (etapa 07) em background, depois `open('http://localhost:<port>')`. Env file aponta para porta do demo (mesma vida que o demo).
     - `mcp` → import `startStdio` da etapa 06. Roda em foreground stdio. Ignora `--port`. NÃO inicia HTTP server. NÃO escreve env file (stdio MCP é spawnado pelo IDE; presença não é discoverable por shell scripts).
   - Tratamento de erro `EADDRINUSE`:
     - Se port explicit → stderr "Port N in use. Try --port=<N+1>"; exit 1.
     - Se port default (sem --port) → port-resolver já tentou 7777..7787; se todos falharam, stderr "Ports 7777-7787 all in use. Try --port=<higher>"; exit 1.
   - Validar argumentos: flag inválida → stderr usage hint; exit 1.
   - Performance: para `--help` / `--version` / `env`, lazy-load (não importar server/mcp).
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
   - Após `seedDemo`, banner ASCII em stdout: "🚀 aiDeck DEMO — <url>" (usa porta resolvida, não hardcoded).
   - Setup SIGINT handler que chama `removeEnvFile()` + `cleanup()` (tmp dir) + fechar server, nesta ordem.
   - `open(url)` no `open` (já na dep).

7. `server/port-resolver.ts`:
   - `async function resolvePort({ requested, isExplicit }): Promise<number>`.
   - Tenta bind temporário (`net.createServer().listen(port, '127.0.0.1')`) para detectar EADDRINUSE.
   - Se `isExplicit`: tenta `requested`. Sucesso → retorna; falha → throw com error type `PortInUseError(port)`.
   - Se NÃO `isExplicit`: tenta `7777`, `7778`, ..., `7787`. Retorna o primeiro free. Falha em todos → `PortInUseError(range)`.
   - Fecha o probe server imediatamente após bind ok (port liberada para Hono pegar a seguir).
   - **Race condition**: entre probe e Hono bind real, outro processo pode pegar a porta. Mitigação: se Hono bind falha após probe ok, refazer resolver (loop, max 3 tentativas). Em prática raríssimo.

8. `server/env-file.ts`:
   - `async function writeEnvFile({ url, port }): Promise<void>`.
   - Resolve path: `path.join(os.homedir(), '.aideck', 'env')`.
   - Garantir parent dir: `fs.mkdir(path.dirname, { mode: 0o700, recursive: true })`.
   - Se file existe: `fs.unlink` (já existia de instância anterior — sobrescrever).
   - `fs.open(envPath, fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_EXCL, 0o600)` → handle.
   - Escreve:
     ```
     # aiDeck environment — generated, do not edit
     export AIDECK_URL="<url>"
     export AIDECK_PORT=<port>
     ```
   - Close handle.
   - **Crítico**: usar `O_EXCL` no open evita race onde outro processo poderia ler durante a janela writeFile+chmod. Modo `0o600` aplicado no open, não chmod-after.
   - `async function removeEnvFile(): Promise<void>`: `fs.unlink` com try/catch silencioso (já removido = OK).
9. Testes integration:
   - `aideck --help` → contém "USAGE", "COMMANDS", "env" listado, exit 0. Tempo < 100ms.
   - `aideck --version` → match `/^\d+\.\d+\.\d+$/`. Tempo < 100ms.
   - `aideck` (sem args) → mesma saída de `--help`.
   - `aideck --bogus` → exit 1, stderr contém "usage".
   - `aideck --no-mcp` → exit 1 (flag não existe), stderr aponta ausência da flag.
   - `aideck serve --port=99999` → exit 1, stderr contém "1024..65535".
   - `aideck serve --port=<porta-livre>` → starta HTTP-only, `curl /api/health` retorna 200 com `"service":"aideck"`, env file criado com porta correta, SIGINT encerra + remove env file.
   - `aideck serve --port=<porta-ocupada>` (port explicit + busy) → exit 1, stderr "Port N in use".
   - `aideck serve` (sem --port, com 7777 ocupada) → auto-fallback para 7778; env file reflete 7778; stdout mostra "aiDeck running at http://127.0.0.1:7778".
   - `aideck serve` (sem --port, com 7777..7787 todas ocupadas) → exit 1, stderr "Ports 7777-7787 all in use".
   - `aideck mcp` → starta stdio sem HTTP. Verificar que porta 7777 ainda livre, env file NÃO criado. Encerrar com kill.
   - `aideck env` (com aiDeck rodando) → imprime exports válidos; `eval "$(aideck env)"` em subshell seta AIDECK_URL e AIDECK_PORT.
   - `aideck env` (sem aiDeck rodando, env file ausente) → não imprime nada, exit 0.
   - `aideck env` (env file stale após crash) → ainda imprime conteúdo do file (subsequente probe HTTP detectará daemon morto; aideck env não tenta verificar liveness).
   - `aideck demo` (com `AIDECK_DEMO_NO_OPEN=1` para não abrir browser em CI):
     - Verificar tmp dir criado, fixtures copiadas, env file criado.
     - Bater em `/api/state/project-status/v3-redesign` → retorna Plan válido.
     - Bater em `/api/health` → body inclui `"service":"aideck"`, `"demo":true`.
     - Disparar mutation tool MCP via processo separado (subprocess `aideck mcp` + stdio test client) → intent gravada → fake-consumer aplica → arquivo atualizado em < 500ms.
     - SIGINT → tmp dir removido, env file removido.

10. Testes unit `env-file.test.ts`:
    - `writeEnvFile` cria dir 0o700 + file 0o600 (verificar `fs.stat` mode bits).
    - Conteúdo do file tem 3 linhas: comment + AIDECK_URL + AIDECK_PORT.
    - Sobrescreve file existente sem corrupção (open com O_EXCL falha → fallback: unlink + retry).
    - `removeEnvFile` quando arquivo ausente: silent OK.
    - Permission edge case: criar `~/.aideck/` com mode 0o755 antes, verificar que aiDeck NÃO downgrade para 0o700 (não muda existing dir; só warning em stderr).

11. Testes unit `port-resolver.test.ts`:
    - Explicit port livre → retorna mesmo port.
    - Explicit port ocupada → throw `PortInUseError`.
    - Default (não-explicit), 7777 livre → retorna 7777.
    - Default, 7777 ocupada, 7778 livre → retorna 7778.
    - Default, 7777..7787 ocupadas → throw `PortInUseError`.

## Testes a escrever

~22 testes (12 integration + 5 env-file unit + 5 port-resolver unit). Preferir invocar `main()` exportada de `cli.ts` para a maioria; só 1 E2E real do binary no smoke (etapa 15).

## Definition of Done

- [ ] `aideck --help` lista subcomandos (serve, demo, mcp, env) + flags, exit 0
- [ ] `aideck --version` imprime versão de `package.json`, exit 0
- [ ] `aideck serve --port=<porta-livre>` levanta HTTP-only, responde `/api/health` com `service: 'aideck'`
- [ ] Auto-port fallback funciona (7777 ocupada → 7778); env file reflete porta escolhida
- [ ] Explicit `--port=N` + N ocupada → exit 1 (sem fallback silencioso)
- [ ] Todas 7777..7787 ocupadas → exit 1 com mensagem clara
- [ ] `~/.aideck/env` criado com mode 0o600 (verificado via stat); parent dir 0o700
- [ ] `~/.aideck/env` contém `AIDECK_URL` e `AIDECK_PORT` corretos para a porta efetiva
- [ ] `~/.aideck/env` removido em SIGINT/SIGTERM/exit normal
- [ ] `eval "$(aideck env)"` em subshell exporta AIDECK_URL e AIDECK_PORT
- [ ] `aideck mcp` roda stdio-only, ignora `--port`, sem HTTP, **NÃO escreve env file**
- [ ] `aideck demo` cria tmp dir, copia fixtures, levanta HTTP + fake-consumer + env file, abre browser, limpa tudo em Ctrl+C
- [ ] Mutation flow no demo funciona end-to-end: chamar MCP mutate tool (via processo separado) → intent JSONL no tmp dir → fake-consumer aplica em `plans/*` ou `initiatives/*` → SSE atualiza browser
- [ ] Banner "DEMO MODE" visível (no banner do CLI + banner UI da etapa 10)
- [ ] `--help` / `--version` / `env` rodam em < 100ms (medido)
- [ ] Coverage ≥ 70% em `src/cli/**`, `src/server/env-file.ts`, `src/server/port-resolver.ts`, `src/demo/**`
- [ ] Commit: `feat(cli): serve(HTTP+env-file)/demo/mcp(stdio)/env subcommands + auto-port fallback`

## Notas/decisões

- **MCP é stdio, separado de HTTP**: o transporte `StdioServerTransport` do `@modelcontextprotocol/sdk` consome stdin/stdout do processo. Um daemon HTTP de longo running não pode também ser o servidor MCP de um IDE — o IDE spawn `aideck mcp` como seu próprio child process, com pipes próprios. Por isso `--no-mcp` não faz sentido e foi removida: `serve`/`demo` já são HTTP-only, e `mcp` é stdio-only. Documentar em README como configurar Claude Code/Cursor para spawnar `aideck mcp`.
- **Auto-port fallback APENAS para default**: se user não passou `--port`, tentamos 7777..7787 e usamos primeira livre. Se passou `--port=N` explicitamente, falha se N busy — porque user fez escolha consciente; trocar sem aviso seria surpresa. Padrão consistente com Vite (`strictPort: false` por default, `strictPort: true` se port explicit). Trade-off honesto em decisions.md (`Port collision strategy` revisada 2026-05-19).
- **Env file existe SÓ para shell discovery em porta non-default**: 99% dos casos usam 7777 default. File `~/.aideck/env` é o backup para os 1% que precisam descobrir porta alternativa via shell. Sem PID, sem version — esses vêm do `/api/health` (cuja URL o consumer já tem via env file).
- **Por que `O_EXCL` em vez de `writeFile + chmod`**: writeFile cria com mode default (geralmente 0o644 world-readable) e SÓ DEPOIS chmod aplica 0o600. Janela curta mas suficiente para credentials leak (certbot #6936, acme.sh #3127, KeePassXC #2575 foram bitten por isso). `O_EXCL` + mode no open aplica permissão atomicamente.
- **Stale env file**: aceitamos. Se daemon crasha, env file fica apontando para URL morta. Consumer probe `/api/health` falha (200ms timeout) → fallback para escrita direta em files canônicos. Não precisamos fcntl, PID liveness, ou outro mecanismo — probe failure É a liveness check.
- **`node:util.parseArgs` vs commander/yargs**: standard library; zero deps; suficiente para 4 subcommands + 3 flags. Manter footprint.
- **Lazy load**: importar `server/index.ts` (Hono pesado) apenas dentro do branch `serve`/`demo`. Manter `cli.ts` topo enxuto para `--help`/`--version`/`env` rápidos.
- **`AIDECK_DEMO_NO_OPEN` env var**: testes (e CI) precisam do `demo` rodar sem abrir browser. Documentar mas não em help público.
- **Banner DEMO no UI**: a marca visual "DEMO MODE" no dashboard vem de uma variável passada do server: o `seedDemo` cria `<rootDir>/.aideck-demo` flag file; o endpoint `/api/health` lê isso e retorna `demo: true`. O client (etapa 10) checa e renderiza banner. Isso evita acoplar CLI ao client.
- **Demo precisa do fake-consumer (etapa 07)**: sem ele, intents seriam gravadas mas nenhuma mutação visível ocorre. `aideck demo` starta `fake-consumer` em background — exclusivo do demo, não vai para produção.
- **Shipping fixtures**: `dist/demo/fixtures/` precisa estar no tarball npm. Atualizar `package.json` `files: ["dist", "README.md"]` — já cobre `dist/demo/fixtures/`. Script `prebuild` ou `postbuild`: `cp -r fixtures dist/demo/fixtures` (cross-platform via Node script para evitar `cp` em Windows — usar `fs.cp` recursive). Implementar como `scripts/copy-fixtures.mjs` e chamar de `build:server`.
- **Cleanup em SIGINT**: além do tmp dir, fechar watcher + http server (já tratado no `server/index.ts`) + fake-consumer + remover env file. Ordem: env file primeiro (consumers param de "descobrir" aideck instantaneamente), depois fake-consumer (para de aplicar intents), depois server (deixa conexões abertas terminarem), por fim tmp dir.
- **CLI testing**: testar invocando `main()` exportada de `cli.ts`, NÃO spawn de processo (mais rápido + cobrável). Só 1 E2E real do binary no smoke (etapa 15).
- **`aideck env` é silent quando env file ausente**: para `eval "$(aideck env)"` não vazar mensagem para a shell se aiDeck não estiver rodando. Padrão `mise`/`asdf`.
