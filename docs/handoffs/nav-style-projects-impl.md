# aiDeck — implementar `nav.style: 'projects'` (shell project-centric GENÉRICO) + publicar DS v2.1

> Handoff gerado pelo Claude Code (do lado atomic-skills). O consumer **atomic-skills é apenas o
> caso de uso** que motivou isto; **NADA do domínio dele entra no aiDeck** — ver o GATE abaixo.

## ⛔ GATE RÍGIDO (inegociável)

O aiDeck é **domain-agnostic**. Esta tarefa **não pode** introduzir nenhum vocabulário de domínio
de consumer no código do aiDeck. **Proibido** no diff (código, defaults, tipos; exceto fixtures
neutras): `atomic-skills`, `plan`, `phase`, `initiative`, `frente`, `panorama`, `foco`, `gate`,
`task`, ou qualquer rótulo de domínio/idioma específico de um consumer.

A feature usa **somente primitivos genéricos que o aiDeck já tem**: `consumers`, `projects`
(project-registry / `GET /api/projects`), `pages`, `dataSources`, `scope` (`project` |
`all-projects`). Qualquer rótulo humano (ex.: "PROJETOS") é **fornecido pelo manifest do
consumer**, nunca hardcoded no aiDeck.

**Verificação obrigatória:** `git diff main` + grep dos termos proibidos = **0** ocorrências fora
de fixtures neutras. Adicione um teste/CI que falhe se vazar.

## Contexto (shell atual = consumer-centric)

- `src/client/components/shell/Sidebar.vue` lista **CONSUMERS** (`~/.aideck/consumers/<id>`); o
  consumer ativo expande para suas pages + árvore de data-sources.
- `src/client/pages/HomePage.vue` (`/`) = grid de "Registered runtimes" (consumers).
- Troca de projeto = `<select>` no topo-direito (`ConsumerPage.vue`) + `?project=` na URL.
- `src/server/manifest-schema.ts:344` → `nav.style ∈ {tabs, sidebar}`.

Um consumer com dataSources `root: project` registra N **projects** (project-registry). Alguns
querem um shell **project-centric**: uma **landing cross-project fixa no topo** + uma **lista de
projects na sidebar** como unidade primária de navegação. É uma capacidade **genérica de shell** —
falta só o aiDeck oferecê-la.

## O que implementar (tudo genérico)

1. **Schema** (`manifest-schema.ts`): `navSchema.style` → `z.enum(['tabs','sidebar','projects'])`.
   Opcionais genéricos:
   - `nav.projectsLabel?: string` — rótulo do grupo na sidebar (default em inglês, ex. `"projects"`).
   - `nav.landingPage?: string` — slug da page usada como landing cross-project (default = a page
     com `default: true`).
2. **Sidebar** (`Sidebar.vue` / `App.vue`), no modo `projects`:
   - Fixa no **topo** um item único = a **landing page** do consumer (genérico: usa `page.title`/
     `page.icon`); clicar leva à landing (cross-project).
   - Abaixo, um grupo rotulado por `projectsLabel` listando os **projects registrados do consumer
     ativo** (de `fetchProjects(consumerId)` / project-registry); cada project é uma row;
     selecionar define o escopo (reusar `selectedProjectId` + `?project=`) e expande para as pages
     `scope: project` do consumer.
   - Mantém a árvore de data-sources. **Não** lista outros consumers aqui (troca de consumer
     segue pela HomePage/wordmark).
3. **Landing cross-project**: a raiz do consumer (`/:consumerId`) renderiza a `landingPage` (que o
   consumer declara com widgets `scope: all-projects` — **já suportado**). O aiDeck só roteia a
   raiz para essa page e a pina no topo. (Dados cross-project já são expressáveis; falta o slot
   de shell.)
4. **Breadcrumb**: no modo projects, `consumer / project / page` (genérico, dos params/estado).
5. **Compat**: `tabs`/`sidebar` inalterados; é um terceiro modo aditivo.
6. **Page fora da nav (genérico) — `page.showInNav?: boolean` (default `true`)**: hoje o runtime
   lista **toda** page declarada na sidebar/tab bar; não há como ter uma page **alcançável** (por
   rota e pelo botão `?` do chrome / `help:`) mas **ausente da nav**. Adicione um flag de page
   `showInNav` (default `true`) no `pageSchema` (`manifest-schema.ts`); quando `false`, a page **não
   aparece** na Sidebar/tab bar mas continua roteável e abrível por `help:`/`?`/`commandPalette`.
   É um primitivo genérico de shell (vale para os 3 modos `tabs`/`sidebar`/`projects`), **sem
   vocabulário de consumer** — o consumer decide quais pages esconder (ex.: uma página de "ajuda"
   ortogonal acessada só pelo `?`). Aplica em `Sidebar.vue` (filtra `pages.filter(p => p.showInNav !== false)`)
   e no `tab bar` do `ConsumerPage.vue`.

## Publicar DS v2.1 (parte B do gap report)

Os 7 widgets (`stepper`, `status-list`, `callout`, `collection-grid`, `record-switcher`,
`headline-banner`, `catalog`/`phase-timeline`) **já estão implementados** no branch
`feat/ds-v2.1-widgets` e renderizam (validado via `--static-dir`). Merge → `main` + `npm version`
(ex.: `0.2.0`) + `npm publish`. (`catalog` já é widget de manifest: `WidgetRenderer.vue:101`.)

## Testes / aceitação

- **Fixture NEUTRA** (não-atomic-skills, ex.: `demo`/`acme`): consumer com `nav.style: 'projects'`,
  `projectsLabel`, 2–3 projects → sidebar mostra a landing no topo + a lista de projects;
  selecionar um escopa as pages.
- **Gate test**: grep do diff por termos de domínio proibidos = 0.
- **Não-regressão**: consumers `sidebar`/`tabs` inalterados.
- **Prova visual**: rodar e capturar com a fixture neutra.

## Arquivos prováveis

`src/server/manifest-schema.ts` (enum + 2 campos), `src/client/components/shell/Sidebar.vue`,
`src/client/pages/ConsumerPage.vue` / `App.vue` (modo + landing routing),
`src/client/pages/HomePage.vue` (inalterado ou ajuste menor), testes + fixture neutra.

> Validado contra o source em 2026-06-19: a causa raiz do "dashboard errado" é exatamente a
> ausência deste modo de shell (o resto do gap report — widgets e navegação por `linkTo`/`cell:`
> slots — já existe no aiDeck v2.1).
