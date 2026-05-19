# 15 — Smoke + publish prep

## Objetivo

Validar fim-a-fim que aiDeck v0.1 atende a definition of done composta de [feature-contracts.md](../feature-contracts.md). Rodar contra fixture realista (idealmente real `.atomic-skills/` se disponível), checar manualmente cada gate F1-F13, rodar accessibility audit, bump version para `0.1.0`, escrever CHANGELOG, validar tarball npm + `npx demo` clean, atualizar README quickstart.

## Pré-requisitos

- Etapas 01-14 concluídas. Todos os testes passam. `npm run typecheck` zero erros.

## Gates F1-F13 cobertos

- **v0.1 DoD composite gate** (último item de feature-contracts.md):
  - F1-F13 individuais (validados na execução das etapas; aqui re-validamos integradamente)
  - README accurate
  - `npx @henryavila/aideck demo` works clean
  - Renders real sda-v2 v3-redesign plan
  - No TypeScript errors
  - Coverage ≥ 70% on schemas + server + mcp
  - Integration test suite passes
  - Manual smoke against real `.atomic-skills/`
  - License + npm metadata correct

## Arquivos a criar/editar

- `CHANGELOG.md` — preencher seção `## [0.1.0]` com features F1-F13
- `package.json` — bump `version: 0.1.0`
- `README.md` — verificar quickstart correto, atualizar shields se ausentes
- `LICENSE` — criar se ausente (MIT)
- `docs/decisions.md` — appendar entrada de release

## Passos

1. **Audit automatizado**:
   - `npm run typecheck` → zero erros.
   - `npm test` → todos passam.
   - `npm run test:coverage` → conferir thresholds:
     - `src/schemas/**` ≥ 70% (geralmente >90% pelo Zod ser puro).
     - `src/server/**` ≥ 70%.
     - `src/mcp/**` ≥ 70%.
   - Se algum abaixo de 70%, escrever testes adicionais nas áreas descobertas.

2. **Build**:
   - `npm run build` → `dist/` populado com server, MCP, schemas, client assets, demo fixtures.
   - Conferir `dist/cli.js` é executável (`chmod +x` se necessário; ou tooling de build faz).
   - Conferir `dist/client/index.html` + assets.
   - Conferir `dist/demo/fixtures/` contém plans/initiatives/etc.

3. **Smoke `demo`**:
   - `node dist/cli.js demo` (sem usar `aideck` binary instalado).
   - Browser abre → DemoBanner visível.
   - HomeView lista consumer "project-status".
   - Navegar `/plans/v3-redesign` → PlanView renderiza com 9 phases visíveis.
   - Click em F0 → InitiativeView renderiza com 8 tasks.
   - Click em F4 ∥ F5 → ambos renderizam parallel.
   - `/help` → 12 skill cards (ou conforme atomic-skills disponíveis).
   - Postar annotation via curl: `curl -X POST http://localhost:7777/api/annotate -d '{"consumer":"project-status",...}'` → drawer aparece com nova entrada em < 200ms.
   - Postar highlight: badge aparece inline em < 200ms.
   - Ctrl+C → tmp dir limpo (verificar `ls /tmp | grep aideck-demo` vazio).

4. **Smoke real `.atomic-skills/`** (se disponível):
   - Apontar `aideck serve` para diretório com dados sda-v2 reais (precisar do usuário fornecer ou usar fixture).
   - Conferir cada gate F1-F13:
     - F1: parser não erra; round-trip OK.
     - F2: editar arquivo → SSE event visto no DevTools < 200ms.
     - F3: cada endpoint manual via curl.
     - F4: MCP conectado em Claude Code; tools/list mostra 18 tools.
     - F5: render plan completo sem overflow.
     - F6: navega initiative; cross-refs funcionam.
     - F7: help page renderiza.
     - F8: demo cleanup OK.
     - F9: axe DevTools rodando (Chrome extension) — zero violations críticas.
     - F10: CLI flags todas funcionais.
     - F11: panel + resolve OK.
     - F12: badges + acknowledge OK.
     - F13: shell verifier roda comando real (ex.: `git tag | grep core-v2`), output capturado.

5. **Accessibility (F9)**:
   - axe DevTools Chrome scan em cada view.
   - Foco visível (`:focus-visible` em todos os interactive).
   - Tab order lógico.
   - Aria labels em botões icon-only.
   - Contraste WCAG AA validado (cores já no ui-layouts; checar implementação).
   - Fix qualquer violation crítica.

6. **Verificação cross-browser**:
   - Chrome (Mac) — primary.
   - Safari (Mac) — verificar SSE + clipboard.
   - Firefox (Mac) — verificar layout + mermaid render.
   - Mobile responsive NÃO é requisito v0.1 (declarar fora de scope se levantar).

