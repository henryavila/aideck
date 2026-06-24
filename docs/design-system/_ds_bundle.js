/* @ds-bundle: {"format":3,"namespace":"AiDeckDesignSystem_9ef1e6","components":[{"name":"Catalog","sourcePath":"components/catalog/Catalog.jsx"},{"name":"Facet","sourcePath":"components/catalog/Facet.jsx"},{"name":"RecordDetail","sourcePath":"components/catalog/RecordDetail.jsx"},{"name":"SearchInput","sourcePath":"components/catalog/SearchInput.jsx"}],"sourceHashes":{"components/catalog/Catalog.jsx":"5530c8f484d7","components/catalog/Facet.jsx":"9636888f9a5f","components/catalog/RecordDetail.jsx":"46a5607c1808","components/catalog/SearchInput.jsx":"8d39915d44a4","components/catalog/catalog.demo-data.js":"e22d00dfefce","components/catalog/catalogShared.jsx":"538eb74741dc","ui_kits/dashboard/app.jsx":"6de85359e00f","ui_kits/dashboard/chrome.jsx":"8ded5cc980a1","ui_kits/dashboard/data.jsx":"21d06056acfb","ui_kits/dashboard/pages.jsx":"2f331bf8fd58","ui_kits/dashboard/tweaks-panel.jsx":"82c387552588","ui_kits/dashboard/widgets-new.jsx":"ec6d3be2a01e","ui_kits/dashboard/widgets.jsx":"5d9af2cb96ea"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AiDeckDesignSystem_9ef1e6 = window.AiDeckDesignSystem_9ef1e6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/catalog/Catalog.jsx
try { (() => {
/* eslint-disable */
/* Catalog — searchable + faceted master-detail browser. Manages search,
   facets, and selection internally; `refs` chips in the detail panel swap the
   selection (and clear filters) so the record graph is navigable. Domain-free:
   record shape, section descriptors, facet field, and search fields are all
   supplied by the consumer.

   Composes the sibling atoms — SearchInput, Facet, RecordDetail — resolved
   from the design-system namespace at render time (each lives in its own
   bundle module).

   Five widget states via `state`: default · loading · empty · error · live.
*/

