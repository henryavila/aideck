# aiDeck — Widgets a criar (especificação agnóstica)

> **Contexto.** Esta spec descreve **widgets genéricos do aiDeck** que ainda não existem na
> biblioteca de 25. Eles nasceram de um dashboard real, mas aqui estão **livres de domínio**:
> nenhum conceito de um consumer específico aparece. O aiDeck é o substrato — ele só conhece
> **registros, coleções, campos, status e tons**. Qualquer vocabulário de domínio (o que um
> "registro" significa, quais são os status válidos) vem do **manifest do consumer**, nunca do
> widget.
>
> **Regra de ouro (do brand guide):** *"Consumer-agnostic. No hardcoded domain vocabulary. A
> token named `--status-success` is correct; `--phase-done` is not."* Toda prop, todo nome de
> campo e todo exemplo abaixo respeita isso. Onde um exemplo precisa de dados, usa nomes
> neutros (`records`, `items`, `nodes`, `steps`, `groups`, `metrics`).

---

## 0. Princípios comuns a todos os widgets

### 0.1 Frame canônico + 5 estados
Todo widget herda o frame do DS (**header · body · footer opcional**) e suporta os **5
estados**: `default` · `loading` (skeleton) · `empty` (texto terso + ação concreta) · `error`
(borda coral + mensagem + `suggestion`) · `live` (`.is-live`, scanline SSE). Não repetir a
descrição em cada widget — assume-se em todos.

### 0.2 Status é dado-do-consumer; tom é do DS
Widgets recebem um campo `status` cujos **valores são arbitrários** (definidos pelo consumer).
O widget **nunca** assume um conjunto de status. O manifest fornece um **mapa status → tom**:

```yaml
statusMap:                # consumer-defined; o widget só consome o tom resultante
  <qualquer-valor>: success | warning | error | info | neutral
```

O widget resolve o tom para os tokens do DS (`--status-success`, …) — fill
`color-mix(<tom> 14%, surface)`, borda `color-mix(<tom> 42%, border)`, dot sólido. **Nenhum**
status é hardcoded no componente.

### 0.3 Inputs sempre por binding genérico
Todo widget é alimentado por um `source` (`ref` a uma coleção/registro do manifest) + um
mapa de campos (`fieldMap`) que diz **qual campo do dado** preenche **qual papel visual**
(`title`, `status`, `caption`, `metric`, …). Assim o mesmo widget serve qualquer domínio.

### 0.4 Densidade
Padding de card 10–14px, linhas densas 4–6px, type base 13–14px, radius 8px (pills 999px).
Um consumer com 5+ páginas × 10–20 widgets cabe em um 13″ sem scroll horizontal.

---

## 1. Resumo — o que criar

| # | Widget novo | Classe | Substitui (nomes de domínio que usei) |
|---|---|---|---|
| 1 | **`stepper`** | NOVO | trilha de etapas horizontal + timeline vertical com dependências |
| 2 | **`status-list`** | NOVO | lista agrupada por status + lista de critérios |
| 3 | **`callout`** | NOVO (átomo) | caixa de destaque "próxima ação" |
| 4 | **`collection-grid`** | NOVO (layout) | grade responsiva data-bound de cards |
| 5 | **`record-switcher`** | NOVO | seletor dropdown no título |
| 6 | **`catalog`** | NOVO (master-detail) | navegador de referência buscável |
| 7 | **`headline-banner`** | NOVO | stat-banner com faixa de marcas |

| # | Existente a estender | Classe | O que falta |
|---|---|---|---|
| 8 | **`progress`** | ENHANCE | rótulo + legenda; (opcional) modo segmentado |
| 9 | **`card`** | ENHANCE | composição por slots + título-link + footer-link |
| 10 | **`header-nav`** | CHROME | command-palette (atalho global) + ação de ajuda |

> **Composições (não são widgets novos):** o "card de registro vivo" e o "painel de detalhe"
> são **composições** de `card` + `stepper` + `progress` + `callout` + `status-list` dentro de
> um `container`/`grid`. Documentadas em §11 como *presets*, não como widgets a implementar.

---

## 2. `stepper` — indicador de etapas por status

### Propósito
Mostrar uma **sequência ordenada de etapas**, cada uma colorida pelo seu status, com uma etapa
marcada como **atual**. Cobre dois layouts do mesmo conceito: **horizontal** (pills compactas,
para visão macro num card ou célula) e **vertical** (linha do tempo com metadados e
**dependências** por etapa). Preenche a lacuna entre `progress` (uma barra só) e `timeline`
(eventos cronológicos) e `tree` (hierarquia) — nenhum expressa "onde estou numa sequência de
estados discretos".

