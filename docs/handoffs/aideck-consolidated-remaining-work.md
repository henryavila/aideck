# aiDeck — trabalho consolidado restante p/ o dashboard atomic-skills

> **Handoff único e autossuficiente** gerado pelo Claude Code (lado atomic-skills), **validado
> contra o source do aiDeck em 2026-06-19** (HEAD `1610a10`, branch `feat/ds-v2.1-widgets`).
> Supera os handoffs anteriores. O consumer atomic-skills é só o caso de uso; **nada do domínio
> dele entra no aiDeck** (ver GATE).

> **Ordem mandatória do owner:** validar LOCALMENTE primeiro; **NÃO publicar no npm antes da
> validação local passar.** A v2.1 já roda do código local — publicar é o ÚLTIMO passo, não
> bloqueia nada.

## Estado validado

| # | Requisito | Estado | Evidência |
|---|---|---|---|
| 1 | `nav.style:'projects'` + `projectsLabel`/`landingPage` + refine | ✅ feito | manifest-schema.ts:349,353,356,425-431 (commit `1610a10`) |
| 2 | Sidebar projects-mode (pina landing / lista projects / escopa+expande) | ✅ feito | Sidebar.vue:11-54,154-158; useProjects.ts:21; App.vue:99 |
| 3 | Landing cross-project em `/:consumerId` | ✅ feito | router.ts:9; ConsumerPage.vue:170-180; App.vue:93,112 |
| 4 | Gramática DS v2.1 (agg/where/of/scope/param.match{state}/repeat{ref,filter}/emits/statusMap/help/commandPalette) | ✅ feito | manifest-schema.ts:108-138,147-210,410-412 |
| 5 | Registry de 13 widgets (collection-grid/status-list/record-switcher/headline-banner/catalog/stepper/…) | ✅ feito | WidgetRenderer.vue:87-131 |
| 6 | Testes: fixture NEUTRA projects + gate domain-agnostic | ✅ feito | sidebar-nav.test.ts:117; nav-projects-domain-gate.test.ts |
| **A** | **`page.showInNav`** (Ajuda fora da sidebar — cosmético, NÃO bloqueia validação do core) | ✗ falta | ausente em schema/Sidebar/tab bar (0 hits) |
| **B** | **Validar LOCALMENTE** o manifest atomic-skills no shell projects (harness CDP vs imagem #2) | ⏳ **PRÓXIMO PASSO** | roda do dist/source local — sem npm |
| **C** | **Publicar v2.1 no npm** (merge→main + build + bump + publish) | ⏳ **ÚLTIMO** — só depois de B passar | nunca foi pra main; npm tem só 0.1.0/0.1.1 pré-v2.1 |

Tudo do engine v2.1 (gramática + widgets + nav projects) está commitado em `feat/ds-v2.1-widgets` e
**roda do código local agora** — é o que o harness usa. A publicação no npm é o passo final de
distribuição, **depois** de o owner validar localmente.

---

## ⛔ GATE RÍGIDO (vale p/ o item A)

O aiDeck é **domain-agnostic**. **Proibido** no diff (código/defaults/tipos; exceto fixtures
neutras): `atomic-skills`, `plan`, `phase`, `initiative`, `frente`, `panorama`, `foco`, `gate`,
`task`. `page.showInNav` é primitivo genérico de shell — o consumer decide o que esconder. Estenda
o gate test (`nav-projects-domain-gate.test.ts`) aos arquivos novos que tocar.

---

## B — Validar LOCALMENTE (o próximo passo de verdade)

O engine v2.1 já existe no código local; nada precisa ir ao npm pra validar. Rodar do build/source
local e capturar o render do dashboard real:

1. **Subir o aiDeck do código local** (uma das opções):
   - rebuild + serve: `npm run build` (⚠️ build **completo** — `tsc -p tsconfig.server.json && vite
     build && copy-demo-assets`; o `dist/server` já esteve stale/meio-buildado), depois
     `node dist/cli.js serve --port=7777 --static-dir=dist/client`; **ou**
   - direto do source: `npm run dev` / `tsx` (instância live v2 já foi rodada assim antes).
   Pós-subida: `GET /api/health` deve reportar a versão do source e `GET /api/consumers` listar de
   `~/.aideck/consumers/` (já há só `atomic-skills`).
2. **Provisionar + popular** (lado atomic-skills): provisionar o consumer `atomic-skills`, emitir o
   state por repo (`scripts/emit-consumer-state.js` com cwd no repo) e `POST /api/projects/register`
   p/ atomic-skills/arch/lekto.
3. **Capturar (CDP)** via chrome-headless-shell (navigate→wait→screenshot; `?project=` NÃO pode ser
   quebrada por `split('=')`) e **comparar com a imagem de referência #2** do design. Checar:
   sidebar = landing **Panorama** no topo + grupo **PROJETOS** (rótulo vindo do manifest); páginas
   `foco-agora / visão-geral / plano(dobra fase) / concluídos` por projeto; 0 "Unknown widget";
   dados reais dos 3 projetos; scoping por `?project=`. (Ajuda ainda aparece na sidebar até o item A.)

**Saída:** se o render bate com a imagem #2 → segue pro C (publish). Se não, ajustar manifest (lado
atomic-skills) e/ou shell (aiDeck) ANTES de publicar.

