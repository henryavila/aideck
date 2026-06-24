/* eslint-disable */
/* SearchInput — the catalog's search field atom. Controlled: owns no state,
   reports keystrokes via onChange(string). Reused by Catalog and available
   standalone for any master-detail or filter UI. Class names match the
   widget-catalog specimen verbatim. */

export function SearchInput({ value, onChange, placeholder, glyph, width, autoFocus }) {
  const { useEffect, useRef } = React;
  if (window.__AidCatalogKit) window.__AidCatalogKit.ensureCatalogStyles();
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  return (
    <div className="search" style={width != null ? { width } : undefined}>
      <span>{glyph || '⌕'}</span>
      <input
        ref={ref}
        value={value || ''}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder || 'search…'}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