### Anatomia
- **horizontal:** pills com rótulo curto (`id`), conectadas por um traço; etapa atual com anel.
- **vertical:** nós numa coluna + conector vertical; cada linha tem rótulo, status-chip,
  métrica opcional (à direita), título e **legenda de dependências**; linha selecionável.

### Data contract
```ts
interface StepperData {
  steps: Step[];
  currentId?: string;          // recebe o anel "você está aqui"
  selectedId?: string;         // (vertical, selectable) linha destacada
}
interface Step {
  id: string;                  // rótulo curto exibido na pill (ex.: "S1")
  label?: string;              // título da etapa (vertical)
  status: string;              // consumer-defined → tom via statusMap
  dependsOn?: string[];        // ids de etapas das quais depende (vertical)
  metric?: string;             // texto curto à direita (ex.: "5/12")
  badge?: string;              // chip extra opcional
}
```

### Config
```yaml
widget: stepper
orientation: horizontal | vertical    # default horizontal
selectable: false | true              # vertical: clicar emite onSelect(step.id)
showDependencies: true                # vertical: render "depende de A, B"
dense: false | true                   # horizontal sem conectores (célula de tabela)
fieldMap: { id: <campo>, label: <campo>, status: <campo>, dependsOn: <campo>, metric: <campo> }
statusMap: { … }                      # §0.2
emits: { onSelect: <ação> }           # ex.: selecionar atualiza outro widget
```

### Regras de cor (via tom resolvido)
- status que mapeia para `success` → pill preenchida (tint forte).
- status `info`/ativo → pill sólida.
- demais tons → pill tint suave.
- sem status / futuro → pill tracejada neutra.
- `currentId` → anel `info` por cima (não muda a cor do status).

### Estados
default/loading/empty(`"sem etapas"`)/error/live como §0.1. `empty` quando `steps=[]`.

### Binding (genérico)
```yaml
- widget: stepper
  orientation: vertical
  selectable: true
  source: { ref: nodes, where: { parentId: "$record.id" } }
  fieldMap: { id: code, label: title, status: state, dependsOn: deps, metric: progressText }
  emits: { onSelect: { set: selectedNode } }   # outro widget lê selectedNode
```

### A11y / interação
Pills com `title` = `id · status · label`. Vertical selecionável: `role="button"`,
foco navegável, seleção persistente. Transições 120ms.

---

## 3. `status-list` — lista de itens por status (com agrupamento)

### Propósito
Listar **itens curtos**, cada um com um **status** e opcionalmente uma **anotação** (ex.: um
motivo, uma origem), com **agrupamento por campo** opcional. Unifica dois padrões: "lista
agrupada por status" e "lista de critérios com rótulo de verificação". É a `list` do DS
acrescida de: chip de status por item, anotação secundária e `groupBy`.

### Anatomia
Seções opcionais (um header por grupo, com contagem) → linhas: `id` mono + rótulo + status-chip
+ anotação (à direita, tom de atenção quando aplicável).

### Data contract
```ts
interface StatusListData { items: Item[]; }
interface Item {
  id?: string;                 // rótulo mono curto (ex.: "T-004")
  label: string;               // texto principal
  status: string;              // consumer-defined → tom
  groupKey?: string;           // valor pelo qual agrupar (se groupBy ligado)
  annotation?: string;         // texto secundário (ex.: "por X, Y")
  annotationTone?: string;     // tom da anotação (default: herda do status)
  meta?: string;               // rótulo terciário mono (ex.: origem/verificador)
}
```

### Config
```yaml
widget: status-list
groupBy: <campo> | none               # cria seções; ordem de grupos configurável
groupOrder: [ … ]                     # ordem explícita dos grupos
showCount: true                       # contagem por grupo no header
fieldMap: { id, label, status, group: <campo>, annotation, meta }
statusMap: { … }
emits: { onItem: <ação> }             # opcional: clicar num item
```

### Estados
`empty` → `"lista vazia"` (terso). Demais como §0.1.

### Binding (genérico)
```yaml
- widget: status-list
  groupBy: state
  groupOrder: [running, blocked, pending, done]
  source: { ref: items, where: { ownerId: "$record.id" } }
  fieldMap: { id: code, label: title, status: state, annotation: blockedByText, meta: source }
```

### Variantes
- **`checklist`**: `groupBy: none`, cada item é um critério com status + `meta` (rótulo de
  verificação mono, truncável). Mesmo widget, sem agrupamento.

---