---

## A — `page.showInNav?: boolean` (default `true`) — Ajuda fora da sidebar (cosmético)

Não bloqueia a validação do core (sem ele, a Ajuda só aparece a mais na sidebar). Faz a página
"Ajuda" ficar **alcançável** (rota + `?`/`help:`/`commandPalette`) mas **fora** da nav.

1. **Schema** (`src/server/manifest-schema.ts`): `showInNav: z.boolean().optional()` nas três page
   schemas — `sectionsPageSchema` (~:242), `gridPageSchema` (~:252), `singlePageSchema` (~:267) — ou
   fatore uma base. `undefined`/`true` = visível (default não-regressivo); `false` = fora da nav.
2. **Tipo** (`useActiveManifest.ts` `PageMeta`, ~:14-21): `showInNav?: boolean`.
3. **Sidebar** (`Sidebar.vue`): filtre `p.showInNav !== false` onde itera `pages` (~:78) e
   `projectPages` (~:43). NÃO filtre rota nem landing.
4. **Tab bar** (`ConsumerPage.vue`, `v-for="page in pages"` ~:28): mesmo filtro.
5. **Helper** (`App.vue:95` `nonLandingPages`/`projectPages`): aplique o filtro aí também.

**Aceitação** (estende `sidebar-nav.test.ts`, fixture NEUTRA): page `showInNav: false` não aparece na
Sidebar/tab bar/lista do projeto, mas continua roteável e abrível por `help:`/`?`; default `true`
mantém o resto visível. O manifest do atomic-skills já pré-cabeia `showInNav: false` na page help.

---

## C — Publicar a v2.1 no npm (ÚLTIMO — só depois de B passar)

Gate do owner: **não publicar antes de validar localmente.** Quando o render local estiver aprovado:

1. **Merge** `feat/ds-v2.1-widgets` (com A incluído) → `main`.
2. **Rebuild COMPLETO** `npm run build` (não publicar de `dist/` meio-buildado).
3. **Bump** `npm version 0.2.0` (minor — feature aditiva grande). NB: `schemaVersion` do **manifest**
   segue `"0.1"` (aditivo); é o semver do **pacote** que vai a 0.2.0.
4. **Publish** `npm publish` + tag `v0.2.0` + `CHANGELOG.md` (engine v2 declarativo, widgets v2.1,
   nav.style:'projects', page.showInNav).
5. **Coordenação:** depois disso o atomic-skills bumpa a dep `^0.1.0` → `^0.2.0`, reinstala e re-roda
   o guardrail `tests/aideck-manifest-widget-registry.test.js`.

---

## Resumo executável (na ordem)

1. **B (AGORA)** — subir o aiDeck do código local (build completo OU source) + provisionar/emitir/
   registrar + capturar CDP e comparar com a imagem #2. É a validação que destrava tudo.
2. **A (paralelo, pequeno)** — `page.showInNav` p/ tirar a Ajuda da sidebar. Cosmético; pode entrar
   antes do publish, mas não bloqueia a validação do core.
3. **C (ÚLTIMO)** — só **depois** da validação local: merge→main · build · `npm version 0.2.0` ·
   publish · tag/CHANGELOG; depois atomic-skills bumpa a dep.

Itens 1-6 da tabela já estão ✅ — não refazer, só validar no caminho.
