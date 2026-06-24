# 11 · Widgets de extensão (v2.1) — agnósticos

> Briefing para colar em [claude.ai/design](https://claude.ai/design). Cobre os
> **7 widgets novos + 3 enhancements** da v2.1. Cole **depois** dos grupos A–E
> (05–09). Tudo continua agnóstico: `status` é valor do consumer e resolve para
> um **tom** do DS via `statusMap` do manifest — nenhum vocabulário de domínio
> entra em prop, nome de campo ou default.

## Contexto rápido

aiDeck é um runtime de dashboard genérico. Estes widgets nasceram de um
dashboard real mas estão livres de domínio: só conhecem **registros, coleções,
campos, status e tons**. Reaproveite o frame canônico (header · body · footer
opcional) e os 5 estados (default · loading · empty · error · live).

**Regra de tom (§0.2):** o widget recebe `status` (valor arbitrário) e um mapa
`statusMap: { <valor>: success | warning | error | info | neutral }`. Resolve
para os tokens `--status-*` — fill `color-mix(<tom> 14%, surface)`, borda
`color-mix(<tom> 42%, border)`, dot sólido. Nada de status hardcoded.

## O que criar

| # | Widget | Resumo |
|---|--------|--------|
| 1 | **`stepper`** | Sequência ordenada de etapas. **horizontal** (pills + conectores, etapa atual com anel) e **vertical** (timeline com metadados + `dependsOn` + linha selecionável → `onSelect`). Variante `dense` (dots, sem conectores) para célula de tabela. Cores: success → pill preenchida, info → sólida, demais tons → tint suave, futuro → tracejado neutro, `currentId` → anel info por cima. |
| 2 | **`status-list`** | Lista de itens curtos com chip de status + `annotation` opcional. `groupBy: <campo>` cria seções com contagem (`groupOrder` define a ordem). Variante **`checklist`** (`groupBy: none`): cada item é um critério com marca ✓/×/idle + `meta` mono (rótulo de verificação). |
| 3 | **`callout`** (átomo) | Bloco de destaque para **um campo**: barra lateral 2px no tom + fundo `color-mix(<tom> 8%, surface)` + eyebrow (uppercase, tom) + corpo. Radius `0 6px 6px 0`. `tone: info \| success \| warning \| error \| neutral`. |
| 4 | **`collection-grid`** (layout) | Repete um template de **`card`** sobre uma coleção numa grade **auto-fit** `minmax(minColWidth, 1fr)` — 1 card por registro, escala 1→N sem scroll horizontal. `attention: { when, gt, tone }` pinta borda condicional; `live: { when }` aplica `.is-live`; `nested` mostra uma mini-lista de filhos. |
| 5 | **`record-switcher`** | Troca o registro em foco numa página de detalhe. O título (h1) vira o trigger (caret ▾); abre um **dropdown rolável** (`bg-elevated`, `shadow-xl`, `max-height ~60vh`) com status-chip + título + caption + ✓ no atual. Fecha em seleção / clique-fora. Emite `onSelect → set: currentRecord`. Escala onde uma fila de tabs não cabe. |
| 6 | **`catalog`** | Navegador **master-detail** buscável de uma coleção plana de registros ricos. Toolbar (busca + chips de faceta) · master (lista rolável: ícone + título + oneLiner + badge denso) · detail (seções configuráveis: `summary` · `examples` code · `prosCons` · `subItems` agrupados · `fields` table · `meta` deps/outputs · `refs`). `refs` viram chips clicáveis que trocam a seleção (forma o grafo). Acionado pela ação `?` do chrome. |
| 7 | **`headline-banner`** | Número grande (mono) + título + legenda à esquerda; **faixa de lanes** à direita (uma marca por registro, tom-codificada, sólido = ativo / esmaecido = inativo). Borda do card no tom. Para cabeçalho de página que comunica um agregado **e** sua distribuição. |

## Enhancements

- **`progress`** — adicionar `label` (acima), `valueText` (alinhado à direita do label, ex.: `5/12`), `caption` (abaixo, tom subtle) e `tone` (cor do fill por status/threshold). Modo `segmented` opcional para unidades discretas. Os "dois níveis" (sequência macro + andamento micro) resolvem-se com **`stepper` + `progress` rotulado lado a lado**, não com uma barra dupla.
- **`card`** — composição por slots: `title` com link, slots de corpo (stepper / progress / stats / nested / callout), `footer` com link. É o preset **record-card**.
- **`header-nav`** (chrome) — **command-palette** (overlay `glass-thick` + `shadow-xl`, ⌘K ou clique na busca, navega registros + páginas de todas as coleções, teclado ↑/↓/↵/esc) + **ação de ajuda** `?` que abre uma página de `catalog` declarada como ajuda do consumer (botão ganha estado ativo enquanto aberta).

## Presets (composições — não são código novo)

- **record-card** — `card` com header (título-link + badge) · `stepper` horizontal · `progress` rotulado · linha de `stat`s · `callout` · footer. `.is-live` condicional. Usado por `collection-grid`.
- **record-detail** — `callout` + `stat`s + `status-list` (itens, agrupados) + `checklist` (critérios), tipicamente ao lado de um `stepper` vertical selecionável (`stepper.onSelect → container.source`).

## Dados de exemplo (neutros)

Use papéis genéricos, não vocabulário de domínio: `records`, `nodes`, `steps`,
`items`, `criteria`, `groups`, `metrics`. Onde um exemplo concreto lê melhor
(ex.: um catálogo de `tools`: `http.request`, `fs.read`), deixe claro que o
significado vem do **manifest do consumer**, não do widget.

## Specimens já no DS

Veja os cartões em `preview/`: `widget-stepper`, `widget-status-list`,
`widget-collection-grid`, `widget-headline-banner`, `widget-record-switcher`,
`widget-catalog`, `component-command-palette`. O protótipo
`ui_kits/dashboard/` exercita todos nas páginas `code-health/records`,
`code-health/record` e `code-health/catalog` + a palette do chrome.
