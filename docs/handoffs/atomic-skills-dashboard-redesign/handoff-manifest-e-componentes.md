# atomic-skills · dashboard → manifest + componentes novos

Handoff do desenho (`Atomic Skills Dashboard.dc.html`) para **(1)** a estrutura do
`manifest.yaml` que o agente vai gerar e **(2)** os componentes novos a criar no aiDeck.

A tela é **scoped por projeto** (troca no menu lateral, como o ui-kit do DS). Tudo abaixo
descreve o manifest de **um** projeto; o aiDeck repete por projeto via `ProjectRegistry`.
Acima dos projetos há uma **Home / Panorama** cross-project (§0). A **Ajuda** (catálogo de
skills) é um domínio ortogonal, aberto pelo **botão `?` nativo do aiDeck** no chrome (§0b).

---

## 0. Home — Panorama (bird's-eye cross-project)

Landing padrão do dashboard. Responde "olhando tudo de cima, onde está a ação?". Otimizada
para **1–10 projetos**. **Link:** item **"Panorama"** no topo da sidebar + o wordmark `aiDeck`
no chrome (ambos levam à Home); o breadcrumb mostra `/ Panorama`.

**Quais dados (o que melhor informa):** por projeto → **modo** (paralelo `N` / isolado /
ocioso), **frentes vivas listadas** (onde a paralelização fica visível — "o que rodo em
paralelo"), **bloqueios** (atenção, borda coral no card), fases ativas e o conjunto de planos.
No topo, faixa de totais: projetos, frentes ativas, projetos em paralelo, tasks travadas.

**Layout:** `single` com uma faixa de `stat` + uma **grade de cards** `auto-fit minmax(340px,
1fr)` — 1 projeto ocupa largura cheia, 10 quebram em colunas densas sem scroll horizontal.

```yaml
- page: panorama
  home: true                                # landing; link no topo da sidebar + wordmark
  layout: single
  widget:
    widget: project-grid                    # ◀ NOVO (§3.10)
    source: { ref: projects }               # cross-project (ProjectRegistry)
    config:
      summary: [ {count: projects}, {sum: activeFronts}, {count: parallelProjects}, {sum: blocked} ]
      card:
        mode: { from: activeCount }         # paralelo N · isolado · ocioso
        fronts: { ref: plans, filter: {status: active}, limit: 3, show: [status, title, nextAction, currentPhase] }
        attention: blocked                  # borda coral se > 0
        link: { to: foco-agora }            # nome do projeto entra no projeto
      grid: auto-fit-minmax-340
```

## 0b. Ajuda — catálogo de skills (domínio ortogonal)

**Não** ligada à hierarquia de planos — uma **lista plana** de skills (descobrir/entender as
ferramentas). **Link:** o **botão `?` nativo do aiDeck** no chrome (NÃO um item de sidebar
dedicado) — a ajuda é chrome do runtime, igual ao spotlight ⌘K. Breadcrumb `/ Ajuda`.

**Dados** (`help.json`, 15 skills): `id, title, emoji, oneLiner, summary, versionAdded,
when[], whenNot[], examples[], args[], subcommands[] (agrupados — `project` tem 25 em 8 grupos),
related[], tags[], dependencies[], outputArtifacts[]`.

**Layout:** **master-detail**. Esquerda: lista buscável + filtro de tags (skills densas marcam
"N cmds"). Direita: detalhe rolável — summary, exemplos (mono), quando/quando-NÃO (2 colunas
✓/×), **subcomandos agrupados** por `group` (o caso denso), tabela de args, deps/artefatos, e
**related** como chips navegáveis (forma o grafo entre skills).

```yaml
help:                                        # aberto pelo botão ? do chrome (runtime)
  layout: master-detail
  source: { ref: skills }                    # catálogo plano, ortogonal aos projetos
  widget: skill-catalog                       # ◀ NOVO (§3.11)
  config:
    list: { search: true, facet: tags, denseBadge: subcommands.length }
    detail: { sections: [summary, examples, when, whenNot, subcommands(groupBy: group), args, related] }
```

---

## 1. As 4 páginas (= as 4 perguntas)

| slug         | pergunta            | layout     | default |
|--------------|---------------------|------------|---------|
| `foco-agora` | **Onde estou?**     | `sections` | ✅ sim  |
| `visao-geral`| **Qual o panorama?**| `sections` | —       |
| `plano`      | **Estou progredindo?** (detalhe) | `sections` (página de detalhe, `param.match`) | — |
| `concluidos` | (fora do caminho)   | `single`   | —       |

> **Concluídos** (`done`+`archived`) nunca aparecem nas 3 primeiras páginas — só aqui.
> Filtro padrão em toda coleção viva: `status NOT IN [done, archived]`.

---

## 2. Estrutura por página (pseudo-manifest)

### 2.1 `foco-agora` — onde estou agora

```yaml
- page: foco-agora
  title: Foco agora
  icon: target
  layout: sections
  sections:
    - title: ~                      # banner sem título
      widgets:
        - widget: parallelism-banner      # ◀ NOVO (§3.1)
          colSpan: 12
          source: { ref: plans, filter: { status: [active, paused] } }
          config:
            countOf: { status: active }    # nº de frentes ativas → paralelo vs isolado
            laneOf:  status                # uma "raia" por plano ativo/suspenso

    - title: Frentes em foco
      subtitle: fase atual e próxima ação de cada frente viva
      widgets:
        - widget: front-card               # ◀ NOVO (§3.2)
          repeat: { ref: plans, filter: { status: active } }   # 1 card por plano ativo
          colSpan: { 1: 12, default: 6 }   # 1 ativo = full; 2+ = meia largura
          source: { ref: initiatives, param: { match: [currentPhase] } }
          config:
            title: plan.title
            meta: plan.branch | plan.slug
            phaseChip: phase.status         # chip da fase atual
            phaseLabel: "{phase.id} · {phase.title}"
            parallelBadge: plan.parallelismAllowed && activePhases > 1
            live: true                      # indicador SSE (.is-live)
          slots:
            phases:  { widget: phase-stepper, source: { ref: phases } }         # §3.7 — macro (fases, pills)
            current: { widget: current-phase-progress, source: { ref: tasks, of: currentPhase } }  # §3.8 — micro (tasks, barra)
            metrics:  { gates: "{gatesMet}/{gatesTotal}", stack: stackDepth }
          titleLink: plano                     # o NOME do plano é o link p/ o detalhe (não um botão)
            nextAction: { widget: callout, field: nextAction, tone: info }

    - title: Suspenso & travado
      subtitle: o que não está andando — e por quê
      widgets:
        - widget: table
          colSpan: 12
          source: { ref: plans, filter: { status: [paused, blocked] } }
          config:
            columns: [plan.title, status, "currentPhase", nextAction]
            rowLink: plano                  # clique → página `plano`
            empty: "nada suspenso ou travado"
```

### 2.2 `visao-geral` — panorama

```yaml
- page: visao-geral
  layout: sections
  sections:
    - widgets:                              # tira de métricas (6 × colSpan 2)
        - { widget: stat, colSpan: 2, source: { ref: plans,       agg: count, filter: { status: active } },  config: { label: FRENTES ATIVAS,  tone: info } }
        - { widget: stat, colSpan: 2, source: { ref: plans,       agg: count, filter: { status: paused } },  config: { label: SUSPENSAS,       tone: warning } }
        - { widget: stat, colSpan: 2, source: { ref: phases,      agg: count, filter: { status: active } },  config: { label: FASES ATIVAS } }
        - { widget: stat, colSpan: 2, source: { ref: tasks,       agg: ratio, of: status==done },            config: { label: TASKS } }
        - { widget: stat, colSpan: 2, source: { ref: exit_gates,  agg: ratio, of: status==met },             config: { label: EXIT GATES } }
        - { widget: stat, colSpan: 2, source: { ref: tasks,       agg: count, filter: { blockedBy: "*" } },  config: { label: TASKS TRAVADAS, tone: error } }
    - title: Frentes vivas
      widgets:
        - widget: table
          colSpan: 12
          source: { ref: plans, filter: { status: [active, paused] } }
          config:
            columns: [plan.title, status, currentPhase, "tasksDone/tasksTotal", nextAction, lastUpdated]
            progressIn: tasks               # barra inline na coluna tasks
            rowLink: plano
```

### 2.3 `plano` — detalhe (drill-in)

Página de **detalhe**: a rota casa o registro via `param.match: [projectId, slug]`.
Topo tem um seletor (chips) das frentes vivas para trocar de plano.

```yaml
- page: plano
  layout: sections
  param: { match: [slug] }                  # /plano/:slug
  sections:
    - widgets:
        - widget: plan-picker               # ◀ NOVO (§3.9) — seletor dropdown no TÍTULO
          source: { ref: plans, filter: { status: [active, paused] } }
          config: { trigger: title, activeBy: slug, link: plano, show: [status, branch, currentPhase] }
    - widgets:
        - widget: phase-timeline            # ◀ NOVO (§3.3) — roteiro vertical c/ deps
          colSpan: 5
          source: { ref: phases, param: { match: [plan.slug] } }
          config:
            order: dependsOn                 # passado→presente→futuro
            edges: dependsOn                 # "depende de F0, F1"
            highlight: currentPhase
            nodeTone: status
            selectable: true                 # clicar numa fase seleciona-a
            selects: initiative-focus        # e troca o painel à direita p/ a fase clicada
            taskMeta: "{tasksDone}/{tasksTotal}"   # contagem por fase em cada linha

        - widget: initiative-focus          # ◀ NOVO (§3.4) — corpo executável
          colSpan: 7
          source: { ref: initiatives, param: { match: [selectedPhase] } }   # default = currentPhase
          empty: "fase ainda não decomposta em tasks"
          slots:
            nextAction: { widget: callout, field: nextAction, tone: info }
            tasks: { widget: task-list, groupBy: status, source: { ref: tasks } }   # §3.5
            gates: { widget: gate-list, source: { ref: exit_gates } }               # §3.6
```

### 2.4 `concluidos`

```yaml
- page: concluidos
  layout: single
  widgets:
    - widget: table
      source: { ref: plans, filter: { status: [done, archived] } }
      config:
        columns: [plan.title, status, "phasesDone/phaseCount", lastUpdated]
        summary: [ { count: archived }, { count: done } ]   # chips de contagem no topo
        rowLink: plano
```

---

## 3. Componentes novos a criar no aiDeck

Todos seguem o **frame canônico** (header · body · footer) e os **5 estados**
(default · loading · empty · error · live) do DS.

### 3.1 `parallelism-banner`
**Expressa:** projeto rodando **N frentes em paralelo** vs. **1 frente isolada** — o
sinal que você pediu como central. Número grande (mono) + raias verticais (1 por plano:
ativa = sólida/info, suspensa = fantasma/warning).
**Props:** `count` (planos ativos), `lanes[] {tone}`, `title`, `sub`, `accentTone`.
**Estados:** `count=0` → "nenhuma frente ativa" (neutro).

### 3.2 `front-card`
**Expressa:** uma frente viva — fase atual, progresso, gates, pilha e **próxima ação**.
É o `card` + `progress-bar` + `callout` compostos num frame; `.is-live` quando SSE-conectado.
**Props:** `title`, `meta`, `phaseChip {status}`, `phaseLabel`, `parallelBadge`,
`tasksDone/Total`, `gatesMet/Total`, `stackDepth`, `nextAction`, `lastUpdated`, `onOpen`.
**Estados:** empty quando a fase atual ainda não tem iniciativa.

### 3.3 `phase-timeline`
**Expressa:** o roteiro de fases como **timeline vertical** com **dependências**
(`dependsOn`) e fase atual destacada. Não é lista plana — mostra "depende de F0, F1".
Cada linha exibe a **contagem de tasks da fase** (`X/Y tasks`). **Interativo:** clicar numa
fase a **seleciona** (nó preenchido + linha destacada) e troca o `initiative-focus` à direita
para mostrar as tasks **daquela** fase — não só da atual. A fase atual já vem selecionada.
**Props:** `nodes[] {id,title,status,dependsOn,tasksDone,tasksTotal}`, `highlight`
(currentPhase), `selected` (controlado), `onSelect`, `edges`. Variante futura: `graph-dag`.

### 3.4 `initiative-focus`
**Expressa:** o corpo executável da **fase selecionada** (default = atual) — wrapper que
compõe próxima ação + tasks (agrupadas por status) + gates. Reage à seleção do
`phase-timeline`. Quando a fase selecionada não tem iniciativa decomposta, mostra estado
vazio honesto ("fase concluída — sem tasks abertas" / "fase ainda não decomposta").
**Props:** `phaseId`, `title`, `nextAction`, `tasksDone/Total`, `gatesMet/Total`,
`stackDepth`. **Slots:** `tasks`, `gates`.

### 3.5 `task-list`
**Expressa:** tasks **agrupadas por status** (Em curso · Travadas · Pendentes · Concluídas),
com glifo de status e, em travadas, o `blockedBy` ("⚑ por T-002").
**Props:** `groups[] {label,tone,items[] {id,title,status,blockedBy}}`. (Pode ser uma config
do `kanban-board` em modo lista vertical.)

### 3.6 `gate-list`
**Expressa:** exit gates com status (`met`/`deferred`/`pending`) + o **verifier label**
(mono, truncável — `shell: node --test …` ou `manual`).
**Props:** `gates[] {id,status,verifierLabel}`.

### 3.7 `phase-stepper` — trilha de fases (nível macro) ⭐
**Expressa:** o roteiro do plano como **stepper de pills numeradas** (`F0 · F1 · F2 …`),
uma por fase, **cor = status da fase**, conectadas por um traço curto. A fase atual recebe um
**anel "você está aqui"** por cima (sem mudar a cor do status).
**Por que pills, não barra:** duas barras finas empilhadas (fases + tasks) liam como duas
progress bars iguais — confuso. O stepper de pills é **visualmente inconfundível** com a barra
de tasks, separando os dois níveis de leitura.
**Cor por status:** `done`→success (tint) · `active`→info (sólido) · `paused`→warning ·
`blocked`→error · `pending`/futuro→pill tracejada neutra. Anel = `currentPhase`.
**Props:** `steps[] {phaseId, status, isCurrent}`, `label` ("2/7 fases concluídas").
**Onde:** front-card, célula `fases` da Visão geral (compacta), topo do `phase-timeline`.
**Variante:** `dense` (sem conectores, pills justas) para célula de tabela.

### 3.11 `skill-catalog` — ajuda / catálogo de skills ⭐
**Expressa:** o **domínio ortogonal da ajuda** — uma lista plana de skills para descobrir e
entender as ferramentas. **Master-detail:** lista buscável (com filtro de tags; skills densas
marcam "N cmds") + painel de detalhe rolável (summary, exemplos em mono, quando/quando-NÃO,
**subcomandos agrupados** por `group` — o caso denso `project`/25, tabela de args,
deps/artefatos, e **related** como chips navegáveis que pulam para a skill). Aberto pelo botão
`?` do chrome (runtime), não por item de sidebar.
**Props:** `skills[] {id,title,emoji,oneLiner,summary,versionAdded,when,whenNot,examples,args,
subcommands,related,tags,dependencies,outputArtifacts}`, `selected`, `query`, `tag`, `onSelect`.

### 3.10 `project-grid` — grade de projetos (Home) ⭐
**Expressa:** o **bird's-eye cross-project** — todos os projetos como cards numa grade
responsiva `auto-fit minmax(340px,1fr)` (escala 1–10 sem scroll horizontal). Cada card mostra
**modo** (paralelo `N` / isolado / ocioso), planos + fases ativas, **tasks travadas** (borda
coral de atenção quando >0), e lista as **frentes vivas** (status + título + próxima ação +
fase) — tornando a paralelização visível de cima. `.is-live` quando o projeto tem frente ativa.
O **nome do projeto é o link** que entra nele (→ Foco agora); cada frente lista linka direto
ao detalhe do plano. Acompanha uma faixa de `stat` com totais cross-project.
**Props:** `projects[] {id,name,activeCount,pausedCount,phasesActive,phasesTotal,blocked,
plansCount,completed,fronts[]}}`, `onEnter(projectId)`, `onOpenPlan(projectId,slug)`.

### 3.9 `plan-picker` — seletor de plano no título ⭐
**Expressa:** trocar de plano **sem fila de botões truncados**. O título do plano vira o
trigger (caret ▾); clicar abre um **dropdown rolável** de todas as frentes vivas, cada uma com
chip de status, **nome completo** (não corta), slug/branch e fase atual; a atual marcada ✓.
**Por quê:** uma faixa de tabs horizontais não escala — com 5+ planos os nomes cortam e a fila
estoura. O dropdown escala para N planos e mantém o nome inteiro legível.
**Props:** `plans[] {slug,title,status,branch,currentPhase}`, `active` (slug), `onSelect`.
Fecha em clique-fora / seleção. (Complementa o spotlight ⌘K para salto cross-project.)

### 3.8 `current-phase-progress` — tasks da fase ativa (nível micro)
**Expressa:** o **zoom na fase atual** — uma `progress-bar` de tasks **só da fase ativa**
("TASKS DA FASE ATUAL · F1 — 5/12") + meta de gates/stack. É a **única barra** do card,
abaixo do `phase-stepper`. No `phase-timeline` (detalhe), cada linha de fase exibe seu próprio
`X/Y tasks` — aí se veem as tasks de **cada** fase, não só da atual.
**Props:** `phaseId`, `tasksDone/Total`, `gatesMet/Total`, `stackDepth`.

> Reusados sem mudança: `stat`, `table`, `progress-bar`, `callout`, `tag-chip`, `badge`,
> `header-nav` (chrome), `drawer`/`sidebar` (menu lateral), `statusbar`.

> **Spotlight (⌘K):** o `header-nav` abre um command-palette (glass-thick) que busca em
> **todos os planos e páginas de todos os projetos** e navega ao escolher. É **chrome do
> runtime aiDeck**, não um widget do manifest — o consumer não declara; vem de graça. A busca
> casa título, slug, branch, projeto e status; resultados ordenam planos antes de páginas.

---

## 4. Vocabulário de status (consumer-owned → tom + glifo)

| status     | tom DS              | glifo | rótulo     |
|------------|---------------------|-------|------------|
| `active`   | `--status-info`     | ◉     | ativo      |
| `pending`  | `--status-neutral`  | ·     | pendente   |
| `paused`   | `--status-warning`  | ‖     | suspenso   |
| `blocked`  | `--status-error`    | ⚑     | travado    |
| `done`     | `--status-success`  | ✓     | concluído  |
| `archived` | `--status-neutral`  | ▢     | arquivado  |
| gate `met` | `--status-success`  | ✓     | met        |
| gate `deferred` | `--status-warning` | … | adiado     |

Chips: fill = `color-mix(status 14%, surface)`, borda = `color-mix(status 42%, border)`.