function Catalog({
  records,
  sections,
  facetField = 'tags',
  searchFields = ['id', 'title', 'summary'],
  selectedId,
  onSelect,
  emptyText = '// no records',
  state = 'default',
  error = 'failed to load records',
  suggestion
}) {
  const {
    useState,
    useMemo,
    useEffect
  } = React;
  const kit = window.__AidCatalogKit || {};
  if (kit.ensureCatalogStyles) kit.ensureCatalogStyles();
  const NS = window.AiDeckDesignSystem_9ef1e6 || {};
  const recs = records || [];
  const secs = sections || [];
  const [query, setQuery] = useState('');
  const [activeFacets, setActiveFacets] = useState({});
  const [internalSel, setInternalSel] = useState(selectedId != null ? selectedId : null);
  useEffect(() => {
    if (selectedId !== undefined) setInternalSel(selectedId);
  }, [selectedId]);
  const allFacets = useMemo(() => kit.deriveFacets ? kit.deriveFacets(recs, facetField) : [], [recs, facetField]);
  const filtered = useMemo(() => kit.filterRecords ? kit.filterRecords(recs, {
    query,
    activeFacets,
    searchFields,
    facetField
  }) : recs, [recs, query, activeFacets, searchFields, facetField]);

  // Effective selection: explicit pick if it still exists, else first filtered.
  const picked = internalSel != null ? recs.find(r => r.id === internalSel) : null;
  const current = picked || filtered[0] || null;
  const currentId = current ? current.id : null;
  const select = id => {
    setInternalSel(id);
    if (onSelect) onSelect(id);
  };
  const onRef = id => {
    if (!recs.find(r => r.id === id)) return;
    setQuery('');
    setActiveFacets({});
    select(id);
  };
  const toggleFacet = f => setActiveFacets(s => ({
    ...s,
    [f]: !s[f]
  }));
  const badgeFor = r => {
    if (r.badge != null) return r.badge;
    const sub = secs.find(s => s.kind === 'subItems');
    if (sub) {
      const v = r[sub.field];
      if (Array.isArray(v)) return v.length;
    }
    return null;
  };
  const isLive = state === 'live';
  const cls = 'cat' + (state === 'error' ? ' is-error' : '') + (isLive ? ' is-live' : '');

  // ── error · empty · loading replace the body wholesale ─────────────────
  if (state === 'error') {
    return /*#__PURE__*/React.createElement("div", {
      className: cls
    }, renderTools(true), /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cat-msg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-glyph err"
    }, "!"), /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-text"
    }, error), suggestion && /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-sug"
    }, "\u2192 ", /*#__PURE__*/React.createElement("b", null, suggestion)))));
  }
  if (state === 'empty' || recs.length === 0) {
    return /*#__PURE__*/React.createElement("div", {
      className: cls
    }, renderTools(true), /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cat-msg"
    }, /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-glyph empty"
    }, "\u2205"), /*#__PURE__*/React.createElement("div", {
      className: "cat-msg-text"
    }, emptyText))));
  }
  if (state === 'loading') {
    return /*#__PURE__*/React.createElement("div", {
      className: cls
    }, renderTools(true), /*#__PURE__*/React.createElement("div", {
      className: "cat-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "master"
    }, [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "skeleton sk-row"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "detail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '46%',
        height: 20
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '100%',
        height: 12,
        marginTop: 18
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '92%',
        height: 12,
        marginTop: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '70%',
        height: 12,
        marginTop: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '100%',
        height: 56,
        marginTop: 22
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "skeleton sk-line",
      style: {
        width: '100%',
        height: 56,
        marginTop: 10
      }
    }))));
  }

  // ── default / live ─────────────────────────────────────────────────────
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, renderTools(false), /*#__PURE__*/React.createElement("div", {
    className: "cat-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "master"
  }, filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "m-empty"
  }, emptyText && emptyText.indexOf('//') === 0 ? emptyText : '// nothing — clear the filter') : filtered.map(r => {
    const b = badgeFor(r);
    return /*#__PURE__*/React.createElement("div", {
      key: r.id,
      className: 'm-row' + (r.id === currentId ? ' sel' : ''),
      onClick: () => select(r.id)
    }, r.icon != null && /*#__PURE__*/React.createElement("span", {
      className: "m-ico"
    }, r.icon), /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "m-name"
    }, r.id), r.oneLiner != null && /*#__PURE__*/React.createElement("div", {
      className: "m-one"
    }, r.oneLiner)), b != null && /*#__PURE__*/React.createElement("span", {
      className: "m-badge"
    }, b));
  })), /*#__PURE__*/React.createElement("div", {
    className: "detail"
  }, NS.RecordDetail ? React.createElement(NS.RecordDetail, {
    record: current,
    sections: secs,
    facetField,
    onSelectRef: onRef
  }) : /*#__PURE__*/React.createElement("div", {
    className: "m-empty"
  }, "// detail panel unavailable"))));
  function renderTools(disabled) {
    const Search = NS.SearchInput;
    const FacetPill = NS.Facet;
    return /*#__PURE__*/React.createElement("div", {
      className: "cat-tools",
      style: disabled ? {
        opacity: 0.55,
        pointerEvents: 'none'
      } : undefined
    }, Search ? React.createElement(Search, {
      value: query,
      onChange: setQuery,
      placeholder: 'search catalog…'
    }) : /*#__PURE__*/React.createElement("div", {
      className: "search"
    }, /*#__PURE__*/React.createElement("span", null, "\u2315"), /*#__PURE__*/React.createElement("input", {
      value: query,
      onChange: e => setQuery(e.target.value),
      placeholder: "search catalog\u2026"
    })), allFacets.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "facets"
    }, allFacets.map(f => FacetPill ? React.createElement(FacetPill, {
      key: f,
      label: f,
      active: !!activeFacets[f],
      onClick: () => toggleFacet(f)
    }) : /*#__PURE__*/React.createElement("span", {
      key: f,
      className: 'facet' + (activeFacets[f] ? ' on' : ''),
      onClick: () => toggleFacet(f)
    }, f))));
  }
}
Object.assign(__ds_scope, { Catalog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/Catalog.jsx", error: String((e && e.message) || e) }); }

// components/catalog/Facet.jsx
try { (() => {
/* eslint-disable */
/* Facet — a single toggleable filter pill. Stateless: the parent owns the
   on/off flag and handles onClick. Pill geometry + the active treatment
   (status-info bg/line/text) match the widget-catalog specimen verbatim. */

function Facet({
  label,
  active,
  onClick
}) {
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  return /*#__PURE__*/React.createElement("span", {
    className: 'facet' + (active ? ' on' : ''),
    onClick: onClick,
    role: "button",
    "aria-pressed": !!active
  }, label);
}
Object.assign(__ds_scope, { Facet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/Facet.jsx", error: String((e && e.message) || e) }); }

// components/catalog/RecordDetail.jsx
try { (() => {
/* eslint-disable */
/* RecordDetail — the catalog's right-hand panel, isolated so a `single`-layout
   page can render one record on its own (no master list, no search). Pure:
   given one `record` and the ordered `sections` descriptor, it renders the
   head + every section that has data. A section whose backing field is empty
   does not render. `refs`-kind sections emit clickable chips through
   onSelectRef(id) — that's the graph edge Catalog wires to selection.

   Section descriptors (all domain field names supplied by the consumer):
     { kind:'summary',  field, label }
     { kind:'examples', field, label }
     { kind:'prosCons', proField, conField, label, proGlyph?, conGlyph? }
     { kind:'subItems', field, label, groupKey, nameKey, descKey }
     { kind:'fields',   field, label, columns:[{key,label,mono?,bool?,trueGlyph?,falseGlyph?}] }
     { kind:'meta',     label, groups:[{field, prefix?, emptyLabel?}] }
     { kind:'refs',     field, label }
*/

function RecordDetail({
  record,
  sections,
  facetField,
  onSelectRef
}) {
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  const kit = window.__AidCatalogKit || {};
  if (!record) {
    return /*#__PURE__*/React.createElement("div", {
      className: "m-empty"
    }, "// nothing selected");
  }
  const facets = kit.facetValues ? kit.facetValues(record, facetField) : [];
  const secs = sections || [];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "d-head"
  }, record.icon != null && /*#__PURE__*/React.createElement("span", {
    className: "d-ico"
  }, record.icon), /*#__PURE__*/React.createElement("span", {
    className: "d-title"
  }, record.title != null ? record.title : record.id), facets.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "d-id"
  }, facets.join(' · '))), secs.map((s, i) => renderSection(s, record, onSelectRef, i)));
}
function isEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}
function Section({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sec-h"
  }, label), children);
}
function renderSection(s, r, onSelectRef, key) {
  switch (s.kind) {
    case 'summary':
      {
        const v = r[s.field];
        if (isEmpty(v)) return null;
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, /*#__PURE__*/React.createElement("div", {
          className: "d-summary"
        }, v));
      }
    case 'examples':
      {
        const list = r[s.field];
        if (isEmpty(list)) return null;
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, list.map((e, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "code"
        }, e)));
      }
    case 'prosCons':
      {
        const pros = r[s.proField] || [];
        const cons = r[s.conField] || [];
        if (isEmpty(pros) && isEmpty(cons)) return null;
        const pg = s.proGlyph || '✓';
        const cg = s.conGlyph || '×';
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, /*#__PURE__*/React.createElement("div", {
          className: "pc"
        }, /*#__PURE__*/React.createElement("div", null, pros.map((p, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "pc-li pro"
        }, /*#__PURE__*/React.createElement("span", {
          className: "mk"
        }, pg), p))), /*#__PURE__*/React.createElement("div", null, cons.map((c, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "pc-li con"
        }, /*#__PURE__*/React.createElement("span", {
          className: "mk"
        }, cg), c)))));
      }
    case 'subItems':
      {
        const list = r[s.field];
        if (isEmpty(list)) return null;
        const gk = s.groupKey || 'group',
          nk = s.nameKey || 'name',
          dk = s.descKey || 'description';
        const groups = {};
        const order = [];
        list.forEach(it => {
          const g = it[gk] == null ? '' : it[gk];
          if (!groups[g]) {
            groups[g] = [];
            order.push(g);
          }
          groups[g].push(it);
        });
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, order.map(g => /*#__PURE__*/React.createElement("div", {
          key: g
        }, g !== '' && /*#__PURE__*/React.createElement("div", {
          className: "sub-grp"
        }, g), groups[g].map((it, i) => /*#__PURE__*/React.createElement("div", {
          key: i,
          className: "sub-row"
        }, /*#__PURE__*/React.createElement("span", {
          className: "sub-name"
        }, it[nk]), /*#__PURE__*/React.createElement("span", {
          className: "sub-desc"
        }, it[dk]))))));
      }
    case 'fields':
      {
        const list = r[s.field];
        if (isEmpty(list)) return null;
        const cols = s.columns || [];
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, /*#__PURE__*/React.createElement("table", {
          className: "ft"
        }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, cols.map((c, i) => /*#__PURE__*/React.createElement("th", {
          key: i
        }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, list.map((row, ri) => /*#__PURE__*/React.createElement("tr", {
          key: ri
        }, cols.map((c, ci) => {
          let cell = row[c.key];
          if (c.bool) cell = cell ? c.trueGlyph || '✓' : c.falseGlyph || '·';
          return /*#__PURE__*/React.createElement("td", {
            key: ci,
            className: c.mono ? 'mono' : undefined
          }, cell);
        }))))));
      }
    case 'meta':
      {
        const groups = s.groups || [];
        const anyData = groups.some(g => !isEmpty(r[g.field]) || g.emptyLabel);
        if (!anyData) return null;
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, /*#__PURE__*/React.createElement("div", {
          className: "chips"
        }, groups.map((g, gi) => {
          const vals = r[g.field];
          if (isEmpty(vals)) {
            if (!g.emptyLabel) return null;
            return /*#__PURE__*/React.createElement("span", {
              key: 'g' + gi,
              className: "chip-mono",
              style: {
                opacity: 0.5
              }
            }, g.emptyLabel);
          }
          return (Array.isArray(vals) ? vals : [vals]).map((v, vi) => /*#__PURE__*/React.createElement("span", {
            key: 'g' + gi + '_' + vi,
            className: "chip-mono"
          }, (g.prefix || '') + v));
        })));
      }
    case 'refs':
      {
        const list = r[s.field];
        if (isEmpty(list)) return null;
        return /*#__PURE__*/React.createElement(Section, {
          key: key,
          label: s.label
        }, /*#__PURE__*/React.createElement("div", {
          className: "chips"
        }, list.map((rf, i) => /*#__PURE__*/React.createElement("span", {
          key: i,
          className: "chip-ref",
          onClick: () => onSelectRef && onSelectRef(rf)
        }, rf))));
      }
    default:
      return null;
  }
}
Object.assign(__ds_scope, { RecordDetail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/RecordDetail.jsx", error: String((e && e.message) || e) }); }

// components/catalog/SearchInput.jsx
try { (() => {
/* eslint-disable */
/* SearchInput — the catalog's search field atom. Controlled: owns no state,
   reports keystrokes via onChange(string). Reused by Catalog and available
   standalone for any master-detail or filter UI. Class names match the
   widget-catalog specimen verbatim. */

function SearchInput({
  value,
  onChange,
  placeholder,
  glyph,
  width,
  autoFocus
}) {
  const {
    useEffect,
    useRef
  } = React;
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);
  return /*#__PURE__*/React.createElement("div", {
    className: "search",
    style: width != null ? {
      width
    } : undefined
  }, /*#__PURE__*/React.createElement("span", null, glyph || '⌕'), /*#__PURE__*/React.createElement("input", {
    ref: ref,
    value: value || '',
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder || 'search…',
    autoComplete: "off",
    spellCheck: false
  }));
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/catalog/catalog.demo-data.js
try { (() => {
/* Demo data for the Catalog component card + the widget-catalog specimen.
   Domain data lives HERE (a tool's "skill catalog"), never in the component's
   props or defaults — the component itself is agnostic. */
window.__CatalogDemo = {
  SECTIONS: [{
    kind: 'summary',
    field: 'summary',
    label: 'summary'
  }, {
    kind: 'examples',
    field: 'examples',
    label: 'examples'
  }, {
    kind: 'prosCons',
    proField: 'pros',
    conField: 'cons',
    label: 'when · when not'
  }, {
    kind: 'subItems',
    field: 'subItems',
    label: 'items',
    groupKey: 'g',
    nameKey: 'n',
    descKey: 'd'
  }, {
    kind: 'fields',
    field: 'fields',
    label: 'fields',
    columns: [{
      key: 'n',
      label: 'arg',
      mono: true
    }, {
      key: 'k',
      label: 'kind',
      mono: true
    }, {
      key: 'r',
      label: 'req',
      mono: true,
      bool: true
    }, {
      key: 'd',
      label: 'description'
    }]
  }, {
    kind: 'meta',
    label: 'deps · outputs',
    groups: [{
      field: 'deps',
      prefix: '↳ ',
      emptyLabel: 'none'
    }, {
      field: 'outputs',
      prefix: '→ '
    }]
  }, {
    kind: 'refs',
    field: 'refs',
    label: 'related'
  }],
  RECORDS: [{
    id: 'http.request',
    icon: '⇄',
    facets: ['io', 'net'],
    oneLiner: 'Issue an HTTP request',
    summary: "Performs an outbound HTTP request and returns the parsed response. Honors the consumer's timeout and retry policy; never follows redirects across hosts.",
    examples: ["http.request({ url, method: 'GET' })", "→ { status, headers, body }"],
    pros: ['streams large bodies', 'retries idempotent verbs'],
    cons: ['no cross-host redirect', 'blocks on slow DNS'],
    subItems: [{
      g: 'options',
      n: 'timeout',
      d: 'per-attempt ms ceiling'
    }, {
      g: 'options',
      n: 'retries',
      d: 'max attempts for idempotent verbs'
    }, {
      g: 'hooks',
      n: 'onChunk',
      d: 'called per streamed chunk'
    }],
    fields: [{
      n: 'url',
      k: 'string',
      r: true,
      d: 'absolute request URL'
    }, {
      n: 'method',
      k: 'enum',
      r: false,
      d: 'GET · POST · …'
    }, {
      n: 'body',
      k: 'bytes',
      r: false,
      d: 'request payload'
    }],
    deps: ['net.dial'],
    outputs: ['response', 'metrics'],
    refs: ['net.dial', 'fs.read']
  }, {
    id: 'fs.read',
    icon: '▤',
    facets: ['io', 'fs'],
    oneLiner: 'Read a file from disk',
    summary: "Reads a file under the consumer's data root and validates it against the declared JSON Schema before returning. Path traversal outside the root is rejected.",
    examples: ["fs.read({ path: 'data/items.jsonl' })", "→ Record[]  // schema-validated"],
    pros: ['schema-validated on read', 'sandboxed to data root'],
    cons: ['whole-file only', 'no watch (use fs.watch)'],
    subItems: [{
      g: 'options',
      n: 'encoding',
      d: 'utf-8 · bytes'
    }, {
      g: 'options',
      n: 'schema',
      d: 'ref to a declared schema'
    }],
    fields: [{
      n: 'path',
      k: 'string',
      r: true,
      d: 'path relative to data root'
    }, {
      n: 'schema',
      k: 'ref',
      r: false,
      d: 'validate against this'
    }],
    deps: [],
    outputs: ['records'],
    refs: ['fs.watch', 'http.request']
  }, {
    id: 'fs.watch',
    icon: '◎',
    facets: ['io', 'fs', 'stream'],
    oneLiner: 'Watch a path for changes',
    summary: 'Emits an event over SSE whenever a watched file changes on disk. Drives the .is-live widget state — the dashboard re-reads and re-renders without user action.',
    examples: ["fs.watch({ path: 'data/*.jsonl' })", "→ stream<{ path, kind }>"],
    pros: ['powers live widgets', 'debounced by default'],
    cons: ['one process per watch', 'no recursive globs'],
    subItems: [{
      g: 'events',
      n: 'change',
      d: 'file content changed'
    }, {
      g: 'events',
      n: 'unlink',
      d: 'file removed'
    }],
    fields: [{
      n: 'path',
      k: 'glob',
      r: true,
      d: 'file or glob to watch'
    }, {
      n: 'debounce',
      k: 'int',
      r: false,
      d: 'ms to coalesce'
    }],
    deps: ['fs.read'],
    outputs: ['stream'],
    refs: ['fs.read']
  }, {
    id: 'net.dial',
    icon: '⊕',
    facets: ['net'],
    oneLiner: 'Open a raw socket',
    summary: 'Low-level TCP dial used by higher-level transports. Most consumers should reach for http.request instead unless they need a custom protocol.',
    examples: ['net.dial({ host, port })', '→ Socket'],
    pros: ['custom protocols', 'keep-alive pooling'],
    cons: ['no TLS helpers', 'manual framing'],
    subItems: [{
      g: 'options',
      n: 'keepAlive',
      d: 'reuse idle sockets'
    }],
    fields: [{
      n: 'host',
      k: 'string',
      r: true,
      d: 'target host'
    }, {
      n: 'port',
      k: 'int',
      r: true,
      d: 'target port'
    }],
    deps: [],
    outputs: ['socket'],
    refs: ['http.request']
  }, {
    id: 'schema.validate',
    icon: '✓',
    facets: ['data'],
    oneLiner: 'Validate against a schema',
    summary: 'Validates a value against a declared JSON Schema and returns structured errors with a concrete suggestion per failure — the same shape widgets render in their error state.',
    examples: ["schema.validate(value, 'item')", "→ { ok, errors[] }"],
    pros: ['structured error + suggestion', 'reused by fs.read'],
    cons: ['no async refs', 'draft-07 only'],
    subItems: [{
      g: 'errors',
      n: 'path',
      d: 'json-pointer to the failure'
    }, {
      g: 'errors',
      n: 'suggestion',
      d: 'concrete next step'
    }],
    fields: [{
      n: 'value',
      k: 'any',
      r: true,
      d: 'value to check'
    }, {
      n: 'schema',
      k: 'ref',
      r: true,
      d: 'declared schema id'
    }],
    deps: [],
    outputs: ['report'],
    refs: ['fs.read']
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/catalog.demo-data.js", error: String((e && e.message) || e) }); }

// components/catalog/catalogShared.jsx
try { (() => {
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
    if (Array.isArray(vals)) vals.forEach(v => {
      if (!set.has(v)) {
        set.add(v);
        seen.push(v);
      }
    });else if (vals != null) {
      if (!set.has(vals)) {
        set.add(vals);
        seen.push(vals);
      }
    }
  });
  return seen;
}

/* Filter records by free-text query (over searchFields + facetField) and the
   set of active facets (AND across active facets). */
function filterRecords(records, {
  query,
  activeFacets,
  searchFields,
  facetField
}) {
  const q = (query || '').trim().toLowerCase();
  const active = Object.keys(activeFacets || {}).filter(k => activeFacets[k]);
  return (records || []).filter(r => {
    if (q) {
      const parts = [];
      (searchFields || []).forEach(f => {
        const v = r[f];
        if (v != null) parts.push(Array.isArray(v) ? v.join(' ') : String(v));
      });
      const fv = r[facetField];
      if (Array.isArray(fv)) parts.push(fv.join(' '));else if (fv != null) parts.push(String(fv));
      if (parts.join(' ').toLowerCase().indexOf(q) === -1) return false;
    }
    if (active.length) {
      const fv = r[facetField];
      const arr = Array.isArray(fv) ? fv : fv != null ? [fv] : [];
      if (!active.every(f => arr.indexOf(f) !== -1)) return false;
    }
    return true;
  });
}

/* facetValues(record, facetField) → always an array (for the detail meta line). */
function facetValues(record, facetField) {
  const fv = record ? record[facetField] : null;
  return Array.isArray(fv) ? fv : fv != null ? [fv] : [];
}
window.__AidCatalogKit = {
  ensureCatalogStyles,
  deriveFacets,
  filterRecords,
  facetValues
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalog/catalogShared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/app.jsx
try { (() => {
/* eslint-disable */
/* App entry — composes Chrome, Sidebar, Page, StatusBar.
   Tweaks panel exposes consumer/page switching + density. */

const {
  useState,
  useEffect
} = React;
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "consumer": "code-health",
  "page": "overview",
  "density": "default",
  "showSidebar": true
} /*EDITMODE-END*/;
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Resolve consumer + page from tweaks; fall back gracefully if a stale
  // tweak value points at something that no longer exists.
  const consumer = CONSUMERS.find(c => c.id === tweaks.consumer) || CONSUMERS[0];
  const page = consumer.pages.find(p => p.id === tweaks.page) || consumer.pages[0];
  const helpActive = page.id === 'catalog';
  const selectConsumerPage = (cId, pId) => {
    setTweak({
      consumer: cId,
      page: pId
    });
  };

  // Command-palette items — records (across collections) + pages.
  const paletteItems = [...PALETTE_RECORDS, ...CONSUMERS.flatMap(c => c.pages.map(p => ({
    kind: 'page',
    title: p.name,
    sub: c.name,
    target: {
      consumer: c.id,
      page: p.id
    }
  })))];
  const onChoosePalette = it => {
    if (it.target) selectConsumerPage(it.target.consumer, it.target.page);
    setPaletteOpen(false);
  };
  const onHelp = () => {
    if (page.id === 'catalog') selectConsumerPage('code-health', 'overview');else selectConsumerPage('code-health', 'catalog');
  };
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const onSelectConsumer = cId => {
    const c = CONSUMERS.find(x => x.id === cId) || CONSUMERS[0];
    setTweak({
      consumer: cId,
      page: c.pages[0].id
    });
  };

  // Density reflected on body so kit.css can scale row padding if needed
  useEffect(() => {
    document.body.setAttribute('data-density', tweaks.density || 'default');
  }, [tweaks.density]);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(Chrome, {
    consumer: consumer,
    page: page,
    onOpenPalette: () => setPaletteOpen(true),
    onHelp: onHelp,
    helpActive: helpActive
  }), /*#__PURE__*/React.createElement("div", {
    className: "shell",
    style: {
      gridTemplateColumns: tweaks.showSidebar ? '200px 1fr' : '1fr'
    }
  }, tweaks.showSidebar && /*#__PURE__*/React.createElement(Sidebar, {
    consumers: CONSUMERS,
    current: {
      consumer: consumer.id,
      page: page.id
    },
    onSelect: selectConsumerPage
  }), /*#__PURE__*/React.createElement(Page, {
    consumer: consumer,
    page: page,
    key: consumer.id + '/' + page.id
  })), /*#__PURE__*/React.createElement(StatusBar, {
    consumer: consumer,
    page: page
  }), paletteOpen && /*#__PURE__*/React.createElement(CommandPalette, {
    items: paletteItems,
    onChoose: onChoosePalette,
    onClose: () => setPaletteOpen(false)
  }), /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Tweaks"
  }, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Consumer + page"
  }, /*#__PURE__*/React.createElement(TweakSelect, {
    label: "Consumer",
    value: tweaks.consumer,
    options: CONSUMERS.map(c => ({
      value: c.id,
      label: c.name
    })),
    onChange: onSelectConsumer
  }), /*#__PURE__*/React.createElement(TweakSelect, {
    label: "Page",
    value: tweaks.page,
    options: consumer.pages.map(p => ({
      value: p.id,
      label: p.name + ' · ' + p.layout
    })),
    onChange: v => setTweak('page', v)
  })), /*#__PURE__*/React.createElement(TweakSection, {
    label: "Layout"
  }, /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Sidebar",
    value: tweaks.showSidebar,
    onChange: v => setTweak('showSidebar', v)
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Density",
    value: tweaks.density,
    options: [{
      value: 'compact',
      label: 'compact'
    }, {
      value: 'default',
      label: 'default'
    }, {
      value: 'roomy',
      label: 'roomy'
    }],
    onChange: v => setTweak('density', v)
  }))));
}

/* Mounted by index.html AFTER the compiled bundle has loaded, so the export
   surface (window.AiDeckDesignSystem_9ef1e6.Catalog, …) is ready. Exposing
   App here — rather than self-mounting — lets this same file compile cleanly
   into _ds_bundle.js without double-rendering. */
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/chrome.jsx
try { (() => {
/* eslint-disable */
/* Chrome — header, sidebar, status bar */

function Chrome({
  consumer,
  page,
  onOpenPalette,
  onHelp,
  helpActive
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "chrome"
  }, /*#__PURE__*/React.createElement("span", {
    className: "wm"
  }, "ai", /*#__PURE__*/React.createElement("span", null, "Deck"), /*#__PURE__*/React.createElement("i", {
    className: "wm-dot"
  })), /*#__PURE__*/React.createElement("div", {
    className: "crumb"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("span", null, consumer.name), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "/"), /*#__PURE__*/React.createElement("span", {
    className: "now"
  }, page.name)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "pal",
    role: "button",
    onClick: onOpenPalette
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontFeatureSettings: '"calt" 0'
    }
  }, "\u2315"), /*#__PURE__*/React.createElement("span", {
    className: "ph"
  }, "jump anywhere"), /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u2318"), /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "K")), /*#__PURE__*/React.createElement("span", {
    className: "lh"
  }, /*#__PURE__*/React.createElement("i", null), "127.0.0.1", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.6,
      marginLeft: 4
    }
  }, "\xB7 no telemetry")), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn" + (helpActive ? " on" : ""),
    title: "help \xB7 opens catalog",
    onClick: onHelp,
    style: helpActive ? {
      background: 'var(--status-info-bg)',
      borderColor: 'var(--status-info-line)',
      color: 'var(--status-info)'
    } : undefined
  }, "?"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    title: "menu"
  }, "\u2261"));
}
function Sidebar({
  consumers,
  current,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "side"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grp"
  }, /*#__PURE__*/React.createElement("span", null, "consumers"), /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, consumers.length)), consumers.map(c => {
    const isOn = c.id === current.consumer;
    return /*#__PURE__*/React.createElement("div", {
      key: c.id
    }, /*#__PURE__*/React.createElement("div", {
      className: "consumer-row" + (isOn ? " on" : ""),
      onClick: () => onSelect(c.id, c.pages[0].id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "dot",
      style: {
        background: c.dot
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, c.name), /*#__PURE__*/React.createElement("span", {
      className: "ct"
    }, c.version)), isOn && c.pages.map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: "page-row" + (p.id === current.page ? " on" : ""),
      onClick: () => onSelect(c.id, p.id)
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, p.name), /*#__PURE__*/React.createElement("span", {
      className: "ct"
    }, p.count))));
  }), /*#__PURE__*/React.createElement("div", {
    className: "grp",
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("span", null, "data sources")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 8px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--fg-subtle)',
      lineHeight: 1.8,
      fontFeatureSettings: '"calt" 0'
    }
  }, /*#__PURE__*/React.createElement("div", null, "~/.aideck/"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 10
    }
  }, "consumers/"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 20,
      color: 'var(--chart-1)'
    }
  }, "code-health/"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 20,
      color: 'var(--chart-3)'
    }
  }, "agent-runs/"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 20,
      color: 'var(--chart-2)'
    }
  }, "ci-pipeline/"), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingLeft: 20,
      color: 'var(--chart-5)'
    }
  }, "knowledge/")));
}
function StatusBar({
  consumer,
  page
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "statusbar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sb-item success"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "127.0.0.1:7777"), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "aideck v0.4.0"), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "consumer \xB7 ", consumer.name, " v", consumer.version), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "layout \xB7 ", page.layout), /*#__PURE__*/React.createElement("span", {
    className: "grow"
  }), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "sse \xB7 4 clients"), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "read \xB7 142 \xB7 write \xB7 0"), /*#__PURE__*/React.createElement("span", {
    className: "sb-item"
  }, "MIT"));
}
Object.assign(window, {
  Chrome,
  Sidebar,
  StatusBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/data.jsx
try { (() => {
/* eslint-disable */
/**
 * Mock consumer data. Four consumers, each with 2-3 pages and varied
 * widget bindings — to prove the runtime is consumer-agnostic.
 */

const CONSUMERS = [{
  id: 'code-health',
  name: 'code-health',
  version: '0.3.1',
  dot: 'var(--chart-1)',
  pages: [{
    id: 'overview',
    name: 'overview',
    layout: 'sections',
    count: '·'
  }, {
    id: 'records',
    name: 'records',
    layout: 'sections',
    count: '24'
  }, {
    id: 'record',
    name: 'record',
    layout: 'sections',
    count: '◉'
  }, {
    id: 'pull-requests',
    name: 'pull-requests',
    layout: 'sections',
    count: '12'
  }, {
    id: 'pipeline',
    name: 'pipeline',
    layout: 'single',
    count: '◉'
  }, {
    id: 'coverage',
    name: 'coverage',
    layout: 'grid',
    count: '82%'
  }, {
    id: 'catalog',
    name: 'catalog',
    layout: 'single',
    count: '?'
  }]
}, {
  id: 'agent-runs',
  name: 'agent-runs',
  version: '0.2.0',
  dot: 'var(--chart-3)',
  pages: [{
    id: 'today',
    name: 'today',
    layout: 'sections',
    count: '142'
  }, {
    id: 'tools',
    name: 'tools',
    layout: 'grid',
    count: '24'
  }, {
    id: 'errors',
    name: 'errors',
    layout: 'sections',
    count: '3'
  }]
}, {
  id: 'ci-pipeline',
  name: 'ci-pipeline',
  version: '0.1.4',
  dot: 'var(--chart-2)',
  pages: [{
    id: 'queue',
    name: 'queue',
    layout: 'sections',
    count: '8'
  }, {
    id: 'history',
    name: 'history',
    layout: 'grid',
    count: '142'
  }]
}, {
  id: 'knowledge',
  name: 'knowledge',
  version: '0.4.2',
  dot: 'var(--chart-5)',
  pages: [{
    id: 'recent',
    name: 'recent',
    layout: 'sections',
    count: '28'
  }, {
    id: 'topics',
    name: 'topics',
    layout: 'grid',
    count: '14'
  }, {
    id: 'principles',
    name: 'principles',
    layout: 'single',
    count: '7'
  }]
}];

/* ──────────────────────────────────────────────────────────────────
   Per (consumer, page) data. Each entry returns the structured
   widget definitions the page renders. Pages are denser than a real
   product — the kit is calibrated against the 5×15-widgets target.
   ────────────────────────────────────────────────────────────────── */

const DATA = {
  /* ── CODE-HEALTH ────────────────────────────────────────────── */

  'code-health/overview': {
    title: 'code-health · overview',
    subtitle: 'consumer · sections layout · refreshed 3s ago',
    sections: [{
      title: 'Health',
      sub: '— 4 widgets · 24h window',
      widgets: [{
        kind: 'stat',
        span: 3,
        title: 'open PRs',
        meta: '24h',
        value: '12',
        delta: '↓ 3',
        dir: 'down-good'
      }, {
        kind: 'stat',
        span: 3,
        title: 'deploys',
        meta: '24h',
        value: '38',
        delta: '↑ 12.4%',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'failed CI',
        meta: '24h',
        value: '3',
        delta: '↑ 1',
        dir: 'down',
        color: 'var(--status-error)'
      }, {
        kind: 'stat',
        span: 3,
        title: 'coverage',
        meta: 'main',
        value: '82.4%',
        delta: '↑ 0.6',
        dir: 'up',
        color: 'var(--status-success)'
      }]
    }, {
      title: 'Throughput',
      sub: '— line + bar · last 7d',
      widgets: [{
        kind: 'line',
        span: 8,
        title: 'deploys per day',
        meta: 'api · mcp · sse',
        series: [{
          key: 'api',
          color: 'var(--chart-1)',
          data: [8, 12, 10, 14, 18, 16, 22]
        }, {
          key: 'mcp',
          color: 'var(--chart-2)',
          data: [5, 7, 9, 8, 12, 11, 14]
        }, {
          key: 'sse',
          color: 'var(--chart-3)',
          data: [2, 3, 3, 4, 5, 6, 8]
        }]
      }, {
        kind: 'bar',
        span: 4,
        title: 'PRs by author',
        meta: 'rolling 7d',
        data: [{
          label: 'henry',
          v: 8,
          c: 'var(--chart-1)'
        }, {
          label: 'claude',
          v: 6,
          c: 'var(--chart-2)'
        }, {
          label: 'cursor',
          v: 5,
          c: 'var(--chart-3)'
        }, {
          label: 'jules',
          v: 3,
          c: 'var(--chart-4)'
        }, {
          label: 'cody',
          v: 2,
          c: 'var(--chart-5)'
        }, {
          label: 'other',
          v: 1,
          c: 'var(--chart-6)'
        }]
      }]
    }, {
      title: 'Activity',
      sub: '— streaming',
      widgets: [{
        kind: 'table',
        span: 7,
        title: 'recent pull requests',
        meta: '12 open · 142 total',
        cols: ['id', 'title', 'author', 'status', '+/-'],
        rows: [['#1284', 'Add retry to MCP server stream', 'henry', {
          chip: 'success',
          text: 'ready'
        }, '+148/-12'], ['#1283', 'Tighten widget grid breakpoint', 'claude', {
          chip: 'warning',
          text: 'review'
        }, '+34/-2'], ['#1281', 'Move test fixtures to jsonl', 'cursor', {
          chip: 'neutral',
          text: 'draft'
        }, '+220/-180'], ['#1278', 'Skeleton loading state', 'henry', {
          chip: 'success',
          text: 'merged'
        }, '+92/-14'], ['#1276', 'Rename status tokens semantic', 'claude', {
          chip: 'info',
          text: 'staged'
        }, '+44/-44'], ['#1271', 'Generic widget runtime', 'henry', {
          chip: 'info',
          text: 'wip'
        }, '+412/-188']]
      }, {
        kind: 'log',
        span: 5,
        title: 'server stdout',
        meta: 'live',
        live: true,
        lines: [['14:32:08', 'ok', 'ready', '127.0.0.1:7777', null], ['14:32:09', 'info', 'load', '5 pages, 62 widgets, 8 sources', null], ['14:32:12', 'info', 'sse', 'client connected', '/_sse?consumer=code-health'], ['14:32:18', 'warn', 'warn', 'slow file', 'runs.jsonl took 412ms'], ['14:32:31', 'info', 'mcp', 'tool page.get', 'overview'], ['14:32:42', 'ok', 'ok', 'refreshed Stat · throughput · 38ms', null], ['14:32:58', 'err', 'err', 'parse error', 'runs.jsonl:412'], ['14:33:11', 'info', 'fs', 'change', 'runs.jsonl · re-reading'], ['14:33:11', 'ok', 'ok', 'cleared error · log#3 healthy', null]]
      }]
    }]
  },
  'code-health/pull-requests': {
    title: 'code-health · pull-requests',
    subtitle: '12 open · refreshed 4s ago',
    tabs: ['overview', 'pull-requests', 'deploys', 'coverage', 'ci-runs'],
    tabActive: 'pull-requests',
    sections: [{
      title: 'Open',
      sub: '— kanban by status',
      widgets: [{
        kind: 'kanban',
        span: 12,
        title: 'pull requests · this sprint',
        meta: '12 open',
        cols: [{
          name: 'draft',
          cards: [{
            id: '#1281',
            title: 'Move test fixtures to jsonl',
            tags: [{
              t: 'data',
              c: 'var(--chart-4)'
            }]
          }, {
            id: '#1276',
            title: 'Rename status tokens',
            tags: [{
              t: 'design',
              c: 'var(--chart-3)'
            }]
          }]
        }, {
          name: 'review',
          cards: [{
            id: '#1283',
            title: 'Tighten widget grid breakpoint',
            tags: [{
              t: 'ui',
              c: 'var(--chart-1)'
            }],
            accent: true
          }, {
            id: '#1271',
            title: 'Generic widget runtime',
            tags: [{
              t: 'core',
              c: 'var(--chart-5)'
            }, {
              t: 'runtime',
              c: 'var(--chart-2)'
            }],
            accent: true
          }, {
            id: '#1268',
            title: 'Drawer keyboard nav',
            tags: [{
              t: 'a11y',
              c: 'var(--chart-2)'
            }]
          }]
        }, {
          name: 'ready',
          cards: [{
            id: '#1284',
            title: 'Add retry to MCP server stream',
            tags: [{
              t: 'mcp',
              c: 'var(--chart-3)'
            }]
          }, {
            id: '#1280',
            title: 'Type narrowing on widget kind',
            tags: [{
              t: 'types',
              c: 'var(--chart-4)'
            }]
          }]
        }, {
          name: 'merged · 24h',
          cards: [{
            id: '#1278',
            title: 'Skeleton loading state'
          }, {
            id: '#1275',
            title: 'Glass utility classes'
          }, {
            id: '#1273',
            title: 'Chart palette · 8 hues'
          }, {
            id: '#1272',
            title: 'Localhost trust signal'
          }, {
            id: '#1269',
            title: 'Inter + JetBrains Mono swap'
          }]
        }]
      }]
    }]
  },
  'code-health/pipeline': {
    title: 'code-health · pipeline',
    subtitle: 'single layout · mermaid · live',
    single: 'pipeline-dag'
  },
  'code-health/coverage': {
    title: 'code-health · coverage',
    subtitle: 'grid layout · 12 col',
    grid: [{
      col: '1 / span 4',
      row: 'span 2',
      kind: 'gauge',
      title: 'overall coverage',
      meta: 'main',
      value: 82.4,
      label: '1,247 / 1,514'
    }, {
      col: '5 / span 4',
      row: 'span 2',
      kind: 'gauge',
      title: 'lines covered',
      meta: 'changed',
      value: 91.2,
      label: '412 / 451',
      c: 'var(--chart-2)'
    }, {
      col: '9 / span 4',
      row: 'span 2',
      kind: 'gauge',
      title: 'branches covered',
      meta: 'changed',
      value: 74.0,
      label: '87 / 117',
      c: 'var(--chart-4)'
    }, {
      col: '1 / span 6',
      row: 'span 3',
      kind: 'progress',
      title: 'by package',
      meta: '5 packages',
      rows: [{
        name: 'src/server',
        cur: 8,
        total: 8,
        c: 'var(--status-success)'
      }, {
        name: 'src/client',
        cur: 12,
        total: 18,
        c: 'var(--status-info)'
      }, {
        name: 'src/widgets',
        cur: 18,
        total: 24,
        c: 'var(--chart-2)'
      }, {
        name: 'src/schemas',
        cur: 3,
        total: 8,
        c: 'var(--chart-3)'
      }, {
        name: 'src/cli',
        cur: 0,
        total: 5,
        c: 'var(--status-neutral)'
      }]
    }, {
      col: '7 / span 6',
      row: 'span 3',
      kind: 'table-compact',
      title: 'uncovered files',
      meta: '18 of 348',
      cols: ['file', 'lines', 'covered', '%'],
      rows: [['src/cli/migrate.ts', '124', '0', '0%'], ['src/cli/init.ts', '88', '0', '0%'], ['src/server/mcp/tools.ts', '212', '142', '67%'], ['src/server/sse.ts', '186', '152', '82%'], ['src/client/widgets/Graph.vue', '142', '118', '83%'], ['src/client/widgets/Tree.vue', '98', '82', '84%']]
    }]
  },
  'code-health/records': {
    title: 'code-health · records',
    subtitle: 'sections · 24 records · collection-grid',
    sections: [{
      title: 'Fleet',
      sub: '— headline-banner + lanes',
      widgets: [{
        kind: 'headline-banner',
        span: 6,
        count: '18',
        title: 'records healthy',
        sub: 'of 24 · ↑ 2 today',
        tone: 'success',
        lanes: [{
          tone: 'success'
        }, {
          tone: 'success'
        }, {
          tone: 'success'
        }, {
          tone: 'success'
        }, {
          tone: 'success'
        }, {
          tone: 'info'
        }, {
          tone: 'info'
        }, {
          tone: 'warning'
        }, {
          tone: 'warning'
        }, {
          tone: 'neutral',
          active: false
        }, {
          tone: 'neutral',
          active: false
        }, {
          tone: 'neutral',
          active: false
        }]
      }, {
        kind: 'headline-banner',
        span: 6,
        count: '2',
        title: 'records blocked',
        sub: 'needs attention · 24h',
        tone: 'warning',
        lanes: [{
          tone: 'warning'
        }, {
          tone: 'warning'
        }, {
          tone: 'neutral',
          active: false
        }, {
          tone: 'neutral',
          active: false
        }, {
          tone: 'neutral',
          active: false
        }]
      }]
    }, {
      title: 'All records',
      sub: '— auto-fit · 1 card per record',
      widgets: [{
        kind: 'collection-grid',
        span: 12,
        title: 'records',
        meta: '24 · auto-fit',
        minColWidth: 248,
        records: [{
          name: 'payments',
          live: true,
          badge: {
            text: 'stream',
            tone: 'info'
          },
          steps: ['success', 'success', 'info', null],
          progress: {
            label: 'progress',
            cur: 5,
            total: 12,
            tone: 'info'
          },
          stats: [{
            v: 12,
            l: 'items'
          }, {
            v: 2,
            l: 'running'
          }, {
            v: 0,
            l: 'errors'
          }],
          nested: [{
            tone: 'info',
            title: 'reindex shards',
            code: 'T-004'
          }, {
            tone: 'info',
            title: 'warm cache',
            code: 'T-009'
          }],
          footer: {
            left: 'refreshed 3s ago',
            right: 'open →'
          }
        }, {
          name: 'notifications',
          attn: true,
          badge: {
            text: 'blocked',
            tone: 'error'
          },
          steps: ['success', 'warning', null, null],
          progress: {
            label: 'progress',
            cur: 1,
            total: 8,
            tone: 'warning'
          },
          stats: [{
            v: 8,
            l: 'items'
          }, {
            v: 2,
            l: 'blocked',
            tone: 'error'
          }, {
            v: 1,
            l: 'errors',
            tone: 'error'
          }],
          callout: {
            tone: 'warning',
            eyebrow: 'next action',
            body: 'Source events.jsonl failed — fix to resume.'
          },
          footer: {
            left: 'github.com/org/repo',
            right: 'open →'
          }
        }, {
          name: 'search-index',
          badge: {
            text: 'healthy',
            tone: 'success'
          },
          steps: ['success', 'success', 'success', 'success'],
          progress: {
            label: 'progress',
            cur: 9,
            total: 9,
            tone: 'success'
          },
          stats: [{
            v: 9,
            l: 'items'
          }, {
            v: 0,
            l: 'running'
          }, {
            v: 0,
            l: 'errors'
          }],
          nested: [{
            tone: 'success',
            title: 'all checks pass',
            code: '9/9'
          }],
          footer: {
            left: 'refreshed 1m ago',
            right: 'open →'
          }
        }, {
          name: 'billing-export',
          badge: {
            text: 'queued',
            tone: 'neutral'
          },
          steps: ['success', null, null, null],
          progress: {
            label: 'progress',
            cur: 0,
            total: 6,
            tone: 'neutral'
          },
          stats: [{
            v: 6,
            l: 'items'
          }, {
            v: 0,
            l: 'running'
          }, {
            v: 0,
            l: 'errors'
          }],
          footer: {
            left: 'queued · 4m ago',
            right: 'open →'
          }
        }]
      }]
    }]
  },
  'code-health/record': {
    title: 'code-health · record',
    subtitle: 'sections · record detail',
    switcher: {
      currentId: 'REC-014',
      records: [{
        id: 'REC-014',
        title: 'payments',
        tone: 'info',
        statusLabel: 'running',
        caption: '2 running · refreshed 3s ago'
      }, {
        id: 'REC-015',
        title: 'notifications',
        tone: 'warning',
        statusLabel: 'blocked',
        caption: '2 blocked · 1m ago'
      }, {
        id: 'REC-016',
        title: 'search-index',
        tone: 'success',
        statusLabel: 'healthy',
        caption: '9/9 · 1m ago'
      }, {
        id: 'REC-018',
        title: 'billing-export',
        tone: 'neutral',
        statusLabel: 'pending',
        caption: 'queued · 4m ago'
      }, {
        id: 'REC-021',
        title: 'audit-log',
        tone: 'info',
        statusLabel: 'running',
        caption: '1 running · 9s ago'
      }, {
        id: 'REC-024',
        title: 'webhooks',
        tone: 'success',
        statusLabel: 'healthy',
        caption: '4/4 · 12m ago'
      }]
    },
    sections: [{
      title: 'Sequence',
      sub: '— stepper vertical + labeled progress',
      widgets: [{
        kind: 'stepper',
        span: 7,
        orientation: 'vertical',
        selectable: true,
        selectedId: 'S3',
        currentId: 'S3',
        title: 'pipeline',
        meta: 'selectable · deps',
        steps: [{
          id: 'S1',
          label: 'validate manifest',
          tone: 'success',
          statusLabel: 'done',
          dependsOn: []
        }, {
          id: 'S2',
          label: 'resolve schemas',
          tone: 'success',
          statusLabel: 'done',
          dependsOn: ['S1']
        }, {
          id: 'S3',
          label: 'render widgets',
          tone: 'info',
          statusLabel: 'running',
          dependsOn: ['S1', 'S2'],
          metric: '5/12'
        }, {
          id: 'S4',
          label: 'flush SSE buffer',
          tone: 'warning',
          statusLabel: 'blocked',
          dependsOn: ['S3']
        }, {
          id: 'S5',
          label: 'publish snapshot',
          tone: 'neutral',
          statusLabel: 'pending',
          dependsOn: ['S3', 'S4']
        }]
      }, {
        kind: 'progress',
        span: 5,
        title: 'andamento',
        meta: 'labeled · tone',
        rows: [{
          name: 'indexing',
          cur: 5,
          total: 12,
          c: 'var(--status-info)'
        }, {
          name: 'coverage',
          cur: 94,
          total: 100,
          c: 'var(--status-success)'
        }, {
          name: 'disk budget',
          cur: 86,
          total: 100,
          c: 'var(--status-warning)'
        }]
      }]
    }, {
      title: 'Items + criteria',
      sub: '— status-list (grouped) + checklist + callout',
      widgets: [{
        kind: 'status-list',
        span: 5,
        title: 'items',
        groupBy: 'state',
        groupOrder: ['running', 'blocked', 'pending', 'done'],
        items: [{
          id: 'T-004',
          label: 'reindex search shards',
          tone: 'info',
          statusLabel: 'running',
          group: 'running'
        }, {
          id: 'T-009',
          label: 'warm cache layer',
          tone: 'info',
          statusLabel: 'running',
          group: 'running'
        }, {
          id: 'T-011',
          label: 'migrate fixtures',
          annotation: 'by T-004',
          group: 'blocked'
        }, {
          id: 'T-013',
          label: 'publish manifest',
          annotation: 'by T-009, T-011',
          group: 'blocked'
        }, {
          id: 'T-018',
          label: 'archive snapshots',
          tone: 'neutral',
          statusLabel: 'pending',
          group: 'pending'
        }, {
          id: 'T-001',
          label: 'validate schema',
          tone: 'success',
          statusLabel: 'done',
          group: 'done'
        }]
      }, {
        kind: 'checklist',
        span: 4,
        title: 'criteria',
        meta: 'verify labels',
        items: [{
          check: 'ok',
          label: 'all required fields present',
          meta: 'schema@1.4'
        }, {
          check: 'ok',
          label: 'no orphaned references',
          meta: 'linter'
        }, {
          check: 'no',
          label: 'data source resolves',
          meta: 'fs-check'
        }, {
          check: 'idle',
          label: 'snapshot signed',
          meta: 'not run'
        }]
      }, {
        kind: 'callout',
        span: 3,
        tone: 'info',
        eyebrow: 'next action',
        body: 'Run aideck validate to unblock 2 dependent records.'
      }]
    }]
  },
  'code-health/catalog': {
    title: 'code-health · catalog',
    subtitle: 'single · master-detail · help',
    single: 'catalog',
    catalog: {
      facets: ['io', 'net', 'fs', 'stream', 'data'],
      records: [{
        id: 'http.request',
        icon: '⇄',
        facets: ['io', 'net'],
        oneLiner: 'Issue an HTTP request',
        summary: "Performs an outbound HTTP request and returns the parsed response. Honors the consumer's timeout and retry policy; never follows redirects across hosts.",
        examples: ["http.request({ url, method: 'GET' })", "→ { status, headers, body }"],
        pros: ['streams large bodies', 'retries idempotent verbs'],
        cons: ['no cross-host redirect', 'blocks on slow DNS'],
        subItems: [{
          group: 'options',
          name: 'timeout',
          description: 'per-attempt ms ceiling'
        }, {
          group: 'options',
          name: 'retries',
          description: 'max attempts for idempotent verbs'
        }, {
          group: 'hooks',
          name: 'onChunk',
          description: 'called per streamed chunk'
        }],
        fields: [{
          name: 'url',
          kind: 'string',
          required: true,
          description: 'absolute request URL'
        }, {
          name: 'method',
          kind: 'enum',
          required: false,
          description: 'GET · POST · …'
        }, {
          name: 'body',
          kind: 'bytes',
          required: false,
          description: 'request payload'
        }],
        deps: ['net.dial'],
        outputs: ['response', 'metrics'],
        refs: ['net.dial', 'fs.read']
      }, {
        id: 'fs.read',
        icon: '▤',
        facets: ['io', 'fs'],
        oneLiner: 'Read a file from disk',
        summary: "Reads a file under the consumer's data root and validates it against the declared JSON Schema before returning. Path traversal outside the root is rejected.",
        examples: ["fs.read({ path: 'data/items.jsonl' })", "→ Record[]  // schema-validated"],
        pros: ['schema-validated on read', 'sandboxed to data root'],
        cons: ['whole-file only', 'no watch (use fs.watch)'],
        subItems: [{
          group: 'options',
          name: 'encoding',
          description: 'utf-8 · bytes'
        }, {
          group: 'options',
          name: 'schema',
          description: 'ref to a declared schema'
        }],
        fields: [{
          name: 'path',
          kind: 'string',
          required: true,
          description: 'path relative to data root'
        }, {
          name: 'schema',
          kind: 'ref',
          required: false,
          description: 'validate against this'
        }],
        deps: [],
        outputs: ['records'],
        refs: ['fs.watch', 'http.request']
      }, {
        id: 'fs.watch',
        icon: '◎',
        facets: ['io', 'fs', 'stream'],
        oneLiner: 'Watch a path for changes',
        summary: 'Emits an event over SSE whenever a watched file changes on disk. Drives the .is-live widget state — the dashboard re-reads and re-renders without user action.',
        examples: ["fs.watch({ path: 'data/*.jsonl' })", "→ stream<{ path, kind }>"],
        pros: ['powers live widgets', 'debounced by default'],
        cons: ['one process per watch', 'no recursive globs'],
        subItems: [{
          group: 'events',
          name: 'change',
          description: 'file content changed'
        }, {
          group: 'events',
          name: 'unlink',
          description: 'file removed'
        }],
        fields: [{
          name: 'path',
          kind: 'glob',
          required: true,
          description: 'file or glob to watch'
        }, {
          name: 'debounce',
          kind: 'int',
          required: false,
          description: 'ms to coalesce'
        }],
        deps: ['fs.read'],
        outputs: ['stream'],
        refs: ['fs.read']
      }, {
        id: 'net.dial',
        icon: '⊕',
        facets: ['net'],
        oneLiner: 'Open a raw socket',
        summary: 'Low-level TCP dial used by higher-level transports. Most consumers should reach for http.request instead unless they need a custom protocol.',
        examples: ['net.dial({ host, port })', '→ Socket'],
        pros: ['custom protocols', 'keep-alive pooling'],
        cons: ['no TLS helpers', 'manual framing'],
        subItems: [{
          group: 'options',
          name: 'keepAlive',
          description: 'reuse idle sockets'
        }],
        fields: [{
          name: 'host',
          kind: 'string',
          required: true,
          description: 'target host'
        }, {
          name: 'port',
          kind: 'int',
          required: true,
          description: 'target port'
        }],
        deps: [],
        outputs: ['socket'],
        refs: ['http.request']
      }, {
        id: 'schema.validate',
        icon: '✓',
        facets: ['data'],
        oneLiner: 'Validate against a schema',
        summary: 'Validates a value against a declared JSON Schema and returns structured errors with a concrete suggestion per failure — the same shape widgets render in their error state.',
        examples: ["schema.validate(value, 'item')", "→ { ok, errors[] }"],
        pros: ['structured error + suggestion', 'reused by fs.read'],
        cons: ['no async refs', 'draft-07 only'],
        subItems: [{
          group: 'errors',
          name: 'path',
          description: 'json-pointer to the failure'
        }, {
          group: 'errors',
          name: 'suggestion',
          description: 'concrete next step'
        }],
        fields: [{
          name: 'value',
          kind: 'any',
          required: true,
          description: 'value to check'
        }, {
          name: 'schema',
          kind: 'ref',
          required: true,
          description: 'declared schema id'
        }],
        deps: [],
        outputs: ['report'],
        refs: ['fs.read']
      }]
    }
  },
  /* ── AGENT-RUNS ─────────────────────────────────────────────── */

  'agent-runs/today': {
    title: 'agent-runs · today',
    subtitle: 'sections · 142 runs · 8.49M tokens',
    sections: [{
      title: 'Today',
      sub: '— 6 widgets',
      widgets: [{
        kind: 'stat',
        span: 3,
        title: 'runs',
        meta: 'today',
        value: '142',
        delta: '↑ 18',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'tokens',
        meta: 'today',
        value: '8.49M',
        delta: '↑ 1.2M',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'avg cost',
        meta: '$/run',
        value: '$0.42',
        delta: '↓ 0.08',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'errors',
        meta: 'today',
        value: '3',
        delta: '↑ 1',
        dir: 'down',
        color: 'var(--status-error)'
      }, {
        kind: 'line',
        span: 6,
        title: 'tokens per hour',
        meta: '24h',
        series: [{
          key: 'input',
          color: 'var(--chart-1)',
          data: [42, 52, 38, 76, 84, 92, 88, 102, 112, 124, 118, 142, 158, 166, 172, 168, 184, 196, 202, 212, 224, 232, 228, 218]
        }, {
          key: 'output',
          color: 'var(--chart-2)',
          data: [18, 22, 16, 28, 32, 38, 36, 42, 48, 54, 52, 62, 68, 72, 76, 78, 82, 88, 92, 98, 104, 108, 106, 104]
        }]
      }, {
        kind: 'bar',
        span: 6,
        title: 'tokens by tool',
        meta: 'today',
        data: [{
          label: 'read',
          v: 42,
          c: 'var(--chart-1)'
        }, {
          label: 'write',
          v: 30,
          c: 'var(--chart-2)'
        }, {
          label: 'bash',
          v: 18,
          c: 'var(--chart-3)'
        }, {
          label: 'grep',
          v: 14,
          c: 'var(--chart-4)'
        }, {
          label: 'edit',
          v: 10,
          c: 'var(--chart-5)'
        }, {
          label: 'fetch',
          v: 6,
          c: 'var(--chart-6)'
        }, {
          label: 'other',
          v: 4,
          c: 'var(--chart-7)'
        }]
      }]
    }, {
      title: 'Recent',
      sub: '— live timeline + log',
      widgets: [{
        kind: 'timeline',
        span: 6,
        title: 'agent run · 3f9a8c1e',
        meta: '14:32 · 4.2k tok',
        events: [['14:32:08', 'success', 'consumer loaded', 'code-health · v0.3.1 · 5 pages'], ['14:32:09', 'success', 'data sources resolved', 'prs.jsonl · deploys.jsonl · coverage.json'], ['14:32:12', 'info', 'tool · read', 'src/server/sse.ts'], ['14:32:14', 'info', 'tool · grep', 'pattern "EventSource" · 12 matches'], ['14:32:18', 'warning', 'flaky test detected', 'drawer-drag-reorder · re-running 1/3'], ['14:32:24', 'success', 'retry passed', 'attempt 2 · 1.4s'], ['14:32:31', 'info', 'tool · write', 'src/client/widgets/Drawer.vue'], ['14:33:02', 'success', 'run complete', '4.2k tok · 1.18s']]
      }, {
        kind: 'log',
        span: 6,
        title: 'mcp server',
        meta: 'live · ~/.aideck',
        live: true,
        lines: [['14:31:42', 'info', 'mcp', 'tool page.list', null], ['14:31:43', 'ok', 'ok', 'returned 5 pages', null], ['14:32:08', 'info', 'load', 'consumer code-health v0.3.1', null], ['14:32:12', 'info', 'sse', 'client connected', '/_sse?consumer=code-health'], ['14:32:14', 'info', 'mcp', 'tool widget.get', 'pr-table#3'], ['14:32:18', 'warn', 'warn', 'slow file', 'runs.jsonl 412ms'], ['14:32:24', 'ok', 'ok', 'fixture write', 'tests/fixtures/sse.jsonl'], ['14:32:42', 'info', 'sse', 'broadcast', 'overview · 12 widgets'], ['14:32:58', 'err', 'err', 'parse error', 'runs.jsonl:412'], ['14:33:11', 'ok', 'ok', 'recovered', 'runs.jsonl re-validated']]
      }]
    }]
  },
  'agent-runs/tools': {
    title: 'agent-runs · tools',
    subtitle: 'grid · usage by tool · last 7d',
    grid: [{
      col: '1 / span 3',
      row: 'span 2',
      kind: 'stat-mini',
      title: 'read',
      value: '4.21M',
      delta: '↑ 12%',
      c: 'var(--chart-1)'
    }, {
      col: '4 / span 3',
      row: 'span 2',
      kind: 'stat-mini',
      title: 'write',
      value: '2.84M',
      delta: '↑ 8%',
      c: 'var(--chart-2)'
    }, {
      col: '7 / span 3',
      row: 'span 2',
      kind: 'stat-mini',
      title: 'bash',
      value: '1.12M',
      delta: '↓ 4%',
      c: 'var(--chart-3)'
    }, {
      col: '10 / span 3',
      row: 'span 2',
      kind: 'stat-mini',
      title: 'grep',
      value: '984k',
      delta: '↑ 22%',
      c: 'var(--chart-4)'
    }, {
      col: '1 / span 12',
      row: 'span 3',
      kind: 'line',
      title: 'tool calls per day · 7d',
      meta: '4 tools · stacked',
      stacked: true,
      series: [{
        key: 'read',
        color: 'var(--chart-1)',
        data: [120, 148, 162, 182, 201, 214, 232]
      }, {
        key: 'write',
        color: 'var(--chart-2)',
        data: [80, 102, 118, 124, 132, 148, 162]
      }, {
        key: 'bash',
        color: 'var(--chart-3)',
        data: [42, 54, 62, 68, 72, 84, 88]
      }, {
        key: 'grep',
        color: 'var(--chart-4)',
        data: [34, 42, 48, 52, 58, 62, 68]
      }]
    }, {
      col: '1 / span 7',
      row: 'span 3',
      kind: 'table-compact',
      title: 'most expensive',
      meta: 'top 6 tool calls',
      cols: ['ts', 'run', 'tool', 'args', 'tokens'],
      rows: [['14:18', '3f99', 'read', 'src/server/mcp/index.ts', '12,482'], ['13:42', '3f88', 'write', 'src/client/widgets/Graph.vue', '8,920'], ['13:14', '3f72', 'grep', 'pattern: "EventSource"', '6,144'], ['12:42', '3f65', 'read', 'docs/superpowers/specs/…', '5,820'], ['11:58', '3f4a', 'bash', 'pnpm test --filter widget', '4,712'], ['11:20', '3f3c', 'read', 'CLAUDE.md', '3,488']]
    }, {
      col: '8 / span 5',
      row: 'span 3',
      kind: 'kv',
      title: 'session',
      meta: 'cumulative',
      rows: [['runs', '142'], ['tools called', '1,284'], ['cache hits', '78%'], ['avg p95', '38.4ms'], ['tokens in', '6.18M'], ['tokens out', '2.31M'], ['cost', '$59.74']]
    }]
  },
  'agent-runs/errors': {
    title: 'agent-runs · errors',
    subtitle: 'sections · 3 today · 18 this week',
    sections: [{
      title: 'Today',
      sub: '— terse, no illustrations',
      widgets: [{
        kind: 'error-card',
        span: 4,
        title: 'parse · runs.jsonl',
        source: 'agent-runs · run-3f9e8c1e',
        msg: "Unexpected ',' at line 412.",
        path: "~/.aideck/consumers/agent-runs/data/runs.jsonl",
        suggestion: "Validate with jq < runs.jsonl"
      }, {
        kind: 'error-card',
        span: 4,
        title: 'tool · timeout',
        source: 'code-health · run-3f88a4c2',
        msg: "Tool write exceeded 8s.",
        path: "tool=write · target=src/client/widgets/Graph.vue",
        suggestion: "Increase tool timeout to 12s in manifest"
      }, {
        kind: 'error-card',
        span: 4,
        title: 'schema · widget',
        source: 'knowledge · load',
        msg: "Widget 'topic-cloud' is not in the built-in 25.",
        path: "~/.aideck/consumers/knowledge/manifest.yaml:48",
        suggestion: "Rename to 'tag' or 'list' kind"
      }]
    }, {
      title: 'History',
      sub: '— 18 events · 7d',
      widgets: [{
        kind: 'timeline',
        span: 12,
        title: 'errors · last 7d',
        meta: '18 events',
        events: [['Mon 09:14', 'warning', 'flaky test', 'drawer-drag-reorder · re-running'], ['Mon 14:42', 'error', 'parse error', 'prs.jsonl:142 · trailing comma'], ['Tue 11:18', 'error', 'schema mismatch', 'widget.kind="histogram" not allowed'], ['Wed 08:02', 'warning', 'slow file', 'agent-runs/runs.jsonl 612ms'], ['Thu 16:38', 'error', 'tool timeout', 'bash test:e2e · 12.4s'], ['Fri 09:22', 'info', 'recovered', 'runs.jsonl re-validated after touch'], ['Fri 13:48', 'warning', 'config drift', 'manifest.yaml version 0.2 → 0.3'], ['Sat 18:14', 'error', 'mcp client error', 'EPIPE on stdout · client restarted']]
      }]
    }]
  },
  /* ── CI-PIPELINE ────────────────────────────────────────────── */

  'ci-pipeline/queue': {
    title: 'ci-pipeline · queue',
    subtitle: 'sections · 8 in queue · 1 running',
    sections: [{
      title: 'Now',
      sub: '— 4 widgets',
      widgets: [{
        kind: 'stat',
        span: 3,
        title: 'in queue',
        meta: 'pending',
        value: '8',
        delta: '↑ 2',
        dir: 'down'
      }, {
        kind: 'stat',
        span: 3,
        title: 'running',
        meta: 'now',
        value: '1',
        delta: '·',
        dir: 'flat',
        color: 'var(--status-info)'
      }, {
        kind: 'stat',
        span: 3,
        title: 'success rate',
        meta: '24h',
        value: '94.4%',
        delta: '↑ 1.2',
        dir: 'up',
        color: 'var(--status-success)'
      }, {
        kind: 'stat',
        span: 3,
        title: 'avg duration',
        meta: '24h',
        value: '4m 12s',
        delta: '↓ 22s',
        dir: 'up'
      }, {
        kind: 'progress',
        span: 6,
        title: 'current run · build #3284',
        meta: '5 of 7 steps',
        rows: [{
          name: 'install',
          cur: 1,
          total: 1,
          c: 'var(--status-success)'
        }, {
          name: 'typecheck',
          cur: 1,
          total: 1,
          c: 'var(--status-success)'
        }, {
          name: 'lint',
          cur: 1,
          total: 1,
          c: 'var(--status-success)'
        }, {
          name: 'unit',
          cur: 1,
          total: 1,
          c: 'var(--status-success)'
        }, {
          name: 'e2e',
          cur: 1,
          total: 1,
          c: 'var(--status-info)'
        }, {
          name: 'bundle',
          cur: 0,
          total: 1,
          c: 'var(--status-neutral)'
        }, {
          name: 'deploy',
          cur: 0,
          total: 1,
          c: 'var(--status-neutral)'
        }]
      }, {
        kind: 'gauge',
        span: 3,
        title: 'cpu',
        meta: 'runner-3',
        value: 74,
        label: '7.4 of 10 cores',
        c: 'var(--chart-4)'
      }, {
        kind: 'gauge',
        span: 3,
        title: 'mem',
        meta: 'runner-3',
        value: 58,
        label: '4.6 of 8 GB',
        c: 'var(--chart-2)'
      }]
    }, {
      title: 'Queue',
      sub: '— 8 pending',
      widgets: [{
        kind: 'table',
        span: 12,
        title: 'pending builds',
        meta: 'sorted by submitted',
        cols: ['#', 'branch', 'commit', 'submitted', 'status', 'eta'],
        rows: [['#3284', 'main', 'a4f9c1', '14:32:08', {
          chip: 'info',
          text: 'running'
        }, '4m'], ['#3285', 'feature/widget-runtime', 'b2e8d3', '14:33:04', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3286', 'fix/sse-reconnect', '3c8a2e', '14:34:21', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3287', 'feature/mcp-tools', 'd1f4a8', '14:34:48', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3288', 'docs/widget-frame', 'e9b3c2', '14:35:12', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3289', 'feature/chart-palette', 'f2a8d1', '14:35:48', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3290', 'main', '7c4e2b', '14:36:18', {
          chip: 'neutral',
          text: 'queued'
        }, '· '], ['#3291', 'dependabot/inter', '4d8f9c', '14:36:42', {
          chip: 'neutral',
          text: 'queued'
        }, '· ']]
      }]
    }]
  },
  'ci-pipeline/history': {
    title: 'ci-pipeline · history',
    subtitle: 'grid · last 142 builds',
    grid: [{
      col: '1 / span 12',
      row: 'span 3',
      kind: 'line',
      title: 'duration over time · 142 builds',
      meta: 'success · failed · flaky',
      series: [{
        key: 'success',
        color: 'var(--chart-2)',
        data: [3.2, 3.4, 3.1, 3.6, 4.0, 3.8, 4.2, 4.1, 3.9, 4.0, 3.7, 3.8, 4.0, 4.2, 4.0, 3.9, 4.1, 4.0, 3.8, 3.9, 4.0, 4.1, 4.0, 4.2]
      }, {
        key: 'failed',
        color: 'var(--chart-8)',
        data: [null, null, 8.4, null, null, 9.2, null, null, null, 10.1, null, null, 8.8, null, null, null, 9.4, null, null, 8.2, null, null, null, 9.0]
      }, {
        key: 'flaky',
        color: 'var(--chart-4)',
        data: [null, 5.4, null, null, 6.0, null, null, 5.8, null, null, 5.6, null, null, 5.4, null, null, null, null, 6.2, null, null, 5.8, null, null]
      }]
    }, {
      col: '1 / span 6',
      row: 'span 3',
      kind: 'bar',
      title: 'failures by step',
      meta: 'last 142',
      data: [{
        label: 'e2e',
        v: 18,
        c: 'var(--chart-1)'
      }, {
        label: 'unit',
        v: 8,
        c: 'var(--chart-2)'
      }, {
        label: 'lint',
        v: 6,
        c: 'var(--chart-3)'
      }, {
        label: 'typecheck',
        v: 4,
        c: 'var(--chart-4)'
      }, {
        label: 'bundle',
        v: 2,
        c: 'var(--chart-5)'
      }]
    }, {
      col: '7 / span 6',
      row: 'span 3',
      kind: 'list',
      title: 'last 8 builds',
      meta: '8 of 142',
      rows: [{
        left: '#3283',
        mid: 'main · a4f9c0',
        right: {
          chip: 'success',
          text: 'pass · 4.0s'
        }
      }, {
        left: '#3282',
        mid: 'feature/widget-runtime',
        right: {
          chip: 'success',
          text: 'pass · 4.2s'
        }
      }, {
        left: '#3281',
        mid: 'docs/widget-frame',
        right: {
          chip: 'success',
          text: 'pass · 3.8s'
        }
      }, {
        left: '#3280',
        mid: 'fix/sse-reconnect',
        right: {
          chip: 'warning',
          text: 'flaky'
        }
      }, {
        left: '#3279',
        mid: 'feature/mcp-tools',
        right: {
          chip: 'error',
          text: 'fail · e2e'
        }
      }, {
        left: '#3278',
        mid: 'main',
        right: {
          chip: 'success',
          text: 'pass · 4.1s'
        }
      }, {
        left: '#3277',
        mid: 'feature/chart-palette',
        right: {
          chip: 'success',
          text: 'pass · 4.0s'
        }
      }, {
        left: '#3276',
        mid: 'dependabot/inter',
        right: {
          chip: 'success',
          text: 'pass · 3.9s'
        }
      }]
    }]
  },
  /* ── KNOWLEDGE ─────────────────────────────────────────────── */

  'knowledge/recent': {
    title: 'knowledge · recent',
    subtitle: 'sections · personal · 28 notes',
    sections: [{
      title: 'Today',
      sub: '— 4 widgets',
      widgets: [{
        kind: 'stat',
        span: 3,
        title: 'notes',
        meta: 'today',
        value: '6',
        delta: '↑ 2',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'total',
        meta: 'all-time',
        value: '284',
        delta: '·',
        dir: 'flat'
      }, {
        kind: 'stat',
        span: 3,
        title: 'tags',
        meta: 'distinct',
        value: '42',
        delta: '↑ 1',
        dir: 'up'
      }, {
        kind: 'stat',
        span: 3,
        title: 'words',
        meta: 'today',
        value: '2,148',
        delta: '↑ 412',
        dir: 'up'
      }, {
        kind: 'markdown',
        span: 8,
        title: 'principle · files are canonical',
        meta: 'pinned',
        md: `
<h3>Files are canonical</h3>
<p>aiDeck never owns state — it <em>projects</em> from local files and gets out of the way. The dashboard is a view; the data file is the truth.</p>
<p>Consumers declare their UI via <code>manifest.yaml</code>. Built-in widgets bind to <code>data sources</code>:</p>
<ul>
  <li><code>yaml</code>, <code>json</code>, <code>jsonl</code></li>
  <li>frontmatter markdown</li>
  <li>schema-validated on read</li>
</ul>
<blockquote>If a write is needed, the consumer authors it. aiDeck never writes outside its own preferences.</blockquote>`
      }, {
        kind: 'tags',
        span: 4,
        title: 'top tags',
        meta: '42 distinct',
        tags: [['design', 18, 'var(--chart-1)'], ['runtime', 12, 'var(--chart-2)'], ['mcp', 10, 'var(--chart-3)'], ['vue', 8, 'var(--chart-4)'], ['widgets', 8, 'var(--chart-5)'], ['protocol', 6, 'var(--chart-6)'], ['docs', 5, 'var(--chart-7)'], ['ci', 4, 'var(--chart-8)'], ['inbox', 3, 'var(--status-neutral)']]
      }]
    }, {
      title: 'Recent',
      sub: '— 8 notes',
      widgets: [{
        kind: 'list',
        span: 12,
        title: 'recent notes',
        meta: 'sorted by edited',
        rows: [{
          left: '2026-05-27',
          mid: 'Widget frame · canonical anatomy',
          right: {
            chip: 'info',
            text: 'design'
          }
        }, {
          left: '2026-05-27',
          mid: 'Why glass on chrome but not body',
          right: {
            chip: 'info',
            text: 'design'
          }
        }, {
          left: '2026-05-26',
          mid: 'Generic vs domain-specific tokens',
          right: {
            chip: 'success',
            text: 'principle'
          }
        }, {
          left: '2026-05-26',
          mid: 'MCP tool: page.get contract',
          right: {
            chip: 'info',
            text: 'mcp'
          }
        }, {
          left: '2026-05-25',
          mid: 'SSE re-broadcast on fs change',
          right: {
            chip: 'info',
            text: 'runtime'
          }
        }, {
          left: '2026-05-25',
          mid: 'JetBrains Mono vs Geist Mono',
          right: {
            chip: 'neutral',
            text: 'typo'
          }
        }, {
          left: '2026-05-24',
          mid: 'Skeleton vs spinner — terms',
          right: {
            chip: 'success',
            text: 'principle'
          }
        }, {
          left: '2026-05-23',
          mid: 'Inbox · refactor manifest schema',
          right: {
            chip: 'warning',
            text: 'inbox'
          }
        }]
      }]
    }]
  },
  'knowledge/topics': {
    title: 'knowledge · topics',
    subtitle: 'grid · clustering by tag',
    grid: [{
      col: '1 / span 8',
      row: 'span 4',
      kind: 'tree',
      title: 'topics tree',
      meta: '42 tags',
      rows: [{
        ind: 0,
        kind: 'dir',
        name: 'design/',
        meta: '18 notes'
      }, {
        ind: 1,
        kind: 'file',
        name: 'widget-frame.md',
        meta: '2k'
      }, {
        ind: 1,
        kind: 'file',
        name: 'glass-on-chrome.md',
        meta: '1.4k',
        active: true
      }, {
        ind: 1,
        kind: 'file',
        name: 'density-feature.md',
        meta: '2.8k'
      }, {
        ind: 1,
        kind: 'dir',
        name: 'tokens/',
        meta: '8 notes'
      }, {
        ind: 2,
        kind: 'file',
        name: 'semantic-status.md',
        meta: '1.1k'
      }, {
        ind: 2,
        kind: 'file',
        name: 'chart-palette-oklch.md',
        meta: '2.4k'
      }, {
        ind: 2,
        kind: 'file',
        name: 'inter-vs-geist.md',
        meta: '1.8k'
      }, {
        ind: 0,
        kind: 'dir',
        name: 'runtime/',
        meta: '12 notes'
      }, {
        ind: 1,
        kind: 'file',
        name: 'manifest-shape.md',
        meta: '3.2k'
      }, {
        ind: 1,
        kind: 'file',
        name: 'sse-rebroadcast.md',
        meta: '2.1k'
      }, {
        ind: 1,
        kind: 'file',
        name: 'mcp-tool-list.md',
        meta: '4.4k'
      }, {
        ind: 0,
        kind: 'dir',
        name: 'mcp/',
        meta: '10 notes'
      }, {
        ind: 0,
        kind: 'dir',
        name: 'inbox/',
        meta: '3 notes'
      }]
    }, {
      col: '9 / span 4',
      row: 'span 4',
      kind: 'markdown',
      title: 'preview · glass-on-chrome.md',
      meta: '1.4k',
      md: `
<h3>Glass = chrome only</h3>
<p>The translucent surface treatment is reserved for <em>chrome</em>: the header, the command palette, the drawer, popovers.</p>
<p>It signals "this floats above your content". Putting it on a widget body would compete with the data itself.</p>
<p>Pair with <code>backdrop-filter: saturate(180%) blur(20px)</code>. Three tiers:</p>
<ul>
  <li><code>--glass-thin</code> · subtle hover</li>
  <li><code>--glass-medium</code> · header, popovers</li>
  <li><code>--glass-thick</code> · command palette, drawer</li>
</ul>
<blockquote>If glass is decorative, it's wrong.</blockquote>`
    }]
  },
  'knowledge/principles': {
    title: 'knowledge · principles',
    subtitle: 'single · 7 principles',
    single: 'principles-md'
  }
};

/* Command-palette records — a slice of records across collections. */
const PALETTE_RECORDS = [{
  kind: 'record',
  title: 'payments',
  sub: 'REC-014',
  tone: 'info',
  target: {
    consumer: 'code-health',
    page: 'record'
  }
}, {
  kind: 'record',
  title: 'notifications',
  sub: 'REC-015',
  tone: 'warning',
  target: {
    consumer: 'code-health',
    page: 'record'
  }
}, {
  kind: 'record',
  title: 'search-index',
  sub: 'REC-016',
  tone: 'success',
  target: {
    consumer: 'code-health',
    page: 'record'
  }
}, {
  kind: 'record',
  title: 'audit-log',
  sub: 'REC-021',
  tone: 'info',
  target: {
    consumer: 'code-health',
    page: 'record'
  }
}];
Object.assign(window, {
  CONSUMERS,
  DATA,
  PALETTE_RECORDS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/pages.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* eslint-disable */
/* Page renderer — turns a data.jsx entry into rendered widgets. */

/* Section descriptors handed to the exported Catalog component for the
   code-health catalog page. Field names are this consumer's data shape — the
   component itself stays domain-agnostic. */
const CATALOG_SECTIONS = [{
  kind: 'summary',
  field: 'summary',
  label: 'summary'
}, {
  kind: 'examples',
  field: 'examples',
  label: 'examples'
}, {
  kind: 'prosCons',
  proField: 'pros',
  conField: 'cons',
  label: 'when · when not'
}, {
  kind: 'subItems',
  field: 'subItems',
  label: 'items',
  groupKey: 'group',
  nameKey: 'name',
  descKey: 'description'
}, {
  kind: 'fields',
  field: 'fields',
  label: 'fields',
  columns: [{
    key: 'name',
    label: 'arg',
    mono: true
  }, {
    key: 'kind',
    label: 'kind',
    mono: true
  }, {
    key: 'required',
    label: 'req',
    mono: true,
    bool: true
  }, {
    key: 'description',
    label: 'description'
  }]
}, {
  kind: 'meta',
  label: 'deps · outputs',
  groups: [{
    field: 'deps',
    prefix: '↳ ',
    emptyLabel: 'none'
  }, {
    field: 'outputs',
    prefix: '→ '
  }]
}, {
  kind: 'refs',
  field: 'refs',
  label: 'related'
}];
function renderWidget(w, key) {
  switch (w.kind) {
    case 'stat':
      return /*#__PURE__*/React.createElement(Stat, _extends({
        key: key
      }, w));
    case 'stat-mini':
      return /*#__PURE__*/React.createElement(StatMini, _extends({
        key: key
      }, w));
    case 'line':
      return /*#__PURE__*/React.createElement(LineChart, _extends({
        key: key
      }, w));
    case 'bar':
      return /*#__PURE__*/React.createElement(BarChart, _extends({
        key: key
      }, w));
    case 'gauge':
      return /*#__PURE__*/React.createElement(Gauge, _extends({
        key: key
      }, w));
    case 'progress':
      return /*#__PURE__*/React.createElement(ProgressWidget, _extends({
        key: key
      }, w));
    case 'table':
      return /*#__PURE__*/React.createElement(Table, _extends({
        key: key
      }, w));
    case 'table-compact':
      return /*#__PURE__*/React.createElement(Table, _extends({
        key: key,
        compact: true
      }, w));
    case 'list':
      return /*#__PURE__*/React.createElement(List, _extends({
        key: key
      }, w));
    case 'kv':
      return /*#__PURE__*/React.createElement(KV, _extends({
        key: key
      }, w));
    case 'markdown':
      return /*#__PURE__*/React.createElement(Markdown, _extends({
        key: key
      }, w));
    case 'tags':
      return /*#__PURE__*/React.createElement(Tags, _extends({
        key: key
      }, w));
    case 'kanban':
      return /*#__PURE__*/React.createElement(Kanban, _extends({
        key: key
      }, w));
    case 'timeline':
      return /*#__PURE__*/React.createElement(Timeline, _extends({
        key: key
      }, w));
    case 'log':
      return /*#__PURE__*/React.createElement(Log, _extends({
        key: key
      }, w));
    case 'tree':
      return /*#__PURE__*/React.createElement(TreeView, _extends({
        key: key
      }, w));
    case 'stepper':
      return /*#__PURE__*/React.createElement(Stepper, _extends({
        key: key
      }, w));
    case 'status-list':
      return /*#__PURE__*/React.createElement(StatusList, _extends({
        key: key
      }, w));
    case 'checklist':
      return /*#__PURE__*/React.createElement(StatusList, _extends({
        key: key,
        variant: "checklist"
      }, w));
    case 'callout':
      return /*#__PURE__*/React.createElement(Callout, _extends({
        key: key
      }, w));
    case 'collection-grid':
      return /*#__PURE__*/React.createElement(CollectionGrid, _extends({
        key: key
      }, w));
    case 'headline-banner':
      return /*#__PURE__*/React.createElement(HeadlineBanner, _extends({
        key: key
      }, w));
    case 'error-card':
      return /*#__PURE__*/React.createElement(ErrorCard, _extends({
        key: key
      }, w));
    default:
      return /*#__PURE__*/React.createElement("div", {
        key: key,
        className: "w"
      }, "unknown \xB7 ", w.kind);
  }
}
function Page({
  consumer,
  page
}) {
  const key = consumer.id + '/' + page.id;
  const data = DATA[key];
  const switcher = data && data.switcher;
  const [switchRec, setSwitchRec] = React.useState(switcher ? switcher.currentId : null);
  const curRec = switcher ? switcher.records.find(r => r.id === switchRec) || switcher.records[0] : null;
  if (!data) {
    return /*#__PURE__*/React.createElement("div", {
      className: "main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-title"
    }, /*#__PURE__*/React.createElement("h1", null, consumer.name, " \xB7 ", page.name)), /*#__PURE__*/React.createElement("div", {
      className: "w",
      style: {
        padding: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "empty"
    }, /*#__PURE__*/React.createElement("div", {
      className: "note"
    }, "// no data"), /*#__PURE__*/React.createElement("div", {
      className: "msg"
    }, "page ", /*#__PURE__*/React.createElement("code", {
      className: "t-code-inline"
    }, key), " not yet defined"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-title"
  }, switcher ? /*#__PURE__*/React.createElement(RecordSwitcher, {
    records: switcher.records,
    currentId: curRec.id,
    onSelect: setSwitchRec
  }) : /*#__PURE__*/React.createElement("h1", null, data.title), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, switcher ? curRec.id + ' · ' + (curRec.caption || '') : data.subtitle), /*#__PURE__*/React.createElement("div", {
    className: "page-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost"
  }, "\u21BB refresh"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, "\u2197 open in editor"))), data.tabs && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      borderBottom: '1px solid var(--border-default)',
      display: 'flex',
      gap: 0
    }
  }, data.tabs.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      padding: '7px 14px',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      color: t === data.tabActive ? 'var(--fg-default)' : 'var(--fg-muted)',
      borderBottom: '2px solid ' + (t === data.tabActive ? 'var(--status-info)' : 'transparent'),
      marginBottom: -1,
      cursor: 'pointer'
    }
  }, t))), data.sections && data.sections.map((s, i) => /*#__PURE__*/React.createElement("section", {
    className: "section",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("h2", null, s.title), /*#__PURE__*/React.createElement("span", {
    className: "sub"
  }, s.sub)), /*#__PURE__*/React.createElement("div", {
    className: "section-grid"
  }, s.widgets.map((w, j) => renderWidget(w, j))))), data.grid && /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-grid",
    style: {
      gridAutoRows: 56
    }
  }, data.grid.map((w, j) => renderWidget(w, j)))), data.single === 'pipeline-dag' && /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      height: 'calc(100vh - 200px)'
    }
  }, /*#__PURE__*/React.createElement(PipelineDAG, null)), data.single === 'principles-md' && /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      height: 'calc(100vh - 200px)'
    }
  }, /*#__PURE__*/React.createElement(PrinciplesMD, null)), data.single === 'catalog' && (() => {
    const ExportedCatalog = (window.AiDeckDesignSystem_9ef1e6 || {}).Catalog;
    return /*#__PURE__*/React.createElement("section", {
      className: "section",
      style: {
        height: 'calc(100vh - 200px)'
      }
    }, ExportedCatalog ? /*#__PURE__*/React.createElement(ExportedCatalog, {
      records: data.catalog.records,
      sections: CATALOG_SECTIONS,
      facetField: "facets",
      searchFields: ['id', 'oneLiner', 'summary']
    }) : /*#__PURE__*/React.createElement("div", {
      className: "w",
      style: {
        padding: 20,
        fontFamily: 'var(--font-mono)',
        color: 'var(--fg-subtle)'
      }
    }, "// catalog component unavailable \u2014 is _ds_bundle.js loaded?"));
  })());
}
Object.assign(window, {
  Page
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/pages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/tweaks-panel.jsx
try { (() => {
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/widgets-new.jsx
try { (() => {
/* eslint-disable */
/* aiDeck · NEW widget primitives (spec batch) — visual recreations.
   Loaded after widgets.jsx; WFrame / Chip are already on window. */

const {
  useState: useStateN
} = React;

/* tone (consumer statusMap already resolved → DS token) */
const TONE = {
  success: 'var(--status-success)',
  info: 'var(--status-info)',
  warning: 'var(--status-warning)',
  error: 'var(--status-error)',
  neutral: 'var(--status-neutral)'
};
const TONE_BG = {
  success: 'var(--status-success-bg)',
  info: 'var(--status-info-bg)',
  warning: 'var(--status-warning-bg)',
  error: 'var(--status-error-bg)',
  neutral: 'var(--status-neutral-bg)'
};
const TONE_LINE = {
  success: 'var(--status-success-line)',
  info: 'var(--status-info-line)',
  warning: 'var(--status-warning-line)',
  error: 'var(--status-error-line)',
  neutral: 'var(--status-neutral-line)'
};
const mono = {
  fontFamily: 'var(--font-mono)',
  fontFeatureSettings: '"calt" 0'
};
function ToneChip({
  tone,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "chip",
    style: {
      color: tone === 'neutral' ? 'var(--fg-muted)' : TONE[tone],
      background: TONE_BG[tone],
      borderColor: TONE_LINE[tone]
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: TONE[tone]
    }
  }), children);
}

/* ── Stepper ───────────────────────────────────────────────────── */

function Stepper({
  title,
  meta,
  span = 6,
  col,
  row,
  orientation = 'horizontal',
  steps,
  currentId,
  selectable,
  selectedId
}) {
  const [sel, setSel] = useStateN(selectedId || null);
  if (orientation === 'horizontal') {
    return /*#__PURE__*/React.createElement(WFrame, {
      title: title,
      meta: meta || 'horizontal',
      span: span,
      col: col,
      row: row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 0'
      }
    }, steps.map((s, i) => {
      const t = s.tone;
      const isCur = s.id === currentId;
      let pill;
      if (t === 'success') pill = {
        background: 'color-mix(in srgb, var(--status-success) 24%, var(--bg-surface))',
        borderColor: TONE_LINE.success,
        color: TONE.success
      };else if (t === 'info') pill = {
        background: TONE.info,
        borderColor: TONE.info,
        color: 'var(--fg-on-accent)'
      };else if (t === 'neutral' || !t) pill = {
        background: 'transparent',
        border: '1px dashed var(--border-bright)',
        color: 'var(--fg-subtle)'
      };else pill = {
        background: TONE_BG[t],
        borderColor: TONE_LINE[t],
        color: TONE[t]
      };
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: s.id
      }, i > 0 && /*#__PURE__*/React.createElement("span", {
        style: {
          height: 2,
          flex: 1,
          minWidth: 12,
          margin: '0 1px',
          borderRadius: 2,
          background: steps[i - 1].tone === 'success' ? 'color-mix(in srgb, var(--status-success) 55%, var(--border-default))' : 'var(--border-default)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        title: s.id + ' · ' + (s.tone || 'pending') + (s.label ? ' · ' + s.label : ''),
        style: {
          ...mono,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 22,
          minWidth: 30,
          padding: '0 9px',
          borderRadius: 'var(--radius-pill)',
          fontSize: 11,
          fontWeight: 500,
          border: '1px solid transparent',
          flex: 'none',
          boxShadow: isCur ? '0 0 0 2px var(--bg-surface), 0 0 0 3px var(--status-info)' : 'none',
          ...pill
        }
      }, s.id));
    })));
  }

  /* vertical */
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta || 'vertical · deps',
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '2px 0'
    }
  }, steps.map((s, i) => {
    const t = s.tone;
    const isSel = selectable && sel === s.id;
    const isCur = s.id === currentId;
    const numStyle = t === 'success' ? {
      background: 'color-mix(in srgb, var(--status-success) 24%, var(--bg-surface))',
      borderColor: TONE_LINE.success,
      color: TONE.success
    } : t === 'info' ? {
      background: TONE.info,
      borderColor: TONE.info,
      color: 'var(--fg-on-accent)'
    } : t && t !== 'neutral' ? {
      background: TONE_BG[t],
      borderColor: TONE_LINE[t],
      color: TONE[t]
    } : {
      background: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
      color: 'var(--fg-muted)'
    };
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      onClick: selectable ? () => setSel(s.id) : undefined,
      style: {
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        gap: 10,
        padding: '7px 8px',
        borderRadius: 'var(--radius-md)',
        cursor: selectable ? 'pointer' : 'default',
        background: isSel ? 'var(--bg-overlay)' : 'transparent',
        boxShadow: isSel ? 'inset 2px 0 0 var(--status-info)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        width: 22,
        height: 22,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        border: '1px solid transparent',
        zIndex: 1,
        boxShadow: isCur ? '0 0 0 2px var(--bg-surface), 0 0 0 3px var(--status-info)' : 'none',
        ...numStyle
      }
    }, t === 'success' ? '✓' : i + 1), i < steps.length - 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '50%',
        top: 22,
        bottom: -14,
        width: 1,
        background: 'var(--border-default)',
        transform: 'translateX(-0.5px)'
      }
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        color: 'var(--fg-default)',
        fontWeight: 500
      }
    }, s.label), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--fg-subtle)',
        marginTop: 2
      }
    }, "depends on ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--fg-muted)'
      }
    }, s.dependsOn && s.dependsOn.length ? s.dependsOn.join(', ') : '—'))), /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: 'center',
        textAlign: 'right'
      }
    }, s.metric && /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--fg-muted)',
        marginBottom: 3
      }
    }, s.metric), /*#__PURE__*/React.createElement(ToneChip, {
      tone: t || 'neutral'
    }, s.statusLabel || t || 'pending')));
  })));
}

