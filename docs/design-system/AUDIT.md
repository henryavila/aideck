# Auditoria DS aiDeck v2 — 27 mai 2026

Auditoria completa do projeto após o revamp v2. Estrutura: ✅ limpo · 🟡 fixado nesta auditoria · 🔴 decisão do usuário.

---

## ✅ Limpo (sem ação necessária)

### Consistência de tokens
- **0 leaks** de tokens v1 (`--status-done/active/pending/blocked/parked/emerged/highlighted`, `--verifier-*`, `--severity-*`, `--accent-cyan/green/amber/red/magenta/purple`) em `preview/`, `prompts/` ou `ui_kits/`. Grep limpo.
- **0 hex codes antigos** (GitHub Dark `#0d1117 #58a6ff` etc) em `prompts/`. Todos os hex batem com `colors_and_type.css`.

### Specimen cards (Design System tab)
- **33 cards** com tag `<!-- @dsCard group="…" -->` na linha 1, distribuídos em 7 grupos:
  - Type · 4 (fonts, scale, presets, mono)
  - Colors · 6 (surfaces, foreground, borders, status, chart, glass)
  - Spacing · 4 (scale, radii, elevation, density)
  - Brand · 4 (wordmark, localhost, iconography, texture)
  - Components · 6 (frame, states, buttons, inputs, chips, chrome)
  - Widgets · 6 (data, charts, text, navigation, kanban, timeline-log, tree-graph) — 7 actually
  - Layout · 3 (sections, grid, single)
- Todos renderizam sem erros de console.

### UI kit hi-fi (`ui_kits/dashboard/`)
- 4 consumers x 12 pages renderizando: code-health, agent-runs, ci-pipeline, knowledge
- Sidebar nav, breadcrumb, trust pill, status bar tudo funcionando
- 3 layout modes (sections, grid, single) operacionais
- Tweaks panel troca consumer/page/density/sidebar

### Prompts (`prompts/`)
- 14 briefings + INDEX = 15 arquivos
- Sequência: 00 setup → 01 home → 02-04 layouts → **04a-c cross-cutting** → 05-09 widgets → 10 handoff
- Hex codes e nomes de tokens batem com `colors_and_type.css`
- Cada briefing referencia o frame canônico e a vocabulário semântica

---

## 🟡 Fixado nesta auditoria

### 1. Progress widget · label e valor colados
**Onde:** `ui_kits/dashboard/widgets.jsx` · ProgressWidget  
**Sintoma:** "install1 / 1", "typecheck1 / 1" sem espaço entre o nome e a fração  
**Causa:** O `.row` flex sem largura explícita não estendia em column flex parent  
**Fix:** Substituído `.row` por div inline com `display: flex; justifyContent: 'space-between'; width: 100%`

### 2. React warning · `fontVariantNumeric` em `<text>` SVG
**Onde:** `widgets.jsx` Gauge + `preview/widget-charts.html`  
**Sintoma:** Console error `React does not recognize the 'fontVariantNumeric' prop`  
**Causa:** `font-variant-numeric` não é atributo SVG nativo, precisa estar no `style`  
**Fix:** Movido para `style={{ fontVariantNumeric: 'tabular-nums' }}` (React) e `style="font-variant-numeric: tabular-nums"` (HTML)

### 3. `README.md` referenciava `_ds_manifest.json` inexistente
**Onde:** Repository index do README  
**Sintoma:** Listava um arquivo manifest auto-gerado que não existe  
**Causa:** O sistema mudou para tags `<!-- @dsCard -->` em vez de manifest  
**Fix:** Substituído pela descrição correta + adicionada linha pra `prompts/`

### 4. `README.md` e `SKILL.md` chamavam `docs/` + `src/` de "cached aiDeck product docs"
**Sintoma:** Sugeria que o conteúdo do docs/src é guia oficial v2  
**Causa:** Conteúdo é v1 atomic-skills (phases/initiatives), pré-revamp  
**Fix:** Marcado claramente como "pre-v2 · legacy · historical only"

