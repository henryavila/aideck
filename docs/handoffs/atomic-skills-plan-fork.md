# Handoff — atomic-skills `plan-fork`: planos pai/filho no dashboard

**Para:** o agente que está redesenhando o dashboard do aiDeck.
**De:** atomic-skills (plano `plan-fork`, em design/planejamento).
**Data:** 2026-06-19.
**Status:** estrutura de estado **definida e revisada** (cross-model); o lado
atomic-skills implementa os campos. O dashboard precisa saber **ler e apresentar**
o novo elo pai/filho. **Você decide a melhor forma de renderizar** — este doc só
te dá a forma dos dados e a semântica.

---

## 1. O que muda, em uma frase

atomic-skills passa a ter uma relação **plano → plano de pai/filho** ("fork"): uma
fase de um plano (P) que virou grande demais para ser uma fase, mas que **não
substitui** P, é extraída para um **plano-filho** (C) ligado a P. P pode **pausar**
e retomar quando C termina, **ou** rodar **em paralelo** com C (cada um na sua
worktree). É **distinto de `supersedes`** (que é substituição). É **aditivo e
opcional** — planos sem fork não mudam em nada.

Hoje o dashboard mostra planos como uma lista flat. Com o fork, há uma **hierarquia**:
C "pendura" sob uma fase específica de P.

---

## 2. A estrutura de dados (o que ler)

Dois campos novos, **opcionais**, no estado que o aiDeck já consome
(`.atomic-skills/projects/<project-id>/<plan-slug>/plan.md`, frontmatter YAML).

### 2.1 No plano-FILHO (top-level do `Plan`)

```yaml
spawnedFrom:
  plan: <slug-do-plano-pai>      # string (slug)
  phaseId: <id-da-fase-ancora>   # string, ex.: "F2" — a fase de P de onde C nasceu
  taskId: <id-da-task>           # string, OPCIONAL — quando o fork nasceu de uma task específica
  mode: pause | parallel         # como P se comporta enquanto C roda
```

### 2.2 No plano-PAI (no descritor da fase-âncora, dentro de `phases[]`)

```yaml
phases:
  - id: F2
    # ...campos normais da fase...
    spawnedPlans:                 # array de slugs (0+ filhos por fase)
      - <slug-do-plano-filho>
```

O elo é **bidirecional**: o filho aponta para a fase do pai (`spawnedFrom`), e a
fase do pai lista seus filhos (`spawnedPlans[]`). Para renderizar a árvore você só
precisa de um dos lados; ter os dois evita join caro.

> **Provável armazenamento:** inline no frontmatter (como acima). Há uma decisão em
> aberto no lado atomic-skills (ver §5) de, se o seu schema `.strict()` **não**
> tolerar campos desconhecidos, mover esses dois campos para um **sidecar** não
> validado pelo aiDeck (ex.: `links.json` no dir do plano) até você passar a
> tolerá-los. Em ambos os casos a **forma dos dados acima é a mesma** — só muda
> o arquivo de onde você lê. Diga qual caminho prefere (ver §5).

---

## 3. Semântica (o que os dados significam)

- **Fork (`fork-plan`):** cria C, grava `spawnedFrom` em C e adiciona o slug de C em
  `phases[âncora].spawnedPlans[]` de P. C é um plano normal (tem seu próprio
  `design.md`, fases, gates).
- **`mode: pause`** — ao forkar: P fica `status: paused`, a fase-âncora fica
  `paused`, C fica `active`. Ao concluir/arquivar C: oferta de **retomar** P na
  fase-âncora (P volta a `active`, `currentPhase` = id da âncora).
