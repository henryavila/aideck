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

export function RecordDetail({ record, sections, facetField, onSelectRef }) {
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  const kit = window.__AidCatalogKit || {};
  if (!record) {
    return <div className="m-empty">// nothing selected</div>;
  }
  const facets = (kit.facetValues ? kit.facetValues(record, facetField) : []);
  const secs = sections || [];
  return (
    <div>
      <div className="d-head">
        {record.icon != null && <span className="d-ico">{record.icon}</span>}
        <span className="d-title">{record.title != null ? record.title : record.id}</span>
        {facets.length > 0 && <span className="d-id">{facets.join(' · ')}</span>}
      </div>
      {secs.map((s, i) => renderSection(s, record, onSelectRef, i))}
    </div>
  );
}

function isEmpty(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

function Section({ label, children }) {
  return (
    <div className="sec">
      <div className="sec-h">{label}</div>
      {children}
    </div>
  );
}

function renderSection(s, r, onSelectRef, key) {
  switch (s.kind) {
    case 'summary': {
      const v = r[s.field];
      if (isEmpty(v)) return null;
      return <Section key={key} label={s.label}><div className="d-summary">{v}</div></Section>;
    }
    case 'examples': {
      const list = r[s.field];
      if (isEmpty(list)) return null;
      return (
        <Section key={key} label={s.label}>
          {list.map((e, i) => <div key={i} className="code">{e}</div>)}
        </Section>
      );
    }
    case 'prosCons': {
      const pros = r[s.proField] || [];
      const cons = r[s.conField] || [];
      if (isEmpty(pros) && isEmpty(cons)) return null;
      const pg = s.proGlyph || '✓';
      const cg = s.conGlyph || '×';
      return (
        <Section key={key} label={s.label}>
          <div className="pc">
            <div>{pros.map((p, i) => <div key={i} className="pc-li pro"><span className="mk">{pg}</span>{p}</div>)}</div>
            <div>{cons.map((c, i) => <div key={i} className="pc-li con"><span className="mk">{cg}</span>{c}</div>)}</div>
          </div>
        </Section>
      );
    }
    case 'subItems': {
      const list = r[s.field];
      if (isEmpty(list)) return null;
      const gk = s.groupKey || 'group', nk = s.nameKey || 'name', dk = s.descKey || 'description';
      const groups = {};
      const order = [];
      list.forEach(it => {
        const g = it[gk] == null ? '' : it[gk];
        if (!groups[g]) { groups[g] = []; order.push(g); }
        groups[g].push(it);
      });
      return (
        <Section key={key} label={s.label}>
          {order.map(g => (
            <div key={g}>
              {g !== '' && <div className="sub-grp">{g}</div>}
              {groups[g].map((it, i) => (
                <div key={i} className="sub-row">
                  <span className="sub-name">{it[nk]}</span>
                  <span className="sub-desc">{it[dk]}</span>
                </div>
              ))}
            </div>
          ))}
        </Section>
      );
    }
    case 'fields': {
      const list = r[s.field];
      if (isEmpty(list)) return null;
      const cols = s.columns || [];
      return (
        <Section key={key} label={s.label}>
          <table className="ft">
            <thead><tr>{cols.map((c, i) => <th key={i}>{c.label}</th>)}</tr></thead>
            <tbody>
              {list.map((row, ri) => (
                <tr key={ri}>
                  {cols.map((c, ci) => {
                    let cell = row[c.key];
                    if (c.bool) cell = cell ? (c.trueGlyph || '✓') : (c.falseGlyph || '·');
                    return <td key={ci} className={c.mono ? 'mono' : undefined}>{cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      );
    }
    case 'meta': {
      const groups = s.groups || [];
      const anyData = groups.some(g => !isEmpty(r[g.field]) || g.emptyLabel);
      if (!anyData) return null;
      return (
        <Section key={key} label={s.label}>
          <div className="chips">
            {groups.map((g, gi) => {
              const vals = r[g.field];
              if (isEmpty(vals)) {
                if (!g.emptyLabel) return null;
                return <span key={'g' + gi} className="chip-mono" style={{ opacity: 0.5 }}>{g.emptyLabel}</span>;
              }
              return (Array.isArray(vals) ? vals : [vals]).map((v, vi) => (
                <span key={'g' + gi + '_' + vi} className="chip-mono">{(g.prefix || '') + v}</span>
              ));
            })}
          </div>
        </Section>
      );
    }
    case 'refs': {
      const list = r[s.field];
      if (isEmpty(list)) return null;
      return (
        <Section key={key} label={s.label}>
          <div className="chips">
            {list.map((rf, i) => (
              <span key={i} className="chip-ref" onClick={() => onSelectRef && onSelectRef(rf)}>{rf}</span>
            ))}
          </div>
        </Section>
      );
    }
    default:
      return null;
  }
}