### 5. `SKILL.md` não mencionava `prompts/`
**Fix:** Adicionado bloco na seção "Where to look" descrevendo os 14 briefings.

---

## 🔴 Decisões do usuário (não fixei sozinho)

### A · `docs/` pre-v2 ainda no projeto
Três arquivos contradizem a filosofia v2:
- `docs/why.md` · 132 linhas sobre v1 atomic-skills/project-status, phases, exit gates, initiatives
- `docs/canonical-data-pattern.md` · referencia `.atomic-skills/` paths
- `docs/data-format.md` · 436 linhas de schema v1 com plans/initiatives/annotations/highlights/inbox

**Risco:** Um leitor novo pode achar que isso é a doc oficial v2. As marquei como "legacy", mas o conteúdo ainda confunde.

**Opções:**
1. Deletar — mais limpo
2. Mover para `legacy-v1/`
3. Adicionar header `⚠ PRE-V2 — DO NOT USE AS GUIDANCE` no topo de cada
4. Reescrever para v2 (substancial)

### B · `src/schemas/*.ts` também pre-v2
- `src/schemas/common.ts` · 99 linhas, `SchemaVersioned`, `ArtifactRef` para atomic-skills
- `src/schemas/project-status.ts` · tipos do phase tracker v1

V2 runtime usa schemas totalmente diferentes (manifest.yaml + consumer data). Mesma decisão que A.

### C · `uploads/` duplica `prompts/`
12 arquivos em `uploads/` são os prompts ORIGINAIS que você subiu pra eu analisar. As versões novas (alinhadas com DS v2) estão em `prompts/`. Manter os dois pode confundir.

**Sugestão:** Deletar `uploads/` — `prompts/` é a fonte de verdade agora.

### D · Babel in-browser warning persistente
**Onde:** UI kit `ui_kits/dashboard/index.html`  
**Sintoma:** Warning permanente "in-browser Babel transformer"  
**Status:** OK por design — o kit é protótipo visual, não produção. Vue real (no repo aiDeck) usa build pipeline.  
**Ação:** Nenhuma. Era pra ficar assim.

---

## 📊 Inventário final

| Categoria | Arquivos | Notas |
|---|---|---|
| Tokens + reset | 1 (`colors_and_type.css`) | 442 linhas, 8 grupos de tokens, 2 fontes via Google Fonts |
| Doc raiz | 2 (`README.md`, `SKILL.md`) | Alinhados ao v2 após esta auditoria |
| Brand assets | 2 SVGs | Wordmark + cursor variant |
| Specimen cards | 33 HTML | Todos com tag `@dsCard`, todos limpos |
| Shared specimen base | 1 (`preview/_card.css`) | Pequenas utilidades |
| UI kit hi-fi | 8 files (`ui_kits/dashboard/`) | React + Babel, 4 consumers funcionais |
| Prompts | 15 (`prompts/`) | INDEX + 14 briefings prontos pra Claude Design |
| Pre-v2 legacy | 5 (`docs/`, `src/schemas/`) | Marcado como legacy; decisão de manter ou deletar é do usuário |
| Uploads originais | 12 (`uploads/`) | Duplicatas dos prompts; sugerir deletar |

---

## Recomendações finais (ordem de prioridade)

1. **Decidir o destino de `docs/`, `src/schemas/`, `uploads/`** — itens A, B, C acima. Posso executar qualquer uma das opções em <2min.
2. **Adicionar o prompt 04d "first-run / no consumers"** se quiser cobrir o estado vazio com profundidade — não estava no escopo dos 14 mas é facilmente derivado.
3. **Substituir os Google Fonts por self-hosting** quando fechar pra produção (telemetria-strict, conforme já notado no handoff).
4. **Mermaid lazy-load real** no GraphDAG do UI kit — atualmente é SVG estático. Para um protótipo visual está OK, mas se quiser fidelidade total ao briefing 07, integrar Mermaid via CDN com lazy import.

---

**TL;DR:** Sistema está coeso e auto-consistente. 5 fixes pequenos aplicados nesta auditoria. 3 categorias de conteúdo legacy aguardam decisão sua (manter, mover, ou deletar).