/* ── StatusList (+ checklist variant) ──────────────────────────── */

function StatusList({
  title,
  meta,
  span = 6,
  col,
  row,
  items,
  groupBy,
  groupOrder,
  variant = 'list'
}) {
  if (variant === 'checklist') {
    return /*#__PURE__*/React.createElement(WFrame, {
      title: title,
      meta: meta || 'checklist',
      span: span,
      col: col,
      row: row
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '-4px 0'
      }
    }, items.map((it, i) => {
      const m = it.check === 'ok' ? {
        bg: 'var(--status-success-bg)',
        bd: TONE_LINE.success,
        fg: TONE.success,
        g: '✓'
      } : it.check === 'no' ? {
        bg: 'var(--status-error-bg)',
        bd: TONE_LINE.error,
        fg: TONE.error,
        g: '×'
      } : {
        bg: 'var(--bg-elevated)',
        bd: 'var(--border-default)',
        fg: 'var(--fg-faint)',
        g: '·'
      };
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '6px 2px',
          borderTop: i ? '1px solid var(--border-subtle)' : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          width: 16,
          height: 16,
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          flex: 'none',
          background: m.bg,
          border: '1px solid ' + m.bd,
          color: m.fg
        }
      }, m.g), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          color: 'var(--fg-default)'
        }
      }, it.label), it.meta && /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--fg-subtle)',
          maxWidth: 130,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, it.meta));
    })));
  }
  let groups;
  if (groupBy) {
    const map = {};
    items.forEach(it => {
      (map[it.group] = map[it.group] || []).push(it);
    });
    const order = groupOrder || Object.keys(map);
    groups = order.filter(g => map[g]).map(g => [g, map[g]]);
  } else {
    groups = [[null, items]];
  }
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta || (groupBy ? 'groupBy: ' + groupBy : 'list'),
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '-6px 0'
    }
  }, groups.map(([g, rows], gi) => /*#__PURE__*/React.createElement("div", {
    key: gi
  }, g && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '9px 2px 5px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 10,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--fg-subtle)'
    }
  }, g), /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 10,
      color: 'var(--fg-faint)'
    }
  }, rows.length), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  })), rows.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: 8,
      alignItems: 'center',
      padding: '5px 2px',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, it.id && /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 11,
      color: 'var(--fg-subtle)'
    }
  }, it.id), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--fg-default)',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, it.label), it.annotation ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 10,
      color: it.annotationTone ? TONE[it.annotationTone] : 'var(--status-warning)',
      whiteSpace: 'nowrap'
    }
  }, it.annotation) : /*#__PURE__*/React.createElement(ToneChip, {
    tone: it.tone || 'neutral'
  }, it.statusLabel || it.tone)))))));
}