## 4. `callout` — caixa de destaque (átomo)

### Propósito
Realçar **um campo importante** de um registro (uma instrução, um alerta, um próximo passo)
numa caixa com barra lateral colorida por tom. Pequeno, mas reutilizado em muitos widgets.
Não existe equivalente nos 25 (Badge/Tag são inline; isto é um bloco).

### Data contract
```ts
interface CalloutData { eyebrow?: string; body: string; tone?: string; } // tone → token DS
```

### Config
```yaml
widget: callout
tone: info | success | warning | error | neutral   # default info
fieldMap: { eyebrow: <campo|literal>, body: <campo> }
```

### Anatomia
Barra lateral 2px (tom) + fundo `color-mix(<tom> ~8%, surface)` + eyebrow (uppercase, tom) +
corpo (texto). Radius 0 6px 6px 0.

### Estados
`empty` → não renderiza (ou placeholder terso se exigido pelo layout).

---

## 5. `collection-grid` — grade responsiva data-bound de cards

### Propósito
Repetir um **template de card** sobre uma **coleção**, numa grade **responsiva auto-fit**
(`minmax(<min>, 1fr)`) que escala de 1 a N registros sem scroll horizontal. Difere do `grid`
do DS (posicionamento explícito 12-col) por ser **data-bound** (1 card por registro) e
**auto-fluida**. É o primitivo de "visão de cima de uma coleção".

### Data contract
Recebe uma coleção + um `card` template (composição — §11). Cada registro alimenta um card.
```ts
interface CollectionGridData { records: Record<string, unknown>[]; }
```

### Config
```yaml
widget: collection-grid
source: { ref: <coleção> }
minColWidth: 340px                    # auto-fit minmax(minColWidth, 1fr)
gap: 14px
attention: { when: <campo>, gt: 0, tone: error }   # borda de atenção condicional no card
card:                                  # composição (§11) — slots data-bound
  title: { field: <campo>, link: { to: <página>, param: <campo> } }
  badge: { field: <campo> }            # ex.: um "modo" derivado
  metrics: [ { label: <literal>, field: <campo> }, … ]
  nested:                              # mini-lista de registros-filhos dentro do card
    source: { ref: <coleção-filha>, where: { … }, limit: 3 }
    show: { status: <campo>, title: <campo>, caption: <campo>, badge: <campo> }
    onItem: { to: <página>, param: <campo> }
  live: { when: <campo> }              # aplica .is-live ao card
  footer: { field: <campo> }           # ex.: timestamp relativo
```

### Estados
`empty` (coleção vazia) → card único terso ou mensagem. Cada card herda seus próprios 5 estados.

### Binding (genérico)
```yaml
- widget: collection-grid
  source: { ref: records }
  minColWidth: 340px
  attention: { when: blockedCount, gt: 0 }
  card:
    title: { field: name, link: { to: detail, param: id } }
    badge: { field: mode }
    metrics: [ {label: "A", field: countA}, {label: "B", field: countB}, {label: "C", field: countC} ]
    nested: { source: { ref: children, where: { parentId: "$record.id", state: active }, limit: 3 },
              show: { status: state, title: title, caption: nextText, badge: code } }
    live: { when: hasActiveChild }
    footer: { field: updatedRel }
```

---

## 6. `record-switcher` — seletor dropdown no título

### Propósito
Trocar o **registro em foco** de uma página de detalhe **sem uma fila de tabs truncadas**. O
título da página vira o trigger (caret ▾); clicar abre um **dropdown rolável** da coleção, cada
linha com status + rótulo completo + metadados; o atual marcado. Escala para N registros (tabs
horizontais não). Nada nos 25 faz isto (Tabs é sempre-visível; Search/Filter é caixa).

### Data contract
```ts
interface RecordSwitcherData { records: SwitchItem[]; currentId: string; }
interface SwitchItem { id: string; title: string; status: string; caption?: string; }
```

### Config
```yaml
widget: record-switcher
trigger: title                        # ancora no h1 da página
source: { ref: <coleção>, where: { … } }
fieldMap: { id, title, status, caption }
statusMap: { … }
emits: { onSelect: { set: currentRecord } }   # rota/estado da página de detalhe
```

### Anatomia
Trigger: título + caret. Dropdown: overlay `bg-elevated`, borda, `shadow-xl`, rolável
(`max-height ~60vh`); linha = status-chip + (título + caption mono) + ✓ no atual. Fecha em
seleção / clique-fora.

### Estados
`empty` → trigger sem caret (coleção de 1). `loading` → título skeleton.

---