7. **CHANGELOG.md**:
   ```
   # Changelog

   ## [0.1.0] — YYYY-MM-DD

   First public release.

   ### Features
   - **F1** Canonical-data parser (YAML+MD frontmatter, JSONL).
   - **F2** chokidar file watcher + SSE event stream.
   - **F3** Hono HTTP REST API with 10 endpoints.
   - **F4** MCP server exposing 18 tools (read, mutate, exit-gate, feedback, meta).
   - **F5** Plan bird's-eye view with phase tree, tracks, parallel pairs, deps overlay.
   - **F6** Initiative zoom view with exit gates, stack, tasks, refs, markdown body.
   - **F7** Help page with skill grid + search/filter + copy command.
   - **F8** Demo mode with seeded fixtures + auto-open browser.
   - **F9** Dark theme (WCAG AA, no FOUC, themed mermaid).
   - **F10** CLI: serve, demo, mcp, --help, --version, --port, --no-mcp.
   - **F11** Annotation panel with filter + resolve + SSE live updates.
   - **F12** Highlight indicators with severity color + hover-reason + acknowledge.
   - **F13** Exit-gate verifier execution (shell + manual; query/test schemas accepted, execution stubbed for v0.2).

   ### Limitations
   - Custom consumer registration deferred to v0.2.
   - Verifier kinds `query` and `test` execution deferred to v0.2.
   - Light theme deferred to v0.2.
   - Mobile responsive layout out of scope.
   ```

8. **package.json**:
   - `"version": "0.1.0"`.
   - Conferir `"files": ["dist", "README.md"]` (CHANGELOG e LICENSE também devem ir → adicionar à lista).
   - Adicionar `"engines.node": ">=20"` (já existe).
   - Conferir `keywords`, `repository.url`.

9. **LICENSE**:
   - MIT (criar se ausente).

10. **README.md**:
    - Verificar quickstart `npm install -g @henryavila/aideck` + `aideck demo` funciona.
    - Verificar links para docs estão corretos.
    - Adicionar shield/badge npm version (se tiver). Opcional.

11. **Tarball test**:
    - `npm pack` → gera `henryavila-aideck-0.1.0.tgz`.
    - `cd /tmp && mkdir test-aideck && cd test-aideck && npm init -y`.
    - `npm install /path/to/henryavila-aideck-0.1.0.tgz`.
    - `npx aideck demo` → confirma funciona.

12. **Publish prep (DON'T publish yet — confirmar com user)**:
    - `npm whoami` → confirma autenticado como `henryavila`.
    - `npm publish --access public --dry-run` → conferir conteúdo do tarball, sem erros.
    - **Publish real só com aprovação explícita** do usuário.
    - `git tag v0.1.0 && git push --tags` após publish.

13. **Decisions log**:
    - Appendar entrada em `decisions.md`: "2026-XX-XX — v0.1.0 released. Composite gate met: see CHANGELOG."

## Testes a escrever

Nesta etapa, não há testes novos a escrever de código. Há sim:
- Manual smoke test scripts documentados (curl + browser interactions).
- Checklist accessibility executado.
- npm pack test.

## Definition of Done

- [ ] `npm run typecheck` zero erros
- [ ] `npm test` all green
- [ ] Coverage ≥ 70% em schemas/server/mcp
- [ ] `npm run build` produz `dist/` completo
- [ ] `node dist/cli.js demo` smoke passes (todos os gates manuais verificados)
- [ ] Render real `.atomic-skills/` smoke passa (ou fixture realista se real não disponível)
- [ ] axe DevTools: zero critical violations
- [ ] CHANGELOG.md atualizado para `[0.1.0]`
- [ ] package.json version `0.1.0`
- [ ] LICENSE presente (MIT)
- [ ] README quickstart verificado
- [ ] `npm pack` + install + `npx demo` from tarball OK
- [ ] `npm publish --dry-run` clean
- [ ] User aprovou release antes de `npm publish` real
- [ ] git tag `v0.1.0` criado e pushed após publish

## Notas/decisões

- **Não publicar sem confirmação explícita do user**: `npm publish` é irreversível (deprecation possível mas não delete). Ask antes.
- **Sem CI/CD em v0.1**: release manual; CI deferido para v0.1.1+.
- **Cross-browser scope**: Mac major browsers. Windows/Linux smoke não obrigatório; documentar como "best-effort".
- **Smoke real `.atomic-skills/`**: se o usuário ainda não tem atomic-skills migrado (provável em v0.1 timeline), usar fixtures completos. Aceitar que validação contra dados reais sda-v2 fica para release iteration.
- **Tag e push**: `git tag v0.1.0 -a -m "v0.1.0 — first public release"`, `git push origin v0.1.0`.
- **Pós-release**: criar release no GitHub com link para CHANGELOG. Demo screencast/GIF é nice-to-have v0.1.1.
- **Rollback strategy**: se bug crítico encontrado pós-publish, `npm deprecate @henryavila/aideck@0.1.0 "Critical bug, use 0.1.1"` + publish 0.1.1 imediato. NÃO usar `npm unpublish` (afeta cache global, quebra outros usuários).
