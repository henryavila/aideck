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

export function Catalog({
  records,
  sections,
  facetField = 'tags',
  searchFields = ['id', 'title', 'summary'],
  selectedId,
  onSelect,
  emptyText = '// no records',
  state = 'default',
  error = 'failed to load records',
  suggestion,
}) {
  const { useState, useMemo, useEffect } = React;
  const kit = window.__AidCatalogKit || {};
  if (kit.ensureCatalogStyles) kit.ensureCatalogStyles();
  const NS = window.AiDeckDesignSystem_9ef1e6 || {};

  const recs = records || [];
  const secs = sections || [];

  const [query, setQuery] = useState('');
  const [activeFacets, setActiveFacets] = useState({});
  const [internalSel, setInternalSel] = useState(selectedId != null ? selectedId : null);
  useEffect(() => { if (selectedId !== undefined) setInternalSel(selectedId); }, [selectedId]);

  const allFacets = useMemo(
    () => (kit.deriveFacets ? kit.deriveFacets(recs, facetField) : []),
    [recs, facetField]
  );
  const filtered = useMemo(
    () => (kit.filterRecords ? kit.filterRecords(recs, { query, activeFacets, searchFields, facetField }) : recs),
    [recs, query, activeFacets, searchFields, facetField]
  );

  // Effective selection: explicit pick if it still exists, else first filtered.
  const picked = (internalSel != null) ? recs.find(r => r.id === internalSel) : null;
  const current = picked || filtered[0] || null;
  const currentId = current ? current.id : null;

  const select = id => { setInternalSel(id); if (onSelect) onSelect(id); };
  const onRef = id => {
    if (!recs.find(r => r.id === id)) return;
    setQuery('');
    setActiveFacets({});
    select(id);
  };
  const toggleFacet = f => setActiveFacets(s => ({ ...s, [f]: !s[f] }));

  const badgeFor = r => {
    if (r.badge != null) return r.badge;
    const sub = secs.find(s => s.kind === 'subItems');
    if (sub) { const v = r[sub.field]; if (Array.isArray(v)) return v.length; }
    return null;
  };

  const isLive = state === 'live';
  const cls = 'cat' + (state === 'error' ? ' is-error' : '') + (isLive ? ' is-live' : '');

  // ── error · empty · loading replace the body wholesale ─────────────────
  if (state === 'error') {
    return (
      <div className={cls}>
        {renderTools(true)}
        <div className="cat-msg-body">
          <div className="cat-msg">
            <div className="cat-msg-glyph err">!</div>
            <div className="cat-msg-text">{error}</div>
            {suggestion && <div className="cat-msg-sug">→ <b>{suggestion}</b></div>}
          </div>
        </div>
      </div>
    );
  }

  if (state === 'empty' || recs.length === 0) {
    return (
      <div className={cls}>
        {renderTools(true)}
        <div className="cat-msg-body">
          <div className="cat-msg">
            <div className="cat-msg-glyph empty">∅</div>
            <div className="cat-msg-text">{emptyText}</div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className={cls}>
        {renderTools(true)}
        <div className="cat-body">
          <div className="master">
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton sk-row" />)}
          </div>
          <div className="detail">
            <div className="skeleton sk-line" style={{ width: '46%', height: 20 }} />
            <div className="skeleton sk-line" style={{ width: '100%', height: 12, marginTop: 18 }} />
            <div className="skeleton sk-line" style={{ width: '92%', height: 12, marginTop: 8 }} />
            <div className="skeleton sk-line" style={{ width: '70%', height: 12, marginTop: 8 }} />
            <div className="skeleton sk-line" style={{ width: '100%', height: 56, marginTop: 22 }} />
            <div className="skeleton sk-line" style={{ width: '100%', height: 56, marginTop: 10 }} />
          </div>
        </div>
      </div>
    );
  }

  // ── default / live ─────────────────────────────────────────────────────
  return (
    <div className={cls}>
      {renderTools(false)}
      <div className="cat-body">
        <div className="master">
          {filtered.length === 0
            ? <div className="m-empty">{emptyText && emptyText.indexOf('//') === 0 ? emptyText : '// nothing — clear the filter'}</div>
            : filtered.map(r => {
                const b = badgeFor(r);
                return (
                  <div key={r.id} className={'m-row' + (r.id === currentId ? ' sel' : '')} onClick={() => select(r.id)}>
                    {r.icon != null && <span className="m-ico">{r.icon}</span>}
                    <div style={{ minWidth: 0 }}>
                      <div className="m-name">{r.id}</div>
                      {r.oneLiner != null && <div className="m-one">{r.oneLiner}</div>}
                    </div>
                    {b != null && <span className="m-badge">{b}</span>}
                  </div>
                );
              })}
        </div>
        <div className="detail">
          {NS.RecordDetail
            ? React.createElement(NS.RecordDetail, { record: current, sections: secs, facetField, onSelectRef: onRef })
            : <div className="m-empty">// detail panel unavailable</div>}
        </div>
      </div>
    </div>
  );

  function renderTools(disabled) {
    const Search = NS.SearchInput;
    const FacetPill = NS.Facet;
    return (
      <div className="cat-tools" style={disabled ? { opacity: 0.55, pointerEvents: 'none' } : undefined}>
        {Search
          ? React.createElement(Search, { value: query, onChange: setQuery, placeholder: 'search catalog…' })
          : <div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="search catalog…" /></div>}
        {allFacets.length > 0 && (
          <div className="facets">
            {allFacets.map(f => (
              FacetPill
                ? React.createElement(FacetPill, { key: f, label: f, active: !!activeFacets[f], onClick: () => toggleFacet(f) })
                : <span key={f} className={'facet' + (activeFacets[f] ? ' on' : '')} onClick={() => toggleFacet(f)}>{f}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
}