/* ── Callout (atom) ────────────────────────────────────────────── */

function Callout({
  tone = 'info',
  eyebrow,
  body,
  span = 4,
  col,
  row
}) {
  const sty = {};
  if (col) sty.gridColumn = col;else if (span) sty.gridColumn = `span ${span}`;
  if (row) sty.gridRow = row;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...sty,
      borderLeft: '2px solid ' + TONE[tone],
      background: 'color-mix(in srgb, ' + TONE[tone] + ' 8%, var(--bg-surface))',
      borderRadius: '0 8px 8px 0',
      padding: '10px 14px',
      alignSelf: 'start'
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: TONE[tone],
      marginBottom: 3
    }
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--fg-default)',
      lineHeight: 1.45
    }
  }, body));
}

/* ── Headline banner (stat + lanes) ────────────────────────────── */

function HeadlineBanner({
  count,
  title,
  sub,
  tone = 'neutral',
  lanes,
  span = 4,
  col,
  row
}) {
  const sty = {
    borderColor: tone === 'neutral' ? 'var(--border-default)' : TONE_LINE[tone]
  };
  if (col) sty.gridColumn = col;else if (span) sty.gridColumn = `span ${span}`;
  if (row) sty.gridRow = row;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...sty,
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      gap: 14,
      border: '1px solid',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      boxShadow: 'var(--shadow-ambient)',
      padding: '14px 16px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 40,
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: '-0.03em',
      color: tone === 'neutral' ? 'var(--fg-muted)' : TONE[tone],
      fontVariantNumeric: 'tabular-nums'
    }
  }, count), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--fg-default)',
      marginTop: 8,
      letterSpacing: '-0.01em'
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 11,
      color: 'var(--fg-subtle)',
      marginTop: 3
    }
  }, sub)), lanes && lanes.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 3
    }
  }, lanes.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    title: l.title || l.tone,
    style: {
      width: 6,
      height: 46,
      borderRadius: '2px 2px 0 0',
      background: TONE[l.tone],
      opacity: l.active === false ? 0.28 : 1
    }
  }))));
}

