# 12 · Empacotar `catalog` (tela de ajuda) como componente montável

> Briefing para colar em [claude.ai/design](https://claude.ai/design), na sessão
> do DS **AiDeckDesignSystem_9ef1e6**. Cole **depois** do 11 (widgets de extensão).
> Objetivo: hoje o `catalog` existe só como **specimen HTML** (`preview/widget-catalog.html`)
> e como código embutido no protótipo. Consumers que precisam de uma tela de
> ajuda **recosturam o padrão à mão**. Este briefing transforma o `catalog` (e o
> preset `record-detail`) em **componentes exportados pelo `_ds_bundle.js`**,
> montáveis via `<x-import component-from-global-scope="AiDeckDesignSystem_9ef1e6.Catalog">`.

## Por que

- `_ds_bundle.js` declara `"components":[]`. Nada é importável.
- A página de Ajuda do *Atomic Skills Dashboard* reimplementou `widget-catalog.html`
  classe-a-classe (`.cat`, `.cat-tools`, `.master`, `.detail`, `.facet`,
  `.m-row`, `.chip-mono`…). Funciona, mas é duplicação: qualquer correção no DS
  não chega ao consumer.
- A ação `?` do chrome já abre "uma página de `catalog` declarada como ajuda".
  Falta o `catalog` ser **um componente**, não um trecho copiável.

## O que criar (componentes exportados)

| # | Export | Resumo |
|---|--------|--------|
| 1 | **`Catalog`** | Navegador master-detail buscável + facetado. Recebe `records` + config de seções; gerencia internamente busca, facetas e seleção. `refs` viram chips clicáveis que trocam a seleção (o grafo). Toolbar · master (ícone + título + oneLiner + badge) · detail (seções configuráveis). |
| 2 | **`RecordDetail`** | O painel direito do `catalog` isolado, para uso fora dele (página `single`). Renderiza as seções de **um** registro. |
| 3 | **`Facet`** / **`SearchInput`** | Átomos já presentes no specimen, exportados para reuso pelo chrome e por outros buscadores. |

## API do `Catalog` (props)

Mantenha **agnóstico** — nada de vocabulário de domínio em prop ou default.

```
records:        Record[]                  // coleção plana
sections:       SectionSpec[]             // quais seções o detail renderiza e em que ordem
facetField:     string                    // campo usado para gerar os chips de faceta (ex.: "tags")
searchFields:   string[]                  // campos varridos pela busca (default: id + title + oneLiner + summary)
selectedId:     string | null            // controlado; se null, auto-seleciona o 1º da lista
onSelect:       (id) => void             // emitido ao trocar seleção (inclui clique em ref)
emptyText:      string                    // copy do estado vazio (default terso)
```

`SectionSpec` cobre os tipos já no specimen: `summary` · `examples` (code) ·
`prosCons` (when / when not) · `subItems` (agrupados por `group`) · `fields`
(tabela arg/tipo/req/desc) · `meta` (deps · outputs como chips) · `refs`
(chips clicáveis → `onSelect`). Cada `SectionSpec` aponta para o campo do
record que a alimenta; seção sem dado **não renderiza** (não force seção vazia).

## Regras de fidelidade (não reinventar)

- **Reaproveite os tokens e as classes do specimen** `preview/widget-catalog.html`
  verbatim — mesmos `--border-*`, `--bg-*`, `--status-info` no `.sel`
  (`box-shadow:inset 2px 0 0`), `.facet.on`, grid `236px 1fr`, paddings densos.
  O componente deve renderizar **pixel-idêntico** ao specimen.
- Frame canônico (header · body · footer opcional) + os **5 estados**
  (default · loading skeleton · empty terso · error coral + suggestion · live).
- Mono (`font-feature-settings:'calt' 0`) em ids, comandos, badges, código.
- Sem entrada animada no load; hover/focus em 120ms.

## Estados a entregar

- **loading** — skeleton no master (linhas) + no detail, sem spinner.
- **empty** — `.m-empty` "// nada — limpe o filtro" + ação concreta.
- **error** — borda coral + mensagem estruturada + campo `suggestion`.
- **live** — `.is-live` (scanline) quando a coleção vem de `fs.watch`.

## Exposição no bundle

- Exportar `Catalog`, `RecordDetail`, `Facet`, `SearchInput` no namespace
  `AiDeckDesignSystem_9ef1e6` (atualizar `"components"` no header do
  `_ds_bundle.js` — hoje `[]`).
- Montagem alvo no consumer:

```html
<x-import component-from-global-scope="AiDeckDesignSystem_9ef1e6.Catalog"
          records="{{ skills }}"
          facet-field="tags"
          selected-id="{{ helpSel }}"
          on-select="{{ onPickSkill }}"
          hint-size="100%,480px">
</x-import>
```

## Specimen + verificação

- Atualizar `preview/widget-catalog.html` para **consumir o componente exportado**
  em vez do script inline (vira o caso de teste do próprio componente).
- Adicionar `preview/component-record-detail.html` para o `RecordDetail` isolado.
- O protótipo `ui_kits/dashboard/` (página `code-health/catalog`) deve montar o
  `Catalog` exportado, provando que chrome `?` → página de ajuda usa o mesmo
  componente que um consumer externo montaria.

## Dados de exemplo (neutros)

Use papéis genéricos — `records`, `fields`, `subItems`, `refs`. Onde um exemplo
concreto lê melhor (catálogo de `tools`: `http.request`, `fs.read`), deixe claro
que o **significado vem do manifest do consumer**, não do widget.