## 7. `catalog` — navegador master-detail buscável

### Propósito
Explorar uma **coleção plana de registros ricos** (descobrir + entender). **Master-detail:**
lista buscável + facetada à esquerda; painel de detalhe à direita com **seções configuráveis**.
Suporta o caso denso: um registro com **muitos sub-itens agrupados**. Nenhum dos 25 faz
master-detail. Internamente compõe `search`, `list`, `tag`, `status-list`, `table`, `code`,
`markdown`.

### Data contract
```ts
interface CatalogData { records: CatalogRecord[]; }
interface CatalogRecord {
  id: string; title: string; icon?: string;   // icon = glyph/emoji opcional, fornecido pelo dado
  oneLiner?: string; summary?: string; version?: string;
  facets?: string[];                           // rótulos para filtro (genérico)
  examples?: string[];                         // linhas de código/comando
  prosList?: string[]; consList?: string[];    // duas colunas (ex.: "quando / quando não")
  subItems?: SubItem[];                        // agrupáveis (caso denso)
  fields?: { name: string; kind?: string; required?: boolean; description: string }[];
  refs?: string[];                             // ids de registros relacionados (grafo)
  deps?: string[]; outputs?: string[];         // chips / lista mono
}
interface SubItem { name: string; group?: string; signature?: string; description: string; }
```

### Config
```yaml
widget: catalog
source: { ref: <coleção> }
list:
  search: true                        # casa title, id, oneLiner, summary, facets, subItems
  facets: { field: facets }           # chips de filtro derivados do campo
  denseBadge: { field: subItems, as: count }   # marca "N itens" em registros densos
detail:
  sections:                           # ordem e presença configuráveis; cada uma é um widget
    - summary                         # markdown curto
    - examples                        # code blocks (mono)
    - prosCons                        # duas colunas ✓ / ×
    - subItems: { groupBy: group }    # status-list/agrupado — o caso denso
    - fields                          # table (arg/kind/required/description)
    - meta                            # deps + outputs (chips / mono)
    - refs                            # chips navegáveis (pulam para o registro)
fieldMap: { id, title, icon, oneLiner, summary, version, facets, examples,
            pros: <campo>, cons: <campo>, subItems, fields, refs, deps, outputs }
emits: { onRef: { set: selectedRecord } }      # clicar num relacionado seleciona-o
```

### Anatomia
- **Toolbar:** caixa de busca + chips de faceta (toggle).
- **Master (esq):** lista rolável; linha = ícone + título + oneLiner + badge denso.
- **Detail (dir):** rolável; header (ícone + título + identificador mono) → seções na ordem
  configurada. `refs` viram chips clicáveis que trocam a seleção (forma o grafo).

### Estados
`empty` lista → `"nada — limpe o filtro"`. `empty` detail → nada selecionado.

### Onde vive
Aberto pela **ação de ajuda do chrome** (botão `?` do `header-nav`), não por item de menu —
ver §10. É chrome-acionado, mas é um widget de página renderizado no corpo.

---

## 8. `headline-banner` — stat de destaque com faixa de marcas

### Propósito
Um **número grande + rótulo + legenda**, acompanhado de uma **faixa de marcas** (uma marca por
registro, tom-codificada) que resume a composição de uma coleção num relance. É um `stat`
turbinado com uma micro-visualização de "lanes". Use para um cabeçalho de página que precisa
comunicar um agregado **e** sua distribuição.

### Data contract
```ts
interface HeadlineBannerData {
  count: number | string; title: string; sub?: string; tone?: string;
  lanes?: { tone: string; title?: string }[];   // uma marca por registro
}
```

### Config
```yaml
widget: headline-banner
source: { ref: <coleção> }
count: { agg: count, where: { … } }   # ou um campo
tone: { from: <regra> }               # tom do número/borda
lanes: { perRecord: true, tone: <campo→tom>, sort: <campo> }
fieldMap: { title: <literal|campo>, sub: <literal|campo> }
```

### Anatomia
Número grande (mono) + título (sans, 600) + legenda (meta) à esquerda; faixa de lanes à direita
(marcas verticais; tom sólido = ativo, esmaecido = inativo). Borda do card no tom.

### Estados
`count=0` → tom neutro + legenda apropriada.

---

## 9. `progress` (ENHANCE existente)