/* ── Collection grid (auto-fit, record-card preset) ────────────── */

function RecordCard({
  r
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "w" + (r.attn ? "" : ""),
    style: {
      borderColor: r.attn ? TONE_LINE.error : 'var(--border-default)',
      boxShadow: r.attn ? '0 0 0 1px color-mix(in srgb,var(--status-error) 18%,transparent), var(--shadow-ambient)' : 'var(--shadow-ambient)',
      position: 'relative'
    }
  }, r.live && /*#__PURE__*/React.createElement("span", {
    className: "is-live",
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "w-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-title"
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--accent-link)',
      textDecoration: 'none'
    }
  }, r.name)), r.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 9,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: r.badge.tone ? TONE[r.badge.tone] : 'var(--fg-muted)',
      background: 'var(--bg-elevated)',
      border: '1px solid ' + (r.badge.tone ? TONE_LINE[r.badge.tone] : 'var(--border-default)'),
      borderRadius: 'var(--radius-sm)',
      padding: '2px 6px'
    }
  }, r.badge.text)), /*#__PURE__*/React.createElement("div", {
    className: "w-body",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11
    }
  }, r.steps && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 3
    }
  }, r.steps.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      height: 7,
      flex: 1,
      borderRadius: 2,
      background: t ? TONE[t] : 'var(--border-default)'
    }
  }))), r.progress && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 9,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--fg-subtle)'
    }
  }, r.progress.label || 'progress'), /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 10,
      color: 'var(--fg-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.progress.cur, " / ", r.progress.total)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 5,
      borderRadius: 3,
      background: 'var(--bg-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      borderRadius: 3,
      width: (r.progress.total ? Math.round(r.progress.cur / r.progress.total * 100) : 0) + '%',
      background: TONE[r.progress.tone || 'info']
    }
  }))), r.stats && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, r.stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 16,
      fontWeight: 600,
      color: s.tone ? TONE[s.tone] : 'var(--fg-default)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 1
    }
  }, s.v), /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 9,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--fg-subtle)',
      marginTop: 3
    }
  }, s.l)))), r.nested && /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden'
    }
  }, r.nested.map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      padding: '5px 8px',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      flex: 'none',
      background: TONE[n.tone || 'neutral']
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-sans)',
      fontSize: 11,
      color: 'var(--fg-default)',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, n.title), n.code && /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 9,
      color: 'var(--fg-subtle)'
    }
  }, n.code)))), r.callout && /*#__PURE__*/React.createElement(Callout, {
    tone: r.callout.tone,
    eyebrow: r.callout.eyebrow,
    body: r.callout.body,
    span: null
  })), r.footer && /*#__PURE__*/React.createElement("div", {
    className: "w-foot"
  }, /*#__PURE__*/React.createElement("span", null, r.footer.left), r.footer.right && /*#__PURE__*/React.createElement("a", null, r.footer.right)));
}
function CollectionGrid({
  title,
  meta,
  span = 12,
  col,
  row,
  records,
  minColWidth = 240
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta || records.length + ' records',
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth}px, 1fr))`,
      gap: 12
    }
  }, records.map((r, i) => /*#__PURE__*/React.createElement(RecordCard, {
    key: i,
    r: r
  }))));
}

/* ── Record switcher (title-anchored dropdown) ─────────────────── */

function RecordSwitcher({
  records,
  currentId,
  onSelect
}) {
  const [open, setOpen] = useStateN(false);
  const cur = records.find(r => r.id === currentId) || records[0];
  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 'none'
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(o => !o),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: 'pointer',
      userSelect: 'none',
      padding: '2px 8px 2px 4px',
      marginLeft: -4,
      borderRadius: 'var(--radius-md)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-sans)',
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--fg-default)',
      letterSpacing: '-0.02em'
    }
  }, cur.title), /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      fontSize: 13,
      color: 'var(--fg-subtle)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform 120ms var(--ease-out)'
    }
  }, "\u25BE")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      top: 38,
      zIndex: 30,
      width: 320,
      maxHeight: 280,
      overflowY: 'auto',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      padding: 5
    }
  }, records.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    onClick: () => {
      onSelect && onSelect(r.id);
      setOpen(false);
    },
    style: {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: 9,
      alignItems: 'center',
      padding: '7px 9px',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      background: r.id === currentId ? 'color-mix(in srgb,var(--status-info) 10%,var(--bg-elevated))' : 'transparent'
    },
    onMouseEnter: e => {
      if (r.id !== currentId) e.currentTarget.style.background = 'var(--bg-overlay)';
    },
    onMouseLeave: e => {
      if (r.id !== currentId) e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement(ToneChip, {
    tone: r.tone || 'neutral'
  }, r.statusLabel || r.tone), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--fg-default)',
      fontWeight: 500
    }
  }, r.title), r.caption && /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 10,
      color: 'var(--fg-subtle)',
      marginTop: 1
    }
  }, r.caption)), /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      color: 'var(--status-info)',
      fontSize: 12,
      opacity: r.id === currentId ? 1 : 0
    }
  }, "\u2713")))));
}

/* ── Command palette (chrome) ──────────────────────────────────── */

function CommandPalette({
  items,
  onChoose,
  onClose
}) {
  const [q, setQ] = useStateN('');
  const [active, setActive] = useStateN(0);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);
  const filtered = !q ? items : items.filter(it => (it.title + ' ' + (it.sub || '')).toLowerCase().includes(q.toLowerCase()));
  const safeActive = Math.min(active, Math.max(filtered.length - 1, 0));
  const onKey = e => {
    if (e.key === 'ArrowDown') {
      setActive(a => (a + 1) % Math.max(filtered.length, 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActive(a => (a - 1 + filtered.length) % Math.max(filtered.length, 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const it = filtered[safeActive];
      if (it) onChoose(it);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  let lastKind = null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(7,9,13,0.5)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 80,
      transform: 'translateX(-50%)',
      width: 480,
      background: 'var(--glass-thick)',
      backdropFilter: 'var(--glass-blur)',
      WebkitBackdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-xl)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '13px 16px',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...mono,
      color: 'var(--fg-subtle)',
      fontSize: 15
    }
  }, "\u2315"), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: q,
    onChange: e => {
      setQ(e.target.value);
      setActive(0);
    },
    onKeyDown: onKey,
    placeholder: "search records and pages\u2026",
    style: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      color: 'var(--fg-default)',
      fontFamily: 'var(--font-sans)',
      fontSize: 15
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 260,
      overflowY: 'auto',
      padding: 6
    }
  }, filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      padding: 22,
      textAlign: 'center',
      fontSize: 11,
      color: 'var(--fg-subtle)'
    }
  }, "// no matches"), filtered.map((it, i) => {
    const grp = it.kind !== lastKind ? lastKind = it.kind : null;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, grp && /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 9,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        padding: '8px 10px 4px'
      }
    }, grp === 'record' ? 'records' : 'pages'), /*#__PURE__*/React.createElement("div", {
      onClick: () => onChoose(it),
      onMouseEnter: () => setActive(i),
      style: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: i === safeActive ? 'var(--bg-overlay)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        width: 16,
        textAlign: 'center',
        color: it.kind === 'record' ? 'var(--chart-1)' : 'var(--fg-subtle)'
      }
    }, it.kind === 'record' ? '▸' : '⊟'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--fg-default)',
        fontWeight: 500
      }
    }, it.title, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--fg-subtle)',
        marginLeft: 8
      }
    }, it.sub)), it.tone ? /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: TONE[it.tone]
      }
    }) : /*#__PURE__*/React.createElement("span", null)));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      display: 'flex',
      gap: 14,
      padding: '8px 14px',
      borderTop: '1px solid var(--glass-border)',
      fontSize: 10,
      color: 'var(--fg-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u2191"), " ", /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u2193"), " navigate"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u21B5"), " open"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "esc"), " close"))));
}

/* Catalog is now an exported design-system component
   (components/catalog/Catalog.jsx → AiDeckDesignSystem_9ef1e6.Catalog). The
   dashboard mounts that exported component on the catalog page, exactly as an
   external consumer would — see pages.jsx. */

Object.assign(window, {
  ToneChip,
  Stepper,
  StatusList,
  Callout,
  HeadlineBanner,
  RecordCard,
  CollectionGrid,
  RecordSwitcher,
  CommandPalette
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/widgets-new.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/widgets.jsx
try { (() => {
/* eslint-disable */
/* aiDeck · widget primitives — visual recreations only.
   Real runtime renders Vue 3; this kit proves the design system. */

const {
  useState,
  useMemo
} = React;

/* ── Frame ─────────────────────────────────────────────────────── */

function WFrame({
  title,
  meta,
  live,
  children,
  foot,
  error,
  span = 12,
  rowSpan,
  col,
  row,
  style
}) {
  const sty = {
    ...(style || {})
  };
  if (col) sty.gridColumn = col;
  if (row) sty.gridRow = row;else if (span && !col) sty.gridColumn = `span ${span}`;
  if (rowSpan) sty.gridRow = `span ${rowSpan}`;
  return /*#__PURE__*/React.createElement("div", {
    className: "w" + (error ? " w-err" : ""),
    style: sty
  }, (title || meta) && /*#__PURE__*/React.createElement("div", {
    className: "w-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "w-meta"
  }, meta && /*#__PURE__*/React.createElement("span", null, meta), live && /*#__PURE__*/React.createElement("span", {
    className: "live",
    "aria-label": "live"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "w-body"
  }, children), foot && /*#__PURE__*/React.createElement("div", {
    className: "w-foot"
  }, /*#__PURE__*/React.createElement("span", null, foot.left), foot.right && /*#__PURE__*/React.createElement("a", null, foot.right)));
}

/* ── Chip ──────────────────────────────────────────────────────── */

const CHIP_COLORS = {
  success: {
    fg: 'var(--status-success)',
    bg: 'var(--status-success-bg)',
    bd: 'var(--status-success-line)'
  },
  warning: {
    fg: 'var(--status-warning)',
    bg: 'var(--status-warning-bg)',
    bd: 'var(--status-warning-line)'
  },
  error: {
    fg: 'var(--status-error)',
    bg: 'var(--status-error-bg)',
    bd: 'var(--status-error-line)'
  },
  info: {
    fg: 'var(--status-info)',
    bg: 'var(--status-info-bg)',
    bd: 'var(--status-info-line)'
  },
  neutral: {
    fg: 'var(--fg-muted)',
    bg: 'var(--status-neutral-bg)',
    bd: 'var(--status-neutral-line)'
  }
};
function Chip({
  kind = 'neutral',
  dot,
  children
}) {
  const c = CHIP_COLORS[kind] || CHIP_COLORS.neutral;
  return /*#__PURE__*/React.createElement("span", {
    className: "chip",
    style: {
      color: c.fg,
      background: c.bg,
      borderColor: c.bd
    }
  }, dot !== false && /*#__PURE__*/React.createElement("span", {
    className: "dot",
    style: {
      background: c.fg
    }
  }), children);
}

/* ── Stat ──────────────────────────────────────────────────────── */

function Stat({
  title,
  meta,
  value,
  delta,
  dir,
  color,
  span = 3
}) {
  const dCls = dir === 'up' || dir === 'down-good' ? 'd up' : dir === 'down' ? 'd down' : 'd';
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      color: color || 'var(--fg-default)'
    }
  }, value), delta && /*#__PURE__*/React.createElement("div", {
    className: dCls
  }, delta)));
}
function StatMini({
  title,
  value,
  delta,
  c,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: "",
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl",
    style: {
      color: c
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "v sm",
    style: {
      color: 'var(--fg-default)'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "d up"
  }, delta)));
}

/* ── Line chart ────────────────────────────────────────────────── */

function LineChart({
  title,
  meta,
  series,
  stacked,
  span = 6,
  col,
  row
}) {
  const W = 400,
    H = 110,
    PAD = 4;
  const allPts = useMemo(() => series.flatMap(s => s.data.filter(v => v !== null)), [series]);
  const maxV = useMemo(() => {
    if (!stacked) return Math.max(...allPts, 1);
    // stack sum at each index
    const n = series[0].data.length;
    let m = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const sr of series) s += sr.data[i] || 0;
      if (s > m) m = s;
    }
    return Math.max(m, 1);
  }, [series, stacked]);
  const n = series[0].data.length;
  const dx = (W - 2 * PAD) / Math.max(n - 1, 1);
  const yScale = v => H - PAD - v / maxV * (H - 2 * PAD);
  let stackAcc = null;
  if (stacked) stackAcc = new Array(n).fill(0);
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("svg", {
    className: "chart",
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    style: {
      height: 130
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "var(--border-subtle)",
    strokeWidth: "1"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: H * 0.25,
    x2: W,
    y2: H * 0.25
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: H * 0.5,
    x2: W,
    y2: H * 0.5
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: H * 0.75,
    x2: W,
    y2: H * 0.75
  })), series.map((s, si) => {
    const points = [];
    for (let i = 0; i < n; i++) {
      const v = s.data[i];
      if (v == null) continue;
      const stacked_v = stacked ? stackAcc[i] + v : v;
      const x = PAD + i * dx;
      const y = yScale(stacked_v);
      points.push([x, y, i, stacked_v]);
      if (stacked) stackAcc[i] += v;
    }
    const path = points.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
    const fillPath = points.length > 1 ? `${path} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z` : null;
    return /*#__PURE__*/React.createElement("g", {
      key: si
    }, stacked && fillPath && /*#__PURE__*/React.createElement("path", {
      d: fillPath,
      fill: s.color,
      fillOpacity: "0.18"
    }), !stacked && fillPath && si === 0 && /*#__PURE__*/React.createElement("path", {
      d: fillPath,
      fill: s.color,
      fillOpacity: "0.10"
    }), /*#__PURE__*/React.createElement("path", {
      d: path,
      fill: "none",
      stroke: s.color,
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 6,
      flexWrap: 'wrap'
    }
  }, series.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 12,
      height: 2,
      background: s.color,
      borderRadius: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--fg-muted)',
      fontFeatureSettings: '"calt" 0'
    }
  }, s.key)))));
}

/* ── Bar chart ─────────────────────────────────────────────────── */

function BarChart({
  title,
  meta,
  data,
  span = 6,
  col,
  row
}) {
  const maxV = Math.max(...data.map(d => d.v), 1);
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      alignItems: 'flex-end',
      height: 110,
      paddingTop: 6
    }
  }, data.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: `${d.v / maxV * 100}%`,
      background: d.c,
      borderRadius: 2,
      minHeight: 2
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--fg-muted)',
      fontFeatureSettings: '"calt" 0'
    }
  }, d.label)))));
}

/* ── Gauge ─────────────────────────────────────────────────────── */

function Gauge({
  title,
  meta,
  value,
  label,
  c = 'var(--chart-2)',
  col,
  row,
  span
}) {
  const arcLen = 264;
  const off = arcLen * (1 - value / 100);
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    col: col,
    row: row,
    span: span
  }, /*#__PURE__*/React.createElement("div", {
    className: "gauge",
    style: {
      padding: '4px 0'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 110",
    width: "100%",
    height: "110"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 16 96 A 84 84 0 0 1 184 96",
    fill: "none",
    stroke: "var(--bg-elevated)",
    strokeWidth: "12",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 16 96 A 84 84 0 0 1 184 96",
    fill: "none",
    stroke: c,
    strokeWidth: "12",
    strokeLinecap: "round",
    strokeDasharray: arcLen,
    strokeDashoffset: off
  }), /*#__PURE__*/React.createElement("text", {
    x: "100",
    y: "76",
    textAnchor: "middle",
    fontFamily: "var(--font-sans)",
    fontSize: "26",
    fontWeight: "600",
    fill: "var(--fg-default)",
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, value, "%"), label && /*#__PURE__*/React.createElement("text", {
    x: "100",
    y: "96",
    textAnchor: "middle",
    fontFamily: "var(--font-mono)",
    fontSize: "10",
    fill: "var(--fg-muted)",
    letterSpacing: "0.05em"
  }, label))));
}

/* ── Progress widget ───────────────────────────────────────────── */

function ProgressWidget({
  title,
  meta,
  rows,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 10
    }
  }, rows.map((r, i) => {
    const pct = r.total === 0 ? 0 : r.cur / r.total * 100;
    return /*#__PURE__*/React.createElement("div", {
      className: "col",
      key: i,
      style: {
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        color: 'var(--fg-default)'
      }
    }, r.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--fg-muted)',
        fontFeatureSettings: '"calt" 0'
      }
    }, r.cur, " / ", r.total)), /*#__PURE__*/React.createElement("div", {
      className: "progress"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: `${pct}%`,
        background: r.c
      }
    })));
  })));
}

/* ── Table ─────────────────────────────────────────────────────── */

function Table({
  title,
  meta,
  cols,
  rows,
  span = 12,
  col,
  row,
  compact
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("table", {
    className: "tab"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, cols.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, ri) => /*#__PURE__*/React.createElement("tr", {
    key: ri
  }, r.map((cell, ci) => {
    if (cell && typeof cell === 'object' && cell.chip) {
      return /*#__PURE__*/React.createElement("td", {
        key: ci
      }, /*#__PURE__*/React.createElement(Chip, {
        kind: cell.chip
      }, cell.text));
    }
    const cls = ci === 0 ? 'mono' : typeof cell === 'string' && cell.match(/^[\d.,+\-/%kM\s]+$/) ? 'num' : '';
    return /*#__PURE__*/React.createElement("td", {
      key: ci,
      className: cls
    }, cell);
  }))))));
}

/* ── List ──────────────────────────────────────────────────────── */

function List({
  title,
  meta,
  rows,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 0
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "row",
    style: {
      padding: '6px 4px',
      borderBottom: i === rows.length - 1 ? 0 : '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--fg-subtle)',
      width: 88,
      flex: 'none',
      fontFeatureSettings: '"calt" 0'
    }
  }, r.left), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12,
      color: 'var(--fg-default)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, r.mid), r.right && r.right.chip ? /*#__PURE__*/React.createElement(Chip, {
    kind: r.right.chip
  }, r.right.text) : /*#__PURE__*/React.createElement("span", {
    className: "value"
  }, r.right)))));
}

/* ── Key-Value ─────────────────────────────────────────────────── */

function KV({
  title,
  meta,
  rows,
  span = 4,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    className: "kv-row",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "kv-k"
  }, r[0]), /*#__PURE__*/React.createElement("span", {
    className: "kv-v mono"
  }, r[1]))));
}

/* ── Markdown ──────────────────────────────────────────────────── */

function Markdown({
  title,
  meta,
  md,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "md",
    dangerouslySetInnerHTML: {
      __html: md
    }
  }));
}

/* ── Tags / chip cloud ─────────────────────────────────────────── */

function Tags({
  title,
  meta,
  tags,
  span = 4,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "row wrap",
    style: {
      gap: 5
    }
  }, tags.map(([name, count, c], i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "chip chip-sq",
    style: {
      color: c,
      background: 'transparent',
      borderColor: 'color-mix(in srgb, ' + c + ' 45%, transparent)',
      height: 20,
      padding: '0 8px'
    }
  }, name, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 5,
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--fg-subtle)',
      fontFeatureSettings: '"calt" 0'
    }
  }, count)))));
}

/* ── Kanban ────────────────────────────────────────────────────── */

function Kanban({
  title,
  meta,
  cols,
  span = 12,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb",
    style: {
      gridTemplateColumns: `repeat(${cols.length}, 1fr)`
    }
  }, cols.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "kb-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kb-col-h"
  }, /*#__PURE__*/React.createElement("span", null, c.name), /*#__PURE__*/React.createElement("span", {
    className: "ct"
  }, c.cards.length)), c.cards.map((card, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "kb-card" + (card.accent ? " accent" : "")
  }, card.id && /*#__PURE__*/React.createElement("div", {
    className: "id"
  }, card.id), /*#__PURE__*/React.createElement("div", {
    className: "ti"
  }, card.title), card.tags && /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, card.tags.map((t, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    className: "tk",
    style: {
      color: t.c,
      border: '1px solid color-mix(in srgb, ' + t.c + ' 40%, transparent)'
    }
  }, t.t)))))))));
}

/* ── Timeline ──────────────────────────────────────────────────── */

function Timeline({
  title,
  meta,
  events,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "tl"
  }, events.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tl-row " + e[1]
  }, /*#__PURE__*/React.createElement("div", {
    className: "tl-ts"
  }, e[0]), /*#__PURE__*/React.createElement("div", {
    className: "tl-ti"
  }, e[2]), e[3] && /*#__PURE__*/React.createElement("div", {
    className: "tl-sub"
  }, e[3])))));
}

/* ── Log ───────────────────────────────────────────────────────── */

function Log({
  title,
  meta,
  lines,
  live,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    live: live,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "log"
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "ts"
  }, l[0]), " ", /*#__PURE__*/React.createElement("span", {
    className: "lv " + l[1]
  }, l[2]), " ", /*#__PURE__*/React.createElement("span", {
    className: "msg"
  }, l[3]), l[4] && /*#__PURE__*/React.createElement("span", null, " ", /*#__PURE__*/React.createElement("span", {
    className: "val"
  }, l[4]))))));
}

/* ── Tree ──────────────────────────────────────────────────────── */

function TreeView({
  title,
  meta,
  rows,
  span = 6,
  col,
  row
}) {
  return /*#__PURE__*/React.createElement(WFrame, {
    title: title,
    meta: meta,
    span: span,
    col: col,
    row: row
  }, /*#__PURE__*/React.createElement("div", {
    className: "tree"
  }, rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "tree-row " + (r.kind === 'dir' ? 'dir ' : '') + (r.active ? 'active ' : ''),
    style: {
      paddingLeft: r.ind * 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "caret"
  }, r.kind === 'dir' ? '▾' : ''), /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, r.name), /*#__PURE__*/React.createElement("span", {
    className: "meta"
  }, r.meta)))));
}

/* ── Error widget ──────────────────────────────────────────────── */

function ErrorCard({
  title,
  source,
  msg,
  path,
  suggestion,
  span = 4
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "w",
    style: {
      borderColor: 'var(--status-error-line)',
      gridColumn: `span ${span}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-head",
    style: {
      background: 'color-mix(in srgb, var(--status-error) 6%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-title",
    style: {
      color: 'var(--status-error)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 700
    }
  }, "\xD7"), " ", title), /*#__PURE__*/React.createElement("div", {
    className: "w-meta"
  }, "retry")), /*#__PURE__*/React.createElement("div", {
    className: "w-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col",
    style: {
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--fg-default)'
    }
  }, msg), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--fg-muted)',
      fontFeatureSettings: '"calt" 0',
      wordBreak: 'break-all'
    }
  }, path), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--status-info)',
      marginTop: 4,
      fontFeatureSettings: '"calt" 0'
    }
  }, "\u2192 ", suggestion))), /*#__PURE__*/React.createElement("div", {
    className: "w-foot"
  }, /*#__PURE__*/React.createElement("span", null, source), /*#__PURE__*/React.createElement("a", null, "open file \u2192")));
}

