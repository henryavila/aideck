# 01 — Foundation + Dependencies

## Objetivo

Preparar o ambiente para que todas as etapas seguintes encontrem dependências, configurações e estrutura de diretórios prontas. Ao fim desta etapa, `npm install`, `npm run typecheck`, `npm test` e `npm run dev:client` devem rodar limpos numa checkout fresca.

## Pré-requisitos

Nenhum. Esta é a primeira etapa.

## Gates F1-F13 cobertos

Nenhum gate diretamente. É infraestrutura para todos os subsequentes. As escolhas aqui (Zod, vitest+happy-dom, coverage v8, pinia/vue-router/marked/mermaid) foram aprovadas pelo usuário em 2026-05-19 e devem ser registradas em [decisions.md](../decisions.md).

## Arquivos a criar/editar

- `package.json` — adicionar deps + script `test:coverage`
- `vitest.config.ts` — criar com paths aliases + thresholds
- `src/client/index.html` — criar (entry HTML do Vite)
- `src/client/main.ts` — placeholder mínimo (monta `App.vue` vazio)
- `src/client/App.vue` — placeholder mínimo (apenas confirma que Vite renderiza)
- `src/client/router.ts` — placeholder (rotas vazias por ora)
- `src/server/index.ts` — placeholder que loga "server not implemented yet" e sai com código 0 (para `tsx watch` não travar nas etapas iniciais)
- `src/mcp/index.ts` — placeholder análogo
- `src/cli.ts` — placeholder mínimo
- `src/demo/seed.ts` — placeholder
- `src/server/routes/`, `src/server/parsers/`, `src/server/writers/` — diretórios placeholder (`.gitkeep`)
- `src/mcp/tools/` — diretório placeholder
- `src/client/components/`, `src/client/views/`, `src/client/stores/`, `src/client/styles/` — diretórios placeholder
- `tests/unit/`, `tests/integration/`, `tests/fixtures/` — diretórios placeholder
- `CHANGELOG.md` — criar com seção `## [Unreleased]`
- `.npmignore` — criar (exclui `tests/`, `fixtures/`, `docs/`, `src/`, mantém `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`)

## Passos

1. Editar `package.json`:
   - Adicionar a `dependencies`: `"zod": "^3.23.0"`, `"pinia": "^2.2.0"`, `"vue-router": "^4.4.0"`, `"marked": "^14.0.0"`, `"mermaid": "^11.0.0"`.
   - Adicionar a `devDependencies`: `"@vitest/coverage-v8": "^2.1.0"`, `"@vue/test-utils": "^2.4.0"`, `"happy-dom": "^15.0.0"`, `"@types/marked": "^6.0.0"` (se necessário — checar tipos no `marked@14`).
   - Adicionar script: `"test:coverage": "vitest run --coverage"`.
2. Rodar `npm install`. Resolver qualquer warning relevante (peer deps).
3. Criar `vitest.config.ts` na raiz com:
   - `environment: 'happy-dom'`
   - Aliases `@` → `src/client`, `@schemas` → `src/schemas` (mesmos do `vite.config.ts`)
   - Globs: `tests/**/*.test.ts`
   - Coverage `provider: 'v8'`, `reporter: ['text', 'html']`
   - Coverage `include: ['src/schemas/**', 'src/server/**', 'src/mcp/**']`
   - Coverage `thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 }`
4. Criar `src/client/index.html` apontando para `/src/client/main.ts` (Vite entry).
5. Criar `src/client/main.ts` placeholder: `import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app')`.
6. Criar `src/client/App.vue` placeholder com um `<template><div>aiDeck — placeholder</div></template>` (vai ser substituído na etapa 10).
7. Criar `src/client/router.ts` placeholder exportando um router vazio (será preenchido na etapa 10).
8. Criar placeholders `src/server/index.ts`, `src/mcp/index.ts`, `src/cli.ts`, `src/demo/seed.ts` — cada um exporta `function placeholder() {}` para o compilador não reclamar de arquivo vazio. Cada placeholder leva o comentário `// TODO(stepNN): implementado na etapa NN`.
9. Criar diretórios + `.gitkeep` em `src/server/{routes,parsers,writers}`, `src/mcp/tools`, `src/client/{components,views,stores,styles}`, `tests/{unit,integration,fixtures}`.
10. Criar `CHANGELOG.md` com header e seção `## [Unreleased]` vazia.
11. Criar `.npmignore` excluindo `src/`, `tests/`, `fixtures/`, `docs/`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`.
12. Rodar `npm run typecheck` — deve passar (zero erros).
13. Rodar `npm test` — deve rodar com zero testes encontrados (status 0).
14. Rodar `npm run dev:client` — Vite deve subir em 5173 mostrando "aiDeck — placeholder". Encerrar com Ctrl+C.
15. Adicionar entrada em [decisions.md](../decisions.md): "2026-05-19 — Picked Zod, pinia, vue-router, marked, mermaid; happy-dom over jsdom for Vitest speed".

## Testes a escrever

Nenhum nesta etapa. Os primeiros testes começam na etapa 02 (Zod validators).

## Definition of Done

- [ ] `npm install` completa sem erros e sem warnings críticos de peer deps
- [ ] `npm run typecheck` retorna 0
- [ ] `npm test` roda (mesmo com 0 testes) e retorna 0
- [ ] `npm run test:coverage` roda e exibe relatório vazio sem crash
- [ ] `npm run dev:client` levanta Vite em 5173 e mostra o placeholder
- [ ] Diretórios + `.gitkeep` criados conforme lista
- [ ] `CHANGELOG.md` e `.npmignore` criados
- [ ] `decisions.md` tem nova entrada
- [ ] Commit único: `chore: scaffold dependencies, vitest, directory structure`

## Notas/decisões

- **Mermaid é pesado (~600KB minified)**. NÃO importar staticamente. Vai ser `import('mermaid')` dinâmico dentro do componente do dependency overlay (etapa 11). Aqui só ficamos com a dep registrada.
- **happy-dom vs jsdom**: happy-dom é ~2x mais rápido para Vue + suficiente para os testes de componente que escreveremos. jsdom só seria necessário se usássemos features de browser muito específicas (não usaremos).
- **Coverage só em `schemas/server/mcp`**: o client recebe testes mais leves no v0.1 (snapshot + integração via Vitest+VTU); não vale travar release por % de cobertura no client.
- **`src/server/index.ts` placeholder com exit 0**: necessário porque `npm run dev` chama `tsx watch src/server/index.ts` e queremos que `npm run dev:client` funcione sozinho sem o server quebrar. Na etapa 05 o placeholder vira o app Hono real.
- **Por que `.npmignore` e não `files` em `package.json`**: o `package.json` já tem `"files": ["dist", "README.md"]` que é mais restritivo. `.npmignore` é redundante mas serve como documentação explícita do que NÃO publicamos. Manter ambos é defensivo.
- **`zod` versão 3.x** porque é a estável; o ecossistema de tipos ainda referencia 3.x. Migrar pra 4 (quando estável) é v0.2+.