A barra já existe. Adicionar, sem domínio:
```yaml
widget: progress
label: <literal|campo>                # rótulo acima (ex.: "ANDAMENTO")
valueText: <campo>                    # ex.: "5/12" alinhado à direita do label
caption: <literal|campo>              # legenda abaixo, tom subtle
tone: { from: <regra> }               # cor do preenchimento por status/threshold
```
Os "dois níveis" que um dashboard pode precisar (sequência macro + andamento micro) resolvem-se
com **`stepper` (macro) + `progress` rotulado (micro)** lado a lado — não com uma barra dupla.
Nenhuma mudança de domínio é necessária aqui.

---

## 10. `header-nav` (CHROME — estender)

O `header-nav` é o chrome do runtime. Adicionar duas capacidades **agnósticas**:

### 10.1 Command-palette (atalho global)
Overlay glass (`glass-thick` + `shadow-xl`) acionado por atalho (ex.: ⌘K) **e** por clique na
barra de busca do header. Busca **registros e páginas de todas as coleções/escopos** e navega
ao escolher. Navegação por teclado (↑/↓/↵), fecha em Esc/clique-fora.
```ts
interface CommandPaletteItem { kind: 'record' | 'page'; scopeId?: string; id?: string;
  title: string; sub?: string; status?: string; }
```
Config: `source` = união de coleções + páginas declaradas no manifest; ordenação configurável
(registros antes de páginas, por ex.). Não é widget de página — é chrome.

### 10.2 Ação de ajuda
Um botão (`?`) no header que abre uma **página de `catalog`** (§7) declarada no manifest como a
ajuda do consumer. O botão recebe estado ativo enquanto a ajuda está aberta. Mantém a ajuda
como chrome-acionada (igual ao command-palette), **sem** um item de navegação dedicado.

---

## 11. Composições (presets — não são widgets novos)

Documentadas para reuso, mas implementam-se **compondo** os widgets acima dentro de
`card`/`container`/`grid`. Não precisam de código próprio além do template de composição.

### 11.1 Preset "record-card" (card de registro vivo)
`card` com: header (título-link + badges) · `stepper` horizontal (slot) · `progress` rotulado
(slot) · linha de `stat`s · `callout` (campo de destaque) · footer (timestamp). `.is-live`
condicional. → É o template usado por `collection-grid.card` e por uma seção de cards.

### 11.2 Preset "record-detail" (painel de detalhe de um registro)
`container` com: `callout` (campo de destaque) · linha de `stat`s · `status-list` (itens,
agrupados) · `status-list`/`checklist` (critérios). Tipicamente ao lado de um `stepper`
vertical selecionável que define qual registro-filho o painel mostra (`stepper.onSelect →
container.source`).

---

## 12. Mapa domínio → genérico (para o manifest do consumer)

A spec acima é agnóstica. O **consumer** mapeia seu vocabulário nestes papéis genéricos via
`fieldMap`/`source`/`statusMap`. Exemplo neutro de correspondência (o consumer preenche a
coluna da direita com **seus** campos — esta tabela é só um molde):

| Papel genérico (widget) | Campo do consumer (exemplo) |
|---|---|
| `record` numa `collection-grid` | um item de topo da coleção |
| `node`/`step` num `stepper` | um item de uma sequência ordenada com `status` + `dependsOn` |
| `item` numa `status-list` | um item curto com `status` (+ `annotation`) |
| `criterion` num `checklist` | um item com `status` + `meta` (rótulo de verificação) |
| `record` rico num `catalog` | uma entrada com `summary`/`examples`/`subItems`/`refs` |
| `status` (qualquer widget) | um campo enumerado do consumer → tom via `statusMap` |

Nenhum desses nomes (`record`, `node`, `step`, `item`, `criterion`) é de domínio — são os
**papéis do widget**. O significado concreto vive **fora** do aiDeck, no manifest.

---

## 13. Checklist de implementação

- [ ] `stepper` (horizontal + vertical selecionável + dependências + dense)
- [ ] `status-list` (groupBy + status-chip + annotation; variante `checklist`)
- [ ] `callout` (átomo, tom + eyebrow + body)
- [ ] `collection-grid` (auto-fit data-bound + card template + attention + nested + live)
- [ ] `record-switcher` (trigger no título + dropdown rolável + clique-fora)
- [ ] `catalog` (master-detail + busca + facetas + seções configuráveis + refs-grafo)
- [ ] `headline-banner` (número + lanes por registro + tom)
- [ ] `progress` — ENHANCE (label + valueText + caption + tone)
- [ ] `card` — ENHANCE (slots: header-link, body-slots, footer-link)
- [ ] `header-nav` — CHROME (command-palette + ação de ajuda)

Todos herdam frame canônico + 5 estados + `statusMap` (§0). Zero vocabulário de domínio em
nomes, props ou defaults.