/* ── Pipeline DAG (specialized) ────────────────────────────────── */

function PipelineDAG() {
  return /*#__PURE__*/React.createElement("div", {
    className: "single-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-title"
  }, "pipeline \xB7 code-health"), /*#__PURE__*/React.createElement("div", {
    className: "w-meta"
  }, /*#__PURE__*/React.createElement("span", null, "mermaid \xB7 live"), /*#__PURE__*/React.createElement("span", {
    className: "live"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 18,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 800 360",
    width: "100%",
    height: "100%",
    preserveAspectRatio: "xMidYMid meet"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("marker", {
    id: "ar2",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "6",
    markerHeight: "6",
    orient: "auto"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,0 L10,5 L0,10 z",
    fill: "var(--border-bright)"
  }))), /*#__PURE__*/React.createElement("style", null, `
            .nb { fill: var(--bg-elevated); stroke: var(--border-default); stroke-width: 1.2; }
            .nb.ok  { fill: var(--status-success-bg); stroke: var(--status-success-line); }
            .nb.act { fill: var(--status-info-bg);    stroke: var(--status-info-line); }
            .nb.err { fill: var(--status-error-bg);   stroke: var(--status-error-line); }
            .nb.nq  { fill: var(--bg-surface); stroke: var(--border-default); }
            .nl  { font-family: var(--font-sans); font-size: 14px; fill: var(--fg-default); font-weight: 500; }
            .nls { font-family: var(--font-mono); font-size: 11px; fill: var(--fg-muted); font-feature-settings: 'calt' 0; }
            .e   { stroke: var(--border-bright); stroke-width: 1.4; fill: none; }
          `), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "20",
    y: "20",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb ok"
  }), /*#__PURE__*/React.createElement("text", {
    x: "90",
    y: "45",
    textAnchor: "middle",
    className: "nl"
  }, "source"), /*#__PURE__*/React.createElement("text", {
    x: "90",
    y: "60",
    textAnchor: "middle",
    className: "nls"
  }, "git \xB7 main \xB7 a4f9c1")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "220",
    y: "20",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb ok"
  }), /*#__PURE__*/React.createElement("text", {
    x: "290",
    y: "45",
    textAnchor: "middle",
    className: "nl"
  }, "install"), /*#__PURE__*/React.createElement("text", {
    x: "290",
    y: "60",
    textAnchor: "middle",
    className: "nls"
  }, "4.2s \xB7 142 pkg")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "220",
    y: "100",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb act"
  }), /*#__PURE__*/React.createElement("text", {
    x: "290",
    y: "125",
    textAnchor: "middle",
    className: "nl"
  }, "lint"), /*#__PURE__*/React.createElement("text", {
    x: "290",
    y: "140",
    textAnchor: "middle",
    className: "nls"
  }, "running \xB7 1.2s")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "420",
    y: "20",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb ok"
  }), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "45",
    textAnchor: "middle",
    className: "nl"
  }, "typecheck"), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "60",
    textAnchor: "middle",
    className: "nls"
  }, "12.8s \xB7 348 files")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "420",
    y: "160",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb ok"
  }), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "185",
    textAnchor: "middle",
    className: "nl"
  }, "unit tests"), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "200",
    textAnchor: "middle",
    className: "nls"
  }, "1284 \u2713 \xB7 18.2s")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "420",
    y: "240",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb err"
  }), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "265",
    textAnchor: "middle",
    className: "nl"
  }, "e2e tests"), /*#__PURE__*/React.createElement("text", {
    x: "490",
    y: "280",
    textAnchor: "middle",
    className: "nls"
  }, "2 flaky \xB7 re-run 2/3")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "620",
    y: "20",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb nq"
  }), /*#__PURE__*/React.createElement("text", {
    x: "690",
    y: "45",
    textAnchor: "middle",
    className: "nl"
  }, "bundle"), /*#__PURE__*/React.createElement("text", {
    x: "690",
    y: "60",
    textAnchor: "middle",
    className: "nls"
  }, "queued")), /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "620",
    y: "240",
    width: "140",
    height: "50",
    rx: "8",
    className: "nb nq"
  }), /*#__PURE__*/React.createElement("text", {
    x: "690",
    y: "265",
    textAnchor: "middle",
    className: "nl"
  }, "deploy"), /*#__PURE__*/React.createElement("text", {
    x: "690",
    y: "280",
    textAnchor: "middle",
    className: "nls"
  }, "awaiting")), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M160,45 L220,45",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M160,45 C190,45 200,125 220,125",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M360,45 L420,45",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M490,70 L490,160",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M490,210 L490,240",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M560,45 L620,45",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("path", {
    className: "e",
    d: "M560,265 L620,265",
    markerEnd: "url(#ar2)"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "translate(20, 320)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "12",
    height: "12",
    rx: "2",
    className: "nb ok"
  }), /*#__PURE__*/React.createElement("text", {
    x: "18",
    y: "11",
    className: "nls"
  }, "done"), /*#__PURE__*/React.createElement("rect", {
    x: "80",
    y: "0",
    width: "12",
    height: "12",
    rx: "2",
    className: "nb act"
  }), /*#__PURE__*/React.createElement("text", {
    x: "98",
    y: "11",
    className: "nls"
  }, "running"), /*#__PURE__*/React.createElement("rect", {
    x: "170",
    y: "0",
    width: "12",
    height: "12",
    rx: "2",
    className: "nb err"
  }), /*#__PURE__*/React.createElement("text", {
    x: "188",
    y: "11",
    className: "nls"
  }, "failed"), /*#__PURE__*/React.createElement("rect", {
    x: "260",
    y: "0",
    width: "12",
    height: "12",
    rx: "2",
    className: "nb nq"
  }), /*#__PURE__*/React.createElement("text", {
    x: "278",
    y: "11",
    className: "nls"
  }, "queued")))));
}
function PrinciplesMD() {
  return /*#__PURE__*/React.createElement("div", {
    className: "single-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-title"
  }, "principles"), /*#__PURE__*/React.createElement("div", {
    className: "w-meta"
  }, "7 \xB7 markdown")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: '24px 32px',
      overflow: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "md",
    style: {
      maxWidth: 720,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 22,
      marginBottom: 14
    }
  }, "Seven principles for aiDeck"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--fg-muted)'
    }
  }, "The runtime exists to project local files. Everything below follows from that."), /*#__PURE__*/React.createElement("h3", null, "1 \xB7 Files are canonical"), /*#__PURE__*/React.createElement("p", null, "aiDeck never owns state. The consumer's data file is the source of truth; the dashboard is a view. ", /*#__PURE__*/React.createElement("code", null, "manifest.yaml"), " declares pages, layouts, and widget bindings. The runtime reads, validates, renders."), /*#__PURE__*/React.createElement("h3", null, "2 \xB7 Localhost-only, zero telemetry"), /*#__PURE__*/React.createElement("p", null, "The runtime binds to ", /*#__PURE__*/React.createElement("code", null, "127.0.0.1"), ". Nothing leaves the user's machine. No analytics, no error reporting, no auto-update pings. The trust signal in the chrome makes this visible at all times."), /*#__PURE__*/React.createElement("h3", null, "3 \xB7 Consumer-agnostic vocabulary"), /*#__PURE__*/React.createElement("p", null, "Tokens are semantic, not domain-specific. ", /*#__PURE__*/React.createElement("code", null, "--status-success"), " is correct; ", /*#__PURE__*/React.createElement("code", null, "--phase-done"), " is not. A consumer projects its own vocabulary onto these tokens."), /*#__PURE__*/React.createElement("h3", null, "4 \xB7 Density is a feature"), /*#__PURE__*/React.createElement("p", null, "The audience reads dense data. 5 pages \xD7 12-20 widgets per page must fit a 13\u2033 laptop. Whitespace is not a default solution \u2014 it is reserved for actual separation."), /*#__PURE__*/React.createElement("h3", null, "5 \xB7 Widget consistency"), /*#__PURE__*/React.createElement("p", null, "All 25 widgets share the same frame: 1px border, 8px radius, header + body + optional footer, identical loading / empty / error states."), /*#__PURE__*/React.createElement("h3", null, "6 \xB7 Glass = chrome only"), /*#__PURE__*/React.createElement("p", null, "Translucent surfaces signal \"floats above your data\". Reserved for chrome \u2014 never on a widget body."), /*#__PURE__*/React.createElement("h3", null, "7 \xB7 Errors include a suggestion"), /*#__PURE__*/React.createElement("p", null, "Every error widget includes a structured ", /*#__PURE__*/React.createElement("code", null, "suggestion"), " field: a concrete next step, not \"something went wrong\"."))));
}
Object.assign(window, {
  WFrame,
  Chip,
  Stat,
  StatMini,
  LineChart,
  BarChart,
  Gauge,
  ProgressWidget,
  Table,
  List,
  KV,
  Markdown,
  Tags,
  Kanban,
  Timeline,
  Log,
  TreeView,
  ErrorCard,
  PipelineDAG,
  PrinciplesMD
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/widgets.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Catalog = __ds_scope.Catalog;

__ds_ns.Facet = __ds_scope.Facet;

__ds_ns.RecordDetail = __ds_scope.RecordDetail;

__ds_ns.SearchInput = __ds_scope.SearchInput;

})();