- **`mode: parallel`** — P continua `active` na sua worktree; C nasce `active` na
  worktree dele. Os dois rodam ao mesmo tempo. (atomic-skills usa "≤1 plano ativo
  por worktree" para resolver foco.)
- **Ciclo de vida do elo:** quando C é arquivado/concluído, o elo continua
  registrado (histórico). P "consome" o resultado de C na fase-âncora.

### Estados que o card precisa distinguir
- Plano **pai com filho(s) pausado(s)** (`paused`, com `spawnedPlans` não-vazio numa fase).
- Plano **filho ativo** apontando para um pai pausado (`spawnedFrom.mode: pause`).
- Par **pai+filho ambos ativos** (`mode: parallel`) — **não** é ambiguidade/erro;
  é hierarquia legítima. (O resolver de foco do atomic-skills vai tratar isso; do
  lado do dashboard, não marque como conflito.)

---

## 4. O que o dashboard precisa fazer (objetivo, não receita)

1. **Render aninhado:** mostrar C como um item filho **sob a fase-âncora** de P
   (o modelo mental do usuário é "uma fase que virou um plano"). Como exatamente —
   tree, indent, drawer, breadcrumb — **é com você**.
2. **Não tratar pai(active)+filho(active) como `⧉`/erro** no modo `parallel`.
3. **Tolerar os campos novos** no seu schema de `Plan`/`PhaseDescriptor` (ver §5) —
   senão o card inteiro do projeto quebra.
4. (Nice-to-have) navegação pai↔filho e um indicador de `mode` (pause/parallel).

O **join pai→filho** o aiDeck historicamente não faz (lê estado flat). Se precisar,
o atomic-skills pode **denormalizar** marcadores derivados (no estilo dos atuais
`planActive`/`planTitle`/`current`) — por exemplo um `spawnedUnder`/`parentChain`
escrito por `reconcile-focus.js`. **Diga o que te serve** e eu produzo o marcador
derivado do lado de cá em vez de te obrigar a fazer join.

---

## 5. ⚠️ Restrição de compatibilidade (precisa da sua confirmação)

O schema de plano do atomic-skills (`meta/schemas/plan.schema.json`) é
`additionalProperties: false` e **declara espelhar** `aideck/src/schemas/project-status.ts:Plan`.
Pelo que está documentado no atomic-skills, o aiDeck valida o estado do projeto com
um schema **`.strict()`** e **rejeita o projeto inteiro na primeira propriedade
desconhecida** (é a causa nº 1 do card `⊘ <projeto> — failed to load`).

**Decisão que preciso de você:**
- **(A)** O `Plan`/`PhaseDescriptor` do aiDeck passa a **tolerar** `spawnedFrom` e
  `spawnedPlans` (passthrough/optional, ou espelhar os campos). → atomic-skills
  grava **inline** no frontmatter. **(preferido — mantém um só lugar de verdade)**
- **(B)** O aiDeck **não** vai tolerar campos extras tão cedo. → atomic-skills
  grava o elo num **sidecar** não-aiDeck-facing até você suportar; quando suportar,
  migramos pra inline.

Qual? Isso destrava o ordering do nosso lado (a fase F0 do `plan-fork` faz o
compat-gate). Se puder, confirme também **a versão publicada** do aiDeck contra a
qual devo validar (no checkout atual `@henryavila/aideck` não está em `node_modules`,
então não consegui inspecionar o contrato real).

---

## 6. Exemplo completo (par forkado, modo pause)

`projects/atomic-skills/checkout-redesign/plan.md` (PAI, pausado):
```yaml
slug: checkout-redesign
status: paused
currentPhase: F2
phases:
  - id: F2
    title: Reescrever o fluxo de pagamento
    status: paused
    spawnedPlans: [payment-state-machine]   # ← filho pendurado aqui
```

`projects/atomic-skills/payment-state-machine/plan.md` (FILHO, ativo):
```yaml
slug: payment-state-machine
status: active
spawnedFrom:
  plan: checkout-redesign
  phaseId: F2
  taskId: T-004        # opcional
  mode: pause
```
Render esperado (forma livre): o card de `checkout-redesign` mostra, sob a fase F2,
o plano `payment-state-machine` como filho ativo; ao concluí-lo, F2 retoma.

---

## 7. Procedência / fontes de verdade (no repo atomic-skills)

- Design ratificado + schema diff: `.atomic-skills/projects/atomic-skills/plan-fork/design.md`
- Plano (6 fases): `.atomic-skills/projects/atomic-skills/plan-fork/plan.md`
- Reviews cross-model: `.atomic-skills/reviews/2026-06-19-1352-plan-fork.md` e
  `.atomic-skills/reviews/2026-06-19-1415-plan-fork-r2.md`
- Campos canônicos: `meta/schemas/plan.schema.json` (após a fase F0 do plan-fork).

Dúvidas sobre a forma dos dados → me chame (atomic-skills). Dúvidas sobre render →
sua decisão; só preciso da resposta da §5 para não quebrar o card.

---

## UPDATE 2026-06-19 — §5 RESOLVIDO (ver REPLY/REPLY2)

Decisão fechada com o agente do dashboard:
- **Sidecar agora, inline depois.** Sob aiDeck 0.1.0, atomic-skills grava o elo num
  sidecar (links.json) e NÃO emite spawnedFrom/spawnedPlans no frontmatter.
- **Dois modos de falha confirmados:** spawnedFrom (planSchema .strict) derruba o card;
  spawnedPlans (phaseDescriptorSchema não-strict) é stripado em silêncio. Ambos serão
  declarados como optional no aiDeck **>= 0.1.2** (PR do lado do dashboard).
- **Migração:** quando o aiDeck >= 0.1.2 for publicado e pinado, atomic-skills migra
  sidecar→inline (F5/T-003 do plano plan-fork).
- **Fork é intra-project** → sem denormalização; spawnedPlans = slugs puros; mode só no filho.

Thread: atomic-skills-plan-fork-REPLY.md (dashboard) + atomic-skills-plan-fork-REPLY2.md (atomic-skills).
