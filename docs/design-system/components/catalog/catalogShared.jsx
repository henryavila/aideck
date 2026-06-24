/* eslint-disable */
/* catalogShared — style injection + tiny helpers for the Catalog component
   family (Catalog · RecordDetail · Facet · SearchInput).

   No .d.ts sibling, so the compiler bundles this but does NOT expose it on
   the namespace. It registers itself on window so the four component files —
   each isolated in its own bundle IIFE — can share one stylesheet and the
   same record/section reducers. Class names are lifted VERBATIM from
   preview/widget-catalog.html and defensively scoped under `.cat` so the
   render is pixel-identical to the specimen without leaking into a consumer
   page. Tokens resolve from the design system's global stylesheet. */

const __AID_CAT_CSS = `
.cat { border:1px solid var(--border-default); border-radius:var(--radius-lg); background:var(--bg-surface); box-shadow:var(--shadow-ambient); overflow:hidden; display:flex; flex-direction:column; height:100%; min-height:0; position:relative; }
.cat.is-error { border-color:var(--status-error); }

.cat .cat-tools { display:flex; align-items:center; gap:8px; padding:9px 12px; border-bottom:1px solid var(--border-subtle); flex:none; }
.cat .search { display:flex; align-items:center; gap:7px; flex:none; width:200px; height:28px; padding:0 10px; background:var(--bg-sunken); border:1px solid var(--border-default); border-radius:var(--radius-md); transition:border-color var(--duration-fast) var(--ease-out); }
.cat .search:focus-within { border-color:var(--border-bright); }
.cat .search span { font-family:var(--font-mono); color:var(--fg-subtle); font-size:12px; }
.cat .search input { flex:1; min-width:0; background:none; border:none; outline:none; color:var(--fg-default); font-family:var(--font-sans); font-size:12px; }
.cat .search input::placeholder { color:var(--fg-subtle); }
.cat .facets { display:flex; gap:6px; flex-wrap:wrap; }
.cat .facet { font-family:var(--font-sans); font-size:11px; color:var(--fg-muted); background:var(--bg-elevated); border:1px solid var(--border-default); border-radius:var(--radius-pill); padding:3px 10px; cursor:pointer; user-select:none; transition:color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out); }
.cat .facet:hover { border-color:var(--border-bright); }
.cat .facet.on { background:var(--status-info-bg); border-color:var(--status-info-line); color:var(--status-info); }

.cat .cat-body { display:grid; grid-template-columns:236px 1fr; flex:1; min-height:0; }
.cat .cat-msg-body { display:flex; align-items:center; justify-content:center; flex:1; min-height:0; }

.cat .master { border-right:1px solid var(--border-subtle); overflow-y:auto; padding:5px; }
.cat .m-row { display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; padding:7px 9px; border-radius:var(--radius-md); cursor:pointer; transition:background-color var(--duration-fast) var(--ease-out); }
.cat .m-row:hover { background:var(--bg-elevated); }
.cat .m-row.sel { background:var(--bg-overlay); box-shadow:inset 2px 0 0 var(--status-info); }
.cat .m-ico { font-family:var(--font-mono); font-size:13px; color:var(--chart-1); width:16px; text-align:center; }
.cat .m-name { font-family:var(--font-mono); font-size:12px; color:var(--fg-default); font-feature-settings:'calt' 0; }
.cat .m-one { font-family:var(--font-sans); font-size:10px; color:var(--fg-subtle); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cat .m-badge { font-family:var(--font-mono); font-size:9px; color:var(--fg-subtle); background:var(--bg-sunken); border:1px solid var(--border-default); border-radius:var(--radius-sm); padding:1px 5px; font-feature-settings:'calt' 0; white-space:nowrap; }
.cat .m-empty { padding:24px 12px; text-align:center; font-family:var(--font-mono); font-size:11px; color:var(--fg-subtle); font-feature-settings:'calt' 0; }

.cat .detail { overflow-y:auto; padding:14px 16px; }
.cat .d-head { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
.cat .d-ico { font-family:var(--font-mono); font-size:18px; color:var(--chart-1); }
.cat .d-title { font-family:var(--font-sans); font-size:18px; font-weight:600; color:var(--fg-default); letter-spacing:-0.015em; }
.cat .d-id { font-family:var(--font-mono); font-size:10px; color:var(--fg-subtle); margin-left:auto; font-feature-settings:'calt' 0; }
.cat .sec { margin-top:16px; }
.cat .sec-h { font-family:var(--font-mono); font-size:9px; letter-spacing:0.08em; text-transform:uppercase; color:var(--fg-subtle); margin-bottom:7px; font-feature-settings:'calt' 0; }
.cat .d-summary { font-family:var(--font-sans); font-size:12px; color:var(--fg-default); line-height:1.55; }
.cat .code { font-family:var(--font-mono); font-size:11px; color:var(--fg-default); background:var(--bg-sunken); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:7px 10px; font-feature-settings:'calt' 0; white-space:pre; overflow-x:auto; }
.cat .code + .code { margin-top:6px; }
.cat .pc { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.cat .pc-li { display:flex; gap:7px; font-family:var(--font-sans); font-size:11px; color:var(--fg-default); padding:2px 0; }
.cat .pc-li .mk { font-family:var(--font-mono); font-weight:700; flex:none; }
.cat .pc-li.pro .mk { color:var(--status-success); }
.cat .pc-li.con .mk { color:var(--status-error); }
.cat .sub-grp { font-family:var(--font-mono); font-size:9px; letter-spacing:0.06em; text-transform:uppercase; color:var(--fg-subtle); margin:8px 0 4px; font-feature-settings:'calt' 0; }
.cat .sub-row { display:flex; gap:8px; padding:4px 0; border-top:1px solid var(--border-subtle); }
.cat .sub-name { font-family:var(--font-mono); font-size:11px; color:var(--status-info); flex:none; min-width:90px; font-feature-settings:'calt' 0; }
.cat .sub-desc { font-family:var(--font-sans); font-size:11px; color:var(--fg-muted); }
.cat table.ft { width:100%; border-collapse:collapse; font-size:11px; }
.cat table.ft th { text-align:left; font-family:var(--font-mono); font-size:9px; letter-spacing:0.05em; text-transform:uppercase; color:var(--fg-subtle); padding:4px 8px; border-bottom:1px solid var(--border-subtle); font-weight:500; font-feature-settings:'calt' 0; }
.cat table.ft td { padding:5px 8px; border-bottom:1px solid var(--border-subtle); color:var(--fg-default); font-family:var(--font-sans); }
.cat table.ft td.mono { font-family:var(--font-mono); color:var(--fg-muted); font-feature-settings:'calt' 0; }
.cat .chips { display:flex; gap:6px; flex-wrap:wrap; }
.cat .chip-mono { font-family:var(--font-mono); font-size:10px; color:var(--fg-muted); background:var(--bg-elevated); border:1px solid var(--border-default); border-radius:var(--radius-sm); padding:2px 7px; font-feature-settings:'calt' 0; }
.cat .chip-ref { font-family:var(--font-mono); font-size:10px; color:var(--accent-link); background:color-mix(in srgb,var(--status-info) 8%,var(--bg-elevated)); border:1px solid var(--status-info-line); border-radius:var(--radius-sm); padding:2px 7px; cursor:pointer; font-feature-settings:'calt' 0; transition:background-color var(--duration-fast) var(--ease-out); }
.cat .chip-ref:hover { background:var(--status-info-bg); }

/* loading skeleton — reuses the global .skeleton shimmer */
.cat .sk-row { height:38px; border-radius:var(--radius-md); margin:2px 4px; }
.cat .sk-line { border-radius:var(--radius-sm); }

/* terse empty + structured error (coral + suggestion) */
.cat .cat-msg { padding:28px 24px; display:flex; flex-direction:column; gap:9px; align-items:center; text-align:center; max-width:440px; }
.cat .cat-msg-glyph { font-family:var(--font-mono); font-size:22px; }
.cat .cat-msg-glyph.err { color:var(--status-error); }
.cat .cat-msg-glyph.empty { color:var(--fg-subtle); }
.cat .cat-msg-text { font-family:var(--font-mono); font-size:12px; color:var(--fg-default); font-feature-settings:'calt' 0; line-height:1.5; }
.cat .cat-msg-sub { font-family:var(--font-sans); font-size:11px; color:var(--fg-muted); line-height:1.5; }
.cat .cat-msg-sug { font-family:var(--font-sans); font-size:11px; color:var(--fg-muted); margin-top:2px; }
.cat .cat-msg-sug b { color:var(--status-info); font-family:var(--font-mono); font-weight:500; font-feature-settings:'calt' 0; }
`;

function ensureCatalogStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('aid-catalog-css')) return;
  const el = document.createElement('style');
  el.id = 'aid-catalog-css';
  el.textContent = __AID_CAT_CSS;
  (document.head || document.documentElement).appendChild(el);
}

/* Build the list of facet values present across records, in first-seen order. */
function deriveFacets(records, facetField) {
  const seen = [];
  const set = new Set();
  (records || []).forEach(r => {
    const vals = r && r[facetField];
    if (Array.isArray(vals)) vals.forEach(v => { if (!set.has(v)) { set.add(v); seen.push(v); } });
    else if (vals != null) { if (!set.has(vals)) { set.add(vals); seen.push(vals); } }
  });
  return seen;
}

/* Filter records by free-text query (over searchFields + facetField) and the
   set of active facets (AND across active facets). */
function filterRecords(records, { query, activeFacets, searchFields, facetField }) {
  const q = (query || '').trim().toLowerCase();
  const active = Object.keys(activeFacets || {}).filter(k => activeFacets[k]);
  return (records || []).filter(r => {
    if (q) {
      const parts = [];
      (searchFields || []).forEach(f => { const v = r[f]; if (v != null) parts.push(Array.isArray(v) ? v.join(' ') : String(v)); });
      const fv = r[facetField];
      if (Array.isArray(fv)) parts.push(fv.join(' ')); else if (fv != null) parts.push(String(fv));
      if (parts.join(' ').toLowerCase().indexOf(q) === -1) return false;
    }
    if (active.length) {
      const fv = r[facetField];
      const arr = Array.isArray(fv) ? fv : (fv != null ? [fv] : []);
      if (!active.every(f => arr.indexOf(f) !== -1)) return false;
    }
    return true;
  });
}

/* facetValues(record, facetField) → always an array (for the detail meta line). */
function facetValues(record, facetField) {
  const fv = record ? record[facetField] : null;
  return Array.isArray(fv) ? fv : (fv != null ? [fv] : []);
}

window.__AidCatalogKit = {
  ensureCatalogStyles,
  deriveFacets,
  filterRecords,
  facetValues,
};
